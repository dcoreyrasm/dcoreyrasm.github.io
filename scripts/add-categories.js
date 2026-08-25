#!/usr/bin/env node
/* Add nine Category choices to the Village Notes Resources table.
 *
 * Merge-safe: it GETs the current schema, appends only what is missing, and
 * PATCHes the full list back. Airtable treats `choices` as the complete set,
 * so anything omitted would be deleted -- and deleting a choice that is in use
 * strips it from every record holding it. Existing choices are sent back by
 * their own ids so they keep their identity, colors, and record links.
 *
 * Re-running is safe: anything already present is skipped.
 *
 * Usage (never paste the token into a chat or commit it):
 *   AIRTABLE_TOKEN=pat... node add-categories.js
 *
 * Needs a token with schema.bases:write on this base. Create a separate,
 * temporary one at https://airtable.com/create/tokens and revoke it after --
 * do not widen the read-only token the sync workflow uses.
 */
'use strict';

const BASE_ID  = 'appxUByKs5ULrDZQp';
const TABLE_ID = 'tbltzLo6IdBIfjkL7';
const FIELD_ID = 'fldBp1UDqNtkz5fKM';

const NEW_CHOICES = [
  'Birth-to-Three / Early Intervention',
  'Doula Services',
  'Pediatric Therapy (OT/PT/Speech)',
  'Tutoring / Academic Support',
  'Grief/Bereavement Support',
  'Senior Center / Congregate Meals & Social Programs',
  'Home Modification / Fall Prevention',
  'Durable Medical Equipment Loan',
  'Veterans Benefits Counseling',
];

const TOKEN = process.env.AIRTABLE_TOKEN;
if (!TOKEN) {
  console.error('AIRTABLE_TOKEN is not set. Refusing to run.');
  process.exit(1);
}
const auth = { Authorization: `Bearer ${TOKEN}` };

async function call(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...auth, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      console.error(`\nAirtable returned ${res.status}. The usual cause is a token without`);
      console.error('schema.bases:write, or one not granted access to this base.');
      console.error('Nothing was changed.\n');
    }
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

(async () => {
  // 1. Read the live schema. Never retype choices from memory.
  const meta = await call(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`);
  const table = meta.tables.find(t => t.id === TABLE_ID);
  if (!table) throw new Error(`Table ${TABLE_ID} not found in base ${BASE_ID}.`);
  const field = table.fields.find(f => f.id === FIELD_ID);
  if (!field) throw new Error(`Field ${FIELD_ID} not found on ${table.name}.`);

  const existing = field.options.choices;
  console.log(`Field "${field.name}" (${field.type}) currently has ${existing.length} choices.`);

  // 2. Append only what is genuinely new, matching on name.
  const have = new Set(existing.map(c => c.name));
  const toAdd = NEW_CHOICES.filter(n => !have.has(n));
  const already = NEW_CHOICES.filter(n => have.has(n));
  if (already.length) console.log(`Already present, skipping: ${already.join(', ')}`);
  if (!toAdd.length) { console.log('Nothing to add. No request sent.'); return; }

  // Keep existing entries byid so Airtable preserves them rather than
  // treating same-named entries as brand new ones.
  const merged = [
    ...existing.map(c => ({ id: c.id, name: c.name })),
    ...toAdd.map(name => ({ name })),
  ];
  console.log(`Adding ${toAdd.length}: ${toAdd.join(', ')}`);
  console.log(`Sending ${merged.length} total choices.\n`);

  // 3. PATCH the field.
  const updated = await call(
    `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${TABLE_ID}/fields/${FIELD_ID}`,
    { method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: { choices: merged } }) }
  );

  console.log(JSON.stringify(updated, null, 2));
  console.log(`\nDone. Field now has ${updated.options.choices.length} choices.`);
})().catch(err => { console.error('Failed:', err.message); process.exit(1); });
