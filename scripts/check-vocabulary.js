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

// Track is the audience, and there are two audiences. Unlike Category, the
// page builds its Track dropdown straight from the data, so there is no list
// in script.js to read -- the expectation lives here instead.
const KNOWN_TRACKS = ['Family & Childcare', 'Elder Care'];

/**
 * Pull the category map out of script.js.
 *
 * The literal is evaluated rather than pattern-matched, so a category
 * containing an apostrophe -- "Children's Program" -- reads correctly instead
 * of silently truncating and reporting every category after it as unmapped.
 */
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

function main() {
  const mapped = readGroups();
  const { resources } = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  const cats = tally(resources, 'category');
  const tracks = tally(resources, 'track');

  const newCats = [...cats.counts.keys()].filter(c => !mapped.has(c)).sort();
  const newTracks = [...tracks.counts.keys()].filter(t => !KNOWN_TRACKS.includes(t)).sort();

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

  a real new kind    -> add it to GROUPS in village-notes/script.js, in the
                        group a parent would look for it under
  a second spelling  -> retag its listings onto the existing option in
                        Airtable, then delete the duplicate option

scripts/airtable-option-audit.md has the last pass over this, and
scripts/chatgpt-instructions.md is the standard meant to stop it recurring.`);

  process.exitCode = 1;
}

main();
