import type { CSSProperties } from 'react'
import { BiText } from '../components/BiText'
import { openTones } from '../lib/siteLinks'
import { ui, type Bi } from '../lib/uiCopy'

type BentoCard = {
  title: Bi
  tag: Bi
  visual: 'jyutping' | 'hk' | 'breakdown' | 'host'
  href?: 'tones'
  span?: 'hero' | 'wide'
}

const CARDS: BentoCard[] = [
  { title: ui.featJpTitle, tag: ui.featJpTag, visual: 'jyutping', href: 'tones', span: 'hero' },
  { title: ui.featHkTitle, tag: ui.featHkTag, visual: 'hk' },
  { title: ui.featFastTitle, tag: ui.featFastTag, visual: 'breakdown' },
  { title: ui.featHostTitle, tag: ui.featHostTag, visual: 'host', span: 'wide' },
]

function JyutpingVisual() {
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
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
        <span>6</span>
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
        <span>WP</span>
        <span>API</span>
      </div>
    </div>
  )
}

function FeatureVisual({ kind }: { kind: BentoCard['visual'] }) {
  switch (kind) {
    case 'jyutping':
      return <JyutpingVisual />
    case 'hk':
      return <HkVisual />
    case 'breakdown':
      return <BreakdownVisual />
    case 'host':
      return <HostVisual />
  }
}

function BentoCardBody({ card }: { card: BentoCard }) {
  const spanClass = card.span ? ` ln-feat-card--${card.span}` : ''
  const inner = (
    <>
      <FeatureVisual kind={card.visual} />
      <div className="ln-feat-card-copy">
        <h3>
          <BiText copy={card.title} size="md" hideJp />
        </h3>
        <BiText className="ln-feat-card-tag" copy={card.tag} size="sm" as="p" hideJp />
      </div>
    </>
  )

  if (card.href === 'tones') {
    return (
      <button
        type="button"
        className={`ln-feat-card ln-feat-card--link${spanClass}`}
        onClick={() => openTones()}
      >
        {inner}
      </button>
    )
  }

  return <article className={`ln-feat-card${spanClass}`}>{inner}</article>
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
