import { useMemo, useState } from 'react'
import {
  HARBOR_GEAR_CATALOG,
  HARBOR_GEAR_SLOTS,
  HARBOR_GEAR_TIER_LABEL,
  HARBOR_VIP_MIN_PRICE,
  harborGearCodexStats,
  harborGearForSlot,
  harborGearMeshInfo,
  harborVipSetFor,
  type HarborGearSlot,
} from './harborGear'
import { HarborGearModelIcon } from './HarborGearModelIcon'

const SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

const KIND_LABEL = {
  recolor: 'Recolor',
  prop: 'Prop mesh',
  empty: 'Empty',
  hull: 'Hull mesh',
  lantern: 'Lantern mesh',
} as const

type Props = {
  owned: readonly string[]
  onClose: () => void
}

/**
 * Fullscreen Harbor gear database — every catalog row with a visible low-poly
 * model card (silhouette tinted by catalog color) plus mesh-family honesty.
 */
export function HarborGearCodex({ owned, onClose }: Props) {
  const [slot, setSlot] = useState<HarborGearSlot | 'all'>('all')
  const stats = useMemo(() => harborGearCodexStats(), [])
  const ownedSet = useMemo(() => new Set(owned), [owned])

  const items = useMemo(() => {
    return slot === 'all' ? [...HARBOR_GEAR_CATALOG] : harborGearForSlot(slot)
  }, [slot])

  return (
    <div className="hq-codex-screen" role="dialog" aria-modal="true" aria-label="Gear codex">
      <div className="hq-codex-screen-inner">
        <header className="hq-codex-header">
          <div className="hq-codex-header-copy">
            <p className="hq-visit-kicker">Gear Codex · 裝備圖鑑</p>
            <h2 className="hq-visit-title">Gear database</h2>
            <p className="hq-visit-body">
              {stats.total} catalog pieces · {stats.families} mesh families · {stats.uniqueMeshes}{' '}
              unique silhouettes. Each card shows the drawn model family tinted for that piece.
            </p>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost hq-codex-close" onClick={onClose}>
            Close codex
          </button>
        </header>

        <div className="hq-codex-slots" role="tablist" aria-label="Codex slots">
          <button
            type="button"
            role="tab"
            aria-selected={slot === 'all'}
            className={`hq-shop-slot${slot === 'all' ? ' is-on' : ''}`}
            onClick={() => setSlot('all')}
          >
            All
          </button>
          {HARBOR_GEAR_SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={slot === s}
              className={`hq-shop-slot${slot === s ? ' is-on' : ''}`}
              onClick={() => setSlot(s)}
            >
              {SLOT_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="hq-codex-scroll">
          <ul className="hq-codex-grid">
            {items.map((item) => {
              const mesh = harborGearMeshInfo(item)
              const have = ownedSet.has(item.id)
              const vipSet = item.tier === 'vip' ? harborVipSetFor(item.id) : undefined
              return (
                <li
                  key={item.id}
                  className={`hq-codex-card${have ? ' is-owned' : ''}${item.tier === 'vip' ? ' is-vip' : ''}`}
                >
                  <HarborGearModelIcon item={item} />
                  <div className="hq-codex-meta">
                    <span className="hq-codex-name">{item.name.en}</span>
                    <span className="hq-codex-name-zh" lang="zh-HK">
                      {item.name.zh}
                    </span>
                    <span className="hq-codex-tags">
                      <span className="hq-codex-chip">{SLOT_LABEL[item.slot]}</span>
                      <span className="hq-codex-chip">{HARBOR_GEAR_TIER_LABEL[item.tier].en}</span>
                      {vipSet ? (
                        <span className="hq-codex-chip hq-codex-chip--vip">{vipSet.name.en}</span>
                      ) : null}
                      <span
                        className={`hq-codex-chip hq-codex-chip--mesh${mesh.uniqueMesh ? ' is-unique' : ''}`}
                      >
                        {KIND_LABEL[mesh.kind]}
                        {mesh.uniqueMesh ? ' · unique' : ' · shared'}
                      </span>
                    </span>
                    <span className="hq-codex-mesh">{mesh.label}</span>
                  </div>
                  <div className="hq-codex-side">
                    <span className="hq-codex-price">
                      {item.price === 0
                        ? 'Starter'
                        : item.tier === 'vip'
                          ? `${item.price.toLocaleString()}¢ · ≥${HARBOR_VIP_MIN_PRICE.toLocaleString()}`
                          : `${item.price}¢`}
                    </span>
                    <span className="hq-codex-own">{have ? 'Owned' : item.tier === 'vip' ? 'VIP lock' : 'Locked'}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
