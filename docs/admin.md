# Admin panel

Internal ops UI at `#/admin` for listing users, changing plans, viewing usage (live + cam down to seconds), and related support actions.

## Access (email allowlist)

Set a comma-separated allowlist on the **API** (Vercel env / `apps/api/.env`):

```bash
YUE_ADMIN_EMAILS=you@example.com,other@example.com
```

Matching is case-insensitive. Signed-in users on this list **or** with an assigned **admin** role (see below) can call `/api/admin/*`. The account hub shows an **Admin** link when `entitlement.isAdmin` is true.

## User roles (assignable badges)

Optional roles are stored on `profiles.role` and can be assigned in `#/admin`:

| Role | Badge | Notes |
|------|-------|-------|
| `admin` | blue **admin** crown badge | Grants admin panel access (same as allowlist) |
| `family` | gold **家** crown badge | Display badge only (no extra entitlements yet) |

Apply migration `supabase/migrations/005_user_roles.sql` on your Supabase project. Assign via the **Role** column in the admin user table (`PATCH /api/admin/users/:userId/role` with `{ "role": "admin" \| "family" \| null }`).

## Admin email notifications (Resend)

The API can email admins when someone **signs up** or **upgrades** (Stripe checkout or manual plan change in `#/admin`). Sign-up, upgrade, and bug-report notifies are **React Email** templates that share a branded shell (harbor + jade colors, Syne / Noto Sans HK fonts, and the JyutTranslate logo mark as a CID attachment).

### 1. Vercel / API env

```bash
RESEND_API_KEY=re_...
YUE_NOTIFY_FROM=JyutTranslate <notify@yourdomain.com>
YUE_ADMIN_NOTIFY_EMAILS=you@example.com
YUE_NOTIFY_WEBHOOK_SECRET=<long-random-secret>
```

- `YUE_ADMIN_NOTIFY_EMAILS` is optional — defaults to `YUE_ADMIN_EMAILS`.
- For Resend testing before domain verification, use `YUE_NOTIFY_FROM=JyutTranslate <onboarding@resend.dev>` (Resend’s sandbox sender).

### Resend Audience (automatic contact sync)

When `RESEND_AUDIENCE_ID` is set, signed-in users with an email are added to that Resend Audience:

- **New sign-up** — Supabase Auth Hook (`/api/internal/signup-notify`)
- **Returning sign-in** — first `/api/health` or `/api/entitlement` call each session
- **Paid upgrade** — Stripe checkout completion (ensures payer is in the audience)

Find the id in **Resend Dashboard → Audiences** (may be labeled Segment in newer UI). Add to Vercel:

```bash
RESEND_AUDIENCE_ID=your-audience-id-here
```

Uses the same `RESEND_API_KEY`. Existing contacts are updated, not duplicated.

**Backfill existing users:** In `#/admin`, click **Sync Resend audience** (or `POST /api/admin/resend-audience/sync` as an admin). This scans every Supabase Auth user and upserts their email into the audience. Users without an email are skipped.

### 2. Upgrade alerts (automatic)

Once `RESEND_API_KEY` and `YUE_NOTIFY_FROM` are set, **Stripe** `checkout.session.completed` sends an email when a user moves to `pro` or `max`. Manual upgrades in `#/admin` also notify when the plan changes to a paid tier.

### 3. Sign-up alerts (Supabase Auth Hook — recommended)

Many Supabase projects **cannot** use Database Webhooks (`schema "supabase_functions" does not exist`). Use an **Auth Hook** instead:

1. **Supabase Dashboard → Authentication → Hooks**
2. Hook: **Before user created**
3. Type: **HTTP**
4. URL: `https://<your-api-host>/api/internal/signup-notify`
5. Copy the hook **secret** Supabase shows (format `v1,whsec_…`) into Vercel:

```bash
SUPABASE_AUTH_HOOK_SECRET=v1,whsec_...
```

Redeploy the API. New sign-ups will email admins. The hook must return HTTP 200 (the API responds with `{}`).

**Do not** add `X-Notify-Secret` for Auth Hooks — Supabase signs requests with Standard Webhooks headers instead.

#### Database Webhook fallback (optional)

Only if your project supports Database Webhooks (no `supabase_functions` error):

| Field | Value |
| --- | --- |
| Table | `auth.users` |
| Events | Insert |
| URL | `https://<your-api-host>/api/internal/signup-notify` |
| HTTP header | `X-Notify-Secret: <same as YUE_NOTIFY_WEBHOOK_SECRET>` |

## Database migration

Run these in the Supabase SQL editor (or `supabase db push`), in order:

1. `supabase/migrations/002_admin_disabled_audit.sql` — `profiles.disabled` + `admin_audit_log`
2. `supabase/migrations/003_usage_increment.sql` — ensures `translate_count`, adds atomic `increment_usage()` so live / TTS / translate cannot wipe each other under concurrency
3. `supabase/migrations/004_camera_usage.sql` — `camera_seconds` + `camera_translate_count`, extends `increment_usage()` for cam metering
4. `supabase/migrations/005_user_roles.sql` — optional `profiles.role` (`admin` | `family`)
5. `supabase/migrations/006_bug_reports.sql` — `bug_reports` table for signed-in user bug reports

Auth ban uses Supabase Auth Admin `ban_duration` so banned users cannot keep a session.

## Bug reports (signed-in users only)

Users must be logged in to submit reports. Guests see no footer link; the API returns `401` without a JWT.

- **User flow:** Account hub → **Report a bug**, error banner link (when signed in), or marketing footer link (when signed in). One-tap issue type + optional note; client attaches route, mode, entitlement snapshot, recent events, and env — **not** translation text, audio, or images.
- **API:** `POST /api/bug-report` (Bearer JWT, rate limit 10/hour per user)
- **Admin:** `#/admin` → **Reports** tab opens a self-diagnostic dashboard (interpreted findings, confidence, next steps, timeline). Raw JSON remains behind **Show technical payload**.
- **Email:** React Email + Resend — rich admin notify with issue summary, plan/route/mode, last error, note, recent trail, and **inline screenshot** (CID attachment) when the user opts in

## Features

| Feature | Notes |
| --- | --- |
| User list | Email, name, plan, live `Hh Mm Ss`, TTS chars, translate count, cam time (+ scan count). Allowlisted emails show an animated **admin** badge (with current plan). Click the badge to open the plan dropdown. |
| Search / filter | Email/name/id, plan, over-quota, banned |
| Sort | Email, plan, live, TTS, translate, cam, joined |
| Change plan | `free` / `pro` / `max` |
| Reset month usage | Zeros live / TTS / translate / cam for the selected month |
| Stripe link | Opens Dashboard customer page when `stripe_customer_id` exists |
| Ban / unban | Profile flag + Auth ban; blocked entitlements (`account_disabled`) |
| Audit log | Tab with recent admin actions |
| Bug reports | Tab listing user reports with status triage |
| CSV export | Current filters + month (includes camera fields) |
| Translate metering | `POST /api/translate` increments `usage_months.translate_count` when metered |
| Cam metering | `POST /api/usage/camera-heartbeat` → `camera_seconds`; `POST /api/camera/scan` → `camera_translate_count` |

## API

All routes require Bearer JWT + allowlisted email:

- `GET /api/admin/me`
- `GET /api/admin/users`
- `GET /api/admin/users.csv`
- `GET /api/admin/users/:userId/usage`
- `PATCH /api/admin/users/:userId/plan`
- `POST /api/admin/users/:userId/reset-usage`
- `PATCH /api/admin/users/:userId/disabled`
- `GET /api/admin/audit`
- `GET /api/admin/bug-reports`
- `PATCH /api/admin/bug-reports/:reportId/status`
