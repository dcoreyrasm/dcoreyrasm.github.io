# Community AI — Free AI Learning

**Report before deployment · 25 October 2026**

Branch `claude/ai-resources-community-page-x630uw`, commit `a23ded6`. Pushed, **not deployed**. Nothing is live until you merge to `main`.

---

## 1. What was built, and where

A new page at **`/community-ai/learn/`**, inside Community AI rather than on top of it.

You asked me two steps ago to simplify the directory page — fewer checkboxes, less confusion about how to filter. Stacking a course finder, a second filter system, a certificates section and an events calendar onto that page would have undone it. So the learning material got its own address, reading the same data, and the directory page gained one thing: a band pointing to it.

Four sections, in this order:

1. **Find Your AI Learning Path** — 11 paths, one click, no questions asked and nothing collected.
2. **Browse every free course** — all 83, with search, five filters, quick filters, sorting and paging.
3. **Free courses that offer a certificate** — 15 courses.
4. **Free AI Workshops & Events** — the dated sessions.

Then, and only then, **"Prefer to learn with an instructor?"**

---

## 2. Files

| File | Change | Lines |
|---|---|---|
| `community-ai/learn/index.html` | new | 281 |
| `community-ai/learn/learn.css` | new | 200 |
| `community-ai/learn/script.js` | new | 767 |
| `community-ai/index.html` | modified | +17 |

The change to the directory page is a link band after the hero and a footer link. Nothing else on it was touched, and no other page on the site was touched. `styles.css`, the shared nav, the Airtable sync script, the GitHub Action and the vocabulary checker are all unchanged.

---

## 3. Where the data comes from

The page fetches `/community-ai/data/opportunities.json` — **the same file the directory reads**. There is no second data source, no second sync, and no Airtable call from the browser. The token stays where it was: a GitHub Actions secret used by `_tools/fetch-community-ai.py`. I searched the built page for credentials and API references and found none.

The directory's 6-hourly sync keeps this page current with no extra wiring.

**Airtable fields used:**

| Field | Used for |
|---|---|
| Type | Splits courses (83 `Free Training`) from events (17 `Event`) |
| Cost Structure | The cost classification on every card |
| Beginner Friendly | Experience filter, the beginner quick filter, the hero count |
| Delivery Format | Format filter and the self-paced / live quick filters |
| Audience Stage | "Who it is for" filter, and 7 of the 11 finder paths |
| Community Topics | Topic filter, and 4 finder paths |
| Age Group | The older-adult path |
| Support Available | The certificates section and the governance path |
| Who Can Participate | The nonprofit path |
| Languages, Accessibility Features | Card labels only, where stated |
| Title, Organization, Description, Best Fit, URL, Last Checked, Application Deadline | Card content and search |

---

## 4. What the data could not support, and what I did instead

This is the part worth reading closely.

| Asked for | What the base holds | What the page does |
|---|---|---|
| **Certificates, free** | No certificate field. The nearest is `Support Available = "Certification or exam voucher"` (15 courses) and `Cost Structure = "Free training, paid exam"` (3) | Built the section from those 15. The note says plainly that the directory records only *that* a certificate is offered — not what it is called, what it is worth, or whether claiming it costs anything. Two of the 15 state a paid exam, and their cards say so. |
| **Estimated duration** | No field | Not shown anywhere. The footer says so. |
| **"No account required"** | No field | Not shown anywhere. The footer says so. |
| **Topics like ChatGPT, Claude, prompting, AI agents** | Community Topics is sector-based: "Education and tutoring" (43), "Technology and coding" (33), "Responsible AI and privacy" (28) | Filter uses the real values. The finder paths map plain-language goals onto them, so "I want to understand AI safety and ethics" finds the responsible-AI records without pretending a safety topic exists. |
| **Older adults** | `Age Group = "Older adults"` on exactly **1** course | The path returns that one course, then a labelled **"Broader suggestions"** divider, then beginner-friendly free courses. It never passes the widened results off as matches. |
| **Event times** | No start time, end time or timezone. 13 of 17 events carry a date in `Application Deadline`, doing double duty | Shows the date only, and says in the section note that it comes from the deadline field and carries no time or timezone. |
| **Languages, accessibility** | Spanish on 3 of 83; accessibility stated on 2 | Too thin to filter on — they would look broken. Shown as card labels where present. |

**Cost is never guessed.** `Free` → "Free". `Free training, paid exam` → "Free course, paid exam". `Limited free plan` / `Free trial` → "Free tier". `Mixed or varies` → "Some free, some paid". Anything unstated gets an **outlined** "Cost not confirmed" tag rather than a bright one, so silence cannot read as a promise. Four courses and four events currently land there.

That rule also reshaped the events section. Of 8 upcoming sessions, 4 have a confirmed-free cost and 4 do not. Putting all 8 under a heading that says "Free" would have made a claim the data does not support, so the 4 confirmed-free ones are in that grid and the other 4 sit below under **"Also coming up, cost not confirmed."** Both groups are useful; only one is called free. Five past sessions are dropped, and the 4 undated ones are left out rather than given a date they do not have.

---

## 5. Keeping free and paid apart

Everything free comes first. Darice Corey, LLC appears **once**, after the whole free library, as "Prefer to learn with an instructor?" — two cards side by side, your workshops and Community AI, so the free option is still on screen at the moment the paid one is offered.

No pop-ups, no interstitials, no banner following the reader down the page, and nothing suggesting the free courses are second-rate — the section opens by saying free courses are a great way to get started.

**The paid cards name no prices.** Pricing and which parts are still open change as the series runs, so the course page is the only place that states them. A price copied onto this page would go stale and contradict you.

---

## 6. How the existing design was reused

No new palette was invented. The colour comes from the pops you already had, documented in `styles.css` as extracted from the Start Your Business graphic:

```
--pop-gold: #fdb926    --pop-teal: #1fd6dc    --pop-rose: #f45d6b    --pop-ink: #16131f
```

Those tokens carry a rule in your stylesheet: bright fills always take Deep Plum text, never the reverse. This page follows it. The finder buttons and course cards rotate gold → teal → rose on their top border exactly as `.services-grid .service-card` does on your course pages, the hero stats are your `.pop-pill`, and the instructor cards are your `.service-card.pop-card`.

The filter boxes, chips, result counts, quick filters and empty states are the directory's own components from `community-ai.css`, reused rather than restated — so the two halves of Community AI read as one thing. `learn.css` adds only what is genuinely new.

Colour is never the only signal. A chosen path shows an outlined circle that fills with a tick; a chosen filter shows a tick, a label change and a removable chip; an unconfirmed fact is an outlined tag, which stays distinguishable in greyscale.

---

## 7. Accessibility

Measured, not assumed — **17 structural checks and 26 contrast measurements, in both light and dark mode**.

- Contrast: every text/background pair passes WCAG 2.2 AA, lowest **5.78:1** against a 4.5 requirement. Translucent surfaces (search highlight, filter chips) were composited over what sits behind them rather than measured as if opaque — 8.20:1 and 12.87:1.
- Keyboard: full operation without a mouse. Filter boxes open on Enter and close on Escape with focus returned to the button that opened them; choosing a path moves focus to the result heading so a screen-reader user lands on the answer.
- One `h1`, no heading level skipped, every control has an accessible name, no duplicate IDs, working skip link, every fieldset has a legend.
- Result counts announce through an `aria-live` region; toggle state is carried by `aria-pressed` and `aria-expanded`.
- Reflow at 320px with no horizontal scrolling (WCAG 1.4.10). No interactive target under 24px, excluding links inside sentences, which the standard exempts.
- `prefers-reduced-motion` is honoured — transitions stop and the hover lift is removed.
- Checked at 375, 390, 768 and 1440px with no horizontal overflow at any width.

---

## 8. Performance and security

8 requests, **192 KB gzipped**, first contentful paint 416ms, DOM ready 394ms, fully interactive in about 1.3 seconds locally. The page's own three files are 26 KB gzipped combined.

The bulk — 151 KB gzipped — is `opportunities.json`, which carries all 276 entries because it is the shared file. The directory page already pays this exact cost today, so this is not a regression, but see the recommendations.

Security: no inline event handlers, no `innerHTML` written from unescaped data, every outbound link `rel="noopener noreferrer"`, and only `http(s)` URLs are rendered — a malformed value in the URL field cannot become a `javascript:` link. All 53 outbound links verified.

Nothing is collected. No form, no account, no analytics event on finder use, no `localStorage`, and nothing written back to Airtable. The finder's state lives in a variable and disappears on refresh.

---

## 9. Test results

| Suite | Result |
|---|---|
| Functional, dark mode | **97 passed, 0 failed** |
| Functional, light mode | **97 passed, 0 failed** |
| Accessibility | **17 passed, 0 failed** |
| Jekyll build | Clean; cache stamps resolve; no unprocessed Liquid |
| `check-community-vocabulary.js` | Clean — 3 doors, 6 legal statuses, 20 of 25 industries, all 37 fields answered |
| `check-vocabulary.js` | Clean — 65 categories, 5 tracks |
| Console errors | None first-party |
| Directory page | Still renders all 276 entries, no new overflow, console clean |

Covered: all 11 finder paths, the widening behaviour, search with highlighting, the no-match state, each of the 5 filter boxes, multi-select within a filter, combining across filters, chip removal, reset, all 5 sort orders, paging through all 83, the certificates section, both event groups, link safety, keyboard-only operation, and four viewport widths.

Five findings surfaced during testing and all five are fixed: the search box was unstyled on mobile because the directory styles its input by ID (`#cf-q`) so nothing reached `#lrn-q`; a card link could push past the viewport below 320px; the older-adult explanation said the same thing twice and named the wrong fallback; events whose cost was unconfirmed were sitting under a heading that said "free"; and the finder's widened results were blended in with real matches.

---

## 10. Recommendations, in the order I would do them

1. **Review it, then merge.** Nothing is live. The page is at `/community-ai/learn/` on the branch.
2. **Add "Free AI Learning" to the main site nav.** The nav include touches every page on the site, which is outside what you asked me to change, so I left it alone. It is currently reachable from the directory band and both footers. One line in `_includes/site-nav.html` under Projects.
3. **Two Airtable fields would unlock a lot** — and I have changed nothing in Airtable. A *Time commitment* single-select (under 1 hour / 1–5 / 5–20 / 20+) and an *Account required* checkbox are the two most-missed facts; "how long will this take me" is the first question most people ask about a free course. A *Certificate cost* field would let the certificates section say something firmer than it can today.
4. **Set Cost Structure on the 4 courses and 4 events showing "Cost not confirmed."** Each is one dropdown. The four events are OpenAI Academy sessions that are very likely free, but the page will not say so until the field does.
5. **Consider trimming the JSON the pages download.** Both pages pull 151 KB gzipped to render. The sync script could emit a slimmer projection alongside the full file — same source, same script, one generator — but it is still another artifact to keep honest, so it is your call rather than mine.
6. **"Older adults" is set on 1 of 83 courses.** The page handles that gracefully, but tagging the courses that genuinely suit older learners would make that path answer properly rather than widen.
7. **Revisit after your presentation.** Which finder paths people actually press is the best evidence for which ones deserve to exist, and Clarity already records clicks on this page.

---

## What I did not do

- Did not deploy, and did not open a pull request.
- Did not change any Airtable record, field, option or table.
- Did not change `styles.css`, the shared nav, the sync script or the Action.
- Did not change any page other than the directory's link band.
- Did not add an AI API, an account, a form, or any data collection.
- Did not invent a date, a price, a duration or a palette.
