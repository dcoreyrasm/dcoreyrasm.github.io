---
layout: prompt
title: "What did you leave out?"
category: Check the answer
description: "One follow-up question that pulls the caveats an AI answer skipped back to the surface, before you rely on it."
published_on: 2026-10-26
tools: [Claude, ChatGPT, Copilot, Gemini]
fill_in: false
prompt: |
  Before I use your answer, check it for me.

  1. What did you leave out?
  2. What would change this answer?
  3. Which parts are you least sure about, and how could I confirm them?

  Keep it short and plain.
how_to:
  - "Ask your question the way you normally would and read the answer."
  - "Copy this prompt and send it as your next message in the same chat."
  - "Read what comes back. If it names something you cannot confirm, check it before you use the answer."
watch_out: "This helps you catch a confident answer that is quietly wrong. It does not replace checking facts that matter, like dates, dollar amounts, medical details, or anything legal."
---
