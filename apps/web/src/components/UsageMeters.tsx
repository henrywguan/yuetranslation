import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BiText } from './BiText'
import { inkEase } from '../lib/motion'
import { formatCompactDuration, formatExactDuration } from '../lib/formatDuration'
import { formatChars } from '../lib/formatChars'
import {
  clampUsageRatio,
  usageBarWidthPct,
  usageRingFill,
} from '../lib/usageMeterMath'
import { biPlain, ui, type Bi } from '../lib/uiCopy'
import type { Entitlement } from '../lib/types'

type MeterKey = 'live' | 'tts' | 'camera' | 'docs' | 'aiVision'

type MeterModel = {
  key: MeterKey
  label: Bi
  blurb: Bi
  /** Default ring center (compact). */
  usedLabel: string
  limitLabel: string
  /** Revealed on tap (mobile) / hover (desktop). */
  revealUsed: string
  revealLeft: string
  ratio: number | null
  /** Raw used amount for empty-ring checks. */
  usedAmount: number
  /** Pooled plans: your share of the ring (0–1). */
  selfFill: number
  /** Pooled plans: other household members' share (0–1). */
  familyFill: number
  unlimited: boolean
  detail: string
}

function splitRingFills(
  totalUsed: number,
  selfUsed: number,
  limit: number,
  unlimited: boolean,
  pooled: boolean,
): { selfFill: number; familyFill: number } {
  if (!pooled || limit <= 0) return { selfFill: 0, familyFill: 0 }

  const total = Math.max(0, totalUsed)
  const self = Math.max(0, Math.min(selfUsed, total))
  const family = Math.max(0, total - self)

  if (unlimited) {
    const decorative = 0.12
    if (total <= 0) return { selfFill: 0, familyFill: 0 }
    return {
      selfFill: (self / total) * decorative,
      familyFill: (family / total) * decorative,
    }
  }

  return {
    selfFill: clampUsageRatio(self / limit),
    familyFill: clampUsageRatio(family / limit),
  }
}

function formatMinutesCompact(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s > 0 && s < 60) return formatCompactDuration(s)
  const mins = s / 60
  if (mins >= 100) return `${Math.round(mins)}m`
  if (mins >= 10) return `${mins.toFixed(0)}m`
  return `${mins.toFixed(1).replace(/\.0$/, '')}m`
}

function timeDetail(usedSec: number, limitSec: number, unlimited: boolean): string {
  const used = formatExactDuration(usedSec)
  if (unlimited || limitSec <= 0) return `${used} used · unlimited`
  const left = formatExactDuration(Math.max(0, limitSec - usedSec))
  return `${used} used · ${left} left`
}

function buildMeters(e: Entitlement): MeterModel[] {
  const pooled = Boolean(e.household?.pooled)
  const pooledSplit = pooled && (e.household?.seatUsed ?? 0) > 1
  const selfUsage = e.usageSelf

  const liveLimitSec = Math.max(0, (e.limits.live_minutes ?? 0) * 60)
  const liveUsed = Math.max(0, Math.floor(e.usage.liveSeconds ?? 0))
  const liveUnlimited = liveLimitSec <= 0
  const liveRatio = liveUnlimited ? null : clampUsageRatio(liveUsed / liveLimitSec)
  const liveLeft = Math.max(0, liveLimitSec - liveUsed)
  const liveSelfUsed = Math.max(0, Math.floor(selfUsage?.liveSeconds ?? 0))
  const liveSplit = splitRingFills(liveUsed, liveSelfUsed, liveLimitSec, liveUnlimited, pooledSplit)

  const ttsUnlimited = Boolean(
    e.ttsUnlimited || e.plan === 'family' || e.plan === 'business',
  )
  const ttsLimit = Math.max(0, e.limits.tts_chars ?? 0)
  const ttsUsed = Math.max(0, e.usage.ttsChars ?? 0)
  const showVoice = ttsUnlimited || ttsLimit > 0
  const ttsRatio = ttsUnlimited || ttsLimit <= 0 ? null : clampUsageRatio(ttsUsed / ttsLimit)
  const ttsLeft = Math.max(0, ttsLimit - ttsUsed)
  const ttsSelfUsed = Math.max(0, selfUsage?.ttsChars ?? 0)
  const ttsSplit = splitRingFills(ttsUsed, ttsSelfUsed, ttsLimit, ttsUnlimited, pooledSplit)

  const camLimitSec = Math.max(0, (e.limits.camera_minutes ?? 0) * 60)
  const camUsed = Math.max(0, Math.floor(e.usage.cameraSeconds ?? 0))
  const camUnlimited = Boolean(e.cameraUnlimited)
  const camRatio = camUnlimited
    ? null
    : camLimitSec <= 0
      ? clampUsageRatio(camUsed > 0 ? 1 : 0)
      : clampUsageRatio(camUsed / camLimitSec)
  const camLeft = Math.max(0, camLimitSec - camUsed)
  const camSelfUsed = Math.max(0, Math.floor(selfUsage?.cameraSeconds ?? 0))
  const camSplit = splitRingFills(camUsed, camSelfUsed, camLimitSec, camUnlimited, pooledSplit)

  const docsLimit = Math.max(0, e.limits.docs_pages ?? 0)
  const docsUsed = Math.max(0, e.usage.docsPages ?? 0)
  const docsUnlimited = Boolean(e.docsUnlimited)
  const docsRatio = docsUnlimited
    ? null
    : docsLimit <= 0
      ? clampUsageRatio(docsUsed > 0 ? 1 : 0)
      : clampUsageRatio(docsUsed / docsLimit)
  const docsLeft = Math.max(0, docsLimit - docsUsed)
  const docsSelfUsed = Math.max(0, selfUsage?.docsPages ?? 0)
  const docsSplit = splitRingFills(docsUsed, docsSelfUsed, docsLimit, docsUnlimited, pooledSplit)

  const aiUsed = Math.max(0, e.usage.aiVisionCount ?? 0)

  const meters: MeterModel[] = [
    {
      key: 'live',
      label: ui.accountLive,
      blurb: ui.usageDetailLive,
      usedLabel: formatMinutesCompact(liveUsed),
      limitLabel: liveUnlimited ? '∞' : `${e.limits.live_minutes}m`,
      revealUsed: formatExactDuration(liveUsed),
      revealLeft: liveUnlimited ? 'unlimited' : `${formatExactDuration(liveLeft)} left`,
      ratio: liveRatio,
      usedAmount: liveUsed,
      selfFill: liveSplit.selfFill,
      familyFill: liveSplit.familyFill,
      unlimited: liveUnlimited,
      detail: timeDetail(liveUsed, liveLimitSec, liveUnlimited),
    },
  ]

  if (showVoice) {
    meters.push({
      key: 'tts',
      label: ui.accountVoice,
      blurb: ui.usageDetailVoice,
      usedLabel: formatChars(ttsUsed),
      limitLabel: ttsUnlimited ? '∞' : formatChars(ttsLimit),
      revealUsed: formatChars(ttsUsed),
      revealLeft: ttsUnlimited ? 'unlimited' : `${formatChars(ttsLeft)} left`,
      ratio: ttsRatio,
      usedAmount: ttsUsed,
      selfFill: ttsSplit.selfFill,
      familyFill: ttsSplit.familyFill,
      unlimited: ttsUnlimited,
      detail: ttsUnlimited
        ? `${formatChars(ttsUsed)} chars used · unlimited`
        : `${formatChars(ttsUsed)} used · ${formatChars(ttsLeft)} left`,
    })
  }

  if (e.loggedIn) {
    meters.push(
      {
        key: 'camera',
        label: ui.modeCamera,
        blurb: ui.usageDetailCamera,
        usedLabel: formatMinutesCompact(camUsed),
        limitLabel: camUnlimited ? '∞' : `${e.limits.camera_minutes ?? 0}m`,
        revealUsed: formatExactDuration(camUsed),
        revealLeft: camUnlimited ? 'unlimited' : `${formatExactDuration(camLeft)} left`,
        ratio: camRatio,
        usedAmount: camUsed,
        selfFill: camSplit.selfFill,
        familyFill: camSplit.familyFill,
        unlimited: camUnlimited,
        detail: timeDetail(camUsed, camLimitSec, camUnlimited),
      },
      {
        key: 'docs',
        label: ui.usageDocs,
        blurb: ui.usageDetailDocs,
        usedLabel: String(docsUsed),
        limitLabel: docsUnlimited ? '∞' : String(docsLimit),
        revealUsed: String(docsUsed),
        revealLeft: docsUnlimited ? 'unlimited' : `${docsLeft} left`,
        ratio: docsRatio,
        usedAmount: docsUsed,
        selfFill: docsSplit.selfFill,
        familyFill: docsSplit.familyFill,
        unlimited: docsUnlimited,
        detail: docsUnlimited
          ? `${docsUsed} pages used · unlimited`
          : `${docsUsed} used · ${docsLeft} left`,
      },
      {
        key: 'aiVision',
        label: ui.accountAiVision,
        blurb: ui.usageDetailAiVision,
        usedLabel: String(aiUsed),
        limitLabel: '∞',
        revealUsed: String(aiUsed),
        revealLeft: 'tracked',
        ratio: null,
        usedAmount: aiUsed,
        selfFill: 0,
        familyFill: 0,
        unlimited: true,
        detail: `${aiUsed} AI reads · tracked only`,
      },
    )
  }

  return meters
}

function MeterRing({
  ratio,
  selfFill,
  familyFill,
  pooled,
  unlimited,
  usedAmount,
  usedLabel,
  limitLabel,
  revealUsed,
  revealLeft,
  precise,
}: {
  ratio: number | null
  selfFill: number
  familyFill: number
  pooled: boolean
  unlimited: boolean
  /** Raw used count/seconds/chars — rings stay empty when this is 0. */
  usedAmount: number
  usedLabel: string
  limitLabel: string
  revealUsed: string
  revealLeft: string
  precise: boolean
}) {
  const gradId = useId().replace(/:/g, '')
  const r = 34
  const c = 2 * Math.PI * r
  const hasUsage = usedAmount > 0
  const showSplit = pooled && hasUsage && (selfFill > 0 || familyFill > 0)
  const fill = usageRingFill(ratio, unlimited, usedAmount)
  const selfDash = c * (showSplit ? selfFill : fill)
  const familyDash = c * (showSplit ? familyFill : 0)
  const level =
    unlimited || fill < 0.55 ? 'ok' : fill < 0.85 ? 'warn' : 'hot'

  return (
    <div
      className={`usage-meter-ring usage-meter-ring--${level}${precise ? ' is-precise' : ''}${showSplit ? ' is-split' : ''}`}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="usage-meter-ring-svg">
        {!showSplit ? (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--jade)" />
              <stop offset="100%" stopColor="var(--gold)" />
            </linearGradient>
          </defs>
        ) : null}
        <circle className="usage-meter-ring-track" cx="40" cy="40" r={r} />
        {showSplit ? (
          <>
            {selfDash > 0 ? (
              <circle
                className="usage-meter-ring-fill usage-meter-ring-fill--self"
                cx="40"
                cy="40"
                r={r}
                strokeDasharray={`${selfDash} ${c - selfDash}`}
                strokeDashoffset={0}
              />
            ) : null}
            {familyDash > 0 ? (
              <circle
                className="usage-meter-ring-fill usage-meter-ring-fill--family"
                cx="40"
                cy="40"
                r={r}
                strokeDasharray={`${familyDash} ${c - familyDash}`}
                strokeDashoffset={-selfDash}
              />
            ) : null}
          </>
        ) : (
          <circle
            className="usage-meter-ring-fill"
            cx="40"
            cy="40"
            r={r}
            stroke={`url(#${gradId})`}
            strokeDasharray={`${selfDash} ${c - selfDash}`}
            strokeDashoffset={0}
          />
        )}
      </svg>
      <div className="usage-meter-ring-center">
        <span className="usage-meter-ring-default">
          <span className="usage-meter-ring-used">{usedLabel}</span>
          <span className="usage-meter-ring-of">/ {limitLabel}</span>
        </span>
        <span className="usage-meter-ring-reveal">
          <span className="usage-meter-ring-used">{revealUsed}</span>
          <span className="usage-meter-ring-of">{revealLeft}</span>
        </span>
      </div>
    </div>
  )
}

function isCoarsePointer(event?: PointerEvent<HTMLElement>): boolean {
  if (event?.pointerType === 'touch') return true
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

type Props = {
  entitlement: Entitlement
}

export function UsageMeters({ entitlement }: Props) {
  const meters = buildMeters(entitlement)
  const [detailOpen, setDetailOpen] = useState(false)
  const [tapRevealed, setTapRevealed] = useState(false)
  const [hoverPrecise, setHoverPrecise] = useState(false)
  const lastTapRef = useRef(0)

  const precise = tapRevealed || hoverPrecise

  const onActivate = (event: PointerEvent<HTMLElement>) => {
    if (isCoarsePointer(event)) {
      const now = Date.now()
      if (now - lastTapRef.current < 320) {
        setDetailOpen(true)
        lastTapRef.current = 0
        return
      }
      lastTapRef.current = now
      setTapRevealed((v) => !v)
      return
    }
    if (event.detail >= 2) {
      setDetailOpen(true)
    }
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
  const pooledSplit = pooled && (entitlement.household?.seatUsed ?? 0) > 1
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
                      const barWidth = usageBarWidthPct(m.ratio, m.unlimited, m.usedAmount)
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
                            data-unlimited={m.unlimited ? '1' : '0'}
                          >
                            <span
                              className="usage-detail-bar-fill"
                              style={{ width: `${barWidth}%` }}
                            />
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
        className={`usage-meters${precise ? ' is-precise' : ''}`}
        onPointerUp={onActivate}
        onMouseEnter={() => {
          if (!isCoarsePointer()) setHoverPrecise(true)
        }}
        onMouseLeave={() => setHoverPrecise(false)}
        role="button"
        tabIndex={0}
        aria-label={biPlain(ui.usageMetersA11y)}
        aria-pressed={precise}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setDetailOpen(true)
            return
          }
          if (e.key === ' ') {
            e.preventDefault()
            setTapRevealed((v) => !v)
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
                selfFill={m.selfFill}
                familyFill={m.familyFill}
                pooled={pooledSplit}
                unlimited={m.unlimited}
                usedAmount={m.usedAmount}
                usedLabel={m.usedLabel}
                limitLabel={m.limitLabel}
                revealUsed={m.revealUsed}
                revealLeft={m.revealLeft}
                precise={precise}
              />
              <BiText copy={m.label} size="sm" as="p" className="usage-meter-label" />
            </motion.div>
          ))}
        </div>
        {pooledSplit ? (
          <div className="usage-meters-legend" aria-hidden>
            <span className="usage-meters-legend-item">
              <span className="usage-meters-legend-swatch usage-meters-legend-swatch--self" />
              <BiText copy={ui.usageMetersLegendYou} size="sm" as="span" />
            </span>
            <span className="usage-meters-legend-item">
              <span className="usage-meters-legend-swatch usage-meters-legend-swatch--family" />
              <BiText copy={ui.usageMetersLegendFamily} size="sm" as="span" />
            </span>
          </div>
        ) : null}
        <BiText
          copy={ui.usageMetersHintTouch}
          size="sm"
          as="p"
          className="usage-meters-hint usage-meters-hint--touch"
        />
        <BiText
          copy={ui.usageMetersHintMouse}
          size="sm"
          as="p"
          className="usage-meters-hint usage-meters-hint--mouse"
        />
      </section>
      {drawer}
    </>
  )
}
