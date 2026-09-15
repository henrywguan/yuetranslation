import { useMemo, useState } from 'react'
import {
  HARBOR_GEAR_CATALOG,
  HARBOR_GEAR_SLOTS,
  HARBOR_GEAR_TIER_LABEL,
  harborGearCodexStats,
  harborGearForSlot,
  harborGearMeshInfo,
  type HarborGearSlot,
} from './harborGear'

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
 * Browseable Harbor gear database — every catalog row with mesh-family honesty
 * (shared scout recolors vs dedicated hand/boat/lantern silhouettes).
 */
export function HarborGearCodex({ owned, onClose }: Props) {
  const [slot, setSlot] = useState<HarborGearSlot | 'all'>('all')
  const stats = useMemo(() => harborGearCodexStats(), [])
  const ownedSet = useMemo(() => new Set(owned), [owned])

  const items = useMemo(() => {
    const list = slot === 'all' ? [...HARBOR_GEAR_CATALOG] : harborGearForSlot(slot)
    return list
  }, [slot])

  return (
    <aside className="hq-visit-panel hq-visit-panel--codex" role="dialog" aria-label="Gear codex">
      <p className="hq-visit-kicker">Gear Codex · 裝備圖鑑</p>
      <h2 className="hq-visit-title">Gear database</h2>
      <p className="hq-visit-body">
        {stats.total} catalog pieces · {stats.families} mesh families · {stats.uniqueMeshes} unique
        silhouettes. Clothing shares one scout mannequin (recolor); hands / boats / lanterns use a
        few drawn mesh families.
      </p>

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

      <ul className="hq-codex-list">
        {items.map((item) => {
          const mesh = harborGearMeshInfo(item)
          const have = ownedSet.has(item.id)
          return (
            <li key={item.id} className={`hq-codex-row${have ? ' is-owned' : ''}`}>
              <span
                className="hq-codex-swatch"
                style={{ background: `#${item.color.toString(16).padStart(6, '0')}` }}
                aria-hidden="true"
              />
              <div className="hq-codex-meta">
                <span className="hq-codex-name">{item.name.en}</span>
                <span className="hq-codex-name-zh" lang="zh-HK">
                  {item.name.zh}
                </span>
                <span className="hq-codex-id">{item.id}</span>
                <span className="hq-codex-tags">
                  <span className="hq-codex-chip">{SLOT_LABEL[item.slot]}</span>
                  <span className="hq-codex-chip">{HARBOR_GEAR_TIER_LABEL[item.tier].en}</span>
                  <span className={`hq-codex-chip hq-codex-chip--mesh${mesh.uniqueMesh ? ' is-unique' : ''}`}>
                    {KIND_LABEL[mesh.kind]}
                    {mesh.uniqueMesh ? ' · unique' : ' · shared'}
                  </span>
                </span>
                <span className="hq-codex-mesh">{mesh.label}</span>
              </div>
              <div className="hq-codex-side">
                <span className="hq-codex-price">{item.price === 0 ? 'Starter' : `${item.price}¢`}</span>
                <span className="hq-codex-own">{have ? 'Owned' : 'Locked'}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
        Close codex
      </button>
    </aside>
  )
}
