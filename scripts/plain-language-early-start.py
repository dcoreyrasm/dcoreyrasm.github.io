#!/usr/bin/env python3
"""Rewrite the Early Start CT template description in plain language.

427 listings came in from the state's Early Start CT file with one line of
description, built by import-early-start-ct.py:

    State-funded Early Start CT provider (Child Care Center) -- 17 infant/toddler
    and 18 preschool funded spaces FY26

That line is accurate but written for the people who run the program. "FY26"
and "funded spaces" mean nothing to a parent, and the slashes and shorthand
are also what machine translation handles worst -- this directory is offered
in seven languages. This rewrites it to:

    A child care center in Early Start CT, Connecticut's state-funded child
    care program. For 2025-26, the state funds 17 infant and toddler spots and
    18 preschool spots here. These are funded spots, not current openings.

Nothing is added that the original line does not say. FY26 is Connecticut's
2025-26 state fiscal year (July 1, 2025 to June 30, 2026).

Only a description that still matches the import template EXACTLY is touched,
so any line somebody has already edited by hand is left alone. Safe to re-run:
a rewritten line no longer matches the template.

Usage:
    AIRTABLE_TOKEN=pat... python3 scripts/plain-language-early-start.py --dry-run
    AIRTABLE_TOKEN=pat... python3 scripts/plain-language-early-start.py
"""

import argparse, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

BASE_ID  = "appxUByKs5ULrDZQp"
TABLE_ID = "tbltzLo6IdBIfjkL7"
API = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"
SPECIFIC = "fldbIll3ZVhDzQUO7"   # Specific Type or Notes
NAME     = "fldhaAie6ZWEBNSnr"   # Resource Name

TEMPLATE = re.compile(
    r"^State-funded Early Start CT provider \(([^)]+)\)"
    r"(?: -- (.+) funded spaces FY26)?$")

KIND = {
    "Child Care Center": "A child care center",
    "Family Home":       "A family child care home",
    "Public School":     "A public school program",
    "Group Home":        "A group child care home",
}

AGE = {
    "infant/toddler": "infant and toddler",
    "preschool":      "preschool",
    "school-age":     "school-age",
}


def spots(phrase):
    """'17 infant/toddler and 18 preschool' -> '17 infant and toddler spots and 18 preschool spots'."""
    parts = []
    for bit in phrase.split(" and "):
        m = re.match(r"^(\d+) (infant/toddler|preschool|school-age)$", bit.strip())
        if not m:
            return None
        n, age = int(m.group(1)), AGE[m.group(2)]
        parts.append(f"{n} {age} {'spot' if n == 1 else 'spots'}")
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def plain(text):
    """The plain-language line, or None if the text is not the import template."""
    m = TEMPLATE.match((text or "").strip())
    if not m:
        return None
    kind = KIND.get(m.group(1))
    if not kind:
        return None
    line = f"{kind} in Early Start CT, Connecticut's state-funded child care program."
    if m.group(2):
        s = spots(m.group(2))
        if s is None:
            return None
        line += (f" For 2025–26, the state funds {s} here."
                 " These are funded spots, not current openings.")
    return line


def api(method, url, token, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(30)
                continue
            raise SystemExit(f"Airtable {e.code}: {e.read().decode()[:400]}")


def fetch(token):
    out, offset = [], None
    formula = 'FIND("State-funded Early Start CT provider", {Specific Type or Notes}) = 1'
    while True:
        q = {"filterByFormula": formula, "pageSize": "100", "returnFieldsByFieldId": "true",
             "fields[]": [SPECIFIC, NAME]}
        if offset:
            q["offset"] = offset
        page = api("GET", API + "?" + urllib.parse.urlencode(q, doseq=True), token)
        out += page.get("records", [])
        offset = page.get("offset")
        if not offset:
            return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=15, help="examples to print (0 = all)")
    args = ap.parse_args()

    token = os.environ.get("AIRTABLE_TOKEN")
    if not token:
        sys.exit("AIRTABLE_TOKEN is not set.")

    # The rules first: a wrong rewrite would reach hundreds of listings at once.
    assert plain("State-funded Early Start CT provider (Child Care Center) -- 17 infant/toddler and 18 preschool funded spaces FY26") == (
        "A child care center in Early Start CT, Connecticut's state-funded child care program. "
        "For 2025–26, the state funds 17 infant and toddler spots and 18 preschool spots here. "
        "These are funded spots, not current openings.")
    assert plain("State-funded Early Start CT provider (Family Home) -- 1 school-age funded spaces FY26").endswith(
        "funds 1 school-age spot here. These are funded spots, not current openings.")
    assert plain("State-funded Early Start CT provider (Public School)") == (
        "A public school program in Early Start CT, Connecticut's state-funded child care program.")
    assert plain("State-funded Early Start CT provider (Mystery Type) -- 3 preschool funded spaces FY26") is None
    assert plain("Edited by hand: State-funded Early Start CT provider (Family Home)") is None

    records = fetch(token)
    plan, skipped = [], []
    for r in records:
        old = r["fields"].get(SPECIFIC, "")
        new = plain(old)
        if new is None:
            skipped.append((r["fields"].get(NAME, r["id"]), old))
        else:
            plan.append({"id": r["id"], "fields": {SPECIFIC: new}, "_old": old,
                         "_name": r["fields"].get(NAME, r["id"])})

    print(f"{len(records)} records start with the template; {len(plan)} to rewrite; "
          f"{len(skipped)} left alone because they no longer match it exactly.")
    for p in plan[: (args.limit or len(plan))]:
        print(f"\n{p['_name']}\n  was: {p['_old']}\n  now: {p['fields'][SPECIFIC]}")
    for name, old in skipped:
        print(f"::notice::left alone: {name}: {old}")

    if args.dry_run:
        print("\nDry run: nothing written.")
        return

    for i in range(0, len(plan), 10):
        batch = [{"id": p["id"], "fields": p["fields"]} for p in plan[i:i + 10]]
        api("PATCH", API, token, {"records": batch})
        time.sleep(0.25)
    print(f"\nRewrote {len(plan)} descriptions.")


if __name__ == "__main__":
    main()
