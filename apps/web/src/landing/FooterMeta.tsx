import { useEffect, useState } from 'react'
import { BiText } from '../components/BiText'
import { getSession } from '../lib/auth'
import { openBugReportOrAuth } from '../lib/bugReport'
import { openDeleteAccount, openPrivacy, openTerms } from '../lib/siteLinks'
import { ui } from '../lib/uiCopy'

const CONTACT_MAILTO = 'mailto:henrywguan@gmail.com'

/** Quiet legal / contact line at the bottom of marketing footers. */
export function FooterMeta() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getSession().then((session) => {
      if (!cancelled) setLoggedIn(Boolean(session))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <p className="ln-footer-meta">
      <BiText copy={ui.footerCopyright} size="sm" hideJp only="en" />
      <span className="ln-footer-meta-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="ln-footer-contact ln-footer-legal" onClick={() => openPrivacy()}>
        <BiText copy={ui.footerPrivacy} size="sm" hideJp />
      </button>
      <span className="ln-footer-meta-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" className="ln-footer-contact ln-footer-legal" onClick={() => openTerms()}>
        <BiText copy={ui.footerTerms} size="sm" hideJp />
      </button>
      <span className="ln-footer-meta-sep" aria-hidden="true">
        ·
      </span>
      <button
        type="button"
        className="ln-footer-contact ln-footer-legal"
        onClick={() => openDeleteAccount()}
      >
        <BiText copy={ui.footerDeleteAccount} size="sm" hideJp />
      </button>
      <span className="ln-footer-meta-sep" aria-hidden="true">
        ·
      </span>
      <a className="ln-footer-contact" href={CONTACT_MAILTO}>
        <BiText copy={ui.footerContact} size="sm" hideJp />
      </a>
      {loggedIn ? (
        <>
          <span className="ln-footer-meta-sep" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            className="ln-footer-contact ln-footer-report"
            onClick={() => void openBugReportOrAuth()}
          >
            <BiText copy={ui.bugReportLink} size="sm" hideJp />
          </button>
        </>
      ) : null}
    </p>
  )
}
