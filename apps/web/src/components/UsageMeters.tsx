import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type MeterKey = 'live' | 'tts' | 'camera' | 'docs' | 'aiVision'

type MeterModel = {
  key: MeterKey
  label: Bi
  blurb: Bi
  usedLabel: string
  limitLabel: string
  ratio: number | null
  unlimited: boolean
  detail: string
}

function clampRatio(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 1) return 1
  return n
}

function formatMinutes(seconds: number): string {
  const mins = Math.max(0, seconds) / 60
  if (mins >= 100) return `${Math.round(mins)}`
  if (mins >= 10) return mins.toFixed(0)
  return mins.toFixed(1).replace(/\.0$/, '')
}

function formatChars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 10_000) return `${Math.round(n / 1000)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(Math.max(0, Math.round(n)))
}

function buildMeters(e: Entitlement): MeterModel[] {
  const liveLimitSec = Math.max(0, (e.limits.live_minutes ?? 0) * 60)
  const liveUsed = Math.max(0, e.usage.liveSeconds ?? 0)
  const liveUnlimited = liveLimitSec <= 0
  const liveRatio = liveUnlimited ? null : clampRatio(liveUsed / liveLimitSec)

  const ttsUnlimited = Boolean(
    e.ttsUnlimited || e.plan === 'family' || e.plan === 'business',
  )
  const ttsLimit = Math.max(0, e.limits.tts_chars ?? 0)
  const ttsUsed = Math.max(0, e.usage.ttsChars ?? 0)
  const showVoice = ttsUnlimited || ttsLimit > 0
  const ttsRatio = ttsUnlimited || ttsLimit <= 0 ? null : clampRatio(ttsUsed / ttsLimit)

  const camLimitSec = Math.max(0, (e.limits.camera_minutes ?? 0) * 60)
  const camUsed = Math.max(0, e.usage.cameraSeconds ?? 0)
  const camUnlimited = Boolean(e.cameraUnlimited)
  const camRatio = camUnlimited
    ? null
    : camLimitSec <= 0
      ? clampRatio(camUsed > 0 ? 1 : 0)
      : clampRatio(camUsed / camLimitSec)

  const docsLimit = Math.max(0, e.limits.docs_pages ?? 0)
  const docsUsed = Math.max(0, e.usage.docsPages ?? 0)
  const docsUnlimited = Boolean(e.docsUnlimited)
  const docsRatio = docsUnlimited
    ? null
    : docsLimit <= 0
      ? clampRatio(docsUsed > 0 ? 1 : 0)
      : clampRatio(docsUsed / docsLimit)

  const aiUsed = Math.max(0, e.usage.aiVisionCount ?? 0)

  const meters: MeterModel[] = [
    {
      key: 'live',
      label: ui.accountLive,
      blurb: ui.usageDetailLive,
      usedLabel: `${formatMinutes(liveUsed)}m`,
      limitLabel: liveUnlimited ? '∞' : `${e.limits.live_minutes}m`,
      ratio: liveRatio,
      unlimited: liveUnlimited,
      detail: liveUnlimited
        ? `${formatMinutes(liveUsed)} min used · unlimited`
        : `${formatMinutes(liveUsed)} / ${e.limits.live_minutes} min`,
    },
  ]

  if (showVoice) {
    meters.push({
      key: 'tts',
      label: ui.accountVoice,
      blurb: ui.usageDetailVoice,
      usedLabel: formatChars(ttsUsed),
      limitLabel: ttsUnlimited ? '∞' : formatChars(ttsLimit),
      ratio: ttsRatio,
      unlimited: ttsUnlimited,
      detail: ttsUnlimited
        ? `${formatChars(ttsUsed)} chars used · unlimited`
        : `${formatChars(ttsUsed)} / ${formatChars(ttsLimit)} chars`,
    })
  }

  if (e.loggedIn) {
    meters.push(
      {
        key: 'camera',
        label: ui.modeCamera,
        blurb: ui.usageDetailCamera,
        usedLabel: `${formatMinutes(camUsed)}m`,
        limitLabel: camUnlimited ? '∞' : `${e.limits.camera_minutes ?? 0}m`,
        ratio: camRatio,
        unlimited: camUnlimited,
        detail: camUnlimited
          ? `${formatMinutes(camUsed)} min used · unlimited`
          : `${formatMinutes(camUsed)} / ${e.limits.camera_minutes ?? 0} min`,
      },
      {
        key: 'docs',
        label: ui.usageDocs,
        blurb: ui.usageDetailDocs,
        usedLabel: String(docsUsed),
        limitLabel: docsUnlimited ? '∞' : String(docsLimit),
        ratio: docsRatio,
        unlimited: docsUnlimited,
        detail: docsUnlimited
          ? `${docsUsed} pages used · unlimited`
          : `${docsUsed} / ${docsLimit} pages`,
      },
      {
        key: 'aiVision',
        label: ui.accountAiVision,
        blurb: ui.usageDetailAiVision,
        usedLabel: String(aiUsed),
        limitLabel: '∞',
        ratio: null,
        unlimited: true,
        detail: `${aiUsed} AI reads · tracked only`,
      },
    )
  }

  return meters
}

function MeterRing({
  ratio,
  unlimited,
  usedLabel,
  limitLabel,
}: {
  ratio: number | null
  unlimited: boolean
  usedLabel: string
  limitLabel: string
}) {
  const gradId = useId().replace(/:/g, '')
  const r = 34
  const c = 2 * Math.PI * r
  const fill = unlimited ? 0.12 : clampRatio(ratio ?? 0)
  const dash = c * fill
  const level =
    unlimited || fill < 0.55 ? 'ok' : fill < 0.85 ? 'warn' : 'hot'

  return (
    <div className={`usage-meter-ring usage-meter-ring--${level}`} aria-hidden>
      <svg viewBox="0 0 80 80" className="usage-meter-ring-svg">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--jade)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle className="usage-meter-ring-track" cx="40" cy="40" r={r} />
        <circle
          className="usage-meter-ring-fill"
          cx="40"
          cy="40"
          r={r}
          stroke={`url(#${gradId})`}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c * 0.25}
        />
      </svg>
      <div className="usage-meter-ring-center">
        <span className="usage-meter-ring-used">{usedLabel}</span>
        <span className="usage-meter-ring-of">/ {limitLabel}</span>
      </div>
    </div>
  )
}

type Props = {
  entitlement: Entitlement
}

export function UsageMeters({ entitlement }: Props) {
  const meters = buildMeters(entitlement)
  const [detailOpen, setDetailOpen] = useState(false)
  const lastTapRef = useRef(0)

  const onActivate = (event: PointerEvent<HTMLElement>) => {
    if (event.detail >= 2) {
      setDetailOpen(true)
      return
    }
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      setDetailOpen(true)
      lastTapRef.current = 0
      return
    }
    lastTapRef.current = now
  }

  useEffect(() => {
    if (!detailOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setDetailOpen(false)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [detailOpen])

  const pooled = Boolean(entitlement.household?.pooled)
  const drawer =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {detailOpen ? (
              <motion.div
                className="usage-detail-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [...inkEase] }}
              >
                <button
                  type="button"
                  className="usage-detail-scrim"
                  aria-label={biPlain(ui.close)}
                  onClick={() => setDetailOpen(false)}
                />
                <motion.aside
                  className="usage-detail-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="usage-detail-title"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.85 }}
                >
                  <div className="usage-detail-handle" aria-hidden />
                  <div className="usage-detail-head">
                    <div>
                      <h3 id="usage-detail-title" className="usage-detail-title">
                        <BiText copy={ui.usageDetailTitle} size="md" />
                      </h3>
                      <BiText
                        copy={pooled ? ui.accountUsagePooled : ui.accountUsage}
                        size="sm"
                        as="p"
                        className="usage-detail-sub"
                      />
                    </div>
                    <button
                      type="button"
                      className="usage-detail-close"
                      onClick={() => setDetailOpen(false)}
                    >
                      <BiText copy={ui.close} size="sm" />
                    </button>
                  </div>

                  <BiText
                    copy={ui.usageDetailLead}
                    size="sm"
                    as="p"
                    className="usage-detail-lead"
                  />

                  <ul className="usage-detail-list">
                    {meters.map((m) => {
                      const pct =
                        m.unlimited || m.ratio == null
                          ? null
                          : Math.round(clampRatio(m.ratio) * 100)
                      return (
                        <li key={m.key} className="usage-detail-row">
                          <div className="usage-detail-row-top">
                            <BiText
                              copy={m.label}
                              size="sm"
                              as="span"
                              className="usage-detail-label"
                            />
                            <span className="usage-detail-value">{m.detail}</span>
                          </div>
                          <div
                            className="usage-detail-bar"
                            style={
                              {
                                '--usage-pct': `${pct == null ? 12 : pct}%`,
                              } as CSSProperties
                            }
                            data-unlimited={m.unlimited ? '1' : '0'}
                          >
                            <span className="usage-detail-bar-fill" />
                          </div>
                          <BiText
                            copy={m.blurb}
                            size="sm"
                            as="p"
                            className="usage-detail-blurb"
                          />
                        </li>
                      )
                    })}
                  </ul>
                </motion.aside>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <>
      <section
        className="usage-meters"
        onPointerUp={onActivate}
        role="button"
        tabIndex={0}
        aria-label={biPlain(ui.usageMetersA11y)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setDetailOpen(true)
          }
        }}
      >
        <div className="usage-meters-grid">
          {meters.map((m, i) => (
            <motion.div
              key={m.key}
              className="usage-meter"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [...inkEase] }}
            >
              <MeterRing
                ratio={m.ratio}
                unlimited={m.unlimited}
                usedLabel={m.usedLabel}
                limitLabel={m.limitLabel}
              />
              <BiText copy={m.label} size="sm" as="p" className="usage-meter-label" />
            </motion.div>
          ))}
        </div>
        <BiText copy={ui.usageMetersHint} size="sm" as="p" className="usage-meters-hint" />
      </section>
      {drawer}
    </>
  )
}
