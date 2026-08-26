import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { BiText } from '../components/BiText'
import { setTtsPlaybackRate, speakTextSequence, stopSpeaking, unlockTtsPlayback } from '../lib/tts'
import { ui, type Bi } from '../lib/uiCopy'
import { FeatureInfoPanel } from './FeatureInfoPanel'
import { TONES } from './tones/tonesData'

const HK_COLLOQUIAL: { han: string; jp: string; gloss: Bi }[] = [
  { han: '係', jp: 'hai6', gloss: ui.featHkExHai },
  { han: '唔', jp: 'm4', gloss: ui.featHkExM },
  { han: '喺', jp: 'hai2', gloss: ui.featHkExHai2 },
  { han: '咗', jp: 'zo2', gloss: ui.featHkExZo },
]

type BentoCard = {
  title: Bi
  tag: Bi
  visual: 'jyutping' | 'hk' | 'breakdown' | 'host'
  span?: 'hero' | 'wide'
}

const CARDS: BentoCard[] = [
  { title: ui.featJpTitle, tag: ui.featJpTag, visual: 'jyutping', span: 'hero' },
  { title: ui.featHkTitle, tag: ui.featHkTag, visual: 'hk' },
  { title: ui.featFastTitle, tag: ui.featFastTag, visual: 'breakdown' },
  { title: ui.featHostTitle, tag: ui.featHostTag, visual: 'host', span: 'wide' },
]

function JyutpingVisual({ activeTone }: { activeTone: number | null }) {
  return (
    <div className="ln-feat-vis ln-feat-vis--jp" aria-hidden="true">
      <div className="ln-feat-ruby ln-feat-ruby--a">
        <span className="ln-feat-ruby-jp">hai6</span>
        <span className="ln-feat-ruby-han" lang="zh-HK">
          係
        </span>
      </div>
      <div className="ln-feat-ruby ln-feat-ruby--b">
        <span className="ln-feat-ruby-jp">m4</span>
        <span className="ln-feat-ruby-han" lang="zh-HK">
          唔
        </span>
      </div>
      <div className="ln-feat-tone-ring">
        {TONES.map((tone) => (
          <span key={tone.n} className={activeTone === tone.n ? 'is-active' : ''}>
            {tone.n}
          </span>
        ))}
      </div>
    </div>
  )
}

function HkVisual() {
  const tags = ['係', '唔', '喺', '咗']
  return (
    <div className="ln-feat-vis ln-feat-vis--hk" aria-hidden="true">
      {tags.map((t, i) => (
        <span key={t} className="ln-feat-hk-tag" style={{ '--i': i } as CSSProperties} lang="zh-HK">
          {t}
        </span>
      ))}
    </div>
  )
}

function BreakdownVisual() {
  const cells = [
    { han: '食', jp: 'sik6' },
    { han: '飯', jp: 'faan6' },
    { han: '未', jp: 'mei6' },
  ]
  return (
    <div className="ln-feat-vis ln-feat-vis--bd" aria-hidden="true">
      {cells.map((c) => (
        <span key={c.han} className="ln-feat-bd-cell">
          <span className="ln-feat-ruby-jp">{c.jp}</span>
          <span className="ln-feat-ruby-han" lang="zh-HK">
            {c.han}
          </span>
        </span>
      ))}
      <span className="ln-feat-bd-cursor" />
    </div>
  )
}

function HostVisual() {
  return (
    <div className="ln-feat-vis ln-feat-vis--host" aria-hidden="true">
      <div className="ln-feat-host-stack">
        <span className="ln-feat-host-layer" />
        <span className="ln-feat-host-layer" />
        <span className="ln-feat-host-layer ln-feat-host-layer--top">
          <span className="ln-feat-host-dot" />
          <span className="ln-feat-host-dot" />
          <span className="ln-feat-host-dot" />
        </span>
      </div>
      <div className="ln-feat-host-badges">
        <span>CAM</span>
      </div>
    </div>
  )
}

function FeatureVisual({
  kind,
  activeTone,
}: {
  kind: BentoCard['visual']
  activeTone?: number | null
}) {
  switch (kind) {
    case 'jyutping':
      return <JyutpingVisual activeTone={activeTone ?? null} />
    case 'hk':
      return <HkVisual />
    case 'breakdown':
      return <BreakdownVisual />
    case 'host':
      return <HostVisual />
  }
}

const TONE_MAX_MS = 950

function JyutpingBentoCard({ card }: { card: BentoCard }) {
  const [activeTone, setActiveTone] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const playingRef = useRef(false)

  useEffect(() => {
    return () => {
      stopSpeaking()
      setTtsPlaybackRate(1)
    }
  }, [])

  const playAllTones = useCallback(() => {
    if (playingRef.current) return
    unlockTtsPlayback()
    playingRef.current = true
    setPlaying(true)

    void speakTextSequence(
      TONES.map((tone) => tone.han),
      {
        maxMsPerItem: TONE_MAX_MS,
        rate: 1.15,
        onStep: (index) => setActiveTone(TONES[index]?.n ?? null),
      },
    ).finally(() => {
      setActiveTone(null)
      setPlaying(false)
      playingRef.current = false
    })
  }, [])

  const spanClass = card.span ? ` ln-feat-card--${card.span}` : ''

  return (
    <button
      type="button"
      className={`ln-feat-card ln-feat-card--link ln-feat-card--tones${playing ? ' is-speaking' : ''}${spanClass}`}
      onClick={() => void playAllTones()}
      aria-label={`${ui.featJpTitle.en} — play si in six tones`}
      aria-busy={playing}
    >
      <FeatureVisual kind="jyutping" activeTone={activeTone} />
      <div className="ln-feat-card-copy">
        <h3>
          <BiText copy={card.title} size="md" hideJp />
        </h3>
        <BiText className="ln-feat-card-tag" copy={card.tag} size="sm" as="p" hideJp />
      </div>
    </button>
  )
}

function HkBentoCard({ card }: { card: BentoCard }) {
  const [open, setOpen] = useState(false)
  const spanClass = card.span ? ` ln-feat-card--${card.span}` : ''

  return (
    <>
      <button
        type="button"
        className={`ln-feat-card ln-feat-card--link ln-feat-card--hk${spanClass}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <FeatureVisual kind="hk" />
        <div className="ln-feat-card-copy">
          <h3>
            <BiText copy={card.title} size="md" hideJp />
          </h3>
          <BiText className="ln-feat-card-tag" copy={card.tag} size="sm" as="p" hideJp />
        </div>
      </button>

      <FeatureInfoPanel
        open={open}
        onClose={() => setOpen(false)}
        title={ui.featHkTitle}
        kicker={ui.featHkTag}
      >
        <BiText className="ln-feat-panel-lead" copy={ui.featHkDesc} size="sm" as="p" />
        <ul className="ln-feat-panel-hk-list">
          {HK_COLLOQUIAL.map((item) => (
            <li key={item.han}>
              <span className="ln-feat-panel-hk-glyph" lang="zh-HK">
                <span className="ln-feat-ruby-jp">{item.jp}</span>
                <span className="ln-feat-ruby-han">{item.han}</span>
              </span>
              <BiText className="ln-feat-panel-hk-gloss" copy={item.gloss} size="sm" hideJp />
            </li>
          ))}
        </ul>
      </FeatureInfoPanel>
    </>
  )
}

function BentoCardBody({ card }: { card: BentoCard }) {
  if (card.visual === 'jyutping') {
    return <JyutpingBentoCard card={card} />
  }

  if (card.visual === 'hk') {
    return <HkBentoCard card={card} />
  }

  const spanClass = card.span ? ` ln-feat-card--${card.span}` : ''
  return (
    <article className={`ln-feat-card${spanClass}`}>
      <FeatureVisual kind={card.visual} />
      <div className="ln-feat-card-copy">
        <h3>
          <BiText copy={card.title} size="md" hideJp />
        </h3>
        <BiText className="ln-feat-card-tag" copy={card.tag} size="sm" as="p" hideJp />
      </div>
    </article>
  )
}

/** Mobile bento feature grid — visual cards, minimal copy. */
export function HomeFeaturesBento() {
  return (
    <div className="ln-feat-bento" aria-label={ui.modesKicker.en}>
      {CARDS.map((card) => (
        <BentoCardBody key={card.title.en} card={card} />
      ))}
    </div>
  )
}
