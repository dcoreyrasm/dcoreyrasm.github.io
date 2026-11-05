#!/usr/bin/env python3
"""Refresh community-ai/data/opportunities.json from Airtable.

The community AI directory (/community-ai/) reads a static JSON snapshot rather
than calling Airtable from the browser, because the site is public and a browser
call would mean shipping an Airtable token to every visitor. This script is how
that snapshot gets rebuilt.

Usage:
    export AIRTABLE_TOKEN=pat...          # a personal access token with data.records:read
    python3 _tools/fetch-community-ai.py

Then commit the changed JSON. Nothing else needs to change: the page derives its
filter options from whatever is in the data, so new Airtable choices appear on
their own.

Get a token at https://airtable.com/create/tokens — scope it to
data.records:read on this one base and nothing else.
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_ID = "apptzwHFsoWzjKOmV"
TABLE_ID = "tblAfYqyIzTYhAQ7q"
OUT = Path(__file__).resolve().parent.parent / "community-ai" / "data" / "opportunities.json"

# Airtable field name -> key used in the JSON and by community-ai/script.js.
# Add a row here to publish a new field; the page shows it if DETAIL_ROWS in
# that file lists the key, and filters on it if FACETS does.
FIELDS = {
    "Opportunity Title": "title",
    "Organization": "org",
    "Opportunity Type": "type",
    "Access Door": "door",
    "Status": "status",
    "Opportunity Description": "description",
    "Who Can Apply": "whoCanApply",
    "Eligibility Summary": "eligibility",
    "Best Fit For": "bestFit",
    "Max Funding Amount": "maxFunding",
    "Funding Details": "fundingDetails",
    "Cost Structure": "cost",
    "Cost After Credits Expire": "costAfterCredits",
    "After Free Support Ends": "afterSupportEnds",
    "Application Deadline": "deadline",
    "Current Cycle": "cycle",
    "Geographic Scope": "geo",
    "Connecticut Relevance": "ctRelevance",
    "Travel or Location Requirement": "travel",
    "Legal Status Required": "legalStatus",
    "Readiness Level": "readiness",
    "Technical Staff Required": "techStaff",
    "Local Partner Required": "localPartner",
    "Community Input Required": "communityInput",
    "Beginner Friendly": "beginnerFriendly",
    "One-on-One Help Available": "oneOnOne",
    "Train-the-Trainer Available": "trainTrainer",
    "Internet or Device Needed": "internetDevice",
    "Sensitive Information Guidance": "sensitiveInfo",
    "Platform Lock-In Risk": "lockIn",
    "Concern or Gap": "concern",
    "Recommended Next Step": "nextStep",
    "Notes": "notes",
    "Official Program URL": "url",
    "Last Checked": "lastChecked",
    "Who Can Participate": "whoCanParticipate",
    "Audience Stage": "audienceStage",
    "Community Served": "communityServed",
    "Age Group": "ageGroup",
    "Delivery Format": "deliveryFormat",
    "Community Topics": "topics",
    "Industry Categories": "industries",
    "Fellowship Program": "fellowship",
    "Watch Next Cycle": "watchNextCycle",
    "Support Available": "support",
    "Languages Available": "languages",
    "Accessibility Features": "accessibility",
    "Existing Account Benefit": "accountBenefit",
    "States Available": "states",
    # Added 2026-11-05 for the Scholarships & Fellowships directory. The same
    # record feeds every page it is published to; see PUBLISH_TO below.
    "Publish To": "publishTo",
    "Applicant Stage": "applicantStage",
    "Field of Study": "fieldOfStudy",
    "Application Opens": "opens",
    "Recommendation Deadline": "recDeadline",
    "Annual Award Amount": "annualAmount",
    "Program Family Key": "programKey",
}

# Keys the page always expects to be a list, even when Airtable returns nothing.
LIST_KEYS = {
    "whoCanParticipate", "audienceStage", "communityServed", "ageGroup",
    "deliveryFormat", "topics", "support", "languages", "accessibility",
    "accountBenefit", "industries", "states",
    "publishTo", "applicantStage", "fieldOfStudy",
}

# The Scholarships & Fellowships page and the Village Notes feature read their
# own snapshot, built from the same pull, so one Airtable record is maintained
# once and appears wherever its Publish To field says.
SCHOLAR_OUT = Path(__file__).resolve().parent.parent / "scholarships-fellowships" / "data" / "opportunities.json"
PAGE_COMMUNITY = "Community AI"
PAGE_SCHOLAR = "Scholarships & Fellowships"
PAGE_VILLAGE = "Village Notes"


def fetch_all(token):
    records, offset = [], None
    while True:
        params = {"pageSize": "100"}
        if offset:
            params["offset"] = offset
        url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                payload = json.load(resp)
        except urllib.error.HTTPError as err:
            body = err.read().decode("utf-8", "replace")[:400]
            sys.exit(f"Airtable returned HTTP {err.code}: {body}")
        records.extend(payload.get("records", []))
        offset = payload.get("offset")
        if not offset:
            return records


def normalize(record):
    fields = record.get("fields", {})
    out = {"id": record["id"]}

    # When the row first appeared in the base, which the page uses to mark an
    # entry as recently added. Airtable returns this on every record without a
    # field having to exist for it, so nothing in the base has to be maintained
    # by hand -- and unlike a hand-kept "date added" it cannot be forgotten.
    created = record.get("createdTime") or ""
    out["added"] = created[:10] or None

    for airtable_name, key in FIELDS.items():
        value = fields.get(airtable_name)
        if key in LIST_KEYS:
            out[key] = list(value) if isinstance(value, list) else ([value] if value else [])
        elif isinstance(value, str):
            value = value.strip()
            out[key] = value or None
        else:
            out[key] = value if value is not None else None
    return out


HELD_PREFIXES = ("duplicate", "out of scope")


def is_held(status):
    """True when research has marked the record as not for publication."""
    text = (status or "").strip().lower()
    return text.startswith(HELD_PREFIXES) or "hold from publication" in text


def on_community_ai(row):
    """Blank Publish To means Community AI, which is every record created
    before the field existed. A record published only to other pages (a
    nursing scholarship, say) stays off the AI directory."""
    pages = row.get("publishTo") or []
    return not pages or PAGE_COMMUNITY in pages


def write_snapshot(path, rows, key, source, note):
    """Write rows under `key`, keeping the stamp stable on a no-op run."""
    previous = {}
    if path.exists():
        try:
            previous = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            previous = {}
    unchanged = previous.get(key) == rows
    generated = previous.get("meta", {}).get("generated") if unchanged else None
    if not generated:
        from datetime import date
        generated = date.today().isoformat()
    payload = {
        "meta": {
            "source": source,
            "baseId": BASE_ID,
            "tableId": TABLE_ID,
            "generated": generated,
            "count": len(rows),
            "note": note,
        },
        key: rows,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
                    encoding="utf-8")
    print(f"{'No changes; ' if unchanged else ''}wrote {len(rows)} records to {path}")


def main():
    token = os.environ.get("AIRTABLE_TOKEN") or os.environ.get("AIRTABLE_API_KEY")
    if not token:
        sys.exit("Set AIRTABLE_TOKEN to an Airtable personal access token and re-run.")

    rows = [normalize(r) for r in fetch_all(token)]
    rows = [r for r in rows if r.get("title")]

    # Status is free text, but research marks records it has deliberately
    # ruled out by how the status starts: "Duplicate - ..." for a record a
    # better one supersedes, "Out of Scope - ..." for one a United States
    # participant cannot use (the directory's scope since 2026-10-31; it was
    # Connecticut before that). Those stay in Airtable as history and are
    # kept off the page. "Closed - Watch Next Cycle" is NOT held: a closed
    # program that will run again is still worth knowing about.
    held = [r for r in rows if is_held(r.get("status"))]
    rows = [r for r in rows if not is_held(r.get("status"))]
    if held:
        print(f"Held back {len(held)} duplicate or out-of-scope "
              f"{'record' if len(held) == 1 else 'records'}: "
              + "; ".join(r["title"] for r in held))
    rows.sort(key=lambda r: ((r.get("org") or "").lower(), (r.get("title") or "").lower()))

    scholar_rows = [r for r in rows
                    if PAGE_SCHOLAR in (r.get("publishTo") or [])
                    or PAGE_VILLAGE in (r.get("publishTo") or [])]
    rows = [r for r in rows if on_community_ai(r)]

    write_snapshot(OUT, rows, "opportunities",
                   "Airtable — AI Support & Opportunities for Communities",
                   "Generated by _tools/fetch-community-ai.py. Do not hand-edit; "
                   "edit the Airtable base and re-run the script.")
    write_snapshot(SCHOLAR_OUT, scholar_rows, "opportunities",
                   "Airtable — AI Support & Opportunities for Communities "
                   "(records whose Publish To includes Scholarships & Fellowships or Village Notes)",
                   "Generated by _tools/fetch-community-ai.py from the same pull as the "
                   "Community AI directory. Do not hand-edit; edit the Airtable record's "
                   "Publish To field and re-run the script.")


if __name__ == "__main__":
    main()
