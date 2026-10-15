# FITMETRICS – Auth setup (Supabase + Express + React)

## What's in this package
| Path | New / Replaces | Purpose |
|---|---|---|
| `supabase/schema.sql` | new | profiles table, roles, RLS, signup trigger |
| `backend/` (whole folder) | new (your `backend/` was empty) | Express API: create users, manage roles/status |
| `frontend/src/lib/supabase.js`, `lib/api.js` | new | Supabase client + helper to call your backend |
| `frontend/src/context/AuthContext.jsx` | new | session, profile, role, signIn/signOut |
| `frontend/src/components/ProtectedRoute.jsx` | new | role-based route guard |
| `frontend/src/App.jsx` | **replaces** | routes grouped by role + `AuthProvider` |
| `frontend/src/pages/Login.jsx` | **replaces** | real login (markup unchanged) |
| `frontend/src/pages/ForgotPassword.jsx` | **replaces** | real email-OTP reset (markup unchanged) |
| `frontend/src/components/{admin,clerk,member}/*Layout.jsx` | **replace** | working Log Out + real user name |

Copy the files over your repo keeping the same paths. Commit first so you can diff.

## How it works
- **Login / sessions / tokens:** the frontend calls Supabase Auth directly. Supabase issues a short-lived JWT access token + refresh token, stores them, and refreshes automatically. You don't write token code.
- **Roles:** `profiles.role` = `admin | clerk | member`. `ProtectedRoute` sends each role to its own area.
- **No public sign-up** (matches your login screen text). Accounts are created only by staff through `POST /api/users`, using the service-role key on the server. Clerks can create members only; admins can create any role.
- **Real security** is the database (RLS) and the backend role checks. React route guards are just UX.
- **Suspended/inactive** users: blocked at sign-in (auth ban), rejected by the backend, and denied by every RLS policy that uses `is_staff()` / `is_admin()` / `current_app_role()`.

## Setup steps
1. **Supabase project** → Project Settings → API: copy the URL, the public anon/publishable key, and the secret `service_role` key.
2. **Authentication → Providers → Email:** turn **off** "Allow new users to sign up".
3. **SQL Editor:** paste and run `supabase/schema.sql`, then run the numbered
   migrations in `supabase/migrations/` order (`001_core.sql` through
   `005_auth_account_rules.sql`). Run `supabase/seed.sql` only for development
   or initial gym configuration.
4. **First admin:** Authentication → Users → Add user (tick *Auto Confirm User*), then run:
   `update public.profiles set role = 'admin' where email = 'your@email.com';`
5. **Forgot-password OTP:** Authentication → Email Templates → *Reset Password*. Replace the link with the code, e.g. `<p>Your FITMETRICS reset code is <b>{{ .Token }}</b></p>`. (Default code length is 6, matching your 6-box UI. Supabase's built-in mailer is heavily rate-limited, so set up custom SMTP before real use.)
6. **Backend:** `cd backend && cp .env.example .env` (fill it, including
   `SUPABASE_ANON_KEY`), `npm install`, `npm run dev`. The anon key is used by
   the server-side password sign-in endpoint; the service-role key never reaches
   the browser.
7. **Frontend:** `cd frontend && npm install @supabase/supabase-js`, `cp .env.example .env` (fill it), `npm run dev`.
8. Log in as the admin. Never commit `.env`, and the `service_role` key must never appear in `frontend/`.

## Backend endpoints
| Method | Path | Who |
|---|---|---|
| POST | `/api/auth/login` | public; email or username plus password |
| GET | `/api/me` | any logged-in user |
| PATCH | `/api/me` | logged-in user; permitted profile fields only |
| GET | `/api/users?role=&status=&search=` | admin |
| POST | `/api/users` | admin, clerk (clerk → member only) |
| PATCH | `/api/users/:id` `{role?, status?}` | admin |
| POST | `/api/users/:id/password` `{password}` | admin |

Example: `await api("/users", { method: "POST", body: { email, password, full_name, phone, gender, emergency_contact_name, emergency_contact_phone } })`

## Using roles in future tables
```sql
create policy "members see own, staff see all" on public.attendance for select to authenticated
  using (member_id = auth.uid() or public.is_staff());
```

## Heads-up
- Your root README mentions PostgreSQL + `JWT_SECRET` + `DATABASE_URL`; with Supabase you need `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` instead, and Vite runs on port 5173, not 3000.
- If someone verifies the reset code but abandons step 3, they stay signed in (Supabase treats the code as proof of email ownership).
- Not wired yet: the Clerk *Member Registration* form and Admin *Manage Users* page still use static UI. Next step is calling `POST /api/users` and `GET/PATCH /api/users` from them.
