#!/usr/bin/env python3
"""
Blog-sync check for Darice on AI.

Compares the issues actually SENT in MailerLite against the blog posts in
_posts/, and reports any real issue that has no matching post. It does NOT
publish anything, on purpose: the post format (authored prose, validated
links, four generated section-image cards) is a quality step that should not
be machine-scraped. See _posts/PUBLISHING.md. This script's job is only to
make sure a missed issue can't sit unnoticed for a week, which matters most
for scheduled sends that go out with no one at the keyboard.

Run locally or from CI:
    MAILERLITE_API_KEY=... python _tools/blog-sync-check.py

Exit code 0 = in sync. Exit code 1 = one or more sent issues have no post.
Prints a short report either way; the GitHub Action turns a non-zero exit
into a tracking issue.

Matching is by send date: a sent issue dated YYYY-MM-DD is considered posted
if any _posts/YYYY-MM-DD-*.md exists. Only the sent->post direction is
checked, so posts that have no matching send (e.g. authored ahead) are fine.
"""

import glob
import json
import os
import re
import sys
import urllib.request

API = "https://connect.mailerlite.com/api/campaigns?filter[status]=sent&limit=100"
POSTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "_posts")

# A "real" weekly issue, as opposed to a test or a resend. Tune here if the
# naming ever changes.
MIN_RECIPIENTS = 5          # 1-2 recipient sends are test sends
SKIP_NAME = re.compile(r"\b(test|resend)\b", re.I)


def fetch_sent(api_key):
    req = urllib.request.Request(API, headers={
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r).get("data", [])


def is_real_issue(c):
    if SKIP_NAME.search(c.get("name", "")):
        return False
    sent = (c.get("stats") or {}).get("sent") or 0
    if sent < MIN_RECIPIENTS:
        return False
    return True


def issue_date(c):
    # Prefer the scheduled/finished date; fall back to created. Take the date part.
    for k in ("scheduled_for", "finished_at", "created_at"):
        v = c.get(k)
        if v:
            return str(v)[:10]
    return None


def posted_dates():
    dates = set()
    for f in glob.glob(os.path.join(POSTS_DIR, "*.md")):
        m = re.match(r"(\d{4}-\d{2}-\d{2})-", os.path.basename(f))
        if m:
            dates.add(m.group(1))
    return dates


def main():
    api_key = os.environ.get("MAILERLITE_API_KEY")
    if not api_key:
        print("error: set MAILERLITE_API_KEY", file=sys.stderr)
        return 2

    sent = [c for c in fetch_sent(api_key) if is_real_issue(c)]
    have = posted_dates()

    missing = []
    for c in sent:
        d = issue_date(c)
        if d and d not in have:
            missing.append((d, c.get("name", ""), (c.get("emails") or [{}])[0].get("subject", "")))

    missing.sort(reverse=True)
    if not missing:
        print(f"In sync: {len(sent)} sent issues, all have a blog post.")
        return 0

    print(f"MISSING {len(missing)} issue(s) from the blog:")
    for d, name, subject in missing:
        print(f"  {d}  {subject or name}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
