import { useCallback, useEffect, useState } from 'react'
import { AdminPracticePartnerLab } from '../components/AdminPracticePartnerLab'
import { BiText } from '../components/BiText'
import { openApp } from '../lib/siteLinks'
import { useAppViewportLock } from '../lib/useAppViewportLock'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ui } from '../lib/uiCopy'
import './PracticePage.css'

type HubPlace = { atOrb: boolean; backToOrb: () => void }

const BACK_ARROW = (
  <svg viewBox="0 0 46 40" aria-hidden="true">
    <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.3 0 4.4l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.3 0 4.4 1.2 1.1 3.3.8 4.4-.3l16-17c.5-.5.8-1.1.8-1.9z" />
  </svg>
)

/** Signed-in Practice Partner (`#/practice`) — Account Hub launcher destination. */
export function PracticePage() {
  useAppViewportLock(true)
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const height = window.visualViewport?.height ?? window.innerHeight
      root.style.setProperty('--practice-vh', `${Math.round(height)}px`)
    }
    apply()
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      root.style.removeProperty('--practice-vh')
      window.visualViewport?.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])
  useDocumentMeta({
    title: 'Practice Partner — JyutTranslate',
    description: 'Speak with 港灣, your Cantonese practice partner.',
    path: '/#/practice',
  })

  const [hubPlace, setHubPlace] = useState<HubPlace | null>(null)
  const onHubPlace = useCallback((place: HubPlace) => {
    setHubPlace(place)
  }, [])
  const atOrb = hubPlace?.atOrb !== false

  return (
    <div className="practice-page">
      <header className="practice-page-bar">
        <button
          type="button"
          className="practice-back"
          onClick={() => {
            if (hubPlace && !hubPlace.atOrb) hubPlace.backToOrb()
            else openApp()
          }}
        >
          <span className="practice-back-mark" aria-hidden="true">
            <span className="practice-back-box">
              <span className="practice-back-elem">{BACK_ARROW}</span>
              <span className="practice-back-elem">{BACK_ARROW}</span>
            </span>
          </span>
          <BiText copy={atOrb ? ui.backToApp : ui.backToHarbor} size="sm" hideJp order="zh-first" />
        </button>
        <h1 className="practice-page-title">
          <BiText copy={ui.practicePartnerShort} size="md" hideJp />
        </h1>
      </header>
      <div className="practice-page-lab">
        <AdminPracticePartnerLab entry="hub" onHubPlace={onHubPlace} />
      </div>
    </div>
  )
}
