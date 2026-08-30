# Publishing a Darice on AI issue to the blog

Every weekly *Darice on AI* newsletter issue is also published here as a blog post.
The newsletter itself is a designed HTML email (built by the `darice-on-ai-newsletter`
skill and sent from MailerLite). The blog version is a plain Markdown post generated
from the **same content** — do not scrape the email HTML. Author the post from the
four tool cards the issue already contains.

This file is the source of truth for the post format. It lives in the repo (not in the
skill) on purpose, so the process survives even if the skill is ever re-installed.

## Where the post goes

`_posts/YYYY-MM-DD-<slug>.md`

- `YYYY-MM-DD` = the issue's send date (the same date used everywhere for that issue).
- `<slug>` = the title, lowercased, spaces to hyphens, punctuation removed.
  Example: "Set It Up Once, Stop Re-Explaining Yourself" → `set-it-up-once-stop-re-explaining-yourself`.

Jekyll turns this into a clean URL automatically: `/blog/<slug>/`.

## Front matter (exact shape)

```yaml
---
layout: post
title: "Four Ways to Stop Starting From Scratch"
date: 2026-07-01
description: "One-sentence summary of the issue, ~15-25 words, no line breaks."
image: /assets/blog/2026-07-01/claude.png
---
```

- `title` — the issue's headline, in quotes.
- `date` — the send date, `YYYY-MM-DD`, no time.
- `description` — one clean sentence for SEO and the blog card. Adapt the issue's intro
  or preview line; do not just paste the 8-12 word inbox preview.
- `image` — the issue's Claude card, `/assets/blog/<date>/claude.png`. This is what
  LinkedIn, other social cards, and search results show as the preview, and it feeds the
  `BlogPosting` structured data in `_layouts/post.html`. Omit it only if the issue has no
  section images; the layout then falls back to the site headshot. The auto-publisher
  writes this line for you.

## Body (maps 1:1 to the four tool cards)

1. The intro paragraph (two or three sentences framing the theme).
2. One `## Tool: <feature>` section per tool, in the fixed order **Claude, ChatGPT,
   Copilot, Gemini**. Inside each:
   - a one-line description of the feature,
   - the numbered steps (same steps as the email card),
   - a `**When to reach for it:**` line,
   - a `Source: [Label](https://validated-url)` line (the same validated official link).
3. The standard closer, verbatim:

   ```
   Want this in your inbox each week? [Subscribe to Darice on AI](https://www.daricecorey.com/newsletter.html).
   ```

See the two reference posts already in this folder for the exact rhythm:
`2026-07-01-four-ways-to-stop-starting-from-scratch.md` and
`2026-07-06-set-it-up-once-stop-re-explaining-yourself.md`.

## Section images (one per tool)

Every issue gets **four images, one embedded in each tool's section** (Claude,
ChatGPT, Copilot, Gemini). Each is a "feature card": the platform's name and accent
color, an icon, and that section's one-line feature label, on the site's dark card.
They are **PNG** (email clients strip SVG) and live in the repo so they load from
`daricecorey.com` in both the email and the blog.

**Generate them** with the reusable Pillow generator (Python + Pillow only, no other
tooling — so the Sunday automation can run it too):

1. Write a config for the issue at `_tools/section-images/YYYY-MM-DD.json`. Copy the
   most recent one and edit the four `label` lines to match this issue's features.
   Keep the fixed per-platform `accent`; pick an `icon` from the set in
   `generate.py` (`photo_text`, `target_photo`, `live_camera`, `snap_camera`, …) — add
   a new icon function there if none fits.
2. From the repo root:
   `python _tools/section-images/generate.py _tools/section-images/YYYY-MM-DD.json`
   → writes `assets/blog/YYYY-MM-DD/{claude,chatgpt,copilot,gemini}.png`.

**Embed in the blog post** — put the image right under each `## Tool:` heading, with
real alt text:

```
## Claude: <feature>

![Claude: <feature label>](/assets/blog/YYYY-MM-DD/claude.png){: .section-image }

<the section text...>
```

The `{: .section-image }` class renders the card at a modest centered width (~440px)
instead of the full content column — keep it on every section image.

**Embed in the email** — the newsletter HTML references the same files by **absolute**
URL (`https://www.daricecorey.com/assets/blog/YYYY-MM-DD/claude.png`), so the PNGs must
be committed and pushed *before* the email is sent. Display them at a matching modest
width (`width="440"` on the `<img>`), not full bleed.

**Only publish images we have the right to use.** These generated cards are original,
which is why we make them instead of lifting screenshots or logos from the tools'
help/docs pages — those are copyrighted.

**Social-share image (optional):** the post layout falls back to `/darice.jpg` for the
Open Graph / Twitter card unless a post sets `image:` in its front matter (point it at a
`.png`/`.jpg`, not an SVG).

## The same accuracy rules apply

The blog post carries the same standing rules as the newsletter: no invented facts or
features, no em-dashes, and every source link must be a validated first-party page. If a
link could not be validated for the email, it does not go in the post either.

## Publishing (git)

From the repo root, after the `_posts/YYYY-MM-DD-<slug>.md` file is written:

```bash
_tools/publish-post.sh "_posts/YYYY-MM-DD-<slug>.md" "New post: <Title>"
```

That helper stages the file, commits, pulls with rebase (the remote often has newer
commits), and pushes to `main`. GitHub Pages rebuilds within a minute or two and the
post appears at `https://www.daricecorey.com/blog/<slug>/` and in `/feed.xml`.

If you'd rather run it by hand, the equivalent commands are:

```bash
git add "_posts/YYYY-MM-DD-<slug>.md"
git commit -m "New post: <Title>"
git pull --rebase origin main
git push origin main
```

Publish the post when the issue is final and approved — the same moment it's ready to
send from MailerLite — so the blog and the email stay in sync.

## The archive (month, then week)

Past issues are browsable from three places, all fed by the same include, so nothing has
to be hand-maintained when a post is published:

- `_includes/post-archive.html` — the shared component. It groups `site.posts` by month,
  then by Sunday-start week, and renders each month as a collapsible `<details>`. The
  newest month is open by default; on a post page that post's month is open too and its
  own entry is flagged.
- Where it appears: `blog.html` (an "Archive" section under the six latest post cards),
  `newsletter.html` (a "Past issues" section above the signup form), and `_layouts/post.html`
  (a compact "Past issues" section under every post).
- Styles live in `styles.css` under the `.post-archive` / `.archive-*` block, namespaced so
  they touch nothing else on the site.

A new post joins all three automatically on the next Pages build. Nothing to update by hand.

**In the email.** The issue template carries a matching "Past issues" block with the same
month, then week, then title grouping. Its markup is kept here as
`_tools/email-past-issues-block.html` (the skill's copy can be wiped by a plugin re-sync;
this one is the source of truth), and the list itself sits between two markers:

```html
<!-- PAST_ISSUES:START --> ... <!-- PAST_ISSUES:END -->
```

`_tools/publish-post.sh` regenerates what is between them on every publish, excluding the
issue it just published, so the template a new issue is built from always carries current
links and there is no per-issue step. To refresh it by hand:

```bash
_tools/refresh-email-past-issues.sh YYYY-MM-DD
```

Defaults to the last six weeks, at most six links (`_tools/past-issues-email.py` does the
rendering; `--weeks` and `--max` change the size). The list is built from the **live site
feed** (`/feed.xml`), not the local `_posts/` folder, so the email lists exactly what the
website archive shows even when a post was published from CI or another machine; it falls
back to `_posts/` if the feed cannot be read.

Two other things run it, so the template cannot quietly drift: the Sunday scheduled task
runs it after it pushes, and the newsletter skill runs it as the first step of building an
issue. It is idempotent, so running it more than once is free. The refresh is also
self-repairing: if a plugin re-sync has wiped the block out of the skill's template, it
puts the whole block back from the repo copy. It soft-fails rather than blocking a
publish, so if the template cannot be found the publish still succeeds and says so.

One limit worth naming: an email is frozen the moment it is sent. An issue sent in August
keeps the list it shipped with, which is why every issue also carries the "See the full
archive" link back to the site, where the archive is always current.

## Automation

Three GitHub Actions back this process up so a scheduled send can't quietly skip the blog:

- **Due-post publisher** (`.github/workflows/publish-due-posts.yml`): runs every morning
  (11:05 and 14:05 UTC) and, on the day a post's front-matter date arrives, asks Pages for a
  fresh build. This exists because `_config.yml` sets no `future` key, so Jekyll skips
  future-dated posts, and the legacy build-from-branch Pages setup only rebuilds on a push.
  Without it, a post written ahead of its send date stays invisible until some unrelated push
  happens to land. Write a post for a future date, merge it whenever, and it goes live on its
  own date. On a day with no due post it does nothing. `workflow_dispatch` runs it by hand.

- **Monitor** (`.github/workflows/blog-sync-check.yml`, `_tools/blog-sync-check.py`): runs daily, compares sent issues to `_posts/`, and opens a tracking issue if any issue has no post. It never publishes.
- **Auto-publisher** (`.github/workflows/newsletter-to-blog.yml`, `_tools/newsletter-to-blog.py`): runs **hourly**, and for any sent issue missing a post it parses the issue, builds the post and the four cards, and **commits them straight to `main`**. GitHub Pages rebuilds and the post goes live within about an hour of a send — no review step, no one at the keyboard.

The auto-publisher deliberately relaxes the "do not scrape the email HTML" rule above. Because it publishes directly, two things hold the line instead of a human review: a parse that does not cleanly recognize the four tool cards raises and commits **nothing** (a malformed issue can never publish a broken post), and the Monitor opens a tracking issue if a send still has no post. The post title comes from the issue's H1 headline; steps, when-notes, and sources come from the four tool cards; the section-image cards use the neutral `doc_stack` icon. If you want to author by hand instead (still fine when you build an issue live), just publish the post before the top of the next hour and the auto-publisher will see the date is already covered and skip it.

It reaches the email HTML through the single-campaign API endpoint (`GET /campaigns/{id}`); the list endpoint omits `emails[].content`, so the script fetches each new issue's detail before parsing.

Both Actions need a repository secret `MAILERLITE_API_KEY` (Settings > Secrets and variables > Actions).

> A fuller operations runbook — how to change the cadence, the real-issue filter, and the
> post template, plus troubleshooting steps — is kept privately outside this repository.
> Ask Darice for it before making changes to the automation.
