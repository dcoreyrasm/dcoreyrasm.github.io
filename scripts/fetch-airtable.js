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
  'Notes/Tags':               'notes',

  // Added after the state import, when the base grew fields the page can
  // actually filter on. The first block drives filters; the rest is detail
  // shown on a card.
  'Registration Status':          'registrationStatus',
  'Care 4 Kids Accepted':         'care4Kids',
  'Financial Assistance Available':'financialAid',
  'Transportation Available':     'transportation',
  'Extended Care Available':      'extendedCare',
  'School-Day Coverage':          'schoolDayCoverage',
  'Services Offered':             'servicesOffered',
  'Languages Offered':            'languages',

  'Meals Provided':               'meals',
  'Days Offered':                 'daysOffered',
  'Schedule Window':              'scheduleWindow',
  'Program Length':               'programLength',
  'Typical Start Time':           'startTime',
  'Typical End Time':             'endTime',
  'Registration Opens':           'registrationOpens',
  'Registration Closes':          'registrationCloses',
  'Licensing / Exemption Status': 'licensing',
  'Residency Eligibility':        'residency',
  'Sibling Discount Available':   'siblingDiscount',
  'Inclusion / Accessibility Support': 'accessibility',
  'Refund / Cancellation Policy': 'refundPolicy',
  'Current Program Year':         'programYear',
  'Last Verified':                'lastVerified',

  // Pet Care & Resources. Animals Accepted is that track's Ages field -- the
  // first thing an owner checks, because a kennel that takes only dogs is no
  // use to someone with a rabbit. Intake Requirements is the second: whether
  // they can book at all, or need shots and an assessment first.
  'Animals Accepted':             'animals',
  'Pet Intake Requirements':      'petRequirements',

  // Teens & High School. Only two of these are new fields. Program Setting,
  // Camp & Program Topics and Teen Opportunity Type have been in the base for
  // weeks but never reached the page -- this is the first track that needs
  // them, and between them they answer public-vs-private, what a school
  // specialises in, and what a programme leads to, without inventing fields
  // that duplicate what is already there.
  'Grade Range':                  'gradeRange',
  'School District':              'schoolDistrict',
  'Program Setting':              'programSetting',
  'Camp & Program Topics':        'programTopics',
  'Teen Opportunity Type':        'teenOpportunity'
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
const LIST_KEYS = new Set(['townsServed', 'extendedCare', 'servicesOffered',
                           'languages', 'daysOffered', 'scheduleWindow',
                           'animals', 'petRequirements',
                           'programSetting', 'programTopics', 'teenOpportunity']);

function clean(value, key) {
  if (LIST_KEYS.has(key)) return Array.isArray(value) ? value : (value ? [value] : []);
  if (value == null) return null;
  if (typeof value === 'number') return value;
  // A scalar field that arrives as an array means its type changed in Airtable
  // -- Town/Area was turned from free text into a multi-select once, and the
  // default String([a,b]) rendering glued the values together as "a,b". Join
  // them properly so the card stays readable while the change is sorted out,
  // and say so, because a shape change should not pass in silence.
  if (Array.isArray(value)) {
    shapeChanges.add(key);
    const joined = value.map(v => String(v).trim()).filter(Boolean).join(', ');
    return joined === '' ? null : joined;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

// Fields the site reads as one value that came back as several. Collected
// across the whole pull so the warning is one line, not one per record.
const shapeChanges = new Set();

function toResource(record) {
  const fields = record.fields || {};
  const out = { id: record.id };

  for (const [airtableName, key] of Object.entries(FIELD_MAP)) {
    const value = clean(fields[airtableName], key);
    // Omit empties. Most of the added fields are blank on the imported state
    // rows, and `"key": null` repeated across 518 records is dead weight in a
    // file the browser downloads before it can draw anything. The page already
    // guards every read, so a missing key behaves exactly like an empty one.
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    out[key] = value;
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

// ::warning:: puts this on the run's summary page, where a green run's output
// otherwise goes unread. It does not fail the sync: the data is fine and
// should ship. check-vocabulary.js is what turns the run red.
function reportShapeChanges() {
  if (!shapeChanges.size) return;
  const fields = [...shapeChanges].sort().join(', ');
  console.log(`::warning::Fields the site reads as single values came back as lists: ${fields}. ` +
              'Their type changed in Airtable. Values were joined with a comma to keep the page readable.');
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
    reportShapeChanges();
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${payload.count} published ${payload.count === 1 ? 'listing' : 'listings'} to ${path.relative(process.cwd(), OUT_PATH)}.`);
  reportShapeChanges();
}

main().catch(err => {
  // Fail loudly and write nothing. A half-written or empty directory is worse
  // than a stale one, and the previous JSON stays live until this succeeds.
  console.error('Village Notes sync failed:', err.message);
  process.exit(1);
});
