# Admin panel

Internal ops UI at `#/admin` for listing users, changing plans, viewing usage (live down to seconds), and related support actions.

## Access (email allowlist)

Set a comma-separated allowlist on the **API** (Vercel env / `apps/api/.env`):

```bash
YUE_ADMIN_EMAILS=you@example.com,other@example.com
```

Matching is case-insensitive. Only signed-in users whose email is on this list can call `/api/admin/*`. The account hub shows an **Admin** link when `entitlement.isAdmin` is true.

## Database migration

Run `supabase/migrations/002_admin_disabled_audit.sql` in the Supabase SQL editor (or `supabase db push`):

- `profiles.disabled` — ban flag (also forces plan to `free` when banning)
- `admin_audit_log` — who changed plan / reset usage / ban / unban

Auth ban uses Supabase Auth Admin `ban_duration` so banned users cannot keep a session.

## Features

| Feature | Notes |
| --- | --- |
| User list | Email, name, plan, live `Hh Mm Ss`, TTS chars, translate count |
| Search / filter | Email/name/id, plan, over-quota, banned |
| Sort | Email, plan, live, TTS, translate, joined |
| Change plan | `free` / `pro` / `max` |
| Reset month usage | Zeros live / TTS / translate for the selected month |
| Stripe link | Opens Dashboard customer page when `stripe_customer_id` exists |
| Ban / unban | Profile flag + Auth ban; blocked entitlements (`account_disabled`) |
| Audit log | Tab with recent admin actions |
| CSV export | Current filters + month |
| Translate metering | `POST /api/translate` increments `usage_months.translate_count` when metered |

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
