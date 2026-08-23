#!/usr/bin/env python3
"""
Build the "Past issues" block for a Darice on AI email.

The website archive (_includes/post-archive.html) groups every published issue
by month, then by the week it went out. The email carries the same idea in a
short form: the last few weeks, same month > week grouping, so a reader who
missed one can get back to it without leaving their inbox.

This writes email-safe HTML only -- tables, divs, inline styles, no CSS classes
that a mail client can drop -- to fill the {{PAST_ISSUES}} placeholder in the
skill's assets/issue-template.html.

Usage:
    python _tools/past-issues-email.py
        Print the block for the most recent issues (default: last 6 weeks,
        at most 6 links), reading _posts/ in this repo.

    python _tools/past-issues-email.py --exclude 2026-08-16
        Leave out the issue you are about to send (normally today's post).

    python _tools/past-issues-email.py --weeks 8 --max 8 --out block.html

Exits 1 if there is nothing to link yet, so a caller can drop the block.
"""

import argparse
import re
import sys
from datetime import date, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
POSTS = REPO / "_posts"
SITE = "https://www.daricecorey.com"

POST_NAME = re.compile(r"^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$")

ACCENT = "#7c3aed"
INK = "#2a2540"
MUTED = "#5d5775"
FAINT = "#6b6583"
SANS = "'DM Sans',Helvetica,Arial,sans-serif"


def read_posts():
    """Every dated post in _posts/ as (date, title, url), newest first."""
    found = []
    for path in sorted(POSTS.glob("*.md")):
        m = POST_NAME.match(path.name)
        if not m:
            continue  # PUBLISHING.md and other non-dated files
        y, mo, d, slug = m.groups()
        text = path.read_text(encoding="utf-8", errors="replace")
        title = slug.replace("-", " ").capitalize()
        tm = re.search(r'^title:\s*"?(.+?)"?\s*$', text, re.MULTILINE)
        if tm:
            title = tm.group(1).strip()
        found.append((date(int(y), int(mo), int(d)), title, f"{SITE}/blog/{slug}/"))
    found.sort(key=lambda row: row[0], reverse=True)
    return found


def week_start(day):
    """The Sunday that starts this post's week -- same rule as the website."""
    return day - timedelta(days=(day.weekday() + 1) % 7)


def escape(text):
    return (text.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace('"', "&quot;"))


def build(posts):
    """Month > week > links, as email-safe HTML."""
    out = []
    current_month = None
    current_week = None
    for day, title, url in posts:
        month = (day.year, day.month)
        if month != current_month:
            current_month = month
            current_week = None
            out.append(
                f'<div style="font-family:{SANS}; font-weight:700; font-size:13px; '
                f'letter-spacing:.5px; color:{INK}; padding:10px 0 2px 0;">'
                f'{day.strftime("%B %Y")}</div>'
            )
        week = week_start(day)
        if week != current_week:
            current_week = week
            out.append(
                f'<div style="font-family:{SANS}; font-weight:700; font-size:11px; '
                f'letter-spacing:1.5px; text-transform:uppercase; color:{ACCENT}; '
                f'padding:8px 0 3px 10px;">Week of '
                f'{week.strftime("%b %-d") if sys.platform != "win32" else week.strftime("%b %#d")}</div>'
            )
        day_label = day.strftime("%a %-d") if sys.platform != "win32" else day.strftime("%a %#d")
        out.append(
            f'<div style="font-family:{SANS}; font-weight:300; font-size:14px; '
            f'line-height:1.5; color:{MUTED}; padding:0 0 5px 20px;">'
            f'<span style="color:{FAINT}; font-size:12px;">{day_label}</span>&nbsp;&nbsp;'
            f'<a href="{escape(url)}" style="color:{ACCENT}; text-decoration:underline;">'
            f'{escape(title)}</a></div>'
        )
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--weeks", type=int, default=6,
                    help="how far back to look, in weeks (default 6)")
    ap.add_argument("--max", type=int, default=6,
                    help="most links to include (default 6)")
    ap.add_argument("--exclude", default=None,
                    help="YYYY-MM-DD of the issue being sent, so it is not listed")
    ap.add_argument("--out", default=None, help="write to this file instead of stdout")
    args = ap.parse_args()

    posts = read_posts()
    if args.exclude:
        skip = date.fromisoformat(args.exclude)
        posts = [row for row in posts if row[0] != skip]
    if posts:
        cutoff = posts[0][0] - timedelta(weeks=args.weeks)
        posts = [row for row in posts if row[0] >= cutoff][: args.max]

    if not posts:
        print("No past issues to link yet.", file=sys.stderr)
        return 1

    block = build(posts)
    if args.out:
        Path(args.out).write_text(block + "\n", encoding="utf-8")
        print(f"Wrote {args.out} ({len(posts)} issues).", file=sys.stderr)
    else:
        print(block)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
