# Daily search brief for Village Notes

This says **what to look for**. The companion file, `chatgpt-instructions.md`,
says **how to record it** — the closed option lists, the no-typecast rule, the
multi-tagging. Both are needed and neither repeats the other, so
`build-chatgpt-brief.js` joins them into `chatgpt-brief.md`. Paste that one;
edit this one.

## Why this replaces the old search

Two things changed. There is a fourth track, Teens & High School, with six
categories and no listings in it at all -- Pet Care, which was the empty one
when this was last rewritten, is now real. And measuring what the directory
actually holds, rather than assuming, changed what is worth searching for.

The headline: **the directory is broad and shallow.** The breadth is real; the
depth behind it is not. The exact figures are measured on every sync and
printed in the WHERE THE DIRECTORY IS THIN section below -- read them there
rather than trusting anything typed here, which is how the numbers in this
paragraph came to be wrong within a week the last time. Broadly:

The site promises real operating hours, honest waitlist timelines, what a place
actually costs, and somewhere to click. Every one of those is carried by a
minority of listings, and two of them are worse than the raw count suggests
because hundreds of records carry a boilerplate sentence instead of an answer.
The measured section gives the current figure for each.

The boilerplate came in with the state import and was honest at the time. It is
not knowledge, and the page's "needs detail" sort already discounts it. So the
search should no longer be measured in listings added. A hundredth daycare with
a phone number is worth less than an operating schedule on one that already
exists.

## The prompt

```
You run the daily Connecticut search for Village Notes, a public directory at
daricecorey.com/village-notes, and record what you find in Airtable base
appxUByKs5ULrDZQp, table "Resources". The write-safety rules for this base --
closed option lists, no typecast, Services Offered multi-tagged -- govern how
you record it. What follows is what to go looking for.

Work in this priority order. Do not skip to the easy one.

1. TEENS & HIGH SCHOOL — started, and lopsided.

   The technical high schools and interdistrict magnets are in. What is missing
   is everything a family compares them AGAINST, and the routes out of school:

     High School (Public)        the comprehensive high school in each town --
                                 the default option, and the one most families
                                 are actually choosing between
     High School (Private)       independent and parochial
     College Access / Readiness  Upward Bound, GEAR UP, college-access
                                 nonprofits, the state's own programmes

   Those three categories are empty. A family looking at a magnet has nothing
   to weigh it against, which makes the track misleading rather than merely
   thin -- it currently reads as though specialty schools are the only option.

   Start with the towns the directory already covers well, so a family
   searching their own town sees the local high school beside the magnet.
   Then the routes out: registered apprenticeships and youth employment
   through the regional workforce boards, where there is one of each so far.

   Read the track boundary in the recording instructions before you start. It
   is the one most likely to go wrong: a summer camp for fifteen-year-olds is
   still Family & Childcare, and an after-school club is still Afterschool
   Enrichment. This track is the school itself, or a route into work or
   college. Nothing else.

   Grade Range and School District are this track's equivalent of Animals
   Accepted -- the fields a family filters on first. Record both, and use
   Program Setting to say public, magnet, charter or private.

2. THE 424 LISTINGS WITH NO WEBSITE — a bounded, finishable job.

   Every listing missing a URL came from one bulk import of Office of Early
   Childhood childcare providers. Every record research has written carries
   one. So this is not a habit to fix; it is a known set to work through, and
   it has an end.

   It matters more than its dullness suggests. A listing with no URL cannot be
   re-checked by anyone, ever, and never enters the standing source registry --
   so no scheduled re-read will reach it however long the directory runs.
   Finishing this is what takes the re-check schedule from covering a third of
   the directory to covering all of it.

   Find them in Airtable: Moderation Status is Published, Submitted By starts
   "Connecticut Office of Early Childhood", Website is empty. Work by town so
   you can use one municipal or state page for several at once.

   The rules on which URLs count are in the recording instructions and they
   are strict: provider-owned or official only, never a directory or review
   site, and never guessed from the name. An empty Website is better than a
   wrong one. Record Last Verified as you go -- that is what puts the site into
   the re-check queue.

3. ELDER CARE — real now, but still thin per category.

   Half of what this directory claims to be. The measured count is below; the
   shape of the gap is that some categories have several listings and others
   have one or none, so aim for even coverage rather than volume. The five
   Connecticut Area Agencies on Aging are the obvious spine; each publishes
   directories of home care agencies, adult day programmes, congregate meal
   sites and caregiver support groups. Assisted living, memory care and skilled
   nursing are licensed and listed by the state.

   Aim to get every elder category into double figures before adding a
   twentieth childcare centre.

4. DEPTH ON LISTINGS THAT ALREADY EXIST — hours, cost, waitlists.

   Hours and Website are the specific promise on the front of the page, and it
   is mostly unkept. See the measured section below for where that stands now
   -- including the finding that every listing missing a website came from one
   bulk import, which makes this a bounded backfill rather than a habit.

   So spend part of every run going back, not forward. Take listings that have
   a name and a phone number and nothing else, find the provider's own page,
   and fill in Hours/Schedule, Website, Registration Status and Last Verified.
   Update the existing record — do not create a second one.

   If you replace one of these two boilerplate lines with something real, that
   is a win worth reporting:
     "Contact the program directly for current openings, schedule, eligibility,
      and family cost."
     "Reduced state-set fee for eligible families in a funded space." 
   If you cannot find the real thing, leave the boilerplate. Do not paraphrase
   it into something that sounds more specific than what you actually know.

5. THE TOWNS WITH NOTHING.

   Well under half of Connecticut's 169 municipalities appear -- the measured
   count is below. Work from the state's own
   list of municipalities rather than guessing which are missing, and prefer
   the smaller and more rural ones — a family in a town with three options
   needs the directory more than a family in New Haven.

RULES THAT DO NOT BEND

Every fact comes from the provider's own page or an official state source. Not
from an aggregator, not from a review site, not from memory. Set Last Verified
to the date you actually looked.

An empty field is a fine outcome. A field filled with a guess is not. If the
hours are not published, leave Hours/Schedule blank rather than writing
something plausible — a parent will drive there.

Check for an existing record before adding one. Match on organisation name plus
street address. Two sites of one provider in different towns are two records;
the same site written up twice is a duplicate that someone has to clean up.

Set Moderation Status to "Published" on what you research -- and only on what
you research. Public form submissions arrive with it empty and are Darice's to
review; leave those alone, and flag them in your report. Your own records go
live on the next sync with nobody reading them first, which is deliberate --
but it means an unsound record reaches a family before anyone notices. If one is not solid enough to
stand on its own, leave it out and name it in your report rather than
publishing a thinner version of it.

REPORT AT THE END OF EACH RUN
  - how many records you added, by track
  - how many existing records you deepened, and which fields you filled
  - anything you found that has no home in the current categories — do not
    invent an option for it, name it and let Darice decide
```

## Keeping this current

The counts in this brief are no longer typed by hand. They are measured from
the published listings on every sync, so the gaps you are sent at are the
gaps that exist today —
the priority order is that it follows the measurement rather than a hunch.
