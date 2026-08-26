#!/usr/bin/env python3
"""Bulk-import a prepared CSV of Connecticut resources into the Village Notes base.

Written for the Connecticut Office of Early Childhood Early Start CT FY26
provider map, and shaped to be the template for the next list -- 211, the Area
Agencies on Aging, municipal camps. To reuse it for a different source, change
the CSV path and the two mapping tables below; everything else is generic.

Safety properties that matter for a directory families act on:

  * Idempotent. Every row is keyed on its licence/registry id (falling back to
    name+town+address), checked against what is already in the table, so a
    re-run adds nothing. Two sites really can share a name in one town --
    Future Scholars has two in Naugatuck -- so name+town alone is not a key.
  * Category and Track are validated against a closed list before sending.
    typecast is on so the 83 towns can create their Towns Served options, and
    without that check a mapping slip could invent a category instead.
  * --dry-run prints exactly what would happen and writes nothing.

Usage:
    AIRTABLE_IMPORT_TOKEN=pat... python3 scripts/import-early-start-ct.py --dry-run
    AIRTABLE_IMPORT_TOKEN=pat... python3 scripts/import-early-start-ct.py

Needs data.records:read and data.records:write on the base. Use a dedicated
write-scoped AIRTABLE_IMPORT_TOKEN when possible; it falls back to
AIRTABLE_TOKEN.
"""

import argparse, csv, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

BASE_ID  = "appxUByKs5ULrDZQp"
TABLE_ID = "tbltzLo6IdBIfjkL7"
CSV_PATH = Path(__file__).resolve().parent / "import-data" / "early-start-ct-fy26.csv"
API = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"


# Field ids on the Resources table.
FLD = dict(name="fldhaAie6ZWEBNSnr", track="fldoN4wD1g4tYEFPo", category="fldBp1UDqNtkz5fKM",
           specific="fldbIll3ZVhDzQUO7", town="fldJa8WOjbdMNgJ86", address="fldyu1YVnAOqu7XTA",
           ages="fld9LqKZpxDyh6Q2x", hours="fldNkvtYO4xUY8s80", avail="fldad1MxH4noQBR3D",
           cost="fldku4JkMsNYYA4BB", website="fldF6mlEPNidU67Wc", contact="fldsx7J66ZPCioGQQ",
           submitted="fldzpdKt9kyDfsg1f", date="fldzu4kv4Epn3vVDZ", status="fldoE5JfQiXElXs1S",
           notes="fldcvNAYhvWg21zzc", served="fldwdLjTvk8jdcqf9")

# Setting-based, because that is what a parent filters on. The funded-space
# breakdown goes in Ages / notes instead: funded spaces are not capacity, and
# the source file says so explicitly.
BY_PROVIDER_TYPE = {
    "Child Care Center": "Center-Based Daycare",
    "Family Home":       "Home Daycare (Licensed)",
    "Group Home":        "Home Daycare (Licensed)",
    "Public School":     "Preschool / Pre-K",
}
# The 13 statewide rows, mapped one at a time rather than by rule.
BY_NAME = {
    "211 Child Care": "Parenting Support/Classes",
    "211 Child Care Provider Search": "Parenting Support/Classes",
    "Care 4 Kids": "Legal/HR Resource",
    "Child Care Aware of America: Connecticut Resources": "Parenting Support/Classes",
    "Connecticut Birth to Three System": "Birth-to-Three / Early Intervention",
    "Connecticut eLicense Child Care Roster": "Legal/HR Resource",
    "Connecticut Head Start Association Program Finder": "Preschool / Pre-K",
    "Connecticut Office of Early Childhood: Find Child Care and Camps": "Parenting Support/Classes",
    "Connecticut WIC Local Agencies": "Parenting Support/Classes",
    "Early Start CT": "Legal/HR Resource",
    "Federal Head Start Center Locator": "Preschool / Pre-K",
    "Help Me Grow Connecticut": "Birth-to-Three / Early Intervention",
    "HUSKY Health Connecticut": "Legal/HR Resource",
}
VALID_CATEGORIES = set(BY_PROVIDER_TYPE.values()) | set(BY_NAME.values())
STATEWIDE = "Statewide (all of Connecticut)"

def g(r, k):  return (r.get(k) or "").strip()
def norm(s):  return re.sub(r"[^a-z0-9]", "", (s or "").lower())
def num(r, k):
    try: return int(float(g(r, k) or 0))
    except ValueError: return 0

def spaces_phrase(r):
    parts = [(num(r,"Infant/Toddler Funded Spaces FY26"), "infant/toddler"),
             (num(r,"Preschool Funded Spaces FY26"),      "preschool"),
             (num(r,"School-Age Funded Spaces FY26"),     "school-age")]
    got = [f"{n} {lab}" for n, lab in parts if n]
    return " and ".join(got) if got else ""

def build_notes(r):
    """Facts only. The interpretive advice that used to sit here was identical
    in all 427 provider rows -- repeated boilerplate is noise in a directory,
    and the caveat belongs on the page once, not in every record."""
    out = []
    sp = spaces_phrase(r)
    if sp:
        out.append(f"FY26 state-funded spaces: {sp}. An allocation, not current openings.")
    if g(r, "License or Registry ID"):
        out.append(f"Licence/registry: {g(r,'License or Registry ID')}.")
    if g(r, "Local Governance Partner"):
        line = f"Local partner: {g(r,'Local Governance Partner')}"
        if g(r, "Local Partner Contact"):
            line += f" -- {g(r,'Local Partner Contact')}"
        out.append(line + ".")
    out.append(f"Source: {g(r,'Source')}, accessed {g(r,'Verified or Accessed')}.")
    return " ".join(out)

def to_record(r, status):
    is_provider = g(r, "Record Type") == "Provider"
    name = g(r, "Resource or Program Name")
    town = g(r, "Town")

    category = (BY_PROVIDER_TYPE.get(g(r, "Provider Type")) if is_provider
                else BY_NAME.get(name))
    if not category:
        return None, f"unmapped: {name} / {g(r,'Provider Type')} / {g(r,'Record Type')}"

    f = {
        FLD["name"]: name,
        FLD["track"]: "Family & Childcare",
        FLD["category"]: category,
        FLD["town"]: town,
        FLD["status"]: status,
        FLD["submitted"]: "Connecticut Office of Early Childhood (Early Start CT FY26 data)",
        FLD["date"]: g(r, "Verified or Accessed") or None,
        FLD["notes"]: build_notes(r),
        FLD["served"]: [STATEWIDE] if town.lower() == "statewide" else [town],
    }
    for key, col in (("address","Address"), ("ages","Ages or Population Served"),
                     ("website","Website"), ("avail","Availability or Cost Notes")):
        if g(r, col): f[FLD[key]] = g(r, col)

    contact = " | ".join(x for x in [g(r,"Contact Name"), g(r,"Phone or Contact")] if x)
    if contact: f[FLD["contact"]] = contact

    if is_provider:
        sp = spaces_phrase(r)
        f[FLD["specific"]] = (f"State-funded Early Start CT provider ({g(r,'Provider Type')})"
                              + (f" -- {sp} funded spaces FY26" if sp else ""))
        f[FLD["cost"]] = "Reduced state-set fee for eligible families in a funded space."
    else:
        f[FLD["specific"]] = g(r, "Category")

    return {"fields": {k: v for k, v in f.items() if v not in (None, "", [])}}, None


def api(method, path="", body=None, params=None, token=""):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
        headers={"Authorization": f"Bearer {token}",
                 **({"Content-Type": "application/json"} if data else {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", "replace")[:400]
        if err.code in (401, 403):
            sys.exit(f"Airtable returned {err.code}. The token needs data.records:read "
                     f"and data.records:write on this base.\nNothing was written.\n{detail}")
        sys.exit(f"Airtable returned {err.code}: {detail}")


def existing_keys(token):
    """Every key already in the table, so a re-run is a no-op."""
    keys, offset = set(), None
    while True:
        params = {"pageSize": "100"}
        if offset: params["offset"] = offset
        page = api("GET", params=params, token=token)
        for rec in page.get("records", []):
            f = rec.get("fields", {})
            lic = norm(f.get("License or Registry ID", ""))
            keys.add(lic if lic else (norm(f.get("Resource Name", "")),
                                      norm(f.get("Town/Area (CT)", "")),
                                      norm(f.get("Address", ""))))
            keys.add(norm(f.get("Resource Name", "")))
        offset = page.get("offset")
        if not offset:
            return keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print the plan, write nothing")
    ap.add_argument("--status", default="Published",
                    help='Moderation Status to set (default: Published; use "Pending Review" to stage)')
    args = ap.parse_args()

    token = os.environ.get("AIRTABLE_IMPORT_TOKEN") or os.environ.get("AIRTABLE_TOKEN")
    if not token:
        sys.exit("Set AIRTABLE_IMPORT_TOKEN (preferred) or AIRTABLE_TOKEN. Refusing to run.")

    rows = list(csv.DictReader(open(CSV_PATH, newline="", encoding="utf-8-sig")))
    have = existing_keys(token)

    records, skipped, problems, seen = [], [], [], set()
    for r in rows:
        nm = norm(g(r, "Resource or Program Name"))
        key = (norm(g(r, "License or Registry ID"))
               or (nm, norm(g(r, "Town")), norm(g(r, "Address"))))
        if nm in have or key in have or key in seen:
            skipped.append(g(r, "Resource or Program Name")); continue
        seen.add(key)
        rec, err = to_record(r, args.status)
        if err:
            problems.append(err); continue
        cat = rec["fields"][FLD["category"]]
        if cat not in VALID_CATEGORIES:
            problems.append(f"invalid category {cat!r} for {g(r,'Resource or Program Name')}"); continue
        if rec["fields"][FLD["track"]] != "Family & Childcare":
            problems.append(f"invalid track for {g(r,'Resource or Program Name')}"); continue
        records.append(rec)

    print(f"rows in file      : {len(rows)}")
    print(f"already present   : {len(skipped)}")
    print(f"unmapped          : {len(problems)}")
    for p in problems: print(f"    ! {p}")
    print(f"to create         : {len(records)}  (Moderation Status = {args.status!r})")

    if problems:
        sys.exit("Refusing to run with unmapped rows. Fix the mapping first; nothing was written.")
    if args.dry_run:
        print("\n--dry-run: nothing written.")
        return
    if not records:
        print("Nothing to do.")
        return

    created = 0
    for i in range(0, len(records), 10):
        batch = records[i:i + 10]
        # typecast lets the 83 town names create their Towns Served options.
        # Category and Track were validated above, so it cannot invent one.
        resp = api("POST", body={"records": batch, "typecast": True}, token=token)
        created += len(resp.get("records", []))
        print(f"   created {created}/{len(records)}")
        time.sleep(0.25)          # stay under Airtable's 5 requests/second
    print(f"\nDone. Created {created} records.")


if __name__ == "__main__":
    main()
