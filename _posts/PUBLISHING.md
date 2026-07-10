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
---
```

- `title` — the issue's headline, in quotes.
- `date` — the send date, `YYYY-MM-DD`, no time.
- `description` — one clean sentence for SEO and the blog card. Adapt the issue's intro
  or preview line; do not just paste the 8-12 word inbox preview.

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
