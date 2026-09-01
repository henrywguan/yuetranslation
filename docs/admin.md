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

- `YUE_NOTIFY_FROM` must be a real email: `Name <local@domain.com>` or `local@domain.com`. A domain alone (`noreply.jyuttranslate.com` inside `<>`) fails Resend’s `from` validation — use `noreply@jyuttranslate.com`. If you verified the `noreply` subdomain in Resend, use e.g. `JyutTranslate <hello@noreply.jyuttranslate.com>`.
- `YUE_ADMIN_NOTIFY_EMAILS` is optional — defaults to `YUE_ADMIN_EMAILS`.
- For Resend testing before domain verification, use `YUE_NOTIFY_FROM=JyutTranslate <onboarding@resend.dev>` (Resend’s sandbox sender). **Important:** `*.resend.dev` can only deliver to the Resend account owner email — other recipients fail at send time. To email contacts/audience, verify a domain at [resend.com/domains](https://resend.com/domains) and set `YUE_NOTIFY_FROM` to an address on that domain.

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

Once `RESEND_API_KEY` and `YUE_NOTIFY_FROM` are set, **Stripe** `checkout.session.completed` sends an email when a user moves to `family` or `max`. Manual upgrades in `#/admin` also notify when the plan changes to a paid tier.

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
6. `supabase/migrations/007_email_hub.sql` — saved campaign templates + email send log for Admin → Email
7. `supabase/migrations/008_docs_pages.sql` — `docs_pages` on usage months + `increment_usage` support for Documents metering

Auth ban uses Supabase Auth Admin `ban_duration` so banned users cannot keep a session.

## Admin Email hub

`#/admin` → **Email** is the campaign center (React Email + Resend):

- **Templates** — built-in layouts (announcement, product update, feature spotlight, newsletter, welcome, plain) with thumbnail + list views; save custom drafts to Supabase
- **Compose** — subject, preview text, eyebrow, headline, body, CTA, sign-off; live HTML preview (desktop/mobile)
- **Recipients** — pick contacts from the Resend audience, or broadcast to the **full audience** (`RESEND_AUDIENCE_ID`)
- **Send results** — after Send, a closable popup shows sent/failed counts, per-recipient errors, and a domain hint when Resend rejects non-owner addresses on a test sender
- **APIs:** `GET/POST /api/admin/email/templates`, `DELETE /api/admin/email/templates/:id`, `GET /api/admin/email/contacts`, `POST /api/admin/email/preview`, `POST /api/admin/email/send`

Apply migration `007_email_hub.sql` on Supabase before saving custom templates (built-ins work without it).

**Domain required for multi-recipient sends:** With `onboarding@resend.dev` (or any unverified test domain), only your Resend account email succeeds — e.g. 4 checked contacts → “1 sent, 3 failed.” Verify the sending domain and update `YUE_NOTIFY_FROM` before broadcasting.

## Bug reports (signed-in users only)

Users must be logged in to submit reports. Guests see no footer link; the API returns `401` without a JWT.

- **User flow:** Account hub → **Report a bug**, error banner link (when signed in), or marketing footer link (when signed in). One-tap issue type + optional note; client attaches route, mode, entitlement snapshot, recent events, and env — **not** translation text, audio, or images.
- **API:** `POST /api/bug-report` (Bearer JWT, rate limit 10/hour per user)
- **Admin:** `#/admin` → **Reports** tab opens a self-diagnostic dashboard (interpreted findings, confidence, next steps, timeline). **Multi-select** (long-press / select mode) supports bulk status updates. Heuristics flag likely **test / smoke** reports. On-demand **AI answer** (`POST /api/admin/bug-reports/:id/ai-answer`) recommends close vs triage. Raw JSON remains behind **Show technical payload**.
- **Email:** React Email + Resend — rich admin notify with issue summary, plan/route/mode, last error, note, recent trail, and **inline screenshot** (CID attachment) when the user opts in. Templates are authored as `.tsx` under `apps/api/src/emails/` and **compiled to plain JS** (`emails/compiled/`) before deploy — Vercel’s Node runtime has no JSX transform, and eagerly importing `.tsx` into the API boot path crashes `/api/health` (clients stuck on Connecting…). Logo uses the public `apple-touch-icon.png` URL; screenshots use Resend’s `inlineContentId` (not `contentId`) so Gmail renders them in the body instead of as downloads only.

## Features

| Feature | Notes |
| --- | --- |
| User list | Email, name, plan, live `Hh Mm Ss`, TTS chars, translate count, cam time (+ scan count), **docs pages**. Allowlisted emails show an animated **admin** badge (with current plan). Click the badge to open the plan dropdown. |
| Search / filter | Email/name/id, plan, over-quota, banned |
| Sort | Email, plan, live, TTS, translate, cam, docs, joined |
| Change plan | `free` / `family` / `max` |
| Reset month usage | Zeros live / TTS / translate / cam / docs for the selected month |
| Stripe link | Opens Dashboard customer page when `stripe_customer_id` exists |
| Ban / unban | Profile flag + Auth ban; blocked entitlements (`account_disabled`) |
| Audit log | Tab with recent admin actions |
| Bug reports | Tab with triage + multi-select bulk status |
| Email | Campaign hub: templates, compose, preview, contacts / full audience send |
| CSV export | Current filters + month (includes camera + docs fields) |
| Translate metering | `POST /api/translate` increments `usage_months.translate_count` when metered |
| Cam metering | `POST /api/usage/camera-heartbeat` → `camera_seconds`; `POST /api/camera/scan` → `camera_translate_count` |
| AI vision metering | `POST /api/camera/scan` when LLM OCR fallback runs → `ai_vision_count` (view-only; Cam + Documents; no hard cap). Migration `010_ai_vision_usage.sql` |
| Docs metering | `POST /api/docs/translate` / `POST /api/docs/commit` → `docs_pages` (success only) |

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
- `POST /api/admin/bug-reports/:reportId/ai-answer`
- `GET /api/admin/email/templates`
- `POST /api/admin/email/templates`
- `DELETE /api/admin/email/templates/:templateId`
- `GET /api/admin/email/contacts`
- `POST /api/admin/email/preview`
- `POST /api/admin/email/send`
- `POST /api/admin/resend-audience/sync`
