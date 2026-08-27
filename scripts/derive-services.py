#!/usr/bin/env python3
"""Fill in Services Offered from what each record already says about itself.

Category is a single select, so it can only name a program's primary purpose.
A YMCA centre that runs infant rooms, a preschool, after-school care and a
summer camp gets filed under one of those and is invisible to a parent
filtering for any of the other three. Services Offered is the multi-select
built for exactly that, and it is empty on 492 of 547 published records.

Nothing here is guessed. Every tag comes from one of two kinds of evidence:

  * The record's own Category, where a Category and a Service option mean the
    same thing. A listing filed under "Infant Care" offers infant care.
  * A phrase in the record's own text that names the service -- "K-8
    afterschool, summer day camp, and teen/tween evening programming" earns
    After-School Care, Summer Day Camp and Teen Program, and nothing else.

Where the text is silent the record is left alone and reported, because an
untagged listing is honest and a wrongly tagged one sends a family to a place
that cannot take their child.

Tags are only ever added. An existing Services Offered value is never removed,
so a human correction survives a re-run.

typecast is deliberately off: every tag is checked against the field's option
list first, so a mapping slip fails loudly instead of inventing a 32nd option.

Usage:
    AIRTABLE_TOKEN=pat... python3 scripts/derive-services.py --dry-run
    AIRTABLE_TOKEN=pat... python3 scripts/derive-services.py

Needs data.records:read and data.records:write. Narrow the token back to
read-only afterwards -- the sync workflows run unattended on it.
"""

import argparse, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

BASE_ID  = "appxUByKs5ULrDZQp"
TABLE_ID = "tbltzLo6IdBIfjkL7"
API = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_ID}"

FLD = dict(name="fldhaAie6ZWEBNSnr", category="fldBp1UDqNtkz5fKM", track="fldoN4wD1g4tYEFPo",
           specific="fldbIll3ZVhDzQUO7", ages="fld9LqKZpxDyh6Q2x",
           notes="fldcvNAYhvWg21zzc", services="flduTdPfjfHmL2h5k",
           status="fldoE5JfQiXElXs1S")

# What this script is allowed to emit. Not the whole field -- Services Offered
# now carries the pet options too, and nothing here derives those, because the
# pet records are hand-researched rather than bulk-imported. Anything the
# tables below produce that is missing from this set is a bug in them, not a
# new option to create.
VALID = {
    "Infant Care", "Toddler Care", "Preschool / Pre-K", "Full-Day Childcare",
    "Before-School Care", "After-School Care", "School Vacation Care",
    "Summer Day Camp", "Summer Sleepaway Camp", "Specialty Camp",
    "Teen / CIT Program", "Youth Employment", "Parent / Family Support",
    "Caregiver Support", "Elder Care", "Afterschool Enrichment",
    "Literacy / Tutoring", "Mentoring", "Arts Enrichment", "STEM Enrichment",
    "Sports Enrichment", "College Access / Readiness", "Summer Camp",
    "Child Care", "Disability Support", "Teen Program",
    "Before- and After-School Care", "Adaptive Program", "Youth Leadership",
    "Volunteer Opportunity", "Transportation",
}

# ---------------------------------------------------------------- layer one

# A Category and a Service that mean the same thing. Deliberately partial:
# "Center-Based Daycare" is left out because "Child Care" says less than the
# category already does, and "Municipal/Parks & Rec Camp" is left out because
# a municipal camp may be a day camp or a set of specialty weeks and the
# category does not say which.
CATEGORY_IMPLIES = {
    "Infant Care":                 ["Infant Care"],
    "Preschool / Pre-K":           ["Preschool / Pre-K"],
    "Before/After School Care":    ["Before- and After-School Care"],
    "School Vacation Week Care":   ["School Vacation Care"],
    "Summer Day Camp":             ["Summer Day Camp"],
    "Summer Sleepaway Camp":       ["Summer Sleepaway Camp"],
    "Specialty Camp":              ["Specialty Camp"],
    "Teen/CIT Program":            ["Teen / CIT Program"],
    "Teen Program":                ["Teen Program"],
    "Youth Employment Program":    ["Youth Employment"],
    "Tutoring / Academic Support": ["Literacy / Tutoring"],
    "Literacy / Reading Program":  ["Literacy / Tutoring"],
    "Afterschool Enrichment":      ["Afterschool Enrichment"],
    "Arts Camp":                   ["Arts Enrichment"],
    "STEM/Tech Camp":              ["STEM Enrichment"],
    "Sports Camp":                 ["Sports Enrichment"],
    "Special Needs Childcare":     ["Disability Support"],
    "Inclusive/Special Needs Camp":["Adaptive Program"],
    "Parenting Support/Classes":   ["Parent / Family Support"],
    "Caregiver Support Group":     ["Caregiver Support"],
}

# ------------------------------------------------- layer one, Early Start CT

# The 427 imported state rows carry a controlled Ages vocabulary taken from the
# Office of Early Childhood's own funded-space breakdown -- "Infant/Toddler;
# Preschool" is a statement about that provider, from the source, not a guess.
EARLY_START = re.compile(r"Early Start CT provider", re.I)
ES_AGE = {
    "infant/toddler": ["Infant Care", "Toddler Care"],
    "preschool":      ["Preschool / Pre-K"],
    # "School age" is left deliberately untranslated. State-funded school-age
    # care may be before school, after school, vacation weeks or all three,
    # and the source does not say which. The Child Care tag below covers it.
}
# Setting, from the provider type the import recorded. A public school pre-K is
# not child care, so it gets nothing here and takes its tag from the age tokens.
ES_SETTING = {
    "Child Care Center": ["Child Care"],
    "Family Home":       ["Child Care"],
    "Group Home":        ["Child Care"],
}

# ---------------------------------------------------------------- layer two

# Hands-on care tags, and the categories allowed to earn them from free text.
# "Early intervention for infants and toddlers" describes who Birth-to-Three
# helps, not a nursery it runs; 211 and WIC mention infants for the same
# reason. Tagging them Infant Care sends a parent hunting for daycare to a
# phone line. So a record only claims to provide care if it is filed as
# somewhere that provides it.
CARE_TAGS = {"Infant Care", "Toddler Care", "Preschool / Pre-K", "Full-Day Childcare",
             "Before-School Care", "After-School Care", "Before- and After-School Care",
             "School Vacation Care"}
# Enrichment reads as youth programming on the site, so it is withheld from
# Elder Care listings. A retirement community with an art studio is not
# somewhere to send a child to do art, and under the grouped filter that tag
# would put it in front of a parent browsing arts camps.
YOUTH_TAGS = {"Arts Enrichment", "STEM Enrichment", "Sports Enrichment",
              "Literacy / Tutoring", "College Access / Readiness", "Mentoring",
              "Youth Leadership", "Afterschool Enrichment", "Teen Program",
              "Teen / CIT Program", "Youth Employment", "Volunteer Opportunity"}

CARE_CATEGORIES = {
    "Center-Based Daycare", "Home Daycare (Licensed)", "Infant Care", "Preschool / Pre-K",
    "Before/After School Care", "School Vacation Week Care", "Backup/Emergency Care",
    "Nanny / Au Pair", "Nanny Share", "Babysitting Co-op", "Special Needs Childcare",
    "Afterschool Enrichment", "Summer Day Camp", "Municipal/Parks & Rec Camp",
}

# Phrases that name a service outright. Ordered longest-intent first so
# "before and after school" is not also read as bare "before school".
PHRASES = [
    (r"before[\s-]*(and|&)[\s-]*after[\s-]*school",        "Before- and After-School Care"),
    (r"\bafter[\s-]?school\b|\bafterschool\b",             "After-School Care"),
    (r"\bbefore[\s-]?school\b",                            "Before-School Care"),
    (r"school vacation|vacation week|school break|february break|april break", "School Vacation Care"),
    (r"\bday camp\b|\bsummer day\b",                       "Summer Day Camp"),
    (r"\bovernight camp\b|\bsleepaway\b|\bresident camp\b|\bresidential camp\b", "Summer Sleepaway Camp"),
    (r"\binfants?\b|\binfant care\b|\binfant room\b|\binfant program\b", "Infant Care"),
    (r"\btoddlers?\b",                                     "Toddler Care"),
    (r"\bpreschool|\bpre-?k\b|\bpre-?kindergarten",        "Preschool / Pre-K"),
    (r"\bfull[\s-]?day (child\s?care|care)\b",             "Full-Day Childcare"),
    (r"counsel[o|]?r[\s-]?in[\s-]?training|\bcit\b|junior counsel", "Teen / CIT Program"),
    (r"teen (program|programming|club|night|track|centre|center|leadership)|\\bteens? ages\\b|for teens\\b|\\btween (program|programming|night)",  "Teen Program"),
    (r"youth employment|job training|paid internship",     "Youth Employment"),
    (r"\bvolunteer",                                       "Volunteer Opportunity"),
    (r"leadership program|youth leadership|teen leadership", "Youth Leadership"),
    (r"\bmentor",                                          "Mentoring"),
    (r"\btutor|\bliteracy\b|reading program|homework help", "Literacy / Tutoring"),
    (r"\bstem\b|\brobotics\b|\bcoding\b|engineering",      "STEM Enrichment"),
    (r"\barts?\b|\bmusic\b|\bdance\b|\bdrama\b|theat(er|re)|\bceramics\b", "Arts Enrichment"),
    (r"\bsports?\b|\bathletics?\b|\bswim|\bsoccer\b|\btennis\b|\bbasketball\b", "Sports Enrichment"),
    (r"college (access|readiness|prep)|college[\s-]?bound", "College Access / Readiness"),
    (r"\badaptive\b|\binclusion\b|\binclusive\b",           "Adaptive Program"),
    (r"\bdisabilit(y|ies)\b|special needs",                 "Disability Support"),
    (r"caregiver support|support groups?\b|\brespite\b",    "Caregiver Support"),
    (r"parent(ing)? (support|class|coach|educat)|family support|parent education", "Parent / Family Support"),
    (r"assisted living|memory care|skilled nursing|\bhospice\b|home health|\belder\b|older adults?\b|\bseniors?\b|\bdementia\b", "Elder Care"),
]
PHRASES = [(re.compile(p, re.I), tag) for p, tag in PHRASES]

# "No transportation", "does not offer respite" -- a phrase inside a denial is
# evidence of absence, and tagging it would be worse than leaving it blank.
NEGATED = re.compile(r"\b(no|not|without|non|never|except)\b[^.;:]{0,40}$", re.I)
# "transportation ... were not confirmed on the provider page" -- the denial
# trails the term, so the window has to look both ways.
DENIED_AFTER = re.compile(r"^[^.;:]{0,60}\b(not confirmed|were not|was not|are not|is not)\b", re.I)

# Where a record cites its source -- "Official Connecticut Aging and Disability
# Services source verified 2026-08-25" -- the sentence describes the state
# agency that published the page, not what the listing offers. Read as
# evidence it tagged half the elder-care records with Disability Support.
CITATION = re.compile(
    r"sources?\s*[:\-][^.;]*"
    r"|official[^.;]{0,80}source verified[^.;]*"
    r"|accessed \d{4}-\d{2}-\d{2}", re.I)


def strip_citations(text):
    return CITATION.sub(" ", text)


def evidence(text):
    """Every service the text names, with the snippet that earned it."""
    found = {}
    for pattern, tag in PHRASES:
        for m in pattern.finditer(text):
            if NEGATED.search(text[max(0, m.start() - 45):m.start()]):
                continue
            if DENIED_AFTER.search(text[m.end():m.end() + 70]):
                continue
            found.setdefault(tag, text[max(0, m.start() - 30):m.end() + 20].replace("\n", " ").strip())
            break
    return found


def derive(rec):
    """Services this record's own content supports, and why."""
    f = rec.get("fields", {})
    category = f.get(FLD["category"]) or ""
    track    = f.get(FLD["track"]) or ""
    specific = f.get(FLD["specific"]) or ""
    ages     = f.get(FLD["ages"]) or ""
    notes    = f.get(FLD["notes"]) or ""
    name     = f.get(FLD["name"]) or ""

    tags, why = {}, {}

    def add(tag, reason):
        if tag not in tags:
            tags[tag] = True
            why[tag] = reason

    for tag in CATEGORY_IMPLIES.get(category, []):
        add(tag, f"category is {category}")

    if EARLY_START.search(specific):
        for setting, setting_tags in ES_SETTING.items():
            if f"({setting})" in specific:
                for tag in setting_tags:
                    add(tag, f"state record for a {setting}")
        for token in (t.strip().lower() for t in ages.split(";")):
            for tag in ES_AGE.get(token, []):
                add(tag, f"funded spaces for {token}")
    else:
        # Free text only for the hand-written records. The 427 imported rows
        # share boilerplate -- a local-partner contact, a source line -- and
        # reading it as evidence would tag hundreds of them off one sentence
        # that describes the state programme rather than the provider.
        text = strip_citations(" ".join([name, specific, ages, notes]))
        for tag, snippet in evidence(text).items():
            if tag in CARE_TAGS and category not in CARE_CATEGORIES:
                continue
            if tag in YOUTH_TAGS and track == "Elder Care":
                continue
            add(tag, f'text says "{snippet}"')

    bad = [t for t in tags if t not in VALID]
    if bad:
        raise SystemExit(f"BUG: {name} would get options that do not exist: {bad}")
    return sorted(tags), why


# ------------------------------------------------------------------ airtable

def call(url, data=None, method="GET"):
    token = os.environ.get("AIRTABLE_TOKEN")
    if not token:
        raise SystemExit("AIRTABLE_TOKEN is not set.")
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.load(res)
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt)
                continue
            detail = err.read().decode()[:400]
            if err.code == 403 and method == "PATCH":
                raise SystemExit(
                    "Airtable refused the write (403).\n"
                    "AIRTABLE_TOKEN can read this base but not write to it, which is how it\n"
                    "is meant to sit day to day -- the two sync workflows only ever read.\n"
                    "Add data.records:write to the token for this run, then take it off again:\n"
                    "  airtable.com/create/tokens -> the Village Notes token -> Scopes\n"
                    f"\nAirtable said: {detail}")
            raise SystemExit(f"Airtable {err.code} on {method} {url}: {detail}")


def fetch_all():
    records, offset = [], None
    fields = [FLD[k] for k in ("name", "category", "track", "specific", "ages",
                               "notes", "services", "status")]
    while True:
        query = [("returnFieldsByFieldId", "true"), ("pageSize", "100")]
        query += [("fields[]", f) for f in fields]
        if offset:
            query.append(("offset", offset))
        page = call(f"{API}?{urllib.parse.urlencode(query)}")
        records += page.get("records", [])
        offset = page.get("offset")
        if not offset:
            return records


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="print the plan, write nothing")
    ap.add_argument("--limit", type=int, default=0, help="only show this many in the plan")
    args = ap.parse_args()

    records = fetch_all()
    print(f"{len(records)} records in the table.\n")

    updates, unchanged, nothing = [], 0, []
    for rec in records:
        existing = rec["fields"].get(FLD["services"]) or []
        derived, why = derive(rec)
        merged = sorted(set(existing) | set(derived))
        name = rec["fields"].get(FLD["name"]) or rec["id"]

        if not derived and not existing:
            nothing.append(name)
            continue
        if merged == sorted(existing):
            unchanged += 1
            continue
        updates.append((rec["id"], name, existing, merged,
                        [(t, why[t]) for t in merged if t in why and t not in existing]))

    shown = updates[:args.limit] if args.limit else updates
    for _, name, existing, merged, reasons in shown:
        print(f"* {name}")
        if existing:
            print(f"    keeping : {', '.join(existing)}")
        print(f"    adding  : {', '.join(t for t in merged if t not in existing)}")
        for tag, reason in reasons:
            print(f"      {tag}: {reason}")
    if args.limit and len(updates) > args.limit:
        print(f"\n... and {len(updates) - args.limit} more not shown (--limit {args.limit}).")

    print(f"\n{len(updates)} to update, {unchanged} already correct, "
          f"{len(nothing)} with nothing the text supports.")
    if nothing:
        print("\nNo evidence found for these -- left untagged rather than guessed:")
        for name in nothing[:40]:
            print(f"  - {name}")
        if len(nothing) > 40:
            print(f"  ... and {len(nothing) - 40} more.")

    if args.dry_run:
        print("\nDry run: nothing written.")
        return

    written = 0
    try:
        for i in range(0, len(updates), 10):
            batch = updates[i:i + 10]
            call(API, {"records": [{"id": rid, "fields": {FLD["services"]: merged}}
                                   for rid, _, _, merged, _ in batch]}, method="PATCH")
            written += len(batch)
            print(f"  wrote {written}/{len(updates)}", flush=True)
    except SystemExit:
        # Half a run is worse than none only if nobody knows which half. Tags
        # are additive and the whole thing is idempotent, so re-running once
        # the cause is fixed simply finishes the job.
        print(f"\nStopped after {written} of {len(updates)} records. "
              f"Re-running picks up where this left off.", flush=True)
        raise
    print(f"\nDone: {len(updates)} records updated.")


if __name__ == "__main__":
    main()
