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
 * The 24 industry categories, flattened out of the grouped literal.
 *
 * INDUSTRY_GROUPS is the only place the five sections exist -- Airtable
 * multi-selects have no groups to read them from -- so it is also the only
 * thing that can quietly stop matching the base. Reading it here means the
 * check can never fall behind the list it is checking.
 */
function readIndustryGroups() {
  const marker = 'var INDUSTRY_GROUPS = [';
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`could not find "${marker}" in community-ai/script.js`);
  const open = source.indexOf('[', start);
  const end = source.indexOf('\n  ];', open);
  if (end === -1) throw new Error('could not find the end of the INDUSTRY_GROUPS literal');

  const groups = new Function('return ' + source.slice(open, end + 4))();
  const ok = Array.isArray(groups) && groups.length &&
    groups.every(g => g && typeof g.label === 'string' && Array.isArray(g.options) &&
                      g.options.length && g.options.every(o => typeof o === 'string'));
  if (!ok) throw new Error('the INDUSTRY_GROUPS literal in community-ai/script.js is not a list of {label, options}');

  const flat = groups.flatMap(g => g.options);
  const duplicated = flat.filter((v, i) => flat.indexOf(v) !== i);
  if (duplicated.length) {
    throw new Error(`INDUSTRY_GROUPS lists the same category in two sections: ${[...new Set(duplicated)].join(', ')}`);
  }
  return flat;
}

/**
 * Fields that are published and deliberately not filled in yet.
 *
 * carriedBySomeRecord() below tells a renamed field from one the snapshot
 * predates, which covers every field this base had until Industry Categories
 * arrived. That field is a third case the two could not express: it exists in
 * Airtable with all 24 of its options, the sync publishes it, and every record
 * carries it as an empty list because nothing has been classified yet. Without
 * this, the first sync after adding any new field turns the run red for a
 * reason nobody can act on.
 *
 * An entry here is a promise that the emptiness is known, not a way to quiet
 * the check: the moment a key listed here DOES carry data the run fails asking
 * for the entry to be removed, so an exemption cannot outlive its reason and
 * go on hiding a real disappearance.
 */
const EXPECTED_EMPTY = new Map([
  ['industries',
   'Industry Categories is in the base with all 24 options, but no record ' +
   'carries one yet. The filter stays hidden until the first is classified.'],
]);

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
  const industry = tally(opportunities, 'industries');

  const knownDoors = readLiteral('DOOR_ORDER');
  const knownLegal = readLiteral('LEGAL_KNOWN');
  const knownIndustries = readIndustryGroups();

  const newDoors = [...doors.counts.keys()].filter(d => !knownDoors.includes(d)).sort();
  const newLegal = [...legal.counts.keys()].filter(l => !knownLegal.includes(l)).sort();

  // An industry on a record that no section lists. The filter still offers it,
  // under "Other", so this is drift to tidy rather than anything broken.
  const newIndustries = [...industry.counts.keys()].filter(i => !knownIndustries.includes(i)).sort();

  // A key the page reads that no entry answers. Every one of them carries data
  // today, so this only goes red when a field stops arriving.
  const keys = readKeys();
  const unanswered = keys.filter(key => opportunities.every(row => isEmpty(row[key])));
  const knownEmpty = unanswered.filter(key => EXPECTED_EMPTY.has(key)).sort();
  const goneQuiet = unanswered.filter(key => carriedBySomeRecord(opportunities, key) &&
                                             !EXPECTED_EMPTY.has(key)).sort();
  const notYetSynced = unanswered.filter(key => !carriedBySomeRecord(opportunities, key) &&
                                                !EXPECTED_EMPTY.has(key)).sort();

  // An exemption that has outlived its reason. Left in place it would go on
  // swallowing a real disappearance of this field, so it fails loudly instead.
  const staleExemptions = [...EXPECTED_EMPTY.keys()]
    .filter(key => keys.includes(key) && !unanswered.includes(key)).sort();

  if (notYetSynced.length) {
    console.log(`${notYetSynced.length} ${plural(notYetSynced.length, 'field the page reads is', 'fields the page reads are')} ` +
                `not in this snapshot yet; the next sync will fill ${plural(notYetSynced.length, 'it', 'them')}: ` +
                notYetSynced.join(', '));
  }

  if (knownEmpty.length) {
    console.log(`${knownEmpty.length} ${plural(knownEmpty.length, 'field is', 'fields are')} ` +
                `published but not filled in yet, which is expected:`);
    for (const key of knownEmpty) console.log(`  ${key} -- ${EXPECTED_EMPTY.get(key)}`);
  }

  if (!newDoors.length && !newLegal.length && !newIndustries.length &&
      !goneQuiet.length && !staleExemptions.length) {
    const answered = keys.length - notYetSynced.length - knownEmpty.length;
    console.log(`Vocabulary clean: ${doors.counts.size} access ${plural(doors.counts.size, 'door', 'doors')}, ` +
                `${legal.counts.size} legal-status ${plural(legal.counts.size, 'option', 'options')}, ` +
                `${industry.counts.size} of ${knownIndustries.length} industry categories in use, ` +
                `and all ${answered} fields in this snapshot are answered by at least one entry.`);
    return;
  }

  console.error('The community AI base has drifted from what the site understands.');
  if (newDoors.length) report('access door', newDoors, doors.counts, doors.examples);
  if (newLegal.length) report('legal status', newLegal, legal.counts, legal.examples);
  if (newIndustries.length) report('industry category', newIndustries, industry.counts, industry.examples);
  if (goneQuiet.length) {
    console.error(`\n${goneQuiet.length} ${plural(goneQuiet.length, 'field the page reads is', 'fields the page reads are')} ` +
                  `empty for every entry:`);
    for (const key of goneQuiet) console.error(`  ${key}`);
  }
  if (staleExemptions.length) {
    console.error(`\n${staleExemptions.length} ${plural(staleExemptions.length, 'field is', 'fields are')} ` +
                  `listed in EXPECTED_EMPTY but now ${plural(staleExemptions.length, 'carries', 'carry')} data:`);
    for (const key of staleExemptions) console.error(`  ${key}`);
  }

  console.error(`
The site is still fine -- every opportunity shows either way. This is about
whether the page keeps saying true things about them.

  a new access door    -> add it to DOOR_ORDER and DOOR_LABEL in
                          community-ai/script.js, and give it a badge colour in
                          community-ai/community-ai.css
  a new legal status   -> add it to LEGAL_KNOWN, and to LEGAL_OPEN as well if it
                          means an applicant does NOT need their own 501(c)(3)
  a new industry       -> add it to INDUSTRY_GROUPS in community-ai/script.js,
                          under the section it belongs to. Until then the
                          filter shows it under "Other" rather than losing it
  a second spelling    -> retag its records onto the existing option in
                          Airtable, then delete the duplicate option
  a stale exemption    -> the field is filled in now, so delete its entry from
                          EXPECTED_EMPTY in this file. Leaving it there would
                          hide the field really going quiet later
  a field gone quiet   -> the Airtable field was probably renamed. Match the new
                          name in the FIELDS map in _tools/fetch-community-ai.py,
                          or drop the key from the page if the field is really
                          gone`);

  process.exitCode = 1;
}

main();
