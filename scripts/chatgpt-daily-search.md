# Daily search brief for Village Notes

Paste the fenced block into the scheduled ChatGPT search that adds resources to
the Village Notes base. It says **what to look for**. The companion file,
`chatgpt-instructions.md`, says **how to record it** — the closed option lists,
the no-typecast rule, the multi-tagging. Both are needed; neither repeats the
other.

## Why this replaces the old search

Two things changed on 2026-08-27. There is a third track, Pet Care & Resources,
with nineteen categories and no listings in it at all. And measuring what the
directory actually holds changed what is worth searching for.

The headline: **the directory is broad and shallow.** 547 listings covering 109
of Connecticut's 169 towns is real breadth. But of those 547:

| The site promises | It actually has |
|---|---|
| real operating hours | **95** listings with any hours at all |
| honest waitlist timelines | **49** — the other 427 say "contact the program directly" |
| what it actually costs | **77** — the other 426 repeat one state-fee sentence |
| somewhere to click | **123** with a website |

The boilerplate came in with the state import and was honest at the time. It is
not knowledge, and the page's "needs detail" sort already discounts it. So the
search should no longer be measured in listings added. A hundredth daycare with
a phone number is worth less than an operating schedule on one that already
exists.

## The prompt

```
You run the daily Connecticut search for Village Notes, a public directory at
daricecorey.com/village-notes. Record what you find in Airtable base
appxUByKs5ULrDZQp, table "Resources", following the write-safety standard you
already have — closed option lists, no typecast, Services Offered multi-tagged.
This brief only tells you what to go looking for.

Work in this priority order. Do not skip to the easy one.

1. PET CARE & RESOURCES — the new track, currently empty.

   A visitor can select it today and get nothing, which is worse than not
   offering it. Fill it first.

   Start with what people search for in a crisis, because that is when a
   directory earns its place: emergency and after-hours veterinary hospitals,
   then low-cost and income-qualified clinics, then spay/neuter and vaccination
   programmes. Municipal animal control, humane societies and regional rescues
   are good spines — they publish real hours and often run the assistance
   programmes too.

   Then the everyday: dog daycare, boarding, in-home sitting, walking,
   grooming, training. Start in the towns the directory already covers, so a
   family searching their own town finds both kinds of care in one place.

   Animals Accepted is not optional on this track. A kennel that takes only
   dogs is no use to somebody with a rabbit, and it is the first thing an owner
   filters on. If the provider does not say, leave it blank — do not assume dogs.

2. ELDER CARE — ten listings, about one per category.

   Half of what this directory claims to be, and it is nearly empty. The five
   Connecticut Area Agencies on Aging are the obvious spine; each publishes
   directories of home care agencies, adult day programmes, congregate meal
   sites and caregiver support groups. Assisted living, memory care and skilled
   nursing are licensed and listed by the state.

   Aim to get every elder category into double figures before adding a
   twentieth childcare centre.

3. DEPTH ON LISTINGS THAT ALREADY EXIST — the biggest gap of all.

   Only 95 of 547 listings carry operating hours, and 123 carry a website. That
   is the specific promise on the front of the page and it is mostly unkept.

   So spend part of every run going back, not forward. Take listings that have
   a name and a phone number and nothing else, find the provider's own page,
   and fill in Hours/Schedule, Website, Registration Status and Last Verified.
   Update the existing record — do not create a second one.

   If you replace one of these two boilerplate lines with something real, that
   is a win worth reporting:
     "Contact the program directly for current openings, schedule, eligibility,
      and family cost."   (on 427 records)
     "Reduced state-set fee for eligible families in a funded space."
      (on 426 records)
   If you cannot find the real thing, leave the boilerplate. Do not paraphrase
   it into something that sounds more specific than what you actually know.

4. THE SIXTY TOWNS WITH NOTHING.

   109 of Connecticut's 169 municipalities appear. Work from the state's own
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

Set Moderation Status to "Pending Review" unless Darice has said otherwise.

REPORT AT THE END OF EACH RUN
  - how many records you added, by track
  - how many existing records you deepened, and which fields you filled
  - anything you found that has no home in the current categories — do not
    invent an option for it, name it and let Darice decide
```

## Keeping this current

The counts above are from 2026-08-27. Re-measure before rewriting this brief —
`village-notes/data/resources.json` holds everything needed, and the point of
the priority order is that it follows the measurement rather than a hunch.
