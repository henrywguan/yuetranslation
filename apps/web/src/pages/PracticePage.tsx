import { AdminPracticePartnerLab } from '../components/AdminPracticePartnerLab'
import { BiText } from '../components/BiText'
import { openApp } from '../lib/siteLinks'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ui } from '../lib/uiCopy'
import './PracticePage.css'

/** Signed-in Practice Partner (`#/practice`) — Account Hub launcher destination. */
export function PracticePage() {
  useDocumentMeta({
    title: 'Practice Partner — JyutTranslate',
    description: 'Speak with 港灣, your Cantonese practice partner.',
    path: '/#/practice',
  })

  return (
    <div className="practice-page">
      <header className="practice-page-bar">
        <button type="button" className="practice-page-back" onClick={() => openApp()}>
          <BiText copy={ui.backToApp} size="sm" hideJp />
        </button>
        <h1 className="practice-page-title">
          <BiText copy={ui.practicePartnerShort} size="md" hideJp />
        </h1>
      </header>
      <div className="practice-page-lab">
        <AdminPracticePartnerLab entry="hub" />
      </div>
    </div>
  )
}
