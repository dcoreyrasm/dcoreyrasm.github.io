#!/usr/bin/env node
/**
 * Guard against schema and vocabulary drift in the Connecticut Passport base.
 *
 * Airtable silently creates a select option when it is sent a value it does
 * not recognise, and it silently changes a field's shape when somebody
 * converts a text field into a multi-select. Neither is visible from the site:
 * the page keeps rendering, slightly wrong, until somebody notices by eye.
 *
 * So this reads the live schema and the freshly pulled JSON and exits non-zero
 * when it finds something the site does not understand. It runs AFTER the
 * refreshed JSON has been committed, deliberately: drift is a quality problem,
 * not an outage, so it should never hold back a data refresh. The red run is
 * the notification.
 *
 * It reads. It never writes, and it never creates or alters an option to make
 * anything line up.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_TOKEN;
const BASE_ID  = process.env.AIRTABLE_CONNECTICUT_BASE_ID  || 'appaCjeN9ZaJXVTV6';
const TABLE_ID = process.env.AIRTABLE_CONNECTICUT_TABLE_ID || 'tblOeQoBxHTZGs0uZ';

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'connecticut-list', 'data', 'experiences.json');
const SYNC = path.join(ROOT, 'scripts', 'fetch-connecticut-list.js');

// What the sync reads each field as. A field that changes shape underneath
// this is the failure that is hardest to see from the page: a single select
// turned multi arrives as a list and renders glued together.
const EXPECTED_TYPES = {
  'Place / Experience': ['singleLineText'],
  'Town':               ['singleLineText'],
  'Region':             ['singleSelect'],
  'Original Category':  ['multipleSelects'],
  'Experience Type':    ['multipleSelects'],
  'Best For':           ['multipleSelects'],
  'Best Time to Visit': ['singleSelect'],
  'Why Go':             ['multilineText', 'singleLineText', 'richText'],
  'Official Website':   ['url'],
  'Address':            ['singleLineText'],
  'Passport Challenge': ['multilineText', 'singleLineText', 'richText'],
  'Notes':              ['multilineText', 'singleLineText', 'richText'],
  'Date Added':         ['date', 'dateTime', 'createdTime'],
  'Status':             ['singleSelect'],
  'Verified':           ['checkbox'],
  'Event Start Date':   ['date', 'dateTime'],
  'Event End Date':     ['date', 'dateTime'],
  'Age Suitability':    ['multipleSelects']
};

// The age vocabulary the page orders and styles. A new option still appears on
// the page, at the end of the row, but it is reported here so a coined
// near-duplicate -- "Adults (21+)" beside "Adults only (21+)" -- is caught the
// way the audience list already catches one.
const AGES = ['All ages', 'Little kids (0-5)', 'Kids (6-12)', 'Teens',
              'Adults only (18+)', 'Adults only (21+)'];

// The only audience values the public page treats as valid, per the
// governance. A new one appearing in the base is a decision somebody made
// without the page knowing, so it is reported rather than quietly rendered.
const AUDIENCES = ['Group Activities', 'Date Night', 'Family', 'Individual Exploration'];

// Read from the sync rather than repeated here, so the two cannot drift.
function publishedStatuses() {
  const source = fs.readFileSync(SYNC, 'utf8');
  const match = source.match(/const PUBLISHED_STATUSES = (\[[^\]]*\]);/);
  if (!match) throw new Error('could not find the PUBLISHED_STATUSES literal in fetch-connecticut-list.js');
  const values = new Function('return ' + match[1])();
  if (!Array.isArray(values) || !values.length) {
    throw new Error('the PUBLISHED_STATUSES literal is not a non-empty list');
  }
  return values;
}

async function fetchSchema() {
  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Airtable responded ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const table = (json.tables || []).find(t => t.id === TABLE_ID);
  if (!table) throw new Error(`table ${TABLE_ID} not found in base ${BASE_ID}`);
  return table;
}

function main() {
  if (!TOKEN) {
    console.error('AIRTABLE_ACCESS_TOKEN is not set. Refusing to run.');
    process.exit(1);
  }

  const problems = [];

  return fetchSchema().then(table => {
    const byName = new Map(table.fields.map(f => [f.name, f]));
    const statuses = publishedStatuses();

    // 1. Every field the sync reads still exists, with the shape it expects.
    for (const [name, types] of Object.entries(EXPECTED_TYPES)) {
      const field = byName.get(name);
      if (!field) {
        problems.push(`Field "${name}" is gone from the table. The sync reads it by name, ` +
                      'so it is now always empty.');
        continue;
      }
      if (!types.includes(field.type)) {
        problems.push(`Field "${name}" is now type "${field.type}"; the sync reads it as ` +
                      `${types.join(' or ')}.`);
      }
    }

    // 2. The publication rule still names statuses that exist. A renamed
    //    option would silently unpublish the whole page.
    const status = byName.get('Status');
    if (status && status.options && status.options.choices) {
      const live = status.options.choices.map(c => c.name);
      statuses.forEach(s => {
        if (!live.includes(s)) {
          problems.push(`The publication rule looks for Status "${s}", which no longer exists ` +
                        `in the base. Live options: ${live.join(', ')}.`);
        }
      });
    }

    // 3. Audience values the governance did not authorise.
    const bestFor = byName.get('Best For');
    if (bestFor && bestFor.options && bestFor.options.choices) {
      bestFor.options.choices
        .map(c => c.name)
        .filter(name => !AUDIENCES.includes(name))
        .forEach(name => {
          problems.push(`"Best For" has an option the public page does not recognise: ` +
                        `"${name}". The four agreed audiences are ${AUDIENCES.join(', ')}.`);
        });
    }

    // 4. Age vocabulary, same reasoning as the audience list above.
    const ageField = byName.get('Age Suitability');
    if (ageField && ageField.options && ageField.options.choices) {
      ageField.options.choices
        .map(c => c.name)
        .filter(name => !AGES.includes(name))
        .forEach(name => {
          problems.push(`"Age Suitability" has an option the page does not recognise: ` +
                        `"${name}". The agreed values are ${AGES.join(', ')}.`);
        });
    }

    // 5. The committed JSON carries nothing internal. Cheap, and it is the
    //    check that matters most: this file is downloaded by every visitor.
    let data = null;
    try {
      data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    } catch (err) {
      problems.push(`Could not read ${path.relative(ROOT, DATA)}: ${err.message}`);
    }
    if (data) {
      const banned = ['status', 'verified', 'verificationNotes', 'source', 'id'];
      const leaked = new Set();
      (data.experiences || []).forEach(e => {
        banned.forEach(k => { if (k in e) leaked.add(k); });
      });
      if (leaked.size) {
        problems.push(`The published JSON carries internal keys: ${[...leaked].join(', ')}. ` +
                      'Only fields mapped to the public model may leave the server.');
      }
    }

    if (problems.length) {
      problems.forEach(p => console.log(`::error::${p}`));
      console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} found.`);
      process.exit(1);
    }
    console.log('Connecticut List: schema, publication rule, audience vocabulary and ' +
                'published JSON all check out.');
  });
}

main().catch(err => {
  console.error('Connecticut List vocabulary check failed:', err.message);
  process.exit(1);
});
