import{r as e}from"./rolldown-runtime-hePW80VL.js";import{w as t}from"./auth-CbgG5V_1.js";import{L as n}from"./api-2oY9EHbr.js";import{C as r,E as i,O as a,P as o,T as s,x as c}from"./index-Bk7H7tR3.js";import{n as l,t as u}from"./landing-BTUPKIve.js";var d=e(t(),1),f=n();function p(e){return e.replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function m(e){let t=e.trim();return/privacy-policy\.md$/i.test(t)||t===`./privacy-policy.md`?`#/privacy`:/terms-of-service\.md$/i.test(t)||t===`./terms-of-service.md`?`#/terms`:t}function h(e){let t=p(o(e));return t=t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(e,t,n)=>{let r=m(n),i=p(r),a=/^https?:/i.test(r);return`<a href="${i}"${a?` target="_blank"`:``}${a?` rel="noopener noreferrer"`:``}>${t}</a>`}),t=t.replace(/\*\*([^*]+)\*\*/g,`<strong>$1</strong>`),t=t.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,`$1<em>$2</em>`),t=t.replace(/`([^`]+)`/g,`<code>$1</code>`),t}function g(e){let t=e.replace(/\r\n/g,`
`).split(`
`),n=[],r=0;for(;r<t.length;){let e=t[r].trim();if(!e){r+=1;continue}if(e===`---`){n.push({type:`hr`}),r+=1;continue}if(e.startsWith(`# `)){n.push({type:`h1`,text:e.slice(2).trim()}),r+=1;continue}if(e.startsWith(`## `)){n.push({type:`h2`,text:e.slice(3).trim()}),r+=1;continue}if(e.startsWith(`### `)){n.push({type:`h3`,text:e.slice(4).trim()}),r+=1;continue}if(e.startsWith(`|`)){let e=[];for(;r<t.length&&t[r].trim().startsWith(`|`);)e.push(t[r].trim()),r+=1;let i=e=>e.replace(/^\|/,``).replace(/\|$/,``).split(`|`).map(e=>e.trim()),a=i(e[0]||``),o=e.slice(2).map(i);n.push({type:`table`,headers:a,rows:o});continue}if(e.startsWith(`- `)||e.startsWith(`* `)){let e=[];for(;r<t.length;){let n=t[r].trim();if(n.startsWith(`- `)||n.startsWith(`* `))e.push(n.slice(2).trim()),r+=1;else if(n)break;else{r+=1;break}}n.push({type:`ul`,items:e});continue}let i=[];for(;r<t.length;){let e=t[r].trim();if(!e){r+=1;break}if(e===`---`||e.startsWith(`#`)||e.startsWith(`|`)||e.startsWith(`- `)||e.startsWith(`* `))break;i.push(e),r+=1}i.length&&n.push({type:`p`,text:i.join(` `)})}return n}function _(e){return g(e).filter((e,t)=>t!==0||e.type!==`h1`).map((e,t)=>{let n=`${e.type}-${t}`;switch(e.type){case`h2`:return(0,f.jsx)(`h2`,{className:`legal-h2`,dangerouslySetInnerHTML:{__html:h(e.text)}},n);case`h3`:return(0,f.jsx)(`h3`,{className:`legal-h3`,dangerouslySetInnerHTML:{__html:h(e.text)}},n);case`p`:return(0,f.jsx)(`p`,{className:`legal-p`,dangerouslySetInnerHTML:{__html:h(e.text)}},n);case`ul`:return(0,f.jsx)(`ul`,{className:`legal-ul`,children:e.items.map((e,t)=>(0,f.jsx)(`li`,{dangerouslySetInnerHTML:{__html:h(e)}},t))},n);case`table`:return(0,f.jsx)(`div`,{className:`legal-table-wrap`,children:(0,f.jsxs)(`table`,{className:`legal-table`,children:[(0,f.jsx)(`thead`,{children:(0,f.jsx)(`tr`,{children:e.headers.map((e,t)=>(0,f.jsx)(`th`,{dangerouslySetInnerHTML:{__html:h(e)}},t))})}),(0,f.jsx)(`tbody`,{children:e.rows.map((e,t)=>(0,f.jsx)(`tr`,{children:e.map((e,t)=>(0,f.jsx)(`td`,{dangerouslySetInnerHTML:{__html:h(e)}},t))},t))})]})},n);case`hr`:return(0,f.jsx)(`hr`,{className:`legal-hr`},n);case`h1`:return(0,f.jsx)(`h1`,{className:`legal-h1`,dangerouslySetInnerHTML:{__html:h(e.text)}},n);default:return null}})}var v={privacy:{title:`Privacy Policy`,eyebrow:c.legalPrivacyEyebrow,md:`# Privacy Policy

**JyutTranslate**  
**Effective date:** September 1, 2026  
**Last updated:** September 1, 2026

This Privacy Policy explains how **Henry Guan, doing business as JyutTranslate** (“**JyutTranslate**,” “**we**,” “**us**,” or “**our**”) collects, uses, shares, and protects information when you use **https://www.jyuttranslate.com** and related apps, pages, and services that link to this policy (the “**Service**”).

**Contact for privacy requests:** [henrywguan@gmail.com](mailto:henrywguan@gmail.com)

We do not currently list a physical mailing address. When we obtain a PO Box or other notice address, we will update this policy.

---

## 1. Who we are

JyutTranslate is a web service that helps people translate between English and Hong Kong Cantonese (粵語), including text translation, Jyutping romanization, interactive character breakdown, live speech translation, text-to-speech, and camera / document translation features.

The Service is operated by Henry Guan, doing business as JyutTranslate. This policy applies to consumer use of the Service worldwide, subject to applicable law.

---

## 2. Eligibility (13+)

The Service is intended for users who are **at least 13 years old**.

If you are under 13, do not create an account or use features that require sign-in. If you believe a child under 13 has provided us personal information, contact us at [henrywguan@gmail.com](mailto:henrywguan@gmail.com) and we will take appropriate steps to delete it where required.

---

## 3. Information we collect

### 3.1 Account and profile information

When you create or use an account, we may collect:

- Email address
- Authentication identifiers (including from email/password or Google / Apple sign-in)
- Plan / subscription status (Free, Family, Business)
- Voice preference settings you save to your account
- Account status flags used for security and administration (for example, disabled/banned)

### 3.2 Billing information

Paid plans are processed by **Stripe**. We receive and store Stripe customer and subscription identifiers linked to your account. Stripe collects and processes payment card details and related billing information under Stripe's own terms and privacy policy. We do not store full payment card numbers on our servers.

### 3.3 Usage and entitlement meters

To enforce plan limits and operate the Service, we store **usage counters** for signed-in users, such as:

- Live microphone minutes used
- Text-to-speech character counts
- Translation request counts
- Camera session time / camera translate counts
- Document page counts
- Related operational counters (for example, AI vision fallback counts)

These are **meters** (how much you used), not a stored archive of what you said, typed, photographed, or uploaded.

### 3.4 Content you submit for translation (processed to provide the Service)

Depending on the feature you use, the Service may process:

- Text you type or paste for translation
- Audio from your microphone for speech recognition / live translation
- Photos, camera frames, or uploaded images for OCR and translation
- Documents (such as PDF or Office files) for translation
- Chinese text you tap for character breakdown / learning overlays

**Speech recognition paths:** Live microphone translation typically uses **Microsoft Azure Speech** via our API. On some devices or configurations (for example, when Azure is unavailable), the app may fall back to your browser’s **Web Speech API**, in which case speech recognition is handled by your browser and/or device platform (such as Apple or Google) under their policies, not stored by us as audio files.

**How we treat this content:**

- We process it to return a translation or related result for your request.
- We do **not** maintain a product database of your translation transcripts, audio recordings, photos, or document files for later browsing, profiling, advertising, sale, or **training our own AI models**.
- Conversation history shown in the app is kept in your browser session memory and is not synced into our account database as a chat archive.
- Temporary technical caches may exist briefly in server memory to improve performance; they are not a durable content library and are not kept after normal process recycling.

**Important:** To deliver the feature, content may be transmitted to subprocessors listed in Section 6 (for example, speech, vision, and language-model providers) **solely to fulfill your request**. Those providers process data under their own terms.

### 3.5 Bug reports and support

If you submit a bug report while signed in, we may store:

- Issue type and optional note you write
- Account email and user id
- App route / mode, device and browser diagnostics, recent error events
- Plan / usage snapshot relevant to troubleshooting
- Optional screenshot **only if you choose to allow it**

Our in-product copy is designed so bug reports attach route and settings diagnostics and **not your translation text**. Document uploads are not attached to bug reports.

### 3.6 Device / local storage

The Service may store preferences on your device (for example, theme, voice picks, UI layout, small offline gloss caches, PWA tip dismissals) using browser storage such as \`localStorage\`. This data stays on your device unless you clear site data.

### 3.7 Approximate analytics

We use **Vercel Analytics** for aggregated traffic and performance insights. This is not a store of your translation content.

### 3.8 Email communications

If email tooling is configured, we may sync your account email to our email provider's audience for product and operational messages, and we may send transactional or administrative notices (for example, related to account, billing, or support). You can contact us to request removal from marketing-style sends where applicable; transactional messages related to the Service may still be necessary.

### 3.9 Information we do not intentionally collect

We do not ask for government ID, precise GPS tracking for ads, or payment card PANs in our own database. Please do not submit sensitive personal information (such as health, financial account secrets, or government ID images) into translation fields unless you accept the risk of processing by the Service and its processors.

---

## 4. How we use information

We use information to:

- Provide, operate, secure, and improve the Service
- Authenticate users and maintain sessions
- Meter entitlements and enforce plan limits
- Process subscriptions and prevent fraud / abuse
- Respond to bug reports and support requests
- Send service-related notices
- Comply with law and enforce our Terms
- Protect the rights, safety, and integrity of users and the Service

**We do not sell your personal information.**  
**We do not use your translation content, audio, images, or documents to train JyutTranslate's own machine-learning models.**  
**We do not sell your content or personal information to data brokers or advertisers.**

---

## 5. Legal bases (where GDPR / UK GDPR may apply)

If European or UK data-protection law applies, we typically rely on:

- **Contract** — to provide the Service you request (account, translation features, billing)
- **Legitimate interests** — security, abuse prevention, basic analytics, service improvement that does not override your rights
- **Consent** — where required (for example, optional screenshot in a bug report, or certain cookies/marketing where consent is legally required)
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
| **Microsoft Azure** | Speech (STT/TTS) and vision/OCR |
| **LLM provider** (OpenAI-compatible API such as DeepSeek / OpenAI, as configured) | Machine translation and related text/vision processing |
| **Google / Apple** | Sign-in (if you choose those providers) |
| **Google Fonts** | Typography delivery (fonts loaded from Google’s CDN when you visit the site) |

We may also disclose information if required by law, legal process, or to protect rights, safety, and security; or in connection with a merger, acquisition, or asset transfer (in which case we will take reasonable steps so the recipient honors this policy or provide notice of changes).

We do **not** share personal information for cross-context behavioral advertising as that term is commonly used under California law, and we do **not** sell personal information.

---

## 7. International transfers

We and our providers may process information in the United States and other countries. Those countries may have different data-protection laws than your home country. Where required, we rely on appropriate transfer mechanisms and vendor terms.

---

## 8. Retention

### Content processed for translation

Text, audio, images, and documents submitted for translation are processed to fulfill the request and are **not retained by us as a lasting content archive** after processing completes (aside from ephemeral technical handling described above). Optional bug-report screenshots/notes you submit are retained as support records.

### Account-linked records

While your **account is active**, we retain:

- Account / profile data
- Usage meters
- Bug reports you submitted
- Admin/security records associated with the account
- Billing identifiers needed to operate subscriptions

**Stripe** may retain payment and invoice records according to Stripe's practices and legal/accounting requirements, including after a subscription ends.

### After account closure

If you ask us to delete your account, we will delete or de-identify account-linked personal data we control within a reasonable period, except information we must keep for legal, security, fraud-prevention, tax, or accounting reasons, or that is stored only in residual backups for a limited time.

Because we do not currently offer fully self-serve account deletion in the product UI, email [henrywguan@gmail.com](mailto:henrywguan@gmail.com) to request deletion.

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

To exercise rights, email [henrywguan@gmail.com](mailto:henrywguan@gmail.com). We may need to verify your identity (for example, via the email on your account).

---

## 11. Cookies and similar technologies

We use:

- **Essential** technologies for login/session and security
- **Preference** storage on your device
- **Vercel Analytics** for aggregated usage

We do not operate a third-party advertising cookie stack on the Service today. Browser controls can block or clear cookies/site data; some features may stop working if essential storage is blocked.

---

## 12. Children's privacy

The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13. Contact us if you believe we have, and we will delete it as required.

---

## 13. Third-party links and services

The Service may link to third-party sites or rely on third-party sign-in and processors. Their privacy practices are governed by their own policies.

---

## 14. Changes to this policy

We may update this Privacy Policy from time to time. We will post the updated version with a revised “Last updated” date. For material changes, we may also provide additional notice (such as email or an in-product notice) when appropriate. Continued use after the effective date of changes means you accept the updated policy, to the extent permitted by law.

---

## 15. Contact

**Privacy / data requests:** [henrywguan@gmail.com](mailto:henrywguan@gmail.com)  
**Operator:** Henry Guan, doing business as JyutTranslate  
**Service:** https://www.jyuttranslate.com

Physical mailing address: to be added when available.
`},terms:{title:`Terms of Service`,eyebrow:c.legalTermsEyebrow,md:`# Terms of Service

**JyutTranslate**  
**Effective date:** September 1, 2026  
**Last updated:** September 1, 2026

These Terms of Service (“**Terms**”) are a contract between you and **Henry Guan, doing business as JyutTranslate** (“**JyutTranslate**,” “**we**,” “**us**,” or “**our**”) governing your use of **https://www.jyuttranslate.com** and related apps, pages, and services that link to these Terms (the “**Service**”).

By accessing or using the Service, you agree to these Terms and our [Privacy Policy](./privacy-policy.md). If you do not agree, do not use the Service.

**Contact:** [henrywguan@gmail.com](mailto:henrywguan@gmail.com)

We do not currently list a physical mailing address. When we obtain a PO Box or other notice address, we will update these Terms.

---

## 1. The Service

JyutTranslate provides English ↔ Hong Kong Cantonese (粵語) translation tools, which may include:

- Solo / text translation and Jyutping romanization
- Interactive character breakdown (tap-to-learn)
- Conversation / live microphone translation
- Text-to-speech (tap-to-play and, on eligible plans, auto-speak)
- Camera features (AR, image upload) and document translation

On some devices, live speech may use your browser’s built-in speech recognition when cloud speech services are unavailable.

Features, limits, and availability may vary by plan, device, browser permissions (microphone/camera), geography, and configuration. We may modify, suspend, or discontinue features with or without notice, to the extent permitted by law.

The Service is provided on an **“as available”** basis. We do not guarantee uninterrupted uptime or error-free operation.

---

## 2. Eligibility

You must be at least **13 years old** to use the Service.

If you use the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.

---

## 3. Accounts

Some features require an account (email/password and/or Google or Apple sign-in via our authentication provider).

You agree to:

- Provide accurate account information
- Keep your login credentials confidential
- Notify us promptly of unauthorized access
- Accept responsibility for activity under your account

We may refuse registration, restrict features, or suspend/terminate accounts for suspected fraud, abuse, non-payment, legal risk, or Terms violations.

To request account deletion, email [henrywguan@gmail.com](mailto:henrywguan@gmail.com) (self-serve deletion may not yet be available in the product UI).

---

## 4. Guest use

Limited features may be available without signing in (for example, certain text translation and tap-to-play voice, subject to change). Guest use is still covered by these Terms and the Privacy Policy. Live microphone and camera/document features generally require sign-in.

---

## 5. Plans, billing, cancellation, and refunds

### 5.1 Plans

We offer Free and paid plans (such as Family and Business). Current pricing, included allowances (live minutes, TTS, camera time, document pages, auto-speak, and similar), and feature comparisons are described on the Service's pricing page and may change over time.

Paid subscriptions are billed through **Stripe** on a recurring monthly or annual basis, as selected at checkout.

### 5.2 Renewal

Unless you cancel, paid subscriptions **automatically renew** at the then-current rate for the selected interval until canceled.

### 5.3 Cancellation

You may cancel a paid subscription at any time through the Stripe Customer Portal / billing management flow offered in the Service (or by contacting us if the portal is unavailable).

**When you cancel, your paid plan remains active until the end of the then-current subscription period.** After that period ends, the account reverts to Free (or loses paid entitlements) unless you resubscribe.

### 5.4 Refunds

**Refunds are not guaranteed.** Charges are generally non-refundable except where required by law or where we expressly agree otherwise in writing (email sufficient). We may, at our sole discretion, issue a courtesy refund or credit in exceptional cases.

### 5.5 Price changes; promotions

We may change prices or plan limits prospectively. For material paid-plan price changes, we will provide reasonable notice where required by law or card-network rules. Promotional codes may be offered under additional conditions and may be modified or revoked.

### 5.6 Taxes

Fees may be exclusive of applicable taxes. You are responsible for taxes associated with your purchase, except taxes based on our net income. Tax handling depends on Stripe Checkout / Stripe configuration and your location.

---

## 6. Acceptable use

You agree not to:

- Use the Service unlawfully or to harm others
- Attempt to bypass plan limits, metering, security, or access controls
- Probe, scan, or attack the Service, or disrupt other users
- Reverse engineer the Service except to the limited extent allowed by law
- Use automated scraping/bots in a way that overloads or abuses the Service without our permission
- Upload malware or infringing content
- Misrepresent your identity or affiliation
- Use microphone, camera, or document features to capture others' private information without appropriate rights/permissions
- Use outputs as a substitute for professional advice where licensed expertise is required (medical, legal, immigration, emergency, etc.)

We may throttle, suspend, or terminate access for abuse, including excessive use that harms service stability—even on high or “unlimited” tiers that remain metered for fairness and operations.

---

## 7. Your content and permissions

You retain ownership of content you submit (text, audio, images, documents).

You grant JyutTranslate a worldwide, non-exclusive, royalty-free license to host, process, transmit, and display that content **solely as needed to provide the Service you request** (including via subprocessors such as speech, vision, and language-model providers).

**We do not claim ownership of your translations' source content.**  
**We do not use your content to train JyutTranslate's own AI models.**  
**We do not sell your content.**

You represent that you have the rights needed to submit the content you provide and that your use will not violate law or third-party rights.

---

## 8. Machine translation disclaimer

The Service uses automated speech recognition, machine translation, OCR, and text-to-speech. **Outputs can be wrong, incomplete, biased, delayed, or inappropriate for the situation.**

You are solely responsible for how you rely on outputs. Do not rely on the Service as the sole basis for medical, legal, safety, immigration, financial, or other high-stakes decisions. For professional or official matters, consult a qualified human expert.

Demo / dictionary / fallback modes may produce limited or clearly marked provisional results when full model capacity is unavailable.

---

## 9. Intellectual property

The Service—including software, design, branding, curated lexicons, and documentation—is owned by Henry Guan d/b/a JyutTranslate or its licensors and is protected by intellectual-property laws.

Jyutping romanization follows publicly documented Linguistic Society of Hong Kong conventions; third-party lexicon/data sources remain subject to their respective licenses/attribution requirements.

You may not copy, modify, distribute, sell, or create derivative works from the Service except as allowed by these Terms or applicable open-source licenses.

---

## 10. Privacy

Our collection and use of personal information is described in the [Privacy Policy](./privacy-policy.md). By using the Service, you acknowledge that policy.

---

## 11. Third-party services

The Service depends on third parties (hosting, auth, payments, speech, vision, LLMs, email). Their outages, policy changes, or errors may affect the Service. Your use of third-party sign-in or payment flows may also be subject to those parties' terms.

---

## 12. Disclaimer of warranties

TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED **“AS IS”** AND **“AS AVAILABLE,”** WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT TRANSLATIONS OR TRANSCRIPTIONS WILL BE ACCURATE, RELIABLE, OR ERROR-FREE.

SOME JURISDICTIONS DO NOT ALLOW CERTAIN DISCLAIMERS; IN THOSE CASES, THE DISCLAIMER APPLIES TO THE FULLEST EXTENT PERMITTED.

---

## 13. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, JYUTTRANSLATE AND ITS OPERATOR WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS INTERRUPTION, ARISING OUT OF OR RELATED TO THE SERVICE OR THESE TERMS, REGARDLESS OF THEORY OF LIABILITY.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF: (A) THE AMOUNTS YOU PAID TO US FOR THE SERVICE IN THE **12 MONTHS** BEFORE THE EVENT GIVING RISE TO THE CLAIM; OR (B) **US $50** IF you have not paid us any amounts.

SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.

---

## 14. Indemnity

To the maximum extent permitted by law, you will defend and indemnify Henry Guan d/b/a JyutTranslate against claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from your content, your misuse of the Service, or your violation of these Terms or applicable law.

---

## 15. Suspension and termination

We may suspend or terminate access immediately for Terms violations, non-payment, legal risk, security concerns, or prolonged inactivity, subject to applicable law. You may stop using the Service at any time and may cancel paid subscriptions as described above. Sections that by nature should survive (including ownership, disclaimers, limitations, indemnity, and dispute terms) survive termination.

---

## 16. Governing law and disputes

These Terms are governed by the laws of the **State of California**, excluding conflict-of-law rules.

Except where prohibited by law, exclusive venue for disputes arising out of or relating to these Terms or the Service shall be the state or federal courts located in **California**, and you consent to personal jurisdiction there.

(If we later adopt arbitration or a small-claims carve-out, we will update these Terms with notice.)

---

## 17. Changes to these Terms

We may update these Terms from time to time. We will post the updated Terms with a revised “Last updated” date. Material changes may be communicated by email or in-product notice when appropriate. Continued use after changes become effective constitutes acceptance to the extent permitted by law.

---

## 18. Miscellaneous

- **Entire agreement.** These Terms and the Privacy Policy are the entire agreement between you and us regarding the Service.
- **Severability.** If a provision is unenforceable, the remainder stays in effect.
- **No waiver.** Failure to enforce a provision is not a waiver.
- **Assignment.** You may not assign these Terms without our consent. We may assign them in connection with a reorganization, merger, or sale of assets.
- **Language.** The English version controls if we provide translations.
- **Notices.** We may notify you via the Service, email associated with your account, or by updating these pages. You may notify us at [henrywguan@gmail.com](mailto:henrywguan@gmail.com). A physical notice address will be added when available.

---

## 19. Contact

**Henry Guan, doing business as JyutTranslate**  
Email: [henrywguan@gmail.com](mailto:henrywguan@gmail.com)  
Web: https://www.jyuttranslate.com
`}};function y({doc:e}){let t=v[e];return(0,d.useEffect)(()=>{let e=document.title;return document.title=`${t.title} — JyutTranslate`,()=>{document.title=e}},[t.title]),(0,f.jsxs)(u,{className:`legal-page`,onFeatures:()=>r(),children:[(0,f.jsxs)(`article`,{className:`legal-article`,children:[(0,f.jsxs)(`header`,{className:`legal-hero`,children:[(0,f.jsx)(`p`,{className:`ln-kicker`,children:(0,f.jsx)(a,{copy:t.eyebrow,size:`sm`,hideJp:!0})}),(0,f.jsx)(`h1`,{className:`legal-title`,children:t.title}),(0,f.jsx)(`p`,{className:`legal-updated`,children:(0,f.jsx)(a,{copy:c.legalEffective,size:`sm`,hideJp:!0,only:`en`})}),(0,f.jsx)(`p`,{className:`legal-switch`,children:e===`privacy`?(0,f.jsx)(`button`,{type:`button`,className:`legal-switch-link`,onClick:()=>i(),children:(0,f.jsx)(a,{copy:c.footerTerms,size:`sm`,hideJp:!0})}):(0,f.jsx)(`button`,{type:`button`,className:`legal-switch-link`,onClick:()=>s(),children:(0,f.jsx)(a,{copy:c.footerPrivacy,size:`sm`,hideJp:!0})})})]}),(0,f.jsx)(`div`,{className:`legal-body`,children:_(t.md)})]}),(0,f.jsx)(l,{})]})}export{y as LegalPage};