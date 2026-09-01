import { BiText } from './BiText'
import { useYueStore } from '../lib/store'
import './IncidentBanner.css'

/** Site-wide ops banner — toggled from #/admin. */
export function IncidentBanner() {
  const banner = useYueStore((s) => s.incidentBanner)
  if (!banner?.enabled) return null

  const copy = {
    en: banner.messageEn,
    zh: banner.messageZh,
    jp: banner.messageEn,
  }

  return (
    <div className="incident-banner" role="status" aria-live="polite">
      <div className="incident-banner-track">
        <span className="incident-banner-chunk">
          <BiText copy={copy} size="sm" layout="inline" />
        </span>
        <span className="incident-banner-chunk" aria-hidden="true">
          <BiText copy={copy} size="sm" layout="inline" />
        </span>
      </div>
    </div>
  )
}
