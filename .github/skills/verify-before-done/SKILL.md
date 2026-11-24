---
name: verify-before-done
description: "Use at the end of any FITMETRICS task, before telling the user the work is finished. Runs the project checks, catches off-task changes, and reports honestly what was run versus only read."
---

# Verify before done

Run this checklist before you say a task is complete. Do not skip steps because the change "looks small".

## When to use this skill
- You finished editing files for a task and are about to write your final reply.
- The user asks "is it done?", "did you test it?" or runs `/verify-before-done`.

## Steps
1. **Scope check.** Run `git --no-pager status --short` and `git --no-pager diff --stat`.
   Any changed file that is not part of the current task (for example `.vscode/settings.json`,
   unrelated routes or pages) must be reverted with `git restore <file>` unless the user asked for it.
   Mention every file you reverted.
2. **Backend syntax.** Run `node --check` on every backend file you changed or created.
3. **Route guards.** If `backend/package.json` has a `check:guards` script, run `npm run check:guards`
   in `/backend`. A router-level `router.use(requireAuth/requireRole ...)` without a path prefix is a bug.
4. **Frontend.** In `/frontend` run `npm run build` and `npm run lint`. Fix errors you caused.
   Report pre-existing lint errors separately; do not fix unrelated files.
5. **Leftovers.** Search your changes for hard-coded numbers or text you were asked to replace with real
   data, plus `console.log`, `TODO`, commented-out code, and any secret-looking strings.
6. **Callers.** If you changed the response of an endpoint or a shared helper, search the repo for every
   caller (`grep` the path in `frontend/src` and `backend/src`) and confirm each still works.
7. **Migrations.** If you created a migration, state its file name. Never run SQL yourself; the user runs it.
   If the `supabase-migration-review` skill exists, run it on the new file first.

## Final reply format
- Files changed (and files reverted).
- Migration file to run, if any.
- Commands you ran, each with PASS or FAIL.
- Things you only read or reasoned about but did not run.
- Manual test steps for the user, in order.
- Anything unfinished or uncertain.

## Rules
- Never claim a check passed unless you ran it and saw the result.
- Never open, print or edit `.env` files.
- If something fails and you cannot fix it within the task, say so plainly instead of hiding it.
