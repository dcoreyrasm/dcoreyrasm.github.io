#!/usr/bin/env bash
# Publish one blog post to daricecorey.com (GitHub Pages).
#
# Usage:
#   _tools/publish-post.sh "_posts/2026-07-06-my-post.md" "New post: My Post"
#
# Stages the given post, commits, rebases on the remote (it usually has newer
# commits), and pushes to main. GitHub Pages rebuilds within a minute or two.
#
# See _posts/PUBLISHING.md for the post format this expects.
set -euo pipefail

POST="${1:-}"
MSG="${2:-}"

if [[ -z "$POST" ]]; then
  echo "error: pass the post path, e.g. _tools/publish-post.sh \"_posts/2026-07-06-my-post.md\" \"New post: My Post\"" >&2
  exit 1
fi

# Run from the repo root regardless of where this was invoked.
cd "$(dirname "$0")/.."

if [[ ! -f "$POST" ]]; then
  echo "error: post not found: $POST" >&2
  exit 1
fi

# Default commit message from the file's title front matter, if none given.
if [[ -z "$MSG" ]]; then
  TITLE="$(grep -m1 '^title:' "$POST" | sed -E 's/^title:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/')"
  MSG="New post: ${TITLE:-$(basename "$POST" .md)}"
fi

git add "$POST"

if git diff --cached --quiet; then
  echo "Nothing to publish — $POST is already committed with no changes."
  exit 0
fi

git commit -m "$MSG"
git pull --rebase origin main
git push origin main

SLUG="$(basename "$POST" .md | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-//')"
echo "Published. Live shortly at: https://www.daricecorey.com/blog/${SLUG}/"
