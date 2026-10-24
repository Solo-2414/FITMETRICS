# FITMETRICS Copilot pack: how to use

## 1. Install (once, 5 minutes)
1. Unzip and copy these into the ROOT of your repo (the folder that contains `backend/`, `frontend/`, `supabase/`):
   - `.github/` (project rules + the six prompts)
   - `.prettierrc`
   - `.vscode/` (if you already have a `.vscode/settings.json`, merge the lines instead of overwriting)
2. In VS Code install the **Prettier** and **ESLint** extensions (`.vscode/extensions.json` will suggest them).
3. Optional but recommended: `.vscode/mcp.json` connects the bot to your Supabase **read-only**, scoped to your
   project, so it reads your real table and column names instead of guessing. VS Code asks you to sign in to
   Supabase the first time. Never remove `read_only=true`.
4. Commit everything: `git add . && git commit -m "Add Copilot rules and prompts"`.
5. Close and reopen the Copilot chat. Check the rules are active: ask "What are the FITMETRICS security rules?"
   in a new chat; it should answer from `.github/copilot-instructions.md`.

## 2. Run the prompts IN ORDER, one per fresh chat
| # | Type in chat | What it fixes |
|---|---|---|
| 1 | `/01-fix-route-guards` | Manage Users "no permission" bug (also fixes /api/me) |
| 2 | `/02-settings-maintenance` | Settings save, maintenance mode, real export |
| 3 | `/03-attendance-analysis` | Attendance Analysis + Manila timezone fix |
| 4 | `/04-reports` | Reports, CSV/PDF, PayMongo-aware revenue |
| 5 | `/05-announcements-email` | Announcements, in-app notifications, Gmail emails |
| 6 | `/06-video-tutorials` | Video tutorials (YouTube/Vimeo links) |

If `/` does not list a prompt, open the `.prompt.md` file and use the run button, or paste everything below the
`---` header into a new Agent-mode chat.

## 3. The routine for every prompt
1. `git status` should be clean. If not, commit first.
2. New chat, **Agent** mode, pick the model yourself (do not leave it on Auto).
3. Run the prompt. Let it finish; do not interrupt it with side questions.
4. Run the migration it names, **yourself**, in the Supabase SQL Editor (choose "Run and enable RLS" if asked).
5. Restart the backend (`npm run dev` in /backend) and the frontend. Do the manual test steps it gives you.
6. `git diff` to review. If it is good: `git commit -am "Task N done"`. If it is bad: `git restore .` and run again
   with one extra sentence describing what went wrong.

## 4. Things to do yourself (the bot cannot)
- Prompt 5: set the Gmail variables in `backend/.env` (SMTP host, port, user, App Password). Test with your own
  email first, before announcing to all members. Check Google's current daily sending limits.
- Prompt 2: confirm your Supabase plan's database size limit and set `DB_PLAN_LIMIT_MB` in `backend/.env`.
- Prompt 4: PayMongo keys stay in `backend/.env`; the reports only read your own tables.
- Never paste keys, passwords or `.env` content into the chat.

## 5. If a run goes wrong
Send me: the bot's final message, the output of `git diff --stat`, and the exact error text or a screenshot.
