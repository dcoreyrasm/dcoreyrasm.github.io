#!/usr/bin/env python3
"""Remove the retired "Children & Youth" choice from the Track field.

Temporary. The Airtable connector cannot edit select choices, so this does it
through the schema API instead, and is deleted once it has run.

Refuses to run unless the choice is genuinely unused. Airtable's field-update
endpoint treats `choices` as the complete list, so omitting one removes it --
and removing a choice that records still hold would clear those cells.
"""
import json, os, sys, urllib.error, urllib.parse, urllib.request

BASE  = "appxUByKs5ULrDZQp"
TABLE = "tbltzLo6IdBIfjkL7"
FIELD = "fldoN4wD1g4tYEFPo"          # Track
DROP  = "Children & Youth"

token = os.environ.get("AIRTABLE_TOKEN")
if not token:
    sys.exit("AIRTABLE_TOKEN is not set. Refusing to run.")
auth = {"Authorization": f"Bearer {token}"}


def call(url, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = dict(auth)
    if data:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:400]
        if e.code in (401, 403):
            sys.exit(f"Airtable returned {e.code}. The token needs schema.bases:read and "
                     f"schema.bases:write on this base.\nNothing was changed.\n{detail}")
        sys.exit(f"Airtable returned {e.code}: {detail}")


# 1. Nobody may still be using it.
q = urllib.parse.urlencode({
    "filterByFormula": f'{{Track}} = "{DROP}"', "pageSize": "1", "fields[]": "Track"})
still = call(f"https://api.airtable.com/v0/{BASE}/{TABLE}?{q}").get("records", [])
if still:
    sys.exit(f"{len(still)}+ records still use {DROP!r}. Move them first; nothing was changed.")
print(f"No records use {DROP!r}.")

# 2. Read the live choices rather than trusting a hardcoded list.
meta = call(f"https://api.airtable.com/v0/meta/bases/{BASE}/tables")
table = next(t for t in meta["tables"] if t["id"] == TABLE)
field = next(f for f in table["fields"] if f["id"] == FIELD)
choices = field["options"]["choices"]
print(f'Field "{field["name"]}" has {len(choices)} choices: {[c["name"] for c in choices]}')

if not any(c["name"] == DROP for c in choices):
    print(f"{DROP!r} is already gone. Nothing to do.")
    raise SystemExit(0)

keep = [{"id": c["id"], "name": c["name"]} for c in choices if c["name"] != DROP]
print(f"Keeping {len(keep)}: {[c['name'] for c in keep]}")

# 3. Send the full remaining list back; the omitted one is what gets removed.
updated = call(f"https://api.airtable.com/v0/meta/bases/{BASE}/tables/{TABLE}/fields/{FIELD}",
               method="PATCH", body={"options": {"choices": keep}})
print(json.dumps(updated, indent=2))
print(f'\nDone. Track now has {len(updated["options"]["choices"])} choices.')
