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
    "Support Available": "support",
    "Languages Available": "languages",
    "Accessibility Features": "accessibility",
    "Existing Account Benefit": "accountBenefit",
}

# Keys the page always expects to be a list, even when Airtable returns nothing.
LIST_KEYS = {
    "whoCanParticipate", "audienceStage", "communityServed", "ageGroup",
    "deliveryFormat", "topics", "support", "languages", "accessibility",
    "accountBenefit",
}


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


def main():
    token = os.environ.get("AIRTABLE_TOKEN") or os.environ.get("AIRTABLE_API_KEY")
    if not token:
        sys.exit("Set AIRTABLE_TOKEN to an Airtable personal access token and re-run.")

    rows = [normalize(r) for r in fetch_all(token)]
    rows = [r for r in rows if r.get("title")]
    rows.sort(key=lambda r: ((r.get("org") or "").lower(), (r.get("title") or "").lower()))

    # Keep the stamp stable when nothing changed, so a no-op run leaves no diff.
    previous = {}
    if OUT.exists():
        try:
            previous = json.loads(OUT.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            previous = {}

    unchanged = previous.get("opportunities") == rows
    generated = previous.get("meta", {}).get("generated") if unchanged else None
    if not generated:
        from datetime import date
        generated = date.today().isoformat()

    payload = {
        "meta": {
            "source": "Airtable — AI Support & Opportunities for Communities",
            "baseId": BASE_ID,
            "tableId": TABLE_ID,
            "generated": generated,
            "count": len(rows),
            "note": "Generated by _tools/fetch-community-ai.py. Do not hand-edit; "
                    "edit the Airtable base and re-run the script.",
        },
        "opportunities": rows,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    print(f"{'No changes; ' if unchanged else ''}wrote {len(rows)} opportunities to {OUT}")


if __name__ == "__main__":
    main()
