import { MotionConfig } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { openHome, openLearn } from '../../lib/siteLinks'
import { useDocumentMeta } from '../../lib/useDocumentMeta'
import { learnLevelFromHash } from '../../lib/useHashRoute'
import { HARBOR_LEVELS, levelById, levelCampaign } from './curriculum'
import { HarborMap, LearnSession } from './LearnPlay'
import {
  continueHarborLevelId,
  hydrateHarborProgress,
  loadHarborProgress,
  type HarborProgress,
} from './progress'
import '../landing.css'
import './learn.css'

const OC_GUIDE = 'https://opencantonese.org/books/cantonese-life-1/pronunciation-guide'

/**
 * Learn · Harbor Quest — launches straight into the fullscreen river voyage.
 * Pier selection lives in an in-game chart overlay (no marketing hub).
 */
export function LearnPage() {
  useDocumentMeta({
    title: 'Learn · Harbor Quest — JyutTranslate',
    description:
      'Play through Cantonese pronunciation like a game — Jyutping initials, finals, and tones from the Open Cantonese guide.',
    path: '/#/learn',
  })

  const [progress, setProgress] = useState<HarborProgress>(() => loadHarborProgress())
  const [levelId, setLevelId] = useState<string>(
    () => learnLevelFromHash() ?? continueHarborLevelId(loadHarborProgress()),
  )
  /** In-game pier chart (replaces the old marketing landing hub). */
  const [chartOpen, setChartOpen] = useState(false)

  useEffect(() => {
    const sync = () => {
      const fromHash = learnLevelFromHash()
      if (fromHash) {
        setLevelId(fromHash)
        return
      }
      // Bare `#/learn` always resolves to a playable pier — never the old hub.
      const next = continueHarborLevelId(loadHarborProgress())
      openLearn(next)
      setLevelId(next)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // Ensure the URL carries a level id on first paint of `#/learn`.
  useEffect(() => {
    if (!learnLevelFromHash()) {
      openLearn(levelId)
    }
  }, [levelId])

  useEffect(() => {
    let cancelled = false
    void hydrateHarborProgress().then((p) => {
      if (cancelled) return
      setProgress(p)
      // If the sailor is still on the auto-continue pier from local storage,
      // prefer the cloud continue target when the hash was bare on entry.
      if (!learnLevelFromHash()) {
        const next = continueHarborLevelId(p)
        if (next !== levelId) {
          openLearn(next)
          setLevelId(next)
        }
      }
    })
    return () => {
      cancelled = true
    }
    // Only hydrate once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openLevel = useCallback((id: string) => {
    openLearn(id)
    setLevelId(id)
    setChartOpen(false)
  }, [])

  const openChart = useCallback(() => {
    setProgress(loadHarborProgress())
    setChartOpen(true)
  }, [])

  const leaveHarbor = useCallback(() => {
    setChartOpen(false)
    openHome()
  }, [])

  const cleared = progress.cleared.length
  const total = HARBOR_LEVELS.length

  return (
    <MotionConfig reducedMotion="user">
      <div className="learn-page learn-page--play learn-page--immersive">
        <LearnSession
          levelId={levelId}
          onExit={openChart}
          onOpenLevel={openLevel}
          onProgress={setProgress}
        />

        {chartOpen ? (
          <div className="hq-chart-overlay" role="dialog" aria-label="Harbor pier chart">
            <div className="hq-chart-sheet">
              <header className="hq-chart-head">
                <p className="hq-chart-brand">
                  <span>JyutTranslate</span>
                  <span aria-hidden="true"> · </span>
                  <span>Harbor Quest</span>
                </p>
                <h2 className="hq-chart-title">Pier chart</h2>
                <p className="hq-chart-sub" lang="zh-HK">
                  碼頭航圖
                </p>
                <p className="hq-chart-progress">
                  {cleared}/{total} piers cleared
                  {progress.correctCount > 0 ? ` · ${progress.correctCount} correct casts` : ''}
                  {typeof progress.coins === 'number' ? ` · ${progress.coins} ferry coins` : ''}
                  {(progress.gold ?? 0) > 0 ? ` · ${progress.gold} arena gold` : ''}
                </p>
                <a className="hq-chart-oc" href={OC_GUIDE} target="_blank" rel="noreferrer">
                  Open Cantonese textbook ↗
                </a>
              </header>

              <HarborMap
                progress={progress}
                onSelect={openLevel}
                initialCampaign={levelCampaign(levelById(levelId) ?? HARBOR_LEVELS[0]!)}
              />

              <footer className="hq-chart-actions">
                <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setChartOpen(false)}>
                  Back to river
                </button>
                <button type="button" className="hq-btn hq-btn--ghost" onClick={leaveHarbor}>
                  Leave harbor
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </MotionConfig>
  )
}
