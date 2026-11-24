---
description: "Admin-side AI assistant: analyzes the gym's data through safe metric functions and answers what-if questions with an opinion."
agent: 'agent'
---
# Task 25: Admin AI assistant

Use `ai-chatbot-guardrails`, `design-freeze`, `toast-feedback`, `skeleton-fidelity` and `verify-before-done`. Requires task 24.

## Behavior
The owner chats about the gym ("why did revenue drop?", "who is at risk of leaving?", "what if I raise the monthly plan by PHP 100?"). The assistant:
- gets numbers ONLY by calling allowlisted read-only functions that the backend implements over the existing analytics views and services
  (KPIs and health score, revenue trend, attendance peaks, membership distribution, retention, churn risk summaries, prediction snapshots, expiring memberships). Read `docs/analytics.md` and reuse the SAME definitions.
- never computes or invents metrics itself, says which metric and period each statement uses, and says "I do not have data for that" when a function cannot answer.
- for what-ifs: the backend has a deterministic `whatIf()` calculator (price change, new promo, extra class, closing hours, retention improvement) that states its assumptions
  and returns low/base/high ranges. The model explains the result and gives its OPINION, clearly labelled as an estimate with risks. It must not present the opinion as a forecast fact.
- no member names, emails, phones or payment references go to Gemini. Churn answers use counts and anonymous segments; a "show me the members" request links to the existing Admin pages instead.

## Backend
`POST /api/admin/ai/chat` (path-prefixed `requireAuth` + `requireRole('admin')`), `GET /api/admin/ai/conversations`, `GET .../:id`, `DELETE .../:id`.
Validate body (length, type), function-calling loop with a max number of tool calls, timeout, token caps, uses task 24 services, writes `audit_log` (no content, only counts and tool names).
Responses include `toolsUsed` and `dataAsOf` so the UI can show where numbers came from.

## Frontend
Add one admin nav item "AI Assistant" (follow the sidebar's existing item markup) and one page `AdminAssistant.jsx` + `.module.css`, built from the admin pages' existing cards, inputs, buttons and CSS variables
so it looks native. Conversation list, message thread, suggested question chips, typing indicator, "sources" chips (tools used), copy answer, new chat, delete chat via `useConfirm`.
Loading uses a `Skeleton` variant that matches this page; errors use toast; a failed history load uses `InlineError`. Responsive at 390 px. Do not alter any existing admin page.

## Tests
Scope/injection tests from the skill, plus: unknown metric request -> "no data", what-if calculator unit tests with fixed inputs, and a test that the prompt string contains no email/phone patterns.

## Final reply
Table of every function the model may call (name, view/service used, fields returned), the migration to run, manual test steps (5 analysis questions, 3 what-ifs, an injection attempt, a quota exhaustion).
