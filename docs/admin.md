# Admin panel

Internal ops UI at `#/admin` for listing users, changing plans, viewing usage (live + cam down to seconds), and related support actions.

## Access (email allowlist)

Set a comma-separated allowlist on the **API** (Vercel env / `apps/api/.env`):

```bash
YUE_ADMIN_EMAILS=you@example.com,other@example.com
```

Matching is case-insensitive. Only signed-in users whose email is on this list can call `/api/admin/*`. The account hub shows an **Admin** link when `entitlement.isAdmin` is true.

## Admin email notifications (Resend)

The API can email admins when someone **signs up** or **upgrades** (Stripe checkout or manual plan change in `#/admin`).

### 1. Vercel / API env

```bash
RESEND_API_KEY=re_...
YUE_NOTIFY_FROM=JyutTranslate <notify@yourdomain.com>
YUE_ADMIN_NOTIFY_EMAILS=you@example.com
YUE_NOTIFY_WEBHOOK_SECRET=<long-random-secret>
```

- `YUE_ADMIN_NOTIFY_EMAILS` is optional — defaults to `YUE_ADMIN_EMAILS`.
- For Resend testing before domain verification, use `YUE_NOTIFY_FROM=JyutTranslate <onboarding@resend.dev>` (Resend’s sandbox sender).

### 2. Upgrade alerts (automatic)

Once `RESEND_API_KEY` and `YUE_NOTIFY_FROM` are set, **Stripe** `checkout.session.completed` sends an email when a user moves to `pro` or `max`. Manual upgrades in `#/admin` also notify when the plan changes to a paid tier.

### 3. Sign-up alerts (Supabase webhook)

Sign-up still happens in Supabase Auth, so add a **Database Webhook** in the Supabase dashboard:

| Field | Value |
| --- | --- |
| Table | `auth.users` |
| Events | Insert |
| URL | `https://<your-api-host>/api/internal/signup-notify` |
| HTTP header | `X-Notify-Secret: <same as YUE_NOTIFY_WEBHOOK_SECRET>` |

The route validates the secret and emails admins with email, provider, and user id.

## Database migration

Run these in the Supabase SQL editor (or `supabase db push`), in order:

1. `supabase/migrations/002_admin_disabled_audit.sql` — `profiles.disabled` + `admin_audit_log`
2. `supabase/migrations/003_usage_increment.sql` — ensures `translate_count`, adds atomic `increment_usage()` so live / TTS / translate cannot wipe each other under concurrency
3. `supabase/migrations/004_camera_usage.sql` — `camera_seconds` + `camera_translate_count`, extends `increment_usage()` for cam metering

Auth ban uses Supabase Auth Admin `ban_duration` so banned users cannot keep a session.

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
