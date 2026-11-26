---
description: "Redesign the Admin AI Assistant page as an analyst workspace with clear visual feedback. No generic 'AI chatbot' look. Uses the system's own design tokens."
agent: 'agent'
---
# Task 28: Redesign the Admin Assistant page (design allowed for THIS page only)

Use `skeleton-fidelity`, `toast-feedback` and `verify-before-done`. `design-freeze` is lifted for `AdminAssistant.jsx` and `AdminAssistant.module.css` only (I am asking for a redesign). Every other page, shared component and CSS rule stays untouched.
Do not change the assistant's backend logic, scope rules, rate limits or prompts. Backend changes are allowed ONLY if additive and needed for the visual feedback below (see "Data for figures").

## Read first
`frontend/src/pages/admin/AdminAssistant.jsx` + `.module.css`, then `AdminDashboard.jsx/.module.css` and `AdminReports.module.css` (the KPI card, panel card, badge and table styles are the visual language to reuse), `App.css` tokens, and the API response of `/admin/ai/chat` (`backend/src/routes/ai.js`).
Write 5 lines on what the page looks like now and which parts look like a generic AI chat template.

## The "AI look" to remove (all of it)
Robot and sparkle icons, a centered "What would you like to understand?" hero, pill-shaped suggestion chips floating in empty space, tinted chat bubbles with one speech-bubble corner, three bouncing dots, glow or gradient accents, purple/neon colors, glassmorphism, emoji, and friendly filler copy. Do not add any new decorative effects.

## Direction: a gym analyst's workspace, not a chat toy
Same dark surfaces, `--card-stroke-color` borders, `--heading-font` and the primary color as the system uses them. Plain, dense, readable, like the Reports and Dashboard pages.
- **Answers are report blocks, not bubbles.** The user's question is a compact header line (small label, the question text). The answer below it is a card: a one-sentence finding first, then the supporting text, then an optional "Assumptions" list for what-ifs. Render safe lightweight formatting (paragraphs, bullet lists, bold, simple numbers) without `dangerouslySetInnerHTML` and without a markdown dependency unless one already exists.
- **"Based on" strip** under each answer: the metrics used (from `toolsUsed`, with friendly names), the period, and "Data as of ...". Replace the raw "Model: ..." text with a quiet detail inside a small "details" toggle.
- **Figures from real data.** When the tools returned numbers, show a row of small KPI tiles (same style as the dashboard KPI cards) and, for trends, a small chart using the existing chart.js setup (`lib/chartDefaults.js`). What-if answers show a Low / Base / High range as a small table or bar, clearly labelled "Estimate".
- **Empty state is useful, not friendly:** a short list of example questions grouped as "Performance", "Members at risk", "What-if", each a row that fills the input on click, plus one line stating what data the assistant can and cannot see (no personal details).
- **Layout:** keep the conversation list column (restyle it as the history list used elsewhere), make the thread the main work area, composer fixed at the bottom of the card. At 390 px the history becomes a collapsible bar above the thread.

## Visual feedback (every state must be visible and distinct)
1. **Sending:** the question appears immediately with a "Sending" state, the composer is disabled with a small spinner on the button.
2. **Working:** a progress block that lists the steps as they really happen (for example "Reading revenue trend", "Reading retention") using the real tool names the API returns; if the API only returns them at the end, show a generic determinate-free line "Reading analytics..." and say so in your reply. Never fake steps.
3. **Arrived:** the new answer fades in once and the thread scrolls to it (`fm-fade-in`), with a "Jump to latest" button when the user has scrolled up.
4. **Failed:** the question stays with an inline "Not sent" marker and a Retry button, plus the toast (`toastError`). Over the rate limit: show the remaining quota and the reset time on the composer, disabled with the reason.
5. **Quota meter:** a thin, labelled usage indicator ("8 of 30 questions today") that changes color near the limit.
6. **Copy:** the copy button changes to a check for 1.5 s, and also fires the existing toast only if the page already did.
7. **Delete chat:** `useConfirm()`, the row animates out, with focus returned to a sensible element.
8. **Loading history:** a skeleton that matches the final layout (`skeleton-fidelity`), no layout jump.
9. Focus rings visible on every control, `aria-live="polite"` on the thread, labels on icon buttons.
10. Respect `prefers-reduced-motion`: no animation, only instant state changes.

## Data for figures (additive only)
Check what `/admin/ai/chat` returns. If the tool results (numbers the SQL/code computed, never text the model wrote) are not in the response, add an optional `figures` array to the response, built from the same tool results. Existing fields stay unchanged and no member-identifying data may be added. If you cannot do this safely, ship the page without charts and say so.

## Rules
- Reuse existing tokens and classes. New classes are added in `AdminAssistant.module.css` only. No new dependencies. No inline hex colors the system does not use. No new icon set; use the Font Awesome icons already in the project, none of them robot, sparkle, magic wand or brain.
- Keep all existing behavior: send, history, select, new chat, delete, copy, quota errors, and the privacy note about not typing names or payment references (reword it as a plain notice near the composer).
- Do not touch the member side.

## Verify and report
`npm run build`, lint on the changed files, and `verify-before-done`. Then give me a table of each of the 10 feedback states and how you triggered it (stop the backend for "Failed", lower the limit for "Quota"). Screenshots or measurements at 1920, 1366 and 390 px, saying clearly what you measured and what you only read from the code.
