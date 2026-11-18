---
layout: prompt
title: "Find the messy rows before you fix them"
category: Spreadsheet cleanup
description: "A prompt that lists repeated and inconsistent entries in a shared list so you can check them before anything changes."
published_on: 2026-11-18
tools: [Claude, ChatGPT, Copilot, Gemini]
fill_in: true
prompt: |
  I'm going to share a list from a spreadsheet. Please don't change anything yet. First, find:

  1. Entries that look like the same person or item typed more than one way.
  2. Values in the same column written in different formats, like dates or numbers.
  3. Totals or counts that don't match the rows they add up.

  Show each problem in a short table with the row, what you found, and what you'd suggest. Then wait for me to tell you which fixes to make.

  Here is the list: [paste your list, with phone numbers, addresses, and other private details removed]
how_to:
  - "Make a copy of the sheet and work only on the copy."
  - "Paste the prompt and your list into Claude, ChatGPT, Copilot, or Gemini."
  - "Check a few flagged rows yourself before you approve any fix."
watch_out: "Take out phone numbers, addresses, and anything else private before you paste a list in, and check any total that involves money yourself."
issue_url: "https://www.daricecorey.com/newsletter.html"
---
