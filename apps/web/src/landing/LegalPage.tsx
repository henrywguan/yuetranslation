import { useEffect } from 'react'
import { BiText } from '../components/BiText'
import { openDeleteAccount, openHome, openPrivacy, openTerms } from '../lib/siteLinks'
import { renderLegalMarkdown } from '../lib/renderLegalMarkdown'
import { ui } from '../lib/uiCopy'
import privacyMd from '../../../../docs/legal/privacy-policy.md?raw'
import termsMd from '../../../../docs/legal/terms-of-service.md?raw'
import deleteAccountMd from '../../../../docs/legal/account-deletion.md?raw'
import { MarketingFooter } from './MarketingFooter'
import { MarketingPageShell } from './MarketingPageShell'
import './landing.css'
import './legal.css'

export type LegalDoc = 'privacy' | 'terms' | 'delete-account'

const DOCS: Record<
  LegalDoc,
  {
    title: string
    eyebrow: (typeof ui)['legalPrivacyEyebrow']
    md: string
  }
> = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: ui.legalPrivacyEyebrow,
    md: privacyMd,
  },
  terms: {
    title: 'Terms of Service',
    eyebrow: ui.legalTermsEyebrow,
    md: termsMd,
  },
  'delete-account': {
    title: 'Delete account & data',
    eyebrow: ui.legalDeleteEyebrow,
    md: deleteAccountMd,
  },
}

/** Marketing-shell page for Privacy / Terms / account deletion. */
export function LegalPage({ doc }: { doc: LegalDoc }) {
  const meta = DOCS[doc]

  useEffect(() => {
    const prev = document.title
    document.title = `${meta.title} — JyutTranslate`
    return () => {
      document.title = prev
    }
  }, [meta.title])

  return (
    <MarketingPageShell className="legal-page" onFeatures={() => openHome()}>
      <article className="legal-article">
        <header className="legal-hero">
          <p className="ln-kicker">
            <BiText copy={meta.eyebrow} size="sm" hideJp />
          </p>
          <h1 className="legal-title">{meta.title}</h1>
          <p className="legal-updated">
            <BiText copy={ui.legalEffective} size="sm" hideJp only="en" />
          </p>
          <p className="legal-switch">
            {doc !== 'privacy' ? (
              <button type="button" className="legal-switch-link" onClick={() => openPrivacy()}>
                <BiText copy={ui.footerPrivacy} size="sm" hideJp />
              </button>
            ) : null}
            {doc !== 'terms' ? (
              <button type="button" className="legal-switch-link" onClick={() => openTerms()}>
                <BiText copy={ui.footerTerms} size="sm" hideJp />
              </button>
            ) : null}
            {doc !== 'delete-account' ? (
              <button type="button" className="legal-switch-link" onClick={() => openDeleteAccount()}>
                <BiText copy={ui.footerDeleteAccount} size="sm" hideJp />
              </button>
            ) : null}
          </p>
        </header>

        <div className="legal-body">{renderLegalMarkdown(meta.md)}</div>
      </article>

      <MarketingFooter />
    </MarketingPageShell>
  )
}
