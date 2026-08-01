#!/usr/bin/env python3
"""
Auto-draft blog posts from sent Darice on AI issues.

This is the auto-publisher half of the blog pipeline. For every issue SENT in
MailerLite that has no post yet, it parses the issue's HTML (the template is
consistent and machine-generated), builds a Jekyll post in the PUBLISHING.md
format, writes a section-image config, and generates the four cards. It writes
files only. The GitHub workflow opens a PULL REQUEST with the result, so a
human reviews and merges. Nothing goes live unreviewed.

This intentionally relaxes the "do not scrape the email HTML" rule in
PUBLISHING.md, but only behind the PR gate: the parse produces a draft, and the
human review is where the quality bar is held. Prefer authoring by hand when
you're building an issue live; this exists to catch scheduled sends that go out
with no one at the keyboard.

Usage:
    MAILERLITE_API_KEY=... python _tools/newsletter-to-blog.py
        Draft posts for every sent issue missing from _posts/.

    python _tools/newsletter-to-blog.py --campaign-json fixture.json
        Offline: process a single campaign dict from a file (for testing).

    python _tools/newsletter-to-blog.py --no-images
        Skip card generation (e.g. when Pillow/fonts aren't available).

Prints the slugs it wrote. Exit 0 always unless it errors hard.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request

from bs4 import BeautifulSoup

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
POSTS_DIR = os.path.join(ROOT, "_posts")
CONFIG_DIR = os.path.join(HERE, "section-images")
GENERATOR = os.path.join(HERE, "section-images", "generate.py")

API = "https://connect.mailerlite.com/api/campaigns?filter[status]=sent&limit=100"
CAMPAIGN = "https://connect.mailerlite.com/api/campaigns/{}"

TOOLS = ["Claude", "ChatGPT", "Copilot", "Gemini"]
ACCENTS = {"Claude": "#d97757", "ChatGPT": "#10a37f", "Copilot": "#2e7df6", "Gemini": "#9168e8"}
DEFAULT_ICON = "doc_stack"   # neutral; retheme in the PR if you want

MIN_RECIPIENTS = 5
SKIP_NAME = re.compile(r"\b(test|resend)\b", re.I)

CLOSER = ("Want this in your inbox each week? "
          "[Subscribe to Darice on AI](https://www.daricecorey.com/newsletter.html).")


# ---- MailerLite ---------------------------------------------------------

def fetch_sent(api_key):
    req = urllib.request.Request(API, headers={
        "Authorization": f"Bearer {api_key}", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("data", [])


def fetch_campaign(api_key, cid):
    """Fetch one campaign's full detail. The list endpoint (fetch_sent) omits
    the email HTML (emails[].content); only the single-campaign endpoint
    returns it, and the parser needs that HTML, so fetch it per new issue."""
    req = urllib.request.Request(CAMPAIGN.format(cid), headers={
        "Authorization": f"Bearer {api_key}", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        obj = json.load(r)
    return obj.get("data", obj)


def is_real_issue(c):
    if SKIP_NAME.search(c.get("name", "")):
        return False
    return ((c.get("stats") or {}).get("sent") or 0) >= MIN_RECIPIENTS


def issue_date(c):
    for k in ("scheduled_for", "finished_at", "created_at"):
        if c.get(k):
            return str(c[k])[:10]
    return None


# ---- parsing ------------------------------------------------------------

def clean(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def title_from_name(name):
    # "Darice on AI - Give This Project One Home - 2026-07-26" -> "Give This Project One Home"
    t = re.sub(r"^\s*darice on ai\s*[-—:]\s*", "", name, flags=re.I)
    t = re.sub(r"\s*[-—(]\s*\(?\d{4}-\d{2}-\d{2}\)?\s*\)?\s*$", "", t)
    return clean(t)


def slugify(title):
    s = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return re.sub(r"-{2,}", "-", s)


def first_sentence(text, limit=180):
    text = clean(text)
    m = re.search(r"(.+?[.!?])(\s|$)", text)
    s = m.group(1) if m else text
    return (s[:limit].rstrip() + "...") if len(s) > limit else s


def parse_issue(campaign):
    """Return a dict: title, date, description, intro, sections[]. Raises on a
    structure it doesn't recognize, so a bad parse becomes a visible failure
    rather than a silently wrong post."""
    email = (campaign.get("emails") or [{}])[0]
    html = email.get("content") or ""
    soup = BeautifulSoup(html, "html.parser")

    # Prefer the issue's own H1 headline (matches how posts have been titled);
    # fall back to the campaign name's middle segment if there's no H1.
    h1 = soup.select_one("h1")
    title = (clean(h1.get_text()) if h1 else "") or title_from_name(
        campaign.get("name", ""))
    date = issue_date(campaign)

    intro_el = soup.select_one("td.intro p") or soup.select_one("td.intro")
    intro = clean(intro_el.get_text()) if intro_el else ""

    sections = []
    cards = soup.select("table.bg-callout")
    for i, card in enumerate(cards[:4]):
        tool = TOOLS[i] if i < len(TOOLS) else clean(
            (card.select_one("span.t-accent") or card).get_text())
        h2 = card.select_one("h2.card-h") or card.select_one("h2")
        feature = clean(h2.get_text()) if h2 else ""

        # steps: paragraphs led by a "N." accent span
        steps = []
        desc = ""
        for p in card.find_all("p"):
            txt = clean(p.get_text())
            if re.match(r"^\d+\.", txt):
                steps.append(re.sub(r"^\d+\.\s*", "", txt))
            elif not desc and txt:
                desc = txt

        when_cell = card.select_one("td.when-cell")
        when = ""
        if when_cell:
            label = when_cell.select_one("span.when-label")
            if label:
                label.extract()
            when = clean(when_cell.get_text())
        if not when:
            # Some issue templates render the note as a plain paragraph
            # ("When to reach for it: ...") rather than a td.when-cell box.
            # Accept either so the two formats never drift the note off the blog.
            for p in card.find_all("p"):
                t = clean(p.get_text())
                m = re.match(r"(?i)^when to reach for it\s*[:\-–—]\s*", t)
                if m:
                    when = t[m.end():].strip()
                    break

        src = card.select_one("div.t-faint a") or card.select_one("a[href^='http']")
        source_text = clean(src.get_text()) if src else "Source"
        source_url = src["href"] if src and src.has_attr("href") else ""

        if not (feature and steps and source_url):
            raise ValueError(f"{title}: card {i} ({tool}) parsed incompletely; "
                             f"feature={bool(feature)} steps={len(steps)} src={bool(source_url)}")

        sections.append({
            "tool": tool, "feature": feature, "desc": desc,
            "steps": steps, "when": when,
            "source_text": source_text, "source_url": source_url,
        })

    if len(sections) != 4:
        raise ValueError(f"{title}: expected 4 tool cards, found {len(sections)}")

    return {
        "title": title, "date": date, "slug": slugify(title),
        "description": first_sentence(intro), "intro": intro, "sections": sections,
    }


# ---- rendering ----------------------------------------------------------

def lower_first(s):
    return s[:1].lower() + s[1:] if s else s


def render_markdown(issue):
    lines = ["---", "layout: post", f'title: "{issue["title"]}"',
             f'date: {issue["date"]}', f'description: "{issue["description"]}"',
             "---", "", issue["intro"], ""]
    for s in issue["sections"]:
        lines.append(f'## {s["tool"]}: {lower_first(s["feature"])}')
        lines.append("")
        lines.append(f'![{s["tool"]}: {s["feature"]}]'
                     f'(/assets/blog/{issue["date"]}/{s["tool"].lower()}.png){{: .section-image }}')
        lines.append("")
        if s["desc"]:
            lines.append(s["desc"])
            lines.append("")
        for n, step in enumerate(s["steps"], 1):
            lines.append(f"{n}. {step}")
        lines.append("")
        if s["when"]:
            lines.append(f'**When to reach for it:** {lower_first(s["when"])}')
            lines.append("")
        lines.append(f'Source: [{s["source_text"]}]({s["source_url"]})')
        lines.append("")
    lines.append(CLOSER)
    lines.append("")
    return "\n".join(lines)


def render_config(issue):
    return {
        "outdir": f'assets/blog/{issue["date"]}',
        "sections": [
            {"platform": s["tool"], "accent": ACCENTS[s["tool"]],
             "icon": DEFAULT_ICON, "label": s["feature"]}
            for s in issue["sections"]
        ],
    }


def posted_dates():
    dates = set()
    for f in os.listdir(POSTS_DIR):
        m = re.match(r"(\d{4}-\d{2}-\d{2})-.*\.md$", f)
        if m:
            dates.add(m.group(1))
    return dates


def write_issue(issue, make_images=True):
    post_path = os.path.join(POSTS_DIR, f'{issue["date"]}-{issue["slug"]}.md')
    with open(post_path, "w") as f:
        f.write(render_markdown(issue))
    cfg_path = os.path.join(CONFIG_DIR, f'{issue["date"]}.json')
    with open(cfg_path, "w") as f:
        json.dump(render_config(issue), f, indent=2)
        f.write("\n")
    if make_images:
        subprocess.run([sys.executable, GENERATOR, cfg_path], cwd=ROOT, check=True)
    return post_path


# ---- main ---------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--campaign-json", help="process one campaign dict from a file (offline test)")
    ap.add_argument("--no-images", action="store_true")
    args = ap.parse_args()

    make_images = not args.no_images

    if args.campaign_json:
        with open(args.campaign_json) as f:
            campaigns = [json.load(f)]
    else:
        key = os.environ.get("MAILERLITE_API_KEY")
        if not key:
            print("error: set MAILERLITE_API_KEY", file=sys.stderr)
            return 2
        campaigns = [c for c in fetch_sent(key) if is_real_issue(c)]

    have = posted_dates()
    wrote = []
    for c in campaigns:
        d = issue_date(c)
        if not args.campaign_json and d in have:
            continue
        if not args.campaign_json:
            c = fetch_campaign(key, c["id"])   # list omits the email HTML
        issue = parse_issue(c)
        write_issue(issue, make_images=make_images)
        wrote.append(f'{issue["date"]}-{issue["slug"]}')

    if wrote:
        print("Drafted:")
        for w in wrote:
            print("  " + w)
    else:
        print("Nothing to draft; blog is in sync.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
