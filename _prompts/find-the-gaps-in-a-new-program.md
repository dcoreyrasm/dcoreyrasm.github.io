---
layout: prompt
title: "Find the Gaps in a New Program"
category: Planning and review
description: "Ask AI to review a new program plan and point out the policies, risks, and missing pieces you may not have thought of."
published_on: 2026-10-28
tools: [Claude, ChatGPT, Copilot, Gemini]
fill_in: true
prompt: |
  You are a program design reviewer with experience in operations, human resources, and compliance.

  I am designing [type of program, such as an internship, fellowship, or volunteer program] at [type of organization]. Here is a summary of the plan:

  [Paste a short description of the program: its purpose, the roles, who participants report to, expected hours, how they are paid or recognized, the tools they will use, and what they will produce. Leave out names, account numbers, and anything private.]

  Review it and tell me what I may have missed. Check each of these areas:

  1. Policy and compliance: work-hour limits (including limits for participants on visas), privacy of participant records, data security, payment data, ownership of the work, accessibility, use of the organization's name or brand, and consent or release forms for anyone featured in the work.
  2. Operations: how requests come in, onboarding and system access, supervisor capacity, handoff when a participant leaves, tracking and reporting, equipment, and budget.
  3. People: how participants are selected and renewed, what happens with underperformance, accommodations, and confidentiality expectations.
  4. Content and AI: who reviews AI-generated work before it is published, and how sensitive topics are handled.
  5. Measurement: what success looks like in the first year, and a way for participants to give feedback on the program.

  For each gap, give me:
  - What is missing, in one or two sentences
  - Why it matters
  - A status label: Confirmed requirement, To confirm with an office, Recommended precaution, or Deferred to a later phase

  Rules:
  - Do not invent policies. If you are not sure a rule exists at my organization, label it "To confirm" and name the type of office that would know.
  - Separate what my plan states from what you are inferring.
  - Do not add gaps just to be thorough. If this is a small pilot, tell me which gaps can wait.

  End with the three most important gaps to close before launch, and up to three questions that would change your recommendations.
how_to:
  - "Copy the prompt and fill in the [brackets] with your program's details."
  - "Paste it into Claude, ChatGPT, Copilot, or Gemini."
  - "Read each gap, then confirm any \"To confirm\" items with the right office before you rely on them."
watch_out: "Before you paste anything in, leave out names, account numbers, and private details about real people. The AI is not a lawyer or a compliance office, so treat its answers as a checklist to verify, not as final rules."
---
