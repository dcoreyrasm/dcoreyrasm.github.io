# Darice's Connecticut List — how the page is built and what governs it

This is the operating record for the public page at `/connecticut-list/`. It is
the companion to Village Notes: same architecture, same safeguards, different
subject matter. Where the two differ, it is because the data differs.

A copy of this belongs under `/Darice Corey/ChatGPT Dropbox/DAIOS/` so ChatGPT
and Claude read the same rules. This file is the source of truth; the Dropbox
copy is the distribution.

---

## 1. What the page is

**Darice's Connecticut List** — things worth doing, seeing, tasting, and
exploring across Connecticut. Independently curated. Not affiliated with the
State of Connecticut or with any organization it lists, and the page says so in
its footer.

The word **Passport** does not appear anywhere a visitor can see it: not in the
title, the navigation, the metadata, the filters, or any label. It survives only
as the name of the Airtable base and of one field, and the site translates that
field to **Try This** before rendering it.

---

## 2. Data source

| | |
|---|---|
| Base | Connecticut Passport — `appaCjeN9ZaJXVTV6` |
| Table | Things to Do — `tblOeQoBxHTZGs0uZ` |

This is the only table that powers the public page.

**The private "Mya & Victor's Connecticut Passport" base is a separate base and
is never read by any code in this repository.** Nothing in the sync, the check
script, or the page references it.

---

## 3. How the data reaches the site

```
Airtable  ──(GitHub Actions, every 6h)──>  connecticut-list/data/experiences.json  ──>  browser
```

- `scripts/fetch-connecticut-list.js` is the only thing that ever holds the
  Airtable token. It runs in Actions, reads the token from a repository secret,
  and writes a file containing no credentials.
- The published page reads that file and nothing else. **No Airtable token,
  base link, or internal field ever reaches a visitor's browser.**
- The site is read-only by construction. Nothing here writes, creates, renames,
  or deletes anything in Airtable, and no request carries `typecast`.
- If the pull fails, the script exits non-zero having written nothing, so the
  previous JSON stays live rather than the page going blank.

### Environment

| Name | Where | Notes |
|---|---|---|
| `AIRTABLE_ACCESS_TOKEN` | repo secret | Preferred. Needs read access to the Connecticut Passport base plus `schema.bases:read` for the drift check. |
| `AIRTABLE_TOKEN` | repo secret | Fallback, already present for Village Notes. One token can serve both bases. |
| `AIRTABLE_CONNECTICUT_BASE_ID` | repo variable | Optional. Defaults to the live base ID. |
| `AIRTABLE_CONNECTICUT_TABLE_ID` | repo variable | Optional. Defaults to the live table ID. |

---

## 4. The publication rule

**One place, one constant: `PUBLISHED_STATUSES` in
`scripts/fetch-connecticut-list.js`.**

A record reaches the public page only when **both** are true:

1. `Status` is `📘 Published` or `⭐ Featured`, **and**
2. `Verified` is ticked.

Verifying a source and publishing a record are two separate decisions.
`Verified = true` means somebody checked the official source. It does not mean
the record is ready for the public web, and the two states are not allowed to
collapse into one.

Records in `💌 New Suggestion`, `🔎 Needs Review`, `🗂️ Keep for Later` or
`🚫 Not a Fit` stay off the site however complete they look.

**If the base later grows an explicit `Public` checkbox**, this constant is the
only thing that changes. No front-end work: the page only ever sees records that
already passed through the rule.

Every run reports how many verified records are waiting on an editorial status
and names them, so a short or empty page is explained by the run rather than
investigated.

---

## 5. What is never published

The sync requests only the fields in its `FIELD_MAP`, so the rest is never
transferred from Airtable at all. It cannot leak from a file that never received
it. Specifically off the page:

- `Verification Notes` — never requested
- `Source` — never requested
- `Verified` and `Status` — read for the publication rule, stripped before write
- Airtable record IDs — stripped before write
- Anything in the private Mya & Victor base — never read

`scripts/check-connecticut-vocabulary.js` re-checks the committed JSON for these
keys on every run and fails the run if any appears.

---

## 6. Display normalization

Handled in the adapter and the presentation layer. **No Airtable record is ever
altered by site code.**

| Airtable | Public page | Why |
|---|---|---|
| `Passport Challenge` | **Try This** | The public page carries no passport language. |
| `Original Category` | **Experience type** | Holds the browse taxonomy — Hiking & Outdoors, Waterfront, Museum & Culture. |
| `Experience Type` | **Category** | Holds the finer categories — Waterfalls, Free / Low-Cost, Easy Walks. |
| `🥾 Hiking & Outdoors` | `Hiking & Outdoors` | Emoji stripped so a filter chip, a URL parameter and a search term read as plain words. |
| `... Date` (trailing) | `...` or `... Visit` | Private-project wording removed. |

The two field names are **swapped relative to what their values describe**,
confirmed against the live schema. The site shows each under the label its
values actually fit. Worth fixing at the source eventually; until then, the
mapping is one line each in `FIELD_MAP`.

### The trailing "Date" rule

Only a **trailing, standalone** `Date` is removed. Two things are deliberately
left alone:

- **"Date Night"** — a real class and event name venues use themselves
  (*Studio Andreas Ceramic Date Night*, *Dirty Date Night Pottery*). Removing it
  would rename somebody's programme.
- **"Couples"** — describes the format of a booking, not a private person.

Dropping the suffix leaves most names complete. A short explicit list of words
that need a noun after them (`art`, `gallery`, `campus`, `mill-building`,
`sunday`, `saturday`, `friday`) takes `Visit` instead. The list is explicit
rather than guessed from parts of speech: a wrong guess renames a real place.

Every run names the records still carrying the wording, so the display fix does
not become a permanent substitute for renaming them in Airtable.

---

## 7. Schema protection

`scripts/check-connecticut-vocabulary.js` runs after every sync and fails the
run when it finds:

- a field the sync reads that has been renamed away or deleted
- a field whose **type changed** underneath the sync
- a `Status` option named in the publication rule that no longer exists
  (a renamed option would silently unpublish the whole page)
- a `Best For` option outside the four agreed audiences
- an internal key in the committed public JSON

It reads. It never writes, and it never creates or alters an option to make
anything line up.

It runs **after** the commit, deliberately: drift is a quality problem, not an
outage, so it never holds back a data refresh. The red run is the notification.

### For any automated writer (ChatGPT or Claude)

- Read the current schema first. Use existing field names and select values
  **exactly**.
- **Never** use `typecast: true`.
- **Never** create, rename, delete, or retype a field during a research run.
- **Never** create a new select option during a research run.
- If Airtable will not accept a value, leave it blank or report it. Do not
  weaken governance to force a write through.
- After writing, **read the records back** and verify they exist with the
  critical fields set. A submitted request is not a successful write. Never
  report success on the strength of the request alone.
- If a write fails: inspect it, correct the payload within the existing schema,
  and report anything unresolved. Do not enable typecasting, invent options, or
  alter field definitions as a workaround.

---

## 7a. Dated events and age suitability

Three fields were added to the table on 5 September 2026, as a deliberate
schema change Darice authorised, **not** during a research run:

| Field | Type | What it is for |
|---|---|---|
| `Event Start Date` | date (ISO) | The day a dated event begins |
| `Event End Date` | date (ISO) | The last day of a multi-day event; blank for a single day |
| `Age Suitability` | multi-select | Who the experience actually suits |

**Age Suitability values, and only these:** `All ages` · `Little kids (0-5)` ·
`Kids (6-12)` · `Teens` · `Adults only (18+)` · `Adults only (21+)`

Both are evidence-based and start empty on every record. Fill them only from
the official source:

- **An invented date sends somebody to a closed gate.** If the official page
  does not give a date, leave both fields blank. "Specific event/date" in Best
  Time to Visit is a marker that a date exists, not a substitute for one.
- **An invented age rating sends a family to an adults-only workshop.** Tag
  `Adults only (21+)` when the source says BYOB, wine, or 21+. Do not tag
  `All ages` because something merely seems suitable. Fewer tags when unsure.

### How the page treats them

- An event is live through its **end** date, so a three-day fair stays visible
  on its last day. A single-day event uses the start date for both.
- **Expired events are hidden by the page, not dropped by the sync.** The check
  runs against the visitor's clock, because the file is rebuilt only every six
  hours and a page left open overnight must stop advertising this morning's
  fair. Same reasoning, same shape, as `liveEvent()` in Village Notes.
- The month filter offers only months a **live** event falls in, so a finished
  event contributes no month and cannot be filtered to.
- Both filter rows hide themselves entirely while no record carries the data,
  so adding the fields did not put two empty rows on the page.
- An `Event End Date` with no start is unusable and shows nothing rather than
  guessing. The run reports it.

Every run reports: expired events, an end date with no start, an end before its
start, records marked "Specific event/date" that carry no date, and how many
records have each field filled in.

---

## 8. The four audiences

`Group Activities` · `Date Night` · `Family` · `Individual Exploration`

Evidence-based only. A tag goes on because the activity's format or its official
information supports it, not because the activity "seems" suitable. An
adults-only BYOB workshop is not `Family`. A private two-person booking is not
`Group Activities`. When uncertain, use fewer tags.

---

## 9. Source verification

Ground every new activity in a current authoritative source: the organization's
own site, the business's own site, a municipal page, a Connecticut or federal
government page, an official nonprofit, land trust, university, or event
organizer page.

Not sufficient on their own: scraped directories, event aggregators, search-result
snippets, social posts, AI-generated summaries, outdated tourism articles. They
can surface a lead. They do not verify one.

Confirm the official source exists and supports the activity **before** setting
`Verified = true`.

Use clean official URLs. The sync strips `utm_*`, `fbclid`, `gclid` and similar
tracking parameters and keeps parameters that identify the page itself. Do not
replace a valid official source with a third-party tourism page because it is
easier to read.

---

## 10. Never invent

Hours, event dates, pricing, age restrictions, accessibility, parking,
reservation requirements, town, address, audience suitability, event status,
seasonal availability, family or group suitability.

**Unknown is preferable to incorrect. Leave unsupported values blank.** The page
is built for this: every optional row hides itself when its field is empty, so a
sparse record renders as a shorter card rather than a broken one.

---

## 11. Deduplication

Before creating a record, search Things to Do for the exact name, close name
variants, the official URL, the organization, the town, and similar activities at
the same venue. Do not create a duplicate because the wording differs.

Separate records are allowed when the **visitor's** experience is genuinely
distinct: museum admission versus a hands-on workshop; a scenic train ride versus
a guest motorman experience; a general park visit versus a separately ticketed
seasonal programme. The distinction has to matter to the visitor.

One main table. Do not create a Research Finds table unless Darice authorizes one.

---

## 12. Provenance

ChatGPT-researched records carry `Source = ChatGPT Research`. Do not overwrite
the provenance of records Darice or the community entered.

New researched records start at `Status = 🔎 Needs Review` and stay there until
Darice or an approved moderation workflow moves them.

---

## 13. Public submissions (not built yet)

If they are added later: no auto-publish, no auto-verify, no treating a
submitter's claim as a verified fact. Hold in moderation and verify against the
official source before publication. Same principle Village Notes already uses.

---

## 14. Verification currency

Dated events, seasonal attractions, ticketed programmes, closures, construction,
hours and reservation rules all go stale. Expired dated events should not keep
appearing as current.

The architecture is ready for this and the behaviour is not built yet: the
adapter already carries `bestTime` and `dateAdded`, and Village Notes' event
expiry (`liveEvent()` in `village-notes/script.js`) is the working pattern to
copy when an event-date field is added to this base.

---

## 15. DAIOS

This is a DAIOS-qualified project. Research runs, major maintenance, governance
work, website implementation and meaningful data cleanup should be logged:
one session per completed run, `Platform` set to whichever platform did the work,
using the existing Connecticut List / Passport project value. Do not create new
select options automatically.

Useful counts, all of which the sync already reports on each run: records
published, records awaiting review, titles still carrying private wording,
records missing Why Go, records missing Region, dropped links.

Mark verification complete only after Airtable writes have been read back and
confirmed. Do not invent active time, start time, time saved, monetary value, or
usage evidence.

---

## 16. Cross-platform consistency

ChatGPT and Claude operate under these same rules. Neither introduces a looser
process on its own. Where the two disagree about schema, field values, counts,
publication state, verification state, or automation behaviour, **verify against
the live system** rather than trusting either platform's memory.

---

## 17. Governance priority

When convenience, speed, or adding more records conflicts with governance and
data quality, **governance and data quality win.** Do not weaken a safeguard to
simplify a migration, an import, an automation, or a front-end feature.

---

## 18. Files

| File | What it does |
|---|---|
| `connecticut-list/index.html` | The page |
| `connecticut-list/script.js` | Search, filters, cards, detail view |
| `connecticut-list/connecticut-list.css` | Only what Village Notes has no component for |
| `connecticut-list/data/experiences.json` | Generated. Never hand-edit. |
| `scripts/fetch-connecticut-list.js` | Airtable adapter and sync. Holds the publication rule. |
| `scripts/check-connecticut-vocabulary.js` | Schema, vocabulary and leak check |
| `.github/workflows/connecticut-list-sync.yml` | Runs both, every six hours |

Airtable fields the page reads are listed in `FIELD_MAP` in the sync, and
their expected types in `EXPECTED_TYPES` in the check script. Adding a field
means adding it to both.

Village Notes components are reused as-is from `/village-notes/village-notes.css`.
**That file is shared. Changing it changes both pages, so test both.**
