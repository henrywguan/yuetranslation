import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import { isOnline, subscribeOnlineStatus } from '../lib/networkStatus'
import { offlineLexiconReady } from '../lib/offlinePackClient'
import { biPlain, ui } from '../lib/uiCopy'

/** Compact status when the device is offline (dictionary pack vs limited). */
export function OfflineBanner() {
  const [online, setOnline] = useState(() => isOnline())
  const [hasPack, setHasPack] = useState(() => offlineLexiconReady())

  useEffect(() => subscribeOnlineStatus(setOnline), [])
  useEffect(() => {
    if (online) return
    setHasPack(offlineLexiconReady())
  }, [online])

  if (online) return null

  return (
    <div className="banner warn offline-banner" role="status">
      <BiText copy={hasPack ? ui.offlineBannerWithPack : ui.offlineBannerNoPack} size="sm" />
    </div>
  )
}
