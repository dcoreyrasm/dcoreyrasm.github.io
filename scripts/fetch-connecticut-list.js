#!/usr/bin/env node
/* ============================================================
   Darice's Connecticut List — Airtable to static JSON.

   Pulls every publishable "Things to Do" record from the Connecticut
   Passport base and rewrites connecticut-list/data/experiences.json.

   This is the ONLY thing that ever sees the Airtable token. It runs in
   GitHub Actions, reads the token from a repository secret at runtime,
   and writes a file that contains no credentials. The published site
   reads that file and nothing else, so the token is never in the repo
   and never reaches a visitor's browser. Exactly the arrangement
   Village Notes already uses -- same guarantee, second directory.

   The site is read-only by construction: nothing here writes, creates,
   renames or deletes anything in Airtable, and no request this file
   makes carries typecast.

   Usage:
     AIRTABLE_ACCESS_TOKEN=pat... node scripts/fetch-connecticut-list.js
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

/* ---------- configuration ----------

   Base and table are the Connecticut Passport base and its "Things to
   Do" table. They are overridable by environment variable so the IDs
   can move without a code change, but they default to the live ones so
   a local run needs only a token.

   The private "Mya & Victor's Connecticut Passport" base is a different
   base entirely and is never referenced here. */

const TOKEN = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_TOKEN;
const BASE_ID  = process.env.AIRTABLE_CONNECTICUT_BASE_ID  || 'appaCjeN9ZaJXVTV6';
const TABLE_ID = process.env.AIRTABLE_CONNECTICUT_TABLE_ID || 'tblOeQoBxHTZGs0uZ';

const OUT_PATH = path.join(__dirname, '..', 'connecticut-list', 'data', 'experiences.json');

/* ---------- the publication rule ----------

   One place, deliberately. "Verified" means somebody checked the source;
   it does not mean the record is ready for the public web, and the two
   states are not allowed to collapse into one here. A record reaches the
   site only when an editorial status says so AND the source has been
   checked.

   Records in "New Suggestion", "Needs Review", "Keep for Later" or
   "Not a Fit" stay off the site however complete they look. That is the
   default the governance asks for: protect anything still in review.

   If the base later grows an explicit "Public" checkbox, this is the
   single constant that changes -- no front-end work, because the site
   only ever sees records that already passed through here. */

const PUBLISHED_STATUSES = ['📘 Published', '⭐ Featured'];

const PUBLISHABLE = [
  'AND(',
    'OR(', PUBLISHED_STATUSES.map(s => `{Status} = "${s}"`).join(','), ')', ',',
    '{Verified}',
  ')'
].join('');

// Verified records held in a review state. Not an error -- it is the queue
// the publication rule is there to hold -- but it is reported on every run so
// a page that looks empty is never a mystery.
const AWAITING_REVIEW = [
  'AND(',
    '{Verified}', ',',
    'NOT(', 'OR(', PUBLISHED_STATUSES.map(s => `{Status} = "${s}"`).join(','), ')', ')',
  ')'
].join('');

/* ---------- the adapter ----------

   Airtable field name -> key on the normalized experience. The front end
   reads these keys and nothing else, so an Airtable field can be renamed
   by changing one line here rather than by touching the page.

   Only these fields are ever requested from the API. Verification Notes,
   in particular, is not in this map and not in the fields[] list below,
   so the internal research commentary is never fetched at all -- it
   cannot leak from a file that never received it. */

const FIELD_MAP = {
  'Place / Experience': 'name',
  'Town':               'town',
  'Region':             'region',
  // Two fields whose Airtable names read backwards from what the public
  // page calls them, confirmed against the live schema on 5 September 2026:
  //
  //   "Original Category" holds the browse taxonomy -- Hiking & Outdoors,
  //   Waterfront, Museum & Culture, Food & Treats -- which is what the site
  //   presents as Experience Type.
  //
  //   "Experience Type" holds the finer categories -- Waterfalls, Free /
  //   Low-Cost, Easy Walks, Scenic Views -- which is what the site presents
  //   as Categories.
  //
  // The site shows each one under the label its values actually describe.
  // Nothing is renamed in Airtable: this is a read-side mapping, and the
  // swap is worth fixing at the source eventually.
  'Original Category':  'experienceTypes',
  'Experience Type':    'categories',
  'Best For':           'audiences',
  'Best Time to Visit': 'bestTime',
  'Why Go':             'whyGo',
  'Official Website':   'officialWebsite',
  'Address':            'address',
  // Displayed as "Try This". The Airtable field name is a leftover from the
  // private project this data started in and is never shown to a visitor.
  'Passport Challenge': 'tryThis',
  'Notes':              'notes',
  'Date Added':         'dateAdded',

  // Read for the publication rule and for run reporting. Stripped before
  // anything is written to disk -- see toPublic() below.
  'Status':             'status',
  'Verified':           'verified'
};

// Keys the public JSON must never carry. The rule is enforced in one place so
// adding a field to the map above cannot quietly publish an internal one.
const INTERNAL_KEYS = new Set(['status', 'verified']);

// Fields that arrive as lists. Airtable omits an empty multi-select entirely
// rather than sending [], so these are normalized here and the page can treat
// them as always-arrays.
const LIST_KEYS = new Set(['experienceTypes', 'categories', 'audiences']);

/* ---------- display-title normalization ----------

   Some records were written for the private couples project this data began
   as, and their names end in a bare "Date": "Niantic Bay Boardwalk Sunset +
   Main Street Date". A public visitor should not be reading the private
   project's vocabulary, so the suffix is cleaned for display only. The
   Airtable record is never touched by this script.

   Two things are deliberately left alone:

     "Date Night" -- a real class and event name that venues use themselves
     (Studio Andreas Ceramic Date Night, Dirty Date Night Pottery). Removing
     it would rename somebody's programme.

     "Couples" -- describes the format of a booking (a couples cooking class,
     a couples spa room), not a private person.

   Dropping a trailing "Date" leaves most names complete. A handful end on a
   word that needs a noun after it -- "...Free Campus Art", "...Sunday" --
   and those take "Visit" instead. The list is short and explicit rather than
   guessed at from parts of speech: a wrong guess renames a real place. */

const NEEDS_NOUN = new Set(['art', 'gallery', 'campus', 'mill-building',
                            'sunday', 'saturday', 'friday']);

function displayName(name) {
  if (!name) return name;
  const trimmed = String(name).trim();
  // Only a trailing, standalone "Date". "Date Night" ends in "Night", so it
  // never matches, and an interior "Date" is left where it is.
  if (!/\sDate$/.test(trimmed)) return trimmed;
  const stem = trimmed.replace(/\sDate$/, '').trim();
  const last = (stem.split(/\s+/).pop() || '').toLowerCase().replace(/[^\w-]/g, '');
  return NEEDS_NOUN.has(last) ? stem + ' Visit' : stem;
}

/* ---------- slugs ---------- */

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/['\u2018\u2019]/g, '')   // apostrophes join rather than break words
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'experience';
}

/* ---------- value cleaning ---------- */

// Emoji prefixes on the browse taxonomy ("🥾 Hiking & Outdoors"). Kept out of
// the published values so a filter chip, a URL parameter and a search term all
// read as plain words. Display concern only: nothing is written back.
function stripLeadingEmoji(value) {
  return String(value).replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

const shapeChanges = new Set();

function clean(value, key) {
  if (LIST_KEYS.has(key)) {
    const list = Array.isArray(value) ? value : (value == null || value === '' ? [] : [value]);
    return list.map(v => stripLeadingEmoji(typeof v === 'string' ? v : String(v)))
               .filter(v => v !== '');
  }
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value;
  // A scalar field that arrives as a list means its type changed in Airtable.
  // Join it so the page stays readable, and say so on the run rather than
  // letting a silent shape change render as "a,b".
  if (Array.isArray(value)) {
    shapeChanges.add(key);
    const joined = value.map(v => String(v).trim()).filter(Boolean).join(', ');
    return joined === '' ? null : joined;
  }
  const text = String(value).trim();
  return text === '' ? null : text;
}

// Official links only, cleaned of tracking. A URL that is not http(s) is
// dropped rather than published: the page would refuse to render it anyway,
// and a broken link that looks official is worse than none.
const badUrls = new Set();

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|igshid$|ref$|ref_src$|_ga$|s_kwcid$|msclkid$)/i;

function cleanUrl(value) {
  if (!value) return null;
  let parsed;
  try {
    parsed = new URL(String(value).trim());
  } catch (err) {
    badUrls.add(String(value).trim());
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    badUrls.add(parsed.href);
    return null;
  }
  // Strip marketing and analytics parameters, keep the ones that identify the
  // page itself -- a course catalogue that addresses a class by ?ScheduleID
  // loses the visitor's destination if the query string is thrown away.
  [...parsed.searchParams.keys()].forEach(k => {
    if (TRACKING_PARAMS.test(k)) parsed.searchParams.delete(k);
  });
  parsed.hash = '';
  return parsed.href;
}

/* ---------- fetch ---------- */

if (!TOKEN) {
  console.error('AIRTABLE_ACCESS_TOKEN is not set. Refusing to run.');
  process.exit(1);
}

// Only the mapped Airtable fields are requested. Anything else in the table --
// Verification Notes, Source, and any internal field added later -- is never
// transferred.
const REQUESTED_FIELDS = Object.keys(FIELD_MAP);

async function fetchPage(offset, formula, fields) {
  const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
  // Server-side filter: a record that is not publishable never leaves
  // Airtable, so a record still in review cannot reach a committed file
  // by accident.
  url.searchParams.set('filterByFormula', formula);
  url.searchParams.set('pageSize', '100');
  (fields || REQUESTED_FIELDS).forEach(f => url.searchParams.append('fields[]', f));
  if (offset) url.searchParams.set('offset', offset);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Airtable responded ${res.status} ${res.statusText}: ${body.slice(0, 400)}`);
  }
  return res.json();
}

// One request per hundred records, not one per record. At the current 225
// this is three calls; several thousand would be a few dozen, on a schedule,
// with the site reading a flat file either way.
async function fetchAll(formula, fields) {
  const records = [];
  let offset;
  do {
    const page = await fetchPage(offset, formula, fields);
    records.push(...(page.records || []));
    offset = page.offset;
  } while (offset);
  return records;
}

/* ---------- shape ---------- */

function toExperience(record) {
  const fields = record.fields || {};
  const out = { id: record.id };

  for (const [airtableName, key] of Object.entries(FIELD_MAP)) {
    const value = clean(fields[airtableName], key);
    if (value === null || (Array.isArray(value) && value.length === 0)) continue;
    out[key] = value;
  }

  out.name = displayName(out.name) || 'Untitled';
  out.officialWebsite = cleanUrl(out.officialWebsite) || undefined;
  if (out.officialWebsite === undefined) delete out.officialWebsite;
  return out;
}

// The boundary between what the adapter knows and what the world sees.
// Airtable record IDs are internal, and so are the two moderation fields the
// publication rule reads, so none of them is written to a public file.
function toPublic(experience) {
  const out = {};
  for (const [key, value] of Object.entries(experience)) {
    if (key === 'id' || INTERNAL_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

// Slugs are the public identity of a record: they are what a shared link
// carries. Derived from the displayed name so the URL reads like the page,
// and disambiguated by town, then by a counter, so two places with the same
// name keep distinct addresses.
function assignSlugs(experiences) {
  const used = new Map();
  experiences.forEach(e => {
    let slug = slugify(e.name);
    if (used.has(slug) && e.town) slug = slugify(`${e.name} ${e.town}`);
    let candidate = slug;
    let n = 2;
    while (used.has(candidate)) candidate = `${slug}-${n++}`;
    used.set(candidate, true);
    e.slug = candidate;
  });
}

/* ---------- write ---------- */

function build(experiences) {
  const byName = (a, b) => String(a || '').localeCompare(String(b || ''));
  const distinct = key => [...new Set(experiences.flatMap(e => e[key]).filter(Boolean))].sort(byName);

  // No `source` block. Village Notes publishes one, but this file is governed
  // by a rule that keeps moderation language and Airtable identifiers off the
  // public web, and the publication formula is both. Where the data came from
  // is recorded on every sync run and in scripts/connecticut-list-governance.md,
  // which is where somebody would actually look for it.
  return {
    generated: new Date().toISOString(),
    count: experiences.length,
    // Filter options come from the data that is actually published, so a
    // visitor is never offered a choice that returns nothing, and a new
    // Airtable option appears in the filters without a code change.
    regions:         distinct('region'),
    towns:           distinct('town'),
    experienceTypes: distinct('experienceTypes'),
    categories:      distinct('categories'),
    audiences:       distinct('audiences'),
    seasons:         distinct('bestTime'),
    experiences: experiences.map(toPublic)
  };
}

/* ---------- run reporting ----------

   ::warning:: puts these on the run's summary page. None of them fails the
   sync: the data that came back is fine and should ship. They exist so a
   quality problem is noticed on the run rather than by eye, weeks later. */

function reportShapeChanges() {
  if (!shapeChanges.size) return;
  console.log(`::warning::Fields the site reads as single values came back as lists: ` +
              `${[...shapeChanges].sort().join(', ')}. Their type changed in Airtable. ` +
              'Values were joined with a comma to keep the page readable.');
}

function reportBadUrls() {
  if (!badUrls.size) return;
  console.log(`::warning::${badUrls.size} Official Website ` +
              `${badUrls.size === 1 ? 'value is' : 'values are'} not a usable http(s) link ` +
              `and were dropped: ${[...badUrls].sort().join('; ')}.`);
}

// Names still carrying the private project's wording. The page cleans them for
// display, but a cleaned title is a patch over the record, not a fix to it, so
// each run says which ones are still worth renaming at the source.
function reportTitleCleanups(raw) {
  const cleaned = raw
    .filter(r => displayName((r.fields || {})['Place / Experience']) !==
                 String((r.fields || {})['Place / Experience'] || '').trim())
    .map(r => (r.fields || {})['Place / Experience'])
    .sort();
  if (!cleaned.length) return;
  console.log(`::warning::${cleaned.length} published ${cleaned.length === 1 ? 'record still ends' : 'records still end'} ` +
              'in the private project\'s "Date" wording and are being cleaned for display only: ' +
              cleaned.join('; ') + '. Worth renaming in Airtable so the record and the page agree.');
}

// Fields a card and a detail view are built around. A published record missing
// all of them is a name and a link, which is thin but not wrong -- so this
// counts rather than blocks.
function reportThinRecords(experiences) {
  const thin = experiences.filter(e => !e.whyGo).length;
  const noRegion = experiences.filter(e => !e.region).length;
  if (thin) {
    console.log(`::warning::${thin} of ${experiences.length} published ` +
                `${thin === 1 ? 'record has' : 'records have'} no Why Go text, so their cards ` +
                'lead with a name and a town only.');
  }
  if (noRegion) {
    console.log(`::warning::${noRegion} of ${experiences.length} published ` +
                `${noRegion === 1 ? 'record has' : 'records have'} no Region, so they cannot be ` +
                'found through the region filter.');
  }
}

// The queue the publication rule holds back. Verified, so the source has been
// checked, but not yet moved to a published status. Named on every run so an
// empty or short page is explained by the run rather than investigated.
async function reportAwaitingReview() {
  let held;
  try {
    held = await fetchAll(AWAITING_REVIEW, ['Place / Experience']);
  } catch (err) {
    // A diagnostic, not the job. A sync that worked should not go red because
    // the follow-up query did not.
    console.log(`::warning::Could not check for records awaiting review: ${err.message}`);
    return;
  }
  if (!held.length) return;
  const names = held.map(r => (r.fields || {})['Place / Experience'] || r.id).sort();
  const shown = names.slice(0, 25);
  console.log(`::warning::${held.length} verified ${held.length === 1 ? 'record is' : 'records are'} ` +
              'waiting on an editorial status and are not on the site: ' + shown.join('; ') +
              (names.length > shown.length ? `; and ${names.length - shown.length} more` : '') +
              '. Set Status to "📘 Published" or "⭐ Featured" and they appear on the next run.');
}

async function main() {
  const raw = await fetchAll(PUBLISHABLE);
  const experiences = raw.map(toExperience)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  assignSlugs(experiences);

  const payload = build(experiences);

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  // `generated` changes on every run, so comparing whole files would produce a
  // commit every six hours even when nothing moved. Compare the listings and
  // keep the existing timestamp when they match.
  let previous = null;
  try {
    previous = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
  } catch (err) {
    // No readable file yet, or it was hand-edited into something invalid.
    // Either way, write a fresh one.
  }

  const unchanged = previous &&
    JSON.stringify(previous.experiences) === JSON.stringify(payload.experiences);

  if (unchanged) {
    console.log(`No change: ${payload.count} published ` +
                `${payload.count === 1 ? 'activity' : 'activities'}.`);
  } else {
    fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log(`Wrote ${payload.count} published ` +
                `${payload.count === 1 ? 'activity' : 'activities'} to ` +
                path.relative(process.cwd(), OUT_PATH) + '.');
  }

  if (!payload.count) {
    console.log('::warning::No records match the publication rule, so the page will show its ' +
                'empty state. This is the rule working, not a failure: a record reaches the ' +
                'site only when Status is "📘 Published" or "⭐ Featured" and Verified is ticked.');
  }

  reportShapeChanges();
  reportBadUrls();
  reportTitleCleanups(raw);
  reportThinRecords(experiences);
  await reportAwaitingReview();
}

main().catch(err => {
  // Fail loudly and write nothing. A half-written or empty file is worse than
  // a stale one, and the previous JSON stays live until this succeeds.
  console.error("Connecticut List sync failed:", err.message);
  process.exit(1);
});
