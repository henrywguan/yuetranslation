# Legal drafts (JyutTranslate)

**Canonical source** for Privacy / Terms / account deletion (also imported by the web app at build time):

| Document | File | In-app route | Clean URL (Play / store listings) |
| --- | --- | --- | --- |
| Privacy Policy | [privacy-policy.md](./privacy-policy.md) | `#/privacy` | https://www.jyuttranslate.com/privacy |
| Terms of Service | [terms-of-service.md](./terms-of-service.md) | `#/terms` | https://www.jyuttranslate.com/terms |
| Account & data deletion | [account-deletion.md](./account-deletion.md) | `#/delete-account` | https://www.jyuttranslate.com/delete-account |

Do **not** keep a second copy under `apps/web` — `LegalPage` imports these files directly.

**Google Play Data safety — Delete account URL:**  
`https://www.jyuttranslate.com/delete-account`  
(rewrites to `#/delete-account` in `apps/web/index.html`)

**Operator:** Henry Guan, d/b/a JyutTranslate  
**Privacy contact:** Help@JyutTranslate.com  
**Governing law (Terms):** California  
**Age:** 13+

**Placeholder:** physical / PO Box notice address — add when available.

Footer links (Privacy · Terms · Delete account · Contact) and auth-panel “agree to Terms and Privacy” are wired.

Re-audit with **`/cleanup`** (`.cursor/skills/cleanup/SKILL.md`) after material product changes (new plans, vendors, data types, auth/billing flows).
