---
description: "Shared AI foundation for both chatbots: Gemini client with key pool and fallback, quota/rate-limit layer, DB tables, config, tests. No UI yet."
agent: 'agent'
---
# Task 24: Gemini AI foundation (backend only)

Use `ai-chatbot-guardrails`, `supabase-migration-review` and `verify-before-done`. Do this before tasks 25 and 26. No frontend changes in this task.

## Research first (official docs only, cite the URLs in your reply)
Current Gemini API: available free-tier models, request and token limits, function calling, system instructions, safety settings, and the data-use terms for the free tier.
Tell me: (a) whether prompts on the free tier may be used by Google to improve products (this decides how much data may be sent), (b) whether using several keys or projects
to raise limits is permitted. If (b) is not allowed or unclear, still build the pool (it must work with one key) and say so prominently.

## Build
1. `backend/src/services/ai/` with: `geminiClient.js` (the only file that calls Gemini; uses `fetch` or the official SDK if the docs recommend it, pinned),
   `keyPool.js` (round robin, per-key cooldown on 429/quota, never logs keys), `modelChain.js` (fallback list from `GEMINI_MODELS`), `quota.js` (per-user and per-role limits stored in DB),
   `cache.js` (short TTL cache for identical admin questions), `errors.js` (`AI_BUSY`, `AI_RATE_LIMITED` with retry-after, mapped through `lib/errorMapper.js`).
2. Config in `backend/.env.example` only: `GEMINI_API_KEYS`, `GEMINI_MODELS`, `AI_MEMBER_DAILY_LIMIT`, `AI_MEMBER_MINUTE_LIMIT`, `AI_ADMIN_DAILY_LIMIT`, `AI_MAX_INPUT_CHARS`, `AI_MAX_OUTPUT_TOKENS`, `AI_ENABLED`.
   Never open `.env`. The server must start and the AI routes must return a clear `AI_NOT_CONFIGURED` when keys are missing.
3. Migration (next number): reuse `chatbot_conversations`, `chatbot_messages`, `ai_insights` if they exist in migrations; add only what is missing: `ai_usage` (user_id, role, day, count, tokens),
   a `conversation scope` column (`admin` | `member`), and member-scoped RLS (a member reads only their own conversation). Add gym_settings toggle `member_ai_enabled` (default true). Idempotent.
4. `check-guards.mjs` must still pass. Every new route (added in 25/26) uses a path-prefixed guard.
5. Tests in `backend/scripts/`: key rotation on 429, all keys cooling down -> `AI_BUSY`, quota counters persist, no key in any error text. They must run without network (mock the HTTP layer).

## Final reply
Doc URLs used, the answers to (a) and (b), migration to run, env names added, tests run.
