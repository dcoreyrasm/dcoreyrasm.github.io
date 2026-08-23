#!/usr/bin/env bash
# Refresh the "Past issues" list inside the newsletter email template.
#
# The template carries the list between two markers:
#     <!-- PAST_ISSUES:START --> ... <!-- PAST_ISSUES:END -->
# This regenerates what sits between them from _posts/, so the template a new
# issue is built from always has current month > week > title links and nobody
# has to remember a step.
#
# Usage:
#   _tools/refresh-email-past-issues.sh                 # refresh from _posts/
#   _tools/refresh-email-past-issues.sh 2026-08-23      # leave that issue out
#   _tools/refresh-email-past-issues.sh 2026-08-23 /path/to/issue-template.html
#
# Self-repairing: if a plugin re-sync has wiped the block out of the skill's
# template, this puts it back from _tools/email-past-issues-block.html.
# Soft-fails (exit 0, message on stderr) when the template cannot be found or
# the list cannot be built, so a publish is never blocked by it.
set -uo pipefail

cd "$(dirname "$0")/.."

EXCLUDE="${1:-}"
TEMPLATE="${2:-}"

if [[ -z "$TEMPLATE" ]]; then
  for root in "$HOME/AppData/Roaming/Claude/local-agent-mode-sessions" "$HOME/.claude"; do
    [[ -d "$root" ]] || continue
    TEMPLATE="$(find "$root" -path '*darice-on-ai-newsletter/assets/issue-template.html' 2>/dev/null | head -1)"
    [[ -n "$TEMPLATE" ]] && break
  done
fi

if [[ -z "$TEMPLATE" || ! -f "$TEMPLATE" ]]; then
  echo "note: newsletter email template not found; skipping past-issues refresh." >&2
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

if ! python _tools/past-issues-email.py ${EXCLUDE:+--exclude "$EXCLUDE"} > "$TMP/block.html" 2>"$TMP/err"; then
  cat "$TMP/err" >&2
  echo "note: could not build the past-issues list; template left as is." >&2
  exit 0
fi

# A re-synced skill loses the whole block. Put it back before the share block.
if ! grep -q 'PAST_ISSUES:START' "$TEMPLATE"; then
  echo "Past issues block missing from the template; restoring it." >&2
  sed -n '/^<tr>$/,$p' _tools/email-past-issues-block.html > "$TMP/whole.html"
  WHOLE="$TMP/whole.html" awk '
    $0 == "<!-- Share / grow -->" && !done {
      print "<!-- Past issues -->"
      while ((getline line < ENVIRON["WHOLE"]) > 0) print line
      done = 1
    }
    { print }
  ' "$TEMPLATE" > "$TMP/restored.html"
  if grep -q 'PAST_ISSUES:START' "$TMP/restored.html"; then
    cp "$TMP/restored.html" "$TEMPLATE"
  else
    echo "note: could not restore the block; see _tools/email-past-issues-block.html." >&2
    exit 0
  fi
fi

BLOCK="$TMP/block.html" awk '
  /PAST_ISSUES:START/ {
    print
    while ((getline line < ENVIRON["BLOCK"]) > 0) print line
    inside = 1
    next
  }
  /PAST_ISSUES:END/ { inside = 0 }
  !inside { print }
' "$TEMPLATE" > "$TMP/out.html"

if ! grep -q 'PAST_ISSUES:END' "$TMP/out.html"; then
  echo "note: refresh produced a template without the end marker; left unchanged." >&2
  exit 0
fi

cp "$TMP/out.html" "$TEMPLATE"
echo "Refreshed the email template's past-issues list ($(grep -c '<a href' "$TMP/block.html") issues)."
