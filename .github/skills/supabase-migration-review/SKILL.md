---
name: supabase-migration-review
description: "Use when a new or changed SQL migration, view, function or table policy exists in supabase/migrations, BEFORE the user runs it in the Supabase SQL Editor. Reviews it for security (RLS, grants, views), safety and consistency with the FITMETRICS database."
---

# Supabase migration review (FITMETRICS)

Review the newest migration file(s) in `supabase/migrations` that have not been applied yet.
You may edit ONLY unapplied migration files. Never edit a migration the user already ran; create a new
numbered one instead. Never run SQL yourself.

## When to use this skill
- You created or edited a `.sql` file in `supabase/migrations`.
- The user runs `/supabase-migration-review` or asks "is this SQL safe?".

## Checklist (report PASS / FAIL / N/A for each, with the line number for every FAIL)

### Naming and safety
1. File is the next number after the highest existing migration, with a clear name.
2. Idempotent: `create ... if not exists`, `create or replace`, `drop ... if exists`,
   `add column if not exists`. Re-running must not fail or duplicate data.
3. No `drop table`, `truncate` or destructive `delete`/`update` without a `where` and an explicit comment why.
4. Changing a CHECK constraint: the real constraint name was looked up (`pg_constraint`), not guessed.

### Security (most important)
5. Every new table has `enable row level security` and explicit policies.
   Members may only touch their own rows; staff and admin use `is_staff()` / `is_admin()`.
6. Nothing is granted to `anon`. Backend-only tables, views and functions are revoked from `anon` and
   `authenticated` and are used only through the Express backend (service role).
7. Views: a view the browser may read must use `security_invoker = true`. Gym-wide analytics views must be
   readable by the backend only. A plain view runs with its owner's rights and can leak other members' data.
8. Functions: `security definer` functions set `search_path = public` and have `execute` revoked from
   `public` and `anon`; grant only to the roles that need it.
9. Tables members can update directly use column-level grants (or a guard trigger) so members cannot change
   `role`, `status`, `is_student`, `member_code`, staff notes, prices or ownership columns.
10. No secrets, real emails, passwords or keys in the SQL.

### Data model
11. Money is `numeric(12,2)` (PHP pesos); timestamps are `timestamptz`; ids are `uuid`.
12. Statuses use enums or CHECK constraints. Foreign keys state `on delete` behaviour deliberately.
13. Indexes exist for new foreign keys and common filters (dates, status, member_id).
14. Day, week, hour and month grouping uses `timezone('Asia/Manila', ts)`, never plain UTC casts.
15. `create or replace view` keeps existing column names, order and types, and you checked what else depends
    on the view (backend routes, other views, reports).

## Output
- A table of the 15 checks with PASS / FAIL / N/A.
- For each FAIL: the exact fix, applied to the unapplied migration file only.
- A one-line instruction for the user: which file to run in the Supabase SQL Editor, and to choose
  "Run and enable RLS" if the editor asks.
- Anything that must be double-checked in the Supabase dashboard (for example Security Advisor warnings).
