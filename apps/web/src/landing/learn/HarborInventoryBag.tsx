import { useEffect, useMemo, useRef, useState } from 'react'
import {
  harborGearById,
  harborGearIsWorn,
  harborGearWearTarget,
  type HarborGearId,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'
import { HarborGearModelIcon } from './HarborGearModelIcon'
import { HarborItemTooltip } from './HarborItemTooltip'
import { HarborWornBoard } from './HarborWornBoard'
import { playHarborUiClick } from './harborInteractSfx'

/** Classic OSRS inventory capacity. */
export const HARBOR_BAG_SLOTS = 28

type Tab = 'bag' | 'worn'

type Props = {
  owned: readonly string[]
  look: HarborLook
  coins: number
  selectedSlot: HarborGearSlot
  onSelectSlot: (slot: HarborGearSlot) => void
  onWear: (slot: HarborGearSlot, id: HarborGearId) => void
  onOpenCodex: () => void
  onClose: () => void
  message?: string | null
}

function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * OSRS-style inventory / bag — stone frame, 4×7 item grid with visible
 * model icons per piece, hover/tap examine tips (dismiss on tap-away),
 * plus a Worn tab.
 */
export function HarborInventoryBag({
  owned,
  look,
  coins,
  selectedSlot,
  onSelectSlot,
  onWear,
  onOpenCodex,
  onClose,
  message,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [tab, setTab] = useState<Tab>('bag')
  const [pickedId, setPickedId] = useState<HarborGearId | null>(null)
  /** Tip id — only set while hovering (desktop) or after an explicit tap (mobile). */
  const [tipId, setTipId] = useState<HarborGearId | null>(null)

  const bagItems = useMemo(() => {
    const ids = owned
      .map((id) => harborGearById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      // Empty-hands is always “equipped” — keep the bag for real pieces.
      .filter((item) => item.id !== 'hand-none')
    return ids
  }, [owned])

  const slots = useMemo(() => {
    const cells: (typeof bagItems[number] | null)[] = Array.from({ length: HARBOR_BAG_SLOTS }, () => null)
    bagItems.slice(0, HARBOR_BAG_SLOTS).forEach((item, i) => {
      cells[i] = item
    })
    return cells
  }, [bagItems])

  const picked = pickedId ? harborGearById(pickedId) : null
  const wearSlot = picked ? harborGearWearTarget(picked, selectedSlot) : null
  const equipped = picked && wearSlot ? look[wearSlot] === picked.id : false
  const wornSomewhere = picked ? harborGearIsWorn(look, picked) : false
  const overflow = Math.max(0, bagItems.length - HARBOR_BAG_SLOTS)

  // Tap / click outside an item button dismisses the tip (keeps selection).
  useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const t = ev.target as Node | null
      if (!t || !root.contains(t)) {
        setTipId(null)
        return
      }
      const el = t instanceof Element ? t : t.parentElement
      if (!el?.closest('.hq-bag-item, .hq-worn-slot')) {
        setTipId(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  return (
    <aside
      ref={rootRef}
      className="hq-visit-panel hq-visit-panel--inv hq-bag"
      role="dialog"
      aria-label="Inventory"
    >
      <div className="hq-bag-frame">
        <div className="hq-bag-tabs" role="tablist" aria-label="Inventory tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'bag'}
            className={`hq-bag-tab${tab === 'bag' ? ' is-on' : ''}`}
            onClick={() => {
              playHarborUiClick()
              setTab('bag')
              setTipId(null)
            }}
            title="Inventory"
          >
            <span className="hq-bag-tab-icon" aria-hidden="true">
              <BagTabIcon />
            </span>
            <span className="hq-bag-tab-label">Bag</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'worn'}
            className={`hq-bag-tab${tab === 'worn' ? ' is-on' : ''}`}
            onClick={() => {
              playHarborUiClick()
              setTab('worn')
              setTipId(null)
            }}
            title="Worn equipment"
          >
            <span className="hq-bag-tab-icon" aria-hidden="true">
              <WornTabIcon />
            </span>
            <span className="hq-bag-tab-label">Worn</span>
          </button>
        </div>

        {tab === 'bag' ? (
          <>
            <div className="hq-bag-grid-wrap">
              <div className="hq-bag-rail hq-bag-rail--hp" aria-hidden="true">
                <span className="hq-bag-rail-glyph">♥</span>
                <span className="hq-bag-rail-num">{Math.min(99, Math.max(1, Math.floor(coins / 4) + 10))}</span>
              </div>
              <ul className="hq-bag-grid" aria-label="Bag items">
                {slots.map((item, i) => {
                  if (!item) {
                    return (
                      <li
                        key={`empty-${i}`}
                        className="hq-bag-cell is-empty"
                        onPointerDown={() => setTipId(null)}
                      />
                    )
                  }
                  const on = pickedId === item.id
                  const wearing = harborGearIsWorn(look, item)
                  const tipOpen = tipId === item.id
                  // Top two rows tip below so they stay inside the panel.
                  const tipBelow = i < 8
                  return (
                    <li key={item.id} className="hq-bag-cell">
                      <button
                        type="button"
                        className={`hq-bag-item${on ? ' is-on' : ''}${wearing ? ' is-worn' : ''}`}
                        aria-pressed={on}
                        aria-label={`${item.name.en}${wearing ? ' (wearing)' : ''}`}
                        onPointerEnter={() => {
                          if (!isCoarsePointer()) setTipId(item.id)
                        }}
                        onPointerLeave={() => {
                          if (!isCoarsePointer()) {
                            setTipId((cur) => (cur === item.id ? null : cur))
                          }
                        }}
                        onClick={() => {
                          setPickedId(item.id)
                          // Keep Hand selected so a lantern Wear/Hold can target the hand.
                          if (!(selectedSlot === 'hand' && item.slot === 'lantern')) {
                            onSelectSlot(item.slot)
                          }
                          if (isCoarsePointer()) {
                            // Tap toggles tip; second tap on same piece hides it.
                            setTipId((cur) => (cur === item.id ? null : item.id))
                          }
                        }}
                        onDoubleClick={() => {
                          const target = harborGearWearTarget(item, selectedSlot)
                          if (look[target] !== item.id) onWear(target, item.id)
                        }}
                      >
                        <HarborGearModelIcon item={item} compact />
                        {wearing ? <span className="hq-bag-worn-dot" aria-hidden="true" /> : null}
                        <HarborItemTooltip
                          item={item}
                          wearing={wearing}
                          open={tipOpen}
                          placement={tipBelow ? 'below' : 'above'}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="hq-bag-rail hq-bag-rail--pray" aria-hidden="true">
                <span className="hq-bag-rail-glyph">✦</span>
                <span className="hq-bag-rail-num">{Math.min(99, bagItems.length)}</span>
              </div>
            </div>

            <div className="hq-bag-inspect" onPointerDown={() => setTipId(null)}>
              {picked ? (
                <>
                  <div className="hq-bag-inspect-icon" aria-hidden="true">
                    <HarborGearModelIcon item={picked} compact />
                  </div>
                  <div className="hq-bag-inspect-copy">
                    <p className="hq-bag-inspect-name">{picked.name.en}</p>
                    <p className="hq-bag-inspect-zh" lang="zh-HK">
                      {picked.name.zh}
                    </p>
                    <p className="hq-bag-inspect-meta">
                      {picked.slot.toUpperCase()}
                      {wearSlot && wearSlot !== picked.slot ? ` → ${wearSlot.toUpperCase()}` : ''}
                      {equipped ? ' · wearing' : wornSomewhere ? ' · worn elsewhere' : ' · in bag'}
                      {picked.price > 0 ? ` · ${picked.price}¢` : ' · starter'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="hq-btn hq-btn--primary hq-btn--tiny"
                    disabled={equipped}
                    onClick={() => {
                      if (!wearSlot) return
                      onWear(wearSlot, picked.id)
                    }}
                  >
                    {equipped
                      ? 'Worn'
                      : wearSlot === 'hand' && picked.slot === 'lantern'
                        ? 'Hold'
                        : 'Wear'}
                  </button>
                </>
              ) : (
                <p className="hq-bag-inspect-hint">
                  Hover or tap a piece to examine · tap away to hide · select Hand then Hold a lantern
                  {overflow > 0 ? ` · +${overflow} banked off-grid` : ''}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="hq-bag-worn">
            <p className="hq-bag-worn-hint">
              Hover or tap a slot to examine · tap away to hide · switch to Bag and Wear a matching piece
            </p>
            <HarborWornBoard
              look={look}
              selected={selectedSlot}
              tipId={tipId}
              onTipId={setTipId}
              onSelect={onSelectSlot}
            />
          </div>
        )}

        {message ? <p className="hq-visit-msg">{message}</p> : null}

        <div className="hq-bag-footer" onPointerDown={() => setTipId(null)}>
          <div className="hq-bag-coins" title="Ferry coins">
            <span className="hq-bag-coin-stack" aria-hidden="true" />
            <span className="hq-bag-coin-qty">{coins}</span>
          </div>
          <div className="hq-visit-actions">
            <button type="button" className="hq-btn hq-btn--ghost" onClick={onOpenCodex}>
              Gear codex
            </button>
            <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
              Close bag
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function BagTabIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path
        d="M4 7.5h12v9.2H4zM7 7.5V5.8a3 3 0 0 1 6 0v1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4 10.2h12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function WornTabIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="4.2" r="2.1" fill="currentColor" />
      <path
        d="M6.2 8.2h7.6v4.2l1.4 5.4H4.8L6.2 12.4z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}
