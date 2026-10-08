import { useEffect, useState } from 'react'
import { BiText } from './BiText'
import {
  downloadOfflinePack,
  fetchOfflinePackManifest,
  installedOfflinePackMeta,
  removeOfflinePack,
  type OfflinePackManifest,
} from '../lib/offlinePackClient'
import type { InstalledPackMeta, OfflinePackId } from '../lib/offlinePackTypes'
import { biPlain, ui } from '../lib/uiCopy'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Account Hub: download / remove Cantonese offline dictionary packs. */
export function OfflinePackPanel() {
  const [manifest, setManifest] = useState<OfflinePackManifest | null>(null)
  const [installed, setInstalled] = useState<InstalledPackMeta | null>(null)
  const [busy, setBusy] = useState<OfflinePackId | 'remove' | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    void installedOfflinePackMeta().then(setInstalled)
  }

  useEffect(() => {
    refresh()
    void fetchOfflinePackManifest()
      .then(setManifest)
      .catch(() => setManifest(null))
  }, [])

  const onDownload = (id: OfflinePackId) => {
    if (busy) return
    setBusy(id)
    setError(null)
    setProgress(0)
    void downloadOfflinePack(id, setProgress)
      .then((meta) => {
        setInstalled(meta)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Download failed')
      })
      .finally(() => {
        setBusy(null)
        setProgress(0)
      })
  }

  const onRemove = () => {
    if (busy) return
    setBusy('remove')
    setError(null)
    void removeOfflinePack()
      .then(() => setInstalled(null))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Remove failed')
      })
      .finally(() => setBusy(null))
  }

  return (
    <div className="offline-pack-panel">
      <p className="account-hub-hint">
        <BiText copy={ui.offlinePackHint} size="sm" />
      </p>
      {installed ? (
        <p className="offline-pack-installed" role="status">
          <BiText copy={ui.offlinePackInstalled} size="sm" layout="inline" hideJp />
          {': '}
          {installed.id === 'full' ? biPlain(ui.offlinePackFull) : biPlain(ui.offlinePackEssentials)}
          {' · '}
          {formatBytes(installed.bytes)}
        </p>
      ) : (
        <p className="offline-pack-installed muted">
          <BiText copy={ui.offlinePackNone} size="sm" layout="inline" hideJp />
        </p>
      )}
      <div className="offline-pack-actions">
        {(manifest?.packs || [
          { id: 'essentials' as const, approxBytes: 50_000, label: 'Essentials' },
          { id: 'full' as const, approxBytes: 2_100_000, label: 'Full' },
        ]).map((pack) => {
          const id = pack.id as OfflinePackId
          const label = id === 'full' ? ui.offlinePackFull : ui.offlinePackEssentials
          const active = installed?.id === id
          return (
            <button
              key={id}
              type="button"
              className={`offline-pack-btn${active ? ' is-active' : ''}`}
              disabled={Boolean(busy)}
              aria-label={biPlain(label)}
              onClick={() => onDownload(id)}
            >
              <span className="offline-pack-btn-label">
                <BiText copy={label} size="sm" layout="inline" hideJp />
              </span>
              <span className="offline-pack-btn-meta">
                {busy === id && progress > 0
                  ? `${Math.round(progress * 100)}%`
                  : formatBytes(pack.approxBytes)}
              </span>
            </button>
          )
        })}
        {installed ? (
          <button
            type="button"
            className="offline-pack-btn offline-pack-btn--danger"
            disabled={Boolean(busy)}
            onClick={onRemove}
          >
            <BiText copy={ui.offlinePackRemove} size="sm" layout="inline" hideJp />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="account-hub-username-error" role="alert">
          {error}
        </p>
      ) : null}
      {manifest?.note ? <p className="account-hub-hint offline-pack-note">{manifest.note}</p> : null}
    </div>
  )
}
