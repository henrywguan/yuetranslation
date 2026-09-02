# Admin panel

Internal ops UI at `#/admin` for listing users, changing plans, viewing usage (live + cam down to seconds), and related support actions.

## Access (email allowlist)

Set a comma-separated allowlist on the **API** (Vercel env / `apps/api/.env`):

```bash
YUE_ADMIN_EMAILS=you@example.com,other@example.com
```

Matching is case-insensitive. Signed-in users on this list **or** with an assigned **admin** role (see below) can call `/api/admin/*`. The account hub shows an **Admin** link when `entitlement.isAdmin` is true.

Apply migration `supabase/migrations/016_app_settings.sql` on your Supabase project.

## Incident banner (site-wide)

In `#/admin`, use **Site status → Show incident banner** to toggle a scrolling alert at the top of every page (landing, app, pricing, admin). The message is bilingual by default:

- English: “The app is currently experiencing issues and is being worked on.”
- 中文: “應用程式目前出現問題，我們正在處理中。”

State is stored in `app_settings` (`incident_banner`) and exposed on `GET /api/health` as `incidentBanner`. Toggles are audit-logged (`incident_banner`).

## User roles (assignable badges)

Optional roles are stored on `profiles.role` and can be assigned in `#/admin`:

| Role | Badge | Notes |
|------|-------|-------|
| `admin` | blue **admin** crown badge | Grants admin panel access (same as allowlist) |
| `family` | gold **家** crown badge | Display badge only (no extra entitlements yet) |

Apply migration `supabase/migrations/005_user_roles.sql` on your Supabase project. Assign via the **Role** column in the admin user table (`PATCH /api/admin/users/:userId/role` with `{ "role": "admin" \| "family" \| null }`).

## Admin email notifications (Resend)

The API can email admins when someone **signs up** or **upgrades** (Stripe checkout or manual plan change in `#/admin`). Sign-up, upgrade, and bug-report notifies are **React Email** templates that share a branded shell (harbor + jade colors, Syne / Noto Sans HK fonts, and the JyutTranslate logo mark as a CID attachment).

**User-facing auth emails** (confirm signup, magic link, password reset) also use React Email when the Supabase **Send Email** hook is configured — see [§4 User auth emails](#4-user-auth-emails-react-email--resend) below.

### 1. Vercel / API env

```bash
RESEND_API_KEY=re_...
YUE_NOTIFY_FROM=JyutTranslate <notify@yourdomain.com>
YUE_SUPPORT_FROM=JyutTranslate Help <help@mail.jyuttranslate.com>
YUE_ADMIN_NOTIFY_EMAILS=you@example.com
YUE_NOTIFY_WEBHOOK_SECRET=<long-random-secret>
```

- `YUE_NOTIFY_FROM` must be a real email: `Name <local@domain.com>` or `local@domain.com`. A domain alone (`noreply.jyuttranslate.com` inside `<>`) fails Resend’s `from` validation — use `noreply@jyuttranslate.com`. If you verified the `noreply` subdomain in Resend, use e.g. `JyutTranslate <hello@noreply.jyuttranslate.com>`.
- `YUE_SUPPORT_FROM` is the **Reply-To** on auth, household invites, campaigns, and admin notifies (default `JyutTranslate Help <help@mail.jyuttranslate.com>`). It does **not** need to match the Resend From domain — replies go to your Help inbox via Cloudflare Email Routing. See [§ Support inbox](#support-inbox-helpmailjyuttranslatecom) below.
- `YUE_ADMIN_NOTIFY_EMAILS` is optional — defaults to `YUE_ADMIN_EMAILS`.
- For Resend testing before domain verification, use `YUE_NOTIFY_FROM=JyutTranslate <onboarding@resend.dev>` (Resend’s sandbox sender). **Important:** `*.resend.dev` can only deliver to the Resend account owner email — other recipients fail at send time. To email contacts/audience, verify a domain at [resend.com/domains](https://resend.com/domains) and set `YUE_NOTIFY_FROM` to an address on that domain.

### Support inbox (`help@mail.jyuttranslate.com`)

Resend **sends** product mail; Cloudflare Email Routing **receives** Help replies and `mailto:` contact.

**1. Cloudflare Email Routing (receive)**

1. Cloudflare Dashboard → zone **`jyuttranslate.com`** → **Email** → **Email Routing** → enable routing.
2. **Destination addresses** → add your personal Gmail (or Workspace) and confirm the verification email.
3. For the **`mail`** subdomain address `help@mail.jyuttranslate.com`:
   - Ensure DNS for `mail.jyuttranslate.com` has Cloudflare Email Routing **MX** records (Email Routing → enable for subdomain / add the MX pair Cloudflare shows for `mail`).
   - **Routing rules** → custom address **`help@mail.jyuttranslate.com`** → forward to your verified destination.
4. Send a test to `help@mail.jyuttranslate.com` from an outside account and confirm it lands in Gmail.

**2. Resend (send + Reply-To)**

- Keep `YUE_NOTIFY_FROM` on your verified sending domain (e.g. `noreply@…` or `notify@…`).
- Set `YUE_SUPPORT_FROM=JyutTranslate Help <help@mail.jyuttranslate.com>` on Vercel (optional — this is already the code default).
- Outbound auth / invites / campaigns / admin alerts use **From** = `YUE_NOTIFY_FROM` and **Reply-To** = `YUE_SUPPORT_FROM`, so “Reply” in Gmail goes to Help.
- You do **not** need to verify `help@mail…` in Resend for Reply-To. Only verify `mail.jyuttranslate.com` in Resend if you later want to **send From** that address.

**3. Site contact link**

Marketing footer Contact uses `mailto:help@mail.jyuttranslate.com`.

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

**Backfill household usage:** Before household pooling (migration `012`), meters lived in `usage_months` per user. After deploy, click **Backfill household usage** in `#/admin` (or `POST /api/admin/household-usage/backfill`) to fold that legacy data into `household_usage_months`. Safe to re-run. Production also runs this automatically on cold start when `YUE_RUN_HOUSEHOLD_USAGE_BACKFILL=1` is set in `vercel.json` — remove that flag once usage looks correct.

### 2. Upgrade alerts (automatic)

Once `RESEND_API_KEY` and `YUE_NOTIFY_FROM` are set, **Stripe** `checkout.session.completed` sends an email when a user moves to `family` or `business`. Manual upgrades in `#/admin` also notify when the plan changes to a paid tier.

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

### 4. User auth emails (React Email + Resend)

By default Supabase sends plain auth emails (confirm signup, password reset, etc.). To send **branded React Email** messages to users:

1. Ensure `RESEND_API_KEY` and `YUE_NOTIFY_FROM` are set (verified domain — not `onboarding@resend.dev` for real users).
2. **Supabase Dashboard → Authentication → Hooks → Send Email**
3. Type: **HTTPS**
4. URL: `https://<your-api-host>/api/internal/auth-send-email`
5. Copy the hook secret into Vercel:

```bash
SUPABASE_SEND_EMAIL_HOOK_SECRET=v1,whsec_...
```

6. Redeploy the API. Supabase will call this hook **instead of** its built-in mailer for signup confirmation, magic links, recovery, invites, and email-change messages.

Templates live at `apps/api/src/emails/AuthEmail.tsx` (compiled to `emails/compiled/` on deploy). `/api/health` reports `notify.userAuth` and `notify.sendEmailHook` when configured.

**Note:** This is separate from the **Before user created** hook (`SUPABASE_AUTH_HOOK_SECRET`) which only emails **admins** about new sign-ups.

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
8. `supabase/migrations/009_tts_voices.sql` — profile TTS voice preferences
9. `supabase/migrations/010_ai_vision_usage.sql` — `ai_vision_count` meter (view-only)
10. `supabase/migrations/011_rename_pro_plan_to_family.sql` — `pro` → `family` plan id
11. `supabase/migrations/012_household_seats_pooled_usage.sql` — household seats + pooled `household_usage_months`
12. `supabase/migrations/013_profiles_username.sql` — custom Account Hub username
13. `supabase/migrations/014_rename_max_plan_to_business.sql` — `max` → `business` plan id
14. `supabase/migrations/015_backfill_household_usage_from_legacy.sql` — fold pre-pooling per-user usage into household pools (safe to re-run)

**If you see** `Could not find the table 'public.households' in the schema cache` — migrations `011`–`015` are not applied. Paste and run the one-shot file `supabase/migrations/apply_011_through_015_household.sql` in **Supabase → SQL Editor** (creates `households` / members / invites / pooled usage, renames plans, backfills legacy meters, then reloads the PostgREST schema cache).

**Legacy usage:** Before household pooling, meters lived in `usage_months` per user. After `012`, Family/Business usage should be in `household_usage_months`. Run migration `015` (or `POST /api/admin/household-usage/backfill`) once on production so historical usage carries over.

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
| Change plan | `free` / `family` / `business` |
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
- `GET /api/admin/users` — query `from` / `to` (`YYYY-MM-DD`, default start of current month → today UTC). Usage columns sum **whole calendar months** overlapping the range. Legacy `month=YYYY_MM` still works.
- `GET /api/admin/users.csv`
- `GET /api/admin/users/:userId/usage` — same `from` / `to`; returns per-month rows plus a `total` for the range
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
- `POST /api/admin/household-usage/backfill` — fold legacy `usage_months` into `household_usage_months` for all months (idempotent)
