#!/usr/bin/env node
/* ============================================================
   Village Notes — Airtable to static JSON.

   Pulls every Resources record whose Moderation Status is
   "Published" and rewrites village-notes/data/resources.json.

   This is the ONLY thing that ever sees the Airtable token. It runs
   in GitHub Actions, reads the token from the AIRTABLE_TOKEN secret
   at runtime, and writes a file that contains no credentials. The
   published site reads that file and nothing else, so the token is
   never in the repo and never reaches a visitor's browser.

   Usage:  AIRTABLE_TOKEN=pat... node scripts/fetch-airtable.js
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_ID  = 'appxUByKs5ULrDZQp';
const TABLE_ID = 'tbltzLo6IdBIfjkL7';
const PUBLISHED = 'Published';

const OUT_PATH = path.join(__dirname, '..', 'village-notes', 'data', 'resources.json');

// Airtable field name -> key emitted in resources.json. Verified against the
// live base schema; the frontend reads these keys and nothing else. The
// Moderation Status field is deliberately absent from the output: it is a
// filter, not something the public directory needs to carry.
const FIELD_MAP = {
  'Resource Name':            'name',
  'Track':                    'track',
  'Category':                 'category',
  'Specific Type or Notes':   'specificType',
  'Town/Area (CT)':           'town',
  'Address':                  'address',
  'Ages or Population Served':'ages',
  'Hours/Schedule':           'hours',
  'Availability/Wait Notes':  'availability',
  'Cost Notes':               'cost',
  'Website':                  'website',
  'Contact Info':             'contact',
  'Towns Served':             'townsServed',
  'Rating':                   'rating',
  'Submitted By':             'submittedBy',
  'Date Submitted':           'dateSubmitted',
  'Notes/Tags':               'notes'
};

const TOKEN = process.env.AIRTABLE_TOKEN;
if (!TOKEN) {
  console.error('AIRTABLE_TOKEN is not set. Refusing to run.');
  process.exit(1);
}

/* ---------- fetch ---------- */

async function fetchPage(offset) {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
  // Server-side filter: unpublished rows never leave Airtable, so a record
  // still under review cannot end up in a committed file by accident.
  url.searchParams.set('filterByFormula', `{Moderation Status} = "${PUBLISHED}"`);
  url.searchParams.set('pageSize', '100');
  if (offset) url.searchParams.set('offset', offset);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Airtable responded ${res.status} ${res.statusText}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

async function fetchAllRecords() {
  const records = [];
  let offset;

  do {
    const page = await fetchPage(offset);
    records.push(...(page.records || []));
    offset = page.offset;
  } while (offset);

  return records;
}

/* ---------- shape ---------- */

// Airtable omits empty fields entirely, so a multi-select with nothing chosen
// arrives as undefined rather than []. The page expects these keys to always be
// arrays, so they are normalised here rather than guarded at every use site.
const LIST_KEYS = new Set(['townsServed']);

function clean(value, key) {
  if (LIST_KEYS.has(key)) return Array.isArray(value) ? value : (value ? [value] : []);
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  return text === '' ? null : text;
}

function toResource(record) {
  const fields = record.fields || {};
  const out = { id: record.id };

  for (const [airtableName, key] of Object.entries(FIELD_MAP)) {
    out[key] = clean(fields[airtableName], key);
  }
  return out;
}

/* ---------- write ---------- */

function build(resources) {
  const byName = (a, b) => String(a || '').localeCompare(String(b || ''));
  const distinct = key => [...new Set(resources.flatMap(r => r[key]).filter(Boolean))].sort(byName);

  return {
    generated: new Date().toISOString(),
    source: {
      base: BASE_ID,
      table: TABLE_ID,
      filter: `Moderation Status = "${PUBLISHED}"`
    },
    count: resources.length,
    tracks: distinct('track'),
    categories: distinct('category'),
    // Union of base towns and served towns, so the filter offers every town a
    // family might search for, not just the ones providers are located in.
    towns: [...new Set([...distinct('town'), ...distinct('townsServed')])].sort(byName),
    resources: resources.sort((a, b) => byName(a.name, b.name))
  };
}

async function main() {
  const records = await fetchAllRecords();
  const resources = records.map(toResource);
  const payload = build(resources);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  // `generated` changes on every run, so comparing the whole file would
  // produce a commit every six hours even when nothing moved. Compare the
  // listings themselves and keep the existing timestamp when they match.
  let previous = null;
  try {
    previous = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch (err) {
    // No readable file yet (first run, or it was hand-edited into something
    // invalid). Either way, write a fresh one.
  }

  if (previous && JSON.stringify(previous.resources) === JSON.stringify(payload.resources)) {
    console.log(`No change: ${payload.count} published ${payload.count === 1 ? 'listing' : 'listings'}.`);
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${payload.count} published ${payload.count === 1 ? 'listing' : 'listings'} to ${path.relative(process.cwd(), OUT_PATH)}.`);
}

main().catch(err => {
  // Fail loudly and write nothing. A half-written or empty directory is worse
  // than a stale one, and the previous JSON stays live until this succeeds.
  console.error('Village Notes sync failed:', err.message);
  process.exit(1);
});
