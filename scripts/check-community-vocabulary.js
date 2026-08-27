#!/usr/bin/env node

/**
 * Guard against vocabulary drift in the community AI Airtable base.
 *
 * Most of this directory looks after itself: the facet lists are built from
 * whatever is in the data, so a new Airtable choice appears as a filter on its
 * own. Three things do not, and each fails silently rather than loudly:
 *
 *   1. Access Door. Three doors order the groups, colour the badges, and fill
 *      the "no application needed" figure in the hero. A fourth would render as
 *      an uncoloured group sorted last, and would be counted in none of it.
 *   2. Legal Status Required. "No 501(c)(3) required" counts two named options.
 *      Rename either in Airtable and the figure quietly drops, with nothing on
 *      the page to say it did.
 *   3. The fields the page reads by name. If an Airtable field is renamed, the
 *      fetch script's FIELDS map stops matching it and every record gets null
 *      for that key. The filter group empties, the detail row vanishes, and the
 *      page still renders perfectly -- just without whatever that field said.
 *
 * So this checks the freshly pulled snapshot against what the site actually
 * understands, and exits non-zero if it finds drift. It runs AFTER the
 * refreshed JSON has been committed, deliberately: none of the above is an
 * outage -- every opportunity still shows -- so it should never be a reason to
 * hold back a data refresh. The red run is the notification.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'community-ai', 'data', 'opportunities.json');
const SCRIPT = path.join(ROOT, 'community-ai', 'script.js');

const source = fs.readFileSync(SCRIPT, 'utf8');

/**
 * Pull a literal out of script.js by its variable name.
 *
 * The literal is evaluated rather than pattern-matched, so a value containing
 * an apostrophe reads correctly instead of silently truncating and reporting
 * everything after it as unrecognised. Both literals end on the same line they
 * start, so the match runs to the first `];`.
 */
function readLiteral(name) {
  const start = source.indexOf(`var ${name} = [`);
  if (start === -1) throw new Error(`could not find "var ${name} = [" in community-ai/script.js`);
  const open = source.indexOf('[', start);
  const end = source.indexOf('];', open);
  if (end === -1) throw new Error(`could not find the end of the ${name} literal`);

  const value = new Function('return ' + source.slice(open, end + 1))();
  // If the shape is not what we expect, the extraction is wrong and every value
  // would look unrecognised. Fail on that rather than cry wolf.
  if (!Array.isArray(value) || !value.length || !value.every(v => typeof v === 'string')) {
    throw new Error(`the ${name} literal in community-ai/script.js is not a list of strings`);
  }
  return value;
}

/**
 * The keys the page reads by name: every facet it filters on, plus the ones it
 * renders as a row of the detail panel. Read from script.js so this list can
 * never fall behind the page it is checking.
 */
function readKeys() {
  const keys = new Set();
  for (const [, block, pattern] of [
    ['FACETS', 'var FACETS = [', /key:\s*'([^']+)'/g],
    ['DETAIL_ROWS', 'var DETAIL_ROWS = [', /\[\s*'([^']+)'/g]
  ].map(([name, marker, re]) => {
    const start = source.indexOf(marker);
    if (start === -1) throw new Error(`could not find "${marker}" in community-ai/script.js`);
    const end = source.indexOf('\n  ];', start);
    if (end === -1) throw new Error(`could not find the end of the ${name} literal`);
    return [name, source.slice(start, end), re];
  })) {
    let match;
    while ((match = pattern.exec(block)) !== null) keys.add(match[1]);
  }
  if (keys.size < 20) throw new Error('read implausibly few keys from FACETS/DETAIL_ROWS');
  return [...keys];
}

/**
 * Tell a field that has gone quiet from one that has not arrived yet.
 *
 * A renamed Airtable field still leaves its key on every record, set to null by
 * the fetch script's normalize() -- that is the silent breakage worth failing
 * on. A key no record carries at all is a field the page reads but the snapshot
 * predates: the next sync fills it. Failing on that would turn every new field
 * into a red run for six hours, so it is reported as a note instead.
 */
function carriedBySomeRecord(rows, key) {
  return rows.some(row => Object.prototype.hasOwnProperty.call(row, key));
}

function isEmpty(value) {
  if (value == null || value === '') return true;
  return Array.isArray(value) && value.length === 0;
}

function tally(rows, key) {
  const counts = new Map();
  const examples = new Map();
  for (const row of rows) {
    const value = row[key];
    for (const v of Array.isArray(value) ? value : [value]) {
      if (isEmpty(v)) continue;
      counts.set(v, (counts.get(v) || 0) + 1);
      if (!examples.has(v)) examples.set(v, row.title || 'untitled opportunity');
    }
  }
  return { counts, examples };
}

function plural(n, one, many) { return n === 1 ? one : many; }

function report(label, unknown, counts, examples) {
  console.error(`\n${unknown.length} unrecognised ${label}:`);
  for (const value of unknown) {
    const n = counts.get(value);
    console.error(`  "${value}" -- ${n} ${plural(n, 'entry', 'entries')}, e.g. ${examples.get(value)}`);
  }
}

function main() {
  const { opportunities } = JSON.parse(fs.readFileSync(DATA, 'utf8'));

  const doors = tally(opportunities, 'door');
  const legal = tally(opportunities, 'legalStatus');

  const knownDoors = readLiteral('DOOR_ORDER');
  const knownLegal = readLiteral('LEGAL_KNOWN');

  const newDoors = [...doors.counts.keys()].filter(d => !knownDoors.includes(d)).sort();
  const newLegal = [...legal.counts.keys()].filter(l => !knownLegal.includes(l)).sort();

  // A key the page reads that no entry answers. Every one of them carries data
  // today, so this only goes red when a field stops arriving.
  const keys = readKeys();
  const unanswered = keys.filter(key => opportunities.every(row => isEmpty(row[key])));
  const goneQuiet = unanswered.filter(key => carriedBySomeRecord(opportunities, key)).sort();
  const notYetSynced = unanswered.filter(key => !carriedBySomeRecord(opportunities, key)).sort();

  if (notYetSynced.length) {
    console.log(`${notYetSynced.length} ${plural(notYetSynced.length, 'field the page reads is', 'fields the page reads are')} ` +
                `not in this snapshot yet; the next sync will fill ${plural(notYetSynced.length, 'it', 'them')}: ` +
                notYetSynced.join(', '));
  }

  if (!newDoors.length && !newLegal.length && !goneQuiet.length) {
    const answered = keys.length - notYetSynced.length;
    console.log(`Vocabulary clean: ${doors.counts.size} access ${plural(doors.counts.size, 'door', 'doors')}, ` +
                `${legal.counts.size} legal-status ${plural(legal.counts.size, 'option', 'options')}, ` +
                `and all ${answered} fields in this snapshot are answered by at least one entry.`);
    return;
  }

  console.error('The community AI base has drifted from what the site understands.');
  if (newDoors.length) report('access door', newDoors, doors.counts, doors.examples);
  if (newLegal.length) report('legal status', newLegal, legal.counts, legal.examples);
  if (goneQuiet.length) {
    console.error(`\n${goneQuiet.length} ${plural(goneQuiet.length, 'field the page reads is', 'fields the page reads are')} ` +
                  `empty for every entry:`);
    for (const key of goneQuiet) console.error(`  ${key}`);
  }

  console.error(`
The site is still fine -- every opportunity shows either way. This is about
whether the page keeps saying true things about them.

  a new access door    -> add it to DOOR_ORDER and DOOR_LABEL in
                          community-ai/script.js, and give it a badge colour in
                          community-ai/community-ai.css
  a new legal status   -> add it to LEGAL_KNOWN, and to LEGAL_OPEN as well if it
                          means an applicant does NOT need their own 501(c)(3)
  a second spelling    -> retag its records onto the existing option in
                          Airtable, then delete the duplicate option
  a field gone quiet   -> the Airtable field was probably renamed. Match the new
                          name in the FIELDS map in _tools/fetch-community-ai.py,
                          or drop the key from the page if the field is really
                          gone`);

  process.exitCode = 1;
}

main();
