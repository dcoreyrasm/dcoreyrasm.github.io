#!/usr/bin/env node

/**
 * Guard against vocabulary drift in the Airtable base.
 *
 * Two people now write to the Resources table -- Darice, and a scheduled
 * ChatGPT search -- and Airtable silently creates a select option when it is
 * sent a value it does not recognise. That is how a third Track appeared and
 * how four camp categories ended up with second spellings: nobody saw it
 * happen, and it was only caught by eye, days later.
 *
 * So this checks the freshly pulled directory against what the site actually
 * understands, and exits non-zero if it finds something new. It runs AFTER the
 * refreshed JSON has been committed, deliberately: an unrecognised category is
 * a quality problem, not an outage -- the page groups it under "Other" and
 * every listing still shows -- so it should never be a reason to hold back a
 * data refresh. The red run is the notification.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'village-notes', 'data', 'resources.json');
const SCRIPT = path.join(ROOT, 'village-notes', 'script.js');
const SYNC = path.join(ROOT, 'scripts', 'fetch-airtable.js');

const BASE_ID = 'appxUByKs5ULrDZQp';
const TABLE_ID = 'tbltzLo6IdBIfjkL7';

// Airtable types that hold several values at once. The sync reads a field as
// either one value or a list, and which one is not a detail the page can shrug
// off: Town/Area was turned from free text into a multi-select without anyone
// asking, and the values started arriving glued together.
const MULTI = new Set(['multipleSelects', 'multipleRecordLinks', 'multipleCollaborators',
                       'multipleAttachments', 'multipleLookupValues']);

// Read from script.js rather than repeated here. When the page had no track
// list of its own this file was the only place the expectation was written
// down; now that the dropdown declares one, two copies would drift, and the
// copy that drifts is the one nobody edits.

/**
 * Pull the category map out of script.js.
 *
 * The literal is evaluated rather than pattern-matched, so a category
 * containing an apostrophe -- "Children's Program" -- reads correctly instead
 * of silently truncating and reporting every category after it as unmapped.
 */
/** The declared track list. A flat array of strings, so a single ] ends it. */
function readTracks() {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  const match = source.match(/var TRACKS = (\[[^\]]*\]);/);
  if (!match) throw new Error('could not find the TRACKS literal in script.js');
  const tracks = new Function('return ' + match[1])();
  if (!Array.isArray(tracks) || !tracks.length || !tracks.every(t => typeof t === 'string')) {
    throw new Error('the TRACKS literal in script.js is not a list of strings');
  }
  return tracks;
}

function readGroups() {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  const start = source.indexOf('var GROUPS = [');
  if (start === -1) throw new Error('could not find "var GROUPS = [" in script.js');

  const open = source.indexOf('[', start);
  const end = source.indexOf('\n  ];', open);
  if (end === -1) throw new Error('could not find the end of the GROUPS literal in script.js');

  const groups = new Function('return ' + source.slice(open, end + 4))();

  // If the shape is not what we expect, the extraction is wrong and every
  // category would look unmapped. Fail on that rather than cry wolf.
  const shaped = Array.isArray(groups) && groups.length >= 10 && groups.every(
    g => Array.isArray(g) && typeof g[0] === 'string' && Array.isArray(g[1])
  );
  if (!shaped) throw new Error('the GROUPS literal in script.js is not the expected shape');

  return new Set(groups.flatMap(g => g[1]));
}

/**
 * What the sync expects of each Airtable field: the site key it becomes, and
 * whether it holds one value or several. Both are declared in fetch-airtable.js
 * already, so they are read from there rather than written down twice.
 */
function readExpectedShapes() {
  const source = fs.readFileSync(SYNC, 'utf8');

  const mapStart = source.indexOf('const FIELD_MAP = {');
  const mapEnd = source.indexOf('\n};', mapStart);
  if (mapStart === -1 || mapEnd === -1) throw new Error('could not find FIELD_MAP in fetch-airtable.js');
  const fieldMap = new Function('return ' + source.slice(source.indexOf('{', mapStart), mapEnd + 2))();

  const listMatch = source.match(/const LIST_KEYS = new Set\((\[[\s\S]*?\])\);/);
  if (!listMatch) throw new Error('could not find LIST_KEYS in fetch-airtable.js');
  const listKeys = new Set(new Function('return ' + listMatch[1])());

  return Object.entries(fieldMap).map(([name, key]) => ({ name, key, list: listKeys.has(key) }));
}

/**
 * Field name -> Airtable type, or a reason the check could not run.
 *
 * Reading the schema needs schema.bases:read, which this token has never
 * carried -- the same 403 that stopped a Category option being renamed months
 * ago. So this degrades rather than failing: a missing permission is not a
 * reason to redden a run over a check that is additional to the vocabulary
 * one. It does mean the check is inert until the scope is added, which is why
 * the message says so instead of just saying "skipped".
 */
async function airtableFields() {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return { skipped: 'no AIRTABLE_TOKEN, so this only runs in Actions' };

  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    return { skipped: 'the token cannot read the schema (403). Add schema.bases:read ' +
                      'to it -- read-only, and this check does nothing without it' };
  }
  if (!res.ok) return { skipped: `Airtable returned ${res.status} for the schema` };

  const body = await res.json();
  const table = (body.tables || []).find(t => t.id === TABLE_ID);
  if (!table) throw new Error(`table ${TABLE_ID} is not in the base schema`);
  return { fields: new Map(table.fields.map(f => [f.name, f.type])) };
}

function checkShapes(expected, actual) {
  const missing = [], wrong = [];
  for (const { name, key, list } of expected) {
    const type = actual.get(name);
    if (!type) { missing.push(name); continue; }
    if (MULTI.has(type) !== list) {
      wrong.push({ name, key, type, wanted: list ? 'several values' : 'one value' });
    }
  }
  return { missing, wrong };
}

function tally(resources, key) {
  const counts = new Map();
  const examples = new Map();
  for (const r of resources) {
    const value = r[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
    if (!examples.has(value)) examples.set(value, r.name || 'untitled listing');
  }
  return { counts, examples };
}

function plural(n, one, many) { return n === 1 ? one : many; }

function report(unknown, singular, many, counts, examples) {
  console.error(`\n${unknown.length} unrecognised ${plural(unknown.length, singular, many)}:`);
  for (const value of unknown) {
    const n = counts.get(value);
    console.error(`  "${value}" -- ${n} ${plural(n, 'listing', 'listings')}, ` +
                  `e.g. ${examples.get(value)}`);
  }
}

async function main() {
  const { fields, skipped } = await airtableFields();
  if (skipped) {
    console.log(`Field-shape check skipped: ${skipped}.`);
  } else {
    const { missing, wrong } = checkShapes(readExpectedShapes(), fields);
    if (missing.length || wrong.length) {
      console.error('Airtable fields no longer match what the sync expects.\n');
      for (const name of missing) {
        console.error(`  "${name}" is gone, or was renamed. The sync reads it by name, so it now reads nothing.`);
      }
      for (const w of wrong) {
        console.error(`  "${w.name}" is a ${w.type}; the sync reads it as ${w.wanted}.`);
      }
      console.error(`
A field's type is not a detail the page can absorb. Changing one silently
changes every listing at once, which is why this fails rather than warns.

Put the field back to the type the sync expects, or -- if the new type is the
right call -- change fetch-airtable.js to match, and the card and filters with
it. Do not leave the two disagreeing.
`);
      process.exitCode = 1;
    } else {
      console.log(`Field shapes match: ${readExpectedShapes().length} fields as the sync expects them.`);
    }
  }

  const knownTracks = readTracks();
  const mapped = readGroups();
  const { resources } = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  const cats = tally(resources, 'category');
  const tracks = tally(resources, 'track');

  const newCats = [...cats.counts.keys()].filter(c => !mapped.has(c)).sort();
  const newTracks = [...tracks.counts.keys()].filter(t => !knownTracks.includes(t)).sort();

  if (!newCats.length && !newTracks.length) {
    console.log(`Vocabulary clean: ${cats.counts.size} categories and ` +
                `${tracks.counts.size} tracks, all recognised.`);
    return;
  }

  console.error('Airtable is using values the site does not recognise.');
  if (newTracks.length) report(newTracks, 'track', 'tracks', tracks.counts, tracks.examples);
  if (newCats.length) report(newCats, 'category', 'categories', cats.counts, cats.examples);

  console.error(`
The site is still fine -- listings show either way, categories it does not know
group under "Other", and the track filter offers whatever it finds. This is
about whether the directory stays easy to search.

Each one is either a real new kind of resource or a second spelling of
something that already exists. Check which, then:

  a real new track    -> add it to TRACKS in village-notes/script.js
  a real new category -> add it to GROUPS in village-notes/script.js, in the
                         group a parent would look for it under
  a second spelling   -> retag its listings onto the existing option in
                         Airtable, then delete the duplicate option

scripts/airtable-option-audit.md has the last pass over this, and
scripts/chatgpt-instructions.md is the standard meant to stop it recurring.`);

  process.exitCode = 1;
}

main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
