#!/usr/bin/env node
/* ============================================================
   Village Notes — Airtable to static JSON.

   Pulls every publishable Resources record and rewrites
   village-notes/data/resources.json.

   Publishable means one of two things:
     - Moderation Status is "Published"; or
     - Submitted By is "Village Notes Research" AND Source Type is set,
       and the record is not Flagged or Removed.

   The second clause exists because research records are pre-reviewed by
   definition -- Darice runs the research, so its output is her editorial
   act. Relying on the researcher to remember to set a status did not work:
   four consecutive days produced records left Pending, invisible until
   somebody went looking. Moderation Status is now the FORM's gate, not
   research's.

   Source Type is required for the second clause, and that is the whole
   security of it: the public form does not collect Source Type, so a
   submission cannot satisfy this branch whatever it types into Submitted
   By -- including the literal words "Village Notes Research". It doubles
   as a quality gate: a research record citing no source stays off the
   site, and the run names it.

   Flagged and Removed still beat both clauses, so they remain the way to
   pull a bad research record off the site.

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
const RESEARCH  = 'Village Notes Research';

// Joined into one line for the query string, written in parts so the shape
// stays readable. Airtable treats a blank single select as "".
const PUBLISHABLE = [
  'OR(',
    `{Moderation Status} = "${PUBLISHED}"`, ',',
    'AND(',
      `{Submitted By} = "${RESEARCH}"`, ',',
      '{Source Type} != ""', ',',
      '{Moderation Status} != "Flagged"', ',',
      '{Moderation Status} != "Removed"',
    ')',
  ')'
].join('');

// Research records the filter holds back for the one reason that is probably
// an oversight rather than a decision: no Source Type. Flagged and Removed
// are deliberate, so they are not reported.
const HELD_BACK = [
  'AND(',
    `{Submitted By} = "${RESEARCH}"`, ',',
    '{Source Type} = ""', ',',
    `{Moderation Status} != "${PUBLISHED}"`, ',',
    '{Moderation Status} != "Flagged"', ',',
    '{Moderation Status} != "Removed"',
  ')'
].join('');

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
  'Teen Opportunity Type':        'teenOpportunity',

  // Disability and accessibility. Inclusion / Accessibility Support has been in
  // the map since the state import but never reached the page; Specialized
  // Support Type is new here. Together with the Disability Support and
  // Special-Needs Pet Care services they are what the accessibility filter
  // reads, and they cut across all four tracks -- an adaptive camp, an agency
  // on aging, and a disability employment programme are each at home in their
  // own track and findable together through these.
  'Specialized Support Type':     'specializedSupport',

  // One dated, announced event -- an open house, tour, information session,
  // webinar, registration night. Two fields rather than one sentence, because
  // the date is what lets the card hide the event once it has happened. A
  // directory that advertises last March's open house is worse than one that
  // advertises nothing, and nobody was ever going to sweep these by hand.
  'Upcoming Event':               'event',
  'Event Date':                   'eventDate'
};

const TOKEN = process.env.AIRTABLE_TOKEN;
if (!TOKEN) {
  console.error('AIRTABLE_TOKEN is not set. Refusing to run.');
  process.exit(1);
}

/* ---------- fetch ---------- */

async function fetchPage(offset, formula, fields) {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
  // Server-side filter: anything not publishable never leaves Airtable, so a
  // form submission still awaiting review cannot reach a committed file by
  // accident.
  url.searchParams.set('filterByFormula', formula || PUBLISHABLE);
  url.searchParams.set('pageSize', '100');
  (fields || []).forEach(f => url.searchParams.append('fields[]', f));
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
    const page = await fetchPage(offset, PUBLISHABLE);
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
                           'programSetting', 'programTopics', 'teenOpportunity',
                           'specializedSupport']);

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
      filter: PUBLISHABLE
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

// A research record with no Source Type is the one case the publishable
// filter holds back that nobody chose. Before this, such a record simply did
// not appear and nothing said so -- which is how thirty-two accumulated. Name
// them, so a silent queue cannot build again.
async function reportHeldBack() {
  let held = [];
  let offset;
  try {
    do {
      const page = await fetchPage(offset, HELD_BACK, ['Resource Name']);
      held.push(...(page.records || []).map(r => (r.fields || {})['Resource Name'] || r.id));
      offset = page.offset;
    } while (offset);
  } catch (err) {
    // This is a diagnostic, not the job. A directory that synced fine should
    // not go red because the follow-up query did not.
    console.log(`::warning::Could not check for held-back research records: ${err.message}`);
    return;
  }
  if (!held.length) return;
  console.log(`::warning::${held.length} research ${held.length === 1 ? 'record is' : 'records are'} ` +
              'off the site for want of a Source Type: ' + held.sort().join('; ') +
              '. Set Source Type and they publish on the next run.');
}

// Events are the one field on the card that goes wrong by sitting still: an
// open house is useful for a fortnight and misleading forever after. The page
// hides an expired one on its own, so nothing wrong ever reaches a visitor --
// but hidden is not fixed, and a listing whose only event has passed has
// quietly lost a row. So the run says which ones to refresh, and which have
// text with no date, the shape the page cannot show at all.
function reportEvents(resources) {
  const today = new Date().toISOString().slice(0, 10);
  const expired = resources
    .filter(r => r.eventDate && r.eventDate < today)
    .map(r => `${r.name} (${r.eventDate})`)
    .sort();
  const undated = resources
    .filter(r => r.event && !r.eventDate)
    .map(r => r.name)
    .sort();

  if (expired.length) {
    console.log(`::warning::${expired.length} ${expired.length === 1 ? 'listing has an event' : 'listings have events'} ` +
                'whose date has passed, now hidden on the site: ' + expired.join('; ') +
                '. Replace with the next announced date, or clear both fields.');
  }
  if (undated.length) {
    console.log(`::warning::${undated.length} ${undated.length === 1 ? 'listing has' : 'listings have'} ` +
                'an Upcoming Event with no Event Date, so the site cannot show it: ' + undated.join('; ') +
                '. An event with no date cannot expire, so it is held back until one is set.');
  }
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
    reportEvents(resources);
    await reportHeldBack();
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${payload.count} published ${payload.count === 1 ? 'listing' : 'listings'} to ${path.relative(process.cwd(), OUT_PATH)}.`);
  reportShapeChanges();
  reportEvents(resources);
  await reportHeldBack();
}

main().catch(err => {
  // Fail loudly and write nothing. A half-written or empty directory is worse
  // than a stale one, and the previous JSON stays live until this succeeds.
  console.error('Village Notes sync failed:', err.message);
  process.exit(1);
});
