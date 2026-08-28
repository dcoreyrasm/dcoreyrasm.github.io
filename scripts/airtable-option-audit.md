# Select-field option audit — Resources table, 2026-08-26

A pass over all 29 select fields in `tbltzLo6IdBIfjkL7`, looking for options that
were coined at write time rather than chosen from the field.

**How they were found.** Options created through the API carry a real colour;
every option in the base's original design is `grayLight2`. So a coloured option
is one that was added after the fact — either deliberately, or by a writer
sending an unrecognised value with `typecast` on. Each coloured option was then
checked against how many published records actually use it.

Two batches of coloured options are legitimate and were left alone: the nine
elder-care and early-intervention categories added on request, and the ~90 real
Connecticut towns added during the state import.

## Safe to delete — records already moved, options are empty

**Decided 2026-08-28: delete these nine.** Each holds **zero records**. Delete
them in Airtable (field → Customize field type → hover the option → delete);
nothing needs re-tagging first. No tool can do this — the Airtable MCP's
`update_field` takes only `formula` in `options`, not `choices` — so it is a
UI job.

| Field | Delete this option | Records moved to |
|---|---|---|
| Track | Camps & Youth Programs | Family & Childcare (10) |
| Category | Special Needs / Inclusive Camp | Inclusive/Special Needs Camp (2) |
| Category | Counselor-in-Training Program | Teen/CIT Program (2) |
| Category | Nature / Outdoor Camp | Outdoor/Nature Camp (1) |
| Source Type | Official provider website | Official Provider Website (17) |
| Schedule Window | Full day / full workday | Full Day (7) |
| Meals Provided | Healthy meals and snacks | Meals and Snacks (1) |
| Residency Eligibility | Bridgeport Residents Only | Residents Only (1) |
| Transportation Available | No Transportation | No (1) |

These were the unambiguous ones: a casing difference, a sentence that leaked
into a dropdown, a town name baked into a rule that the record's own Town field
already carries, or a slash-spacing variant of an option sitting two rows above
it.

**Corrected 2026-08-27: `Teen Program` was on this list and should not have
been.** It was merged into `Teen / CIT Program` as a near-duplicate. It is not
one -- Category carries both as separate options, and a teen programme is not a
counselor-in-training programme. Several listings legitimately hold both. The
one record the merge touched has been put back, and the option stays.

The tell was that the derivation pass recreated it a day later from records
whose own text said "teen programs", which is what should happen for an option
that is doing a job. A genuinely dead option does not come back on its own.

**Kept 2026-08-28: `Nature / Farm Camp`.** It was on this list, merged into
`Outdoor/Nature Camp` on the same reasoning as the slash-spacing variants. That
was wrong for the same reason `Teen Program` was: the test is whether an option
names a distinct concept, not whether it is empty. A working dairy farm is not a
nature preserve. The one record the merge moved -- Arethusa Farm Camp,
Litchfield (`recMLOtfjGA8p2Yu1`) -- has been put back on it, so the option is in
use rather than kept empty on principle.

`Medical / Diagnosis-Specific Camp` (4 records) was coined the same way and kept
for the same reason.

## Your call — real overlap, but each carries information

Not touched, because merging either way loses something.

**Source Type: `Official Provider` (5) vs `Official Provider Website` (50).**
Two names for nearly the same thing. `Official Provider` is the original
vocabulary; the longer one is now the overwhelming majority. This field never
reaches the site, so it only matters for your own filtering in Airtable.

**Registration Status: `Past Cycle` (23), `Registration Varies` (3),
`Registration Opens Later` (2).** All three were coined. `Past Cycle` earns its
place — "this is last season's listing" is not the same as `Closed`, and 23
records depend on it. `Registration Opens Later` is what `Not Yet Announced`
already means. `Registration Varies` has no gray equivalent.

**Meals Provided: `Lunch and Snacks` (1), `Breakfast, Lunch, and Snack` (1).**
More precise than `Meals and Snacks`, which is why they're worth keeping — but
they fragment a field with only six populated records in it.

**Services Offered overlaps.** `Summer Camp` (20) sits over `Summer Day Camp`
(2) and `Summer Sleepaway Camp`; `Child Care` (18) over `Full-Day Childcare`
(6); `Before- and After-School Care` (4) over `Before-School Care` (2) and
`After-School Care` (4). In each pair the coined general option is winning
against the specific originals. Low urgency: this field is searchable text on
the site, not a filter.

**Transportation Available: `Morning Bus Only` (1), `Program Transportation
Included` (1).** Genuinely more specific than `Yes`, and the site's transport
filter already handles them correctly (it treats anything other than No / Not
Confirmed / Contact Program as transport available). Recommend keeping.

**Camp & Program Topics: `Sports`, `Arts`.** Broad catch-alls next to 55
specific gray topics, used by a single record that also carries the specific
ones. Harmless.

**Towns Served: `Lakeville` (1 record).** A village in Salisbury rather than a
town in its own right — and Salisbury isn't an option, so this is the only
handle for that corner of the state. Left as-is.

## Clean — nothing coined

Eighteen fields contain only their original options: Age Groups Served, Program
Setting, Camp Stay Type, Program Format, Teen Opportunity Type, Specialized
Support Type, Seasonal Early Childhood Care, Languages Offered, Licensing /
Exemption Status, Extended Care Available, Care 4 Kids Accepted, Financial
Assistance Available, Sibling Discount Available, Days Offered, End Time Band,
Program Length, School-Day Coverage, Moderation Status.

Worth noting where the damage clusters: every coined option landed in a field
that a researching assistant fills in from a provider's website. The fields
nobody writes to programmatically are untouched — which is the same conclusion
`chatgpt-instructions.md` is built on.
