# Privacy Policy

**JyutTranslate**  
**Effective date:** September 1, 2026  
**Last updated:** September 20, 2026

This Privacy Policy explains how **Henry Guan, doing business as JyutTranslate** (“**JyutTranslate**,” “**we**,” “**us**,” or “**our**”) collects, uses, shares, and protects information when you use **https://www.jyuttranslate.com** and related apps, pages, and services that link to this policy (the “**Service**”).

**Not legal advice.** This document is a product-facing policy draft based on how the Service works today. Have qualified counsel review it before relying on it as your final published terms.

**Contact for privacy requests:** [Help@JyutTranslate.com](mailto:Help@JyutTranslate.com)

We do not currently list a physical mailing address. When we obtain a PO Box or other notice address, we will update this policy.

---

## 1. Who we are

JyutTranslate is a web service for translation and language learning centered on Hong Kong Cantonese (粵語), with additional language pairs and modes that may include Mandarin, Shanghainese, Sichuanese, Tagalog, Mexican and Peninsular Spanish, Vietnamese, and text-only Philippine languages (such as Cebuano, Ilocano, and Bikol Central). Features may include text translation and romanization (for example Jyutping), interactive character breakdown, live speech translation, text-to-speech, camera / document translation, Account Hub preferences, optional Web Push notifications, and **Harbor Quest** (an in-product Cantonese learning voyage at `#/learn`).

The Service is operated by Henry Guan, doing business as JyutTranslate. This policy applies to consumer use of the Service worldwide, subject to applicable law.

---

## 2. Eligibility (13+)

The Service is intended for users who are **at least 13 years old**.

If you are under 13, do not create an account or use features that require sign-in. If you believe a child under 13 has provided us personal information, contact us at [Help@JyutTranslate.com](mailto:Help@JyutTranslate.com) and we will take appropriate steps to delete it where required.

---

## 3. Information we collect

### 3.1 Account and profile information

When you create or use an account, we may collect:

- Email address
- Authentication identifiers (including from email/password or Google / Apple sign-in)
- Display name from your sign-in provider, if provided
- Optional username you choose for your account profile (may appear on Harbor Quest leaderboards and in-product displays)
- Plan / subscription status (Free, Family, Business)
- Voice preference settings you save to your account
- Optional **primary language** preference (Account Hub) used to localize bilingual UI chrome
- Optional **Web Push** opt-in and related subscription endpoints (see Section 3.11)
- Account status flags used for security and administration (for example, disabled/banned)

### 3.2 Billing information

Paid plans are processed by **Stripe**. We receive and store Stripe customer and subscription identifiers linked to your account. Stripe collects and processes payment card details and related billing information under Stripe’s own terms and privacy policy. We do not store full payment card numbers on our servers.

### 3.3 Households (Family and Business)

Paid **Family** and **Business** plans may include a **household** (shared seats under one subscription). For households we may collect and store:

- Household membership (who belongs to the household and their role, such as owner or member)
- Invite emails and invite status (including emails of people who have not yet created an account)
- Pooled usage meters for the household (shared monthly allowances)

Household owners can invite others by email. Invitees may receive an invitation email even before they sign up. Within the Service, household members may see other members’ emails and pending invite emails so the household can be managed.

### 3.4 Guest trial identity (when you use the Service without signing in)

Limited guest trials (for example, monthly live-mic minutes and Cam AR/Upload scan credits) may use identifiers that are **not** a full account:

- An HttpOnly guest cookie (`yue_guest_id`) set by our API
- A device UUID stored in your browser (`localStorage`) and sent as a guest device header so the trial can survive cookie clears on the same browser profile
- A server-side **network** mapping based on a hash of approximate network identity and calendar month (so clearing cookies on the same network does not always reset the trial)

Guest usage counters are stored separately and may **merge into your account** when you later sign in from that device/cookie/network. These identifiers are used for entitlement enforcement and abuse prevention, not for advertising profiles.

### 3.5 Usage and entitlement meters

To enforce plan limits and operate the Service, we store **usage counters** for guests (where applicable), signed-in users, and households, such as:

- Live microphone minutes used
- Text-to-speech character counts
- Translation request counts
- **Cam scan credits** used (AR / Upload). Camera session seconds may also be logged for operations/admin insight and do **not** by themselves gate Cam access
- Document page counts
- Related operational counters (for example, AI vision OCR fallback counts)
- Harbor Quest correct-answer deltas (admin-visible metering; not a hard consumer cap today)

These are **meters** (how much you used), not a complete archive of what you said, typed, photographed, or uploaded—except where you opt into cloud history sync described below. On household plans, meters may be **pooled** across members under the owner’s subscription.

### 3.6 Content you submit for translation (processed to provide the Service)

Depending on the feature you use, the Service may process:

- Text you type or paste for translation
- Text or files you share into the app via the operating system (for example, PWA share target or “Open with” / file handlers)
- Audio from your microphone for speech recognition / live translation
- Photos, camera frames, or uploaded images for OCR and translation
- Documents (such as PDF or Office files) for translation
- Text you tap for character breakdown / learning overlays (including non-Chinese languages where pedagogy applies)

**Speech recognition paths:** Live microphone translation typically uses **Microsoft Azure Speech** via our API. On some devices or configurations (for example, when Azure is unavailable or for certain locales), the app may fall back to your browser’s **Web Speech API**, in which case speech recognition is handled by your browser and/or device platform (such as Apple or Google) under their policies, not stored by us as audio files.

**Solo / Conversation history:**

- The app keeps recent translation turns on your device (browser storage) so History works across reloads.
- When you are **signed in**, those turns (source text, translation, language direction, and timestamps—typically up to a capped number of recent turns) are also **synced to our servers** so History can follow you across devices.
- Cloud history turns are retained for about **14 days** from each turn’s timestamp and are pruned thereafter (client, API, and scheduled cleanup). Guests and signed-out use remain local to the device unless/until you sign in and merge.
- History sync is for **your** product History feature. It is not used to train JyutTranslate’s own AI models, and it is not sold to advertisers.

**How we otherwise treat translation content:**

- We process it to return a translation or related result for your request.
- We do **not** use your translation content, audio, images, or documents to train JyutTranslate’s own machine-learning models.
- We do **not** sell your content or personal information to data brokers or advertisers.
- Temporary technical caches may exist briefly in server memory to improve performance; they are not a durable content library and are not kept after normal process recycling.
- Microphone capture is intended for active listening sessions. Leaving the app in the background is designed to release mic access promptly on supported platforms (product privacy behavior; not a guarantee against all OS UI indicators).

**Important:** To deliver the feature, content may be transmitted to subprocessors listed in Section 6 (for example, speech, vision, and language-model providers) **solely to fulfill your request**. Those providers process data under their own terms.

### 3.7 Harbor Quest (Learn)

**Harbor Quest** (`#/learn`) is a Free+ beta learning voyage for signed-in users (also reachable by admins). Depending on how you play, we may process:

- **On-device progress** in browser storage (cleared levels, coins/XP/gold, cosmetics, appearance, fishing bag, and similar game state)
- **Cloud-synced progress** for signed-in accounts (same game-state blob stored in our database so progress can follow the account)
- **Public leaderboard** entries derived from progress (for example XP, gold, correct counts, cleared piers) shown with a **display name** based on your Account Hub username when set, otherwise a generic label
- Optional **cosmetic gifts** between signed-in sailors (lanterns/titles), which update both players’ progress blobs
- Harbor Speak buttons use the same text-to-speech path as the rest of the Service (metered TTS characters)

Harbor Quest does not require a separate account. Deleting your JyutTranslate account removes cloud Harbor Quest progress we control, subject to Section 8.

### 3.8 Bug reports and support

If you submit a bug report while signed in, we may store:

- Issue type and optional note you write
- Account email and user id
- App route / mode, device and browser diagnostics, recent error events
- Plan / usage snapshot relevant to troubleshooting
- Optional screenshot **only if you choose to allow it**

Our in-product copy is designed so bug reports attach route and settings diagnostics and **not your translation text**. Document uploads are not attached to bug reports.

Operators may use the configured **LLM provider** to help triage a bug report (for example, summarizing diagnostics you already submitted). That is support tooling, not a translation content archive.

### 3.9 Device / local storage

The Service may store preferences and caches on your device using browser storage such as `localStorage`, including for example:

- Theme, voice picks, UI layout, PWA tip dismissals
- Guest device id (see Section 3.4)
- Local Solo / Conversation history and Harbor Quest progress
- Push notification opt-in flags for this device
- Small offline gloss / pedagogy caches

When you install the Service as a progressive web app (PWA), a service worker may cache static app assets on your device for offline/performance use. Large Harbor Quest media assets are generally not precached into the service worker. This data stays on your device unless you clear site data or uninstall the app.

### 3.10 Approximate analytics

We use **Vercel Analytics** for aggregated traffic and performance insights. This is not a store of your translation content.

### 3.11 Web Push notifications (optional)

If you enable notifications in Account Hub (and your browser/PWA supports Web Push), we may store a **push subscription** for that device (endpoint URL and encryption keys, plus limited device metadata such as user agent / platform). We use this to send product or operational notifications you opted into. You can turn notifications off in Account Hub or revoke permission in the browser; we then stop using that subscription. Push delivery also involves your browser vendor’s push service (for example Apple, Mozilla, or Google infrastructure) under their policies.

### 3.12 Email communications

If email tooling is configured, we may sync your account email (and display name, if available) to our email provider’s audience for product and operational messages, and we may send transactional or administrative notices (for example, related to account confirmation, password reset, household invitations, billing, or support). You can contact us to request removal from marketing-style sends where applicable; transactional messages related to the Service may still be necessary.

### 3.13 Information we do not intentionally collect

We do not ask for government ID, precise GPS tracking for ads, or payment card PANs in our own database. Please do not submit sensitive personal information (such as health, financial account secrets, or government ID images) into translation fields unless you accept the risk of processing by the Service and its processors.

---

## 4. How we use information

We use information to:

- Provide, operate, secure, and improve the Service
- Authenticate users and maintain sessions
- Operate guest trials and merge guest usage into accounts on sign-in
- Operate households (invites, seats, pooled metering)
- Meter entitlements and enforce plan limits
- Sync Solo / Conversation history and Harbor Quest progress for signed-in users who use those features
- Operate optional Web Push notifications you enable
- Show Harbor Quest leaderboards and process cosmetic gifts you initiate
- Process subscriptions and prevent fraud / abuse
- Respond to bug reports and support requests
- Send service-related notices
- Comply with law and enforce our Terms
- Protect the rights, safety, and integrity of users and the Service

**We do not sell your personal information.**  
**We do not use your translation content, audio, images, or documents to train JyutTranslate’s own machine-learning models.**  
**We do not sell your content or personal information to data brokers or advertisers.**

---

## 5. Legal bases (where GDPR / UK GDPR may apply)

If European or UK data-protection law applies, we typically rely on:

- **Contract** — to provide the Service you request (account, translation features, history sync, Harbor Quest, billing, households, optional push)
- **Legitimate interests** — security, abuse prevention, guest-trial enforcement, basic analytics, service improvement that does not override your rights
- **Consent** — where required (for example, optional screenshot in a bug report, Web Push permission, or certain cookies/marketing where consent is legally required)
- **Legal obligation** — where we must retain or disclose information to comply with law

---

## 6. How we share information (processors / service providers)

We share information with vendors who help us run the Service, under contractual and operational controls appropriate to the service:

| Provider | Typical role |
| --- | --- |
| **Vercel** | Hosting, delivery, analytics |
| **Supabase** | Authentication and database |
| **Stripe** | Payments and subscriptions |
| **Resend** | Email delivery / audience tooling |
| **Cloudflare** | CDN / edge network for the web app |
| **Microsoft Azure** | Speech (STT/TTS) and vision/OCR |
| **LLM provider** (OpenAI-compatible API such as DeepSeek / OpenAI, as configured) | Machine translation, related text/vision processing, and optional support triage |
| **Google / Apple** | Sign-in (if you choose those providers); browser / OS Web Push delivery when you opt in |
| **Google Fonts** | Typography delivery (fonts loaded from Google’s CDN when you visit the site) |

We may also disclose information if required by law, legal process, or to protect rights, safety, and security; or in connection with a merger, acquisition, or asset transfer (in which case we will take reasonable steps so the recipient honors this policy or provide notice of changes).

We do **not** share personal information for cross-context behavioral advertising as that term is commonly used under California law, and we do **not** sell personal information.

---

## 7. International transfers

We and our providers may process information in the United States and other countries. Those countries may have different data-protection laws than your home country. Where required, we rely on appropriate transfer mechanisms and vendor terms.

---

## 8. Retention

### Content processed for translation

Text, audio, images, and documents submitted for translation are processed to fulfill the request. We do **not** retain microphone audio, photos, or document files as a lasting media library after processing completes (aside from ephemeral technical handling described above).

**Signed-in Solo / Conversation history** (source/translation text turns) is retained in our database only for the History feature, with about a **14-day** retention window per turn, then pruned. Optional bug-report screenshots/notes you submit are retained as support records.

### Account-linked records

While your **account is active**, we retain:

- Account / profile data (including username, primary language, and voice preferences)
- Usage meters (including household pooled meters where applicable)
- Household membership and invite records associated with your account
- Cloud-synced translation history (within the retention window above)
- Harbor Quest progress and related leaderboard rows derived from that progress
- Web Push subscriptions you opted into
- Bug reports you submitted
- Admin/security records associated with the account
- Billing identifiers needed to operate subscriptions

**Stripe** may retain payment and invoice records according to Stripe’s practices and legal/accounting requirements, including after a subscription ends.

Guest trial identifiers and guest usage months are retained as needed to enforce monthly trial limits and to merge into an account on sign-in.

### After account closure

If you ask us to delete your account, we will delete or de-identify account-linked personal data we control within a reasonable period, except information we must keep for legal, security, fraud-prevention, tax, or accounting reasons, or that is stored only in residual backups for a limited time. That deletion includes cloud translation history, Harbor Quest progress / leaderboard rows, and push subscriptions we control for your account, subject to the same exceptions.

Because we do not currently offer fully self-serve account deletion in the product UI, follow the steps on our [Account & data deletion](./account-deletion.md) page, or email [Help@JyutTranslate.com](mailto:Help@JyutTranslate.com) with the subject line `JyutTranslate account deletion request`.

---

## 9. Security

We use reasonable administrative, technical, and organizational measures designed to protect personal information (for example, encrypted transport (HTTPS), authenticated APIs, and access-controlled admin tools). No method of transmission or storage is 100% secure.

---

## 10. Your choices and rights

Depending on where you live, you may have rights to:

- Access the personal information we hold about you
- Correct inaccurate information
- Delete personal information
- Export / portability of certain data
- Object to or restrict certain processing
- Opt out of marketing emails
- Appeal a denial of a privacy request (where required by law)

**California (CCPA/CPRA) notice (summary):** We do not sell personal information and do not share it for cross-context behavioral advertising. California residents may request know/access, delete, and correct rights, and may designate an authorized agent as permitted by law. We will not discriminate against you for exercising privacy rights.

To exercise rights, email [Help@JyutTranslate.com](mailto:Help@JyutTranslate.com). We may need to verify your identity (for example, via the email on your account).

---

## 11. Cookies and similar technologies

We use:

- **Essential** technologies for login/session, guest trial cookies, and security
- **Preference** storage on your device
- **Vercel Analytics** for aggregated usage
- **Optional** Web Push subscription state when you enable notifications

We do not operate a third-party advertising cookie stack on the Service today. Browser controls can block or clear cookies/site data; some features may stop working if essential storage is blocked.

---

## 12. Children’s privacy

The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. Contact us if you believe we have, and we will delete it as required.

---

## 13. Third-party links and services

The Service may link to third-party sites or rely on third-party sign-in and processors. Their privacy practices are governed by their own policies.

---

## 14. Changes to this policy

We may update this Privacy Policy from time to time. We will post the updated version with a revised “Last updated” date. For material changes, we may also provide additional notice (such as email or an in-product notice) when appropriate. Continued use after the effective date of changes means you accept the updated policy, to the extent permitted by law.

---

## 15. Contact

**Privacy / data requests:** [Help@JyutTranslate.com](mailto:Help@JyutTranslate.com)  
**Operator:** Henry Guan, doing business as JyutTranslate  
**Service:** https://www.jyuttranslate.com

Physical mailing address: to be added when available.
