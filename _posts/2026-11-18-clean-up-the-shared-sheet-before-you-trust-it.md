---
layout: post
title: "Clean up the shared sheet before you trust it"
date: 2026-11-18
description: "This time of year I always end up in a shared spreadsheet: the potluck sign-up, the carpool list, the gift exchange."
image: /assets/blog/2026-11-18/claude.png
---

This time of year I always end up in a shared spreadsheet: the potluck sign-up, the carpool list, the gift exchange. By the time it gets to me, half the names are typed two different ways and a total is quietly off. Here's one feature per tool that helps you clean that kind of sheet up. One honest note first: AI can sound sure and still be wrong, so check any total that involves money yourself, and keep private details like addresses and phone numbers out of tools you don't fully trust.

## Claude: claude in Google Sheets

![Claude: Claude in Google Sheets](/assets/blog/2026-11-18/claude.png){: .section-image }

A sidebar inside Google Sheets that can explain, fix, and tidy the sheet you have open, and it asks before it changes anything.

1. Install Claude from the Google Workspace Marketplace, then open your sheet and go to Extensions > Claude > Open Claude.
2. Allow the two permissions Google asks for, then sign in with your Claude account in the sidebar.
3. Select the messy range and ask something like "Make the names and dates in this list consistent, and tell me what you changed."
4. Keep the default "Ask before edits" mode on so you approve each change. If you change your mind, Undo or version history brings it back.

**When to reach for it:** reach for it when you want a sheet explained and fixed right where it lives. It's a beta for Pro, Max, Ultra, Team, and Enterprise plans, it only works on Google Sheets files (not Excel files opened in Sheets), and it doesn't work in Firefox.

Source: [Anthropic Help Center: Use Claude in Google Docs, Sheets, and Slides](https://support.claude.com/en/articles/16951679-use-claude-in-google-docs-sheets-and-slides)

## ChatGPT: chatGPT for Google Sheets

![ChatGPT: ChatGPT for Google Sheets](/assets/blog/2026-11-18/chatgpt.png){: .section-image }

An add-on that works inside your spreadsheet, traces where a number went wrong, and asks permission before it edits.

1. Go to OpenAI's ChatGPT for Excel page (linked below) and use its install link to add ChatGPT to Google Sheets or Excel.
2. Open your sheet and start ChatGPT from the add-on.
3. Ask it to find what's broken, for example "Why doesn't the total in column D match the list?"
4. Read each proposed change before you accept it. ChatGPT points to the cells it used or changed, so you can check its work.

**When to reach for it:** reach for it when a number looks off and you want to know why. OpenAI's page says the Google Sheets version is available on all plans, the Excel version is a beta with plan and region limits, and complex formulas may still need fixing by hand.

Source: [OpenAI: ChatGPT for Excel and Google Sheets](https://www.openai.com/index/chatgpt-for-excel/)

## Copilot: clean Data in Excel

![Copilot: Clean Data in Excel](/assets/blog/2026-11-18/copilot.png){: .section-image }

A button in Excel that spots text typed inconsistently, numbers stored as text, and extra spaces, then suggests fixes.

1. Open the workbook in Excel for the web or on Windows. For best results, turn your list into a table first with Home > Styles > Format as Table.
2. Select the Data tab, then select Clean Data.
3. Review the suggestion cards in the side pane, like two spellings of the same family name that should match.
4. Apply the fixes you agree with and skip the ones you don't.

**When to reach for it:** reach for it when the same thing has been typed five different ways. Microsoft says it's for Copilot customers in Excel for the web and Windows, it's still rolling out, it works best up to 50,000 rows, and as an early release it may sometimes suggest something inaccurate.

Source: [Microsoft Support: Clean data in Excel](https://support.microsoft.com/en-us/excel/clean-data-in-excel)

## Gemini: the AI Function in Google Sheets

![Gemini: The AI Function in Google Sheets](/assets/blog/2026-11-18/gemini.png){: .section-image }

Type a plain-language instruction into a cell and Gemini fills in the answer, using only the cells you point it to.

1. In an empty column next to your list, type something like =AI("Rewrite this name as First Last", A2), using your own instruction and cell. =Gemini() works too.
2. Select the cell and click Generate and Insert.
3. Drag to fill the rest of the column, then spot-check a few rows against the original.
4. If the original data changes later, click Refresh and Insert to update the results.

**When to reach for it:** reach for it when you want a cleaned-up copy sitting next to the original instead of changing it. It needs an eligible Google AI or Workspace plan, it only returns text, it only sees the cells you reference, and there's no undo, so you regenerate instead.

Source: [Google Docs Editors Help: Use the AI function in Google Sheets](https://support.google.com/docs/answer/15877199)

Want this in your inbox each week? [Subscribe to Darice on AI](https://www.daricecorey.com/newsletter.html).
