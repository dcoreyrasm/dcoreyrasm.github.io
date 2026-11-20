# International student and OPT checks for Scholarships & Fellowships research

Added 2026-11-20. Paste the block below into the instructions of whatever
assistant runs the weekly Scholarships & Fellowships search (and any other run
that adds records with Publish To = "Scholarships & Fellowships"). It adds
eligibility checks only. It does not change the search schedule, the research
categories, or the existing verification rules.

Airtable: base `apptzwHFsoWzjKOmV`, table `tblAfYqyIzTYhAQ7q`. The website
(`/scholarships-fellowships/`) reads these fields through
`_tools/fetch-community-ai.py` and maps the Airtable wording to its public
labels in `scholarships-fellowships/script.js` (`INTL_LABELS`). Use only the
existing options below. Never create a new option, and never turn on typecast
to "fix" a value.

## The block

> **International student and OPT eligibility (every new or updated record)**
>
> Read the official program page (not a listing site) and fill these fields
> from what it says. Never infer from the program name, the sponsor, or
> similar programs. When the page does not say, choose the "verify" option.
> A missing answer is never a reason to leave an otherwise relevant
> opportunity out of the directory.
>
> 1. **International Student Eligibility**: `Accepts international applicants`
>    only when the page says non-citizens or international students may apply.
>    `Citizenship/PR required` when it limits applicants to U.S. citizens,
>    nationals, permanent residents, or DACA recipients. Otherwise
>    `Unclear - verify`.
> 2. **International Scholarship Eligibility** (scholarships only):
>    `Eligible`, `Restricted`, or `Needs Verification` on the same rule.
>    `Not Applicable` for anything that is not a scholarship.
> 3. **Employment or Services Required**: `Yes` when the page describes a job,
>    paid placement, student-employee status, or a service obligation. `No`
>    only when it describes pure financial support with no work or service
>    condition. Otherwise `Needs Verification`.
> 4. **F-1 OPT Compatibility** and **STEM OPT Compatibility**:
>    `Provider confirms OPT accepted` / `Provider confirms STEM OPT support`
>    only when the page names OPT or STEM OPT. `Potentially compatible,
>    individual review required` only when the page accepts U.S. work
>    authorization without requiring citizenship (for example "otherwise
>    eligible for U.S. work authorization"). For STEM OPT this also needs a
>    paid employer relationship and E-Verify or Form I-983 support named on the
>    page. `Provider says OPT not accepted` / `Provider says STEM OPT
>    unsupported` when the page rules it out or limits applicants to
>    citizens or permanent residents. `Not applicable` when no U.S. employment
>    is involved or applicants are still enrolled. Otherwise `Needs
>    verification`. Accepting international applicants does NOT mean a
>    program accepts OPT.
> 5. **CPT or Pre-Completion OPT Considerations**: for programs open to
>    enrolled students, what the page says about off-campus work authorization
>    before graduation. Leave blank when it says nothing.
> 6. **Future Visa Sponsorship**: `Available` or `Not available` only when the
>    page says so. `Not applicable` when taking part involves no U.S.
>    employment. Otherwise `Unknown`.
> 7. **Degree-Related Work Requirement**: `Applies - DSO must confirm` when the
>    opportunity is U.S. work an F-1 student would do under practical training.
>    `Not Applicable` when no employment is involved. Otherwise `Needs
>    Verification`.
> 8. **OPT Eligibility Evidence**: the exact sentence(s) from the official page,
>    the URL, and the date you read it. End with "General program information,
>    not an immigration determination."
> 9. **International Eligibility Last Verified**: the date you read the page.
>    Leave blank if you could not verify anything.
>
> Never write that a student qualifies or that participation is authorized.
> When two official pages disagree, choose the "verify" option and quote both
> in the evidence field.
