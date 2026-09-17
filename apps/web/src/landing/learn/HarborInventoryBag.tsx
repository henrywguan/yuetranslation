import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  HARBOR_GEAR_SLOTS,
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

/** Classic OSRS inventory capacity (minimum grid pad). */
export const HARBOR_BAG_SLOTS = 28

const STORAGE_KEY = 'harbor.inv.layout.v1'
const MIN_W = 280
const MIN_H = 340
const MAX_W = 520
const MAX_H = 780
const DEFAULT_W = 340
const DEFAULT_H = 520

type Tab = 'bag' | 'worn'
type BagFilter = HarborGearSlot | 'all'

type Layout = {
  left: number
  top: number
  width: number
  height: number
}

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

const SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}

function defaultLayout(): Layout {
  if (typeof window === 'undefined') {
    return { left: 16, top: 72, width: DEFAULT_W, height: DEFAULT_H }
  }
  const width = clamp(DEFAULT_W, MIN_W, Math.min(MAX_W, window.innerWidth - 24))
  const height = clamp(
    Math.min(DEFAULT_H, window.innerHeight - 96),
    MIN_H,
    Math.min(MAX_H, window.innerHeight - 48),
  )
  return {
    left: clamp(16, 8, window.innerWidth - width - 8),
    top: clamp(72, 8, window.innerHeight - height - 8),
    width,
    height,
  }
}

function loadLayout(): Layout {
  const fallback = defaultLayout()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Layout>
    const width = typeof parsed.width === 'number' ? clamp(parsed.width, MIN_W, MAX_W) : fallback.width
    const height =
      typeof parsed.height === 'number' ? clamp(parsed.height, MIN_H, MAX_H) : fallback.height
    return {
      left:
        typeof parsed.left === 'number'
          ? clamp(parsed.left, 4, Math.max(4, window.innerWidth - width - 4))
          : fallback.left,
      top:
        typeof parsed.top === 'number'
          ? clamp(parsed.top, 4, Math.max(4, window.innerHeight - height - 4))
          : fallback.top,
      width,
      height,
    }
  } catch {
    return fallback
  }
}

function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    /* ignore */
  }
}

function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * OSRS-style inventory / bag — stone frame, scrollable 4-col item grid with
 * slot filters, hover/tap examine tips, plus a Worn tab. Floating panel is
 * draggable / resizable and stays inside the viewport.
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
  const [filter, setFilter] = useState<BagFilter>('all')
  const [pickedId, setPickedId] = useState<HarborGearId | null>(null)
  /** Tip id — only set while hovering (desktop) or after an explicit tap (mobile). */
  const [tipId, setTipId] = useState<HarborGearId | null>(null)
  const [layout, setLayout] = useState<Layout>(() => loadLayout())
  const dragRef = useRef<{
    kind: 'move' | 'resize'
    pointerId: number
    startX: number
    startY: number
    origLeft: number
    origTop: number
    origWidth: number
    origHeight: number
  } | null>(null)

  const bagItems = useMemo(() => {
    const ids = owned
      .map((id) => harborGearById(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      // Empty-hands is always “equipped” — keep the bag for real pieces.
      .filter((item) => item.id !== 'hand-none')
    return ids
  }, [owned])

  const filteredItems = useMemo(() => {
    if (filter === 'all') return bagItems
    return bagItems.filter((item) => item.slot === filter)
  }, [bagItems, filter])

  const slots = useMemo(() => {
    const pad = Math.max(HARBOR_BAG_SLOTS, Math.ceil(filteredItems.length / 4) * 4)
    const cells: (typeof filteredItems[number] | null)[] = Array.from({ length: pad }, () => null)
    filteredItems.forEach((item, i) => {
      cells[i] = item
    })
    return cells
  }, [filteredItems])

  const picked = pickedId ? harborGearById(pickedId) : null
  const wearSlot = picked ? harborGearWearTarget(picked, selectedSlot) : null
  const equipped = picked && wearSlot ? look[wearSlot] === picked.id : false
  const wornSomewhere = picked ? harborGearIsWorn(look, picked) : false

  useEffect(() => {
    saveLayout(layout)
  }, [layout])

  // Keep panel inside the viewport on resize / orientation change.
  useEffect(() => {
    const onWinResize = () => {
      setLayout((prev) => {
        const width = clamp(prev.width, MIN_W, Math.min(MAX_W, window.innerWidth - 16))
        const height = clamp(prev.height, MIN_H, Math.min(MAX_H, window.innerHeight - 16))
        return {
          width,
          height,
          left: clamp(prev.left, 4, Math.max(4, window.innerWidth - width - 4)),
          top: clamp(prev.top, 4, Math.max(4, window.innerHeight - height - 4)),
        }
      })
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (d.kind === 'move') {
        setLayout((prev) => ({
          ...prev,
          left: clamp(d.origLeft + dx, 4, window.innerWidth - prev.width - 4),
          top: clamp(d.origTop + dy, 4, window.innerHeight - prev.height - 4),
        }))
      } else {
        const width = clamp(d.origWidth + dx, MIN_W, Math.min(MAX_W, window.innerWidth - d.origLeft - 4))
        const height = clamp(
          d.origHeight + dy,
          MIN_H,
          Math.min(MAX_H, window.innerHeight - d.origTop - 4),
        )
        setLayout((prev) => ({ ...prev, width, height }))
      }
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d || e.pointerId !== d.pointerId) return
      dragRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const beginMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button, .hq-bag-resize')) return
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        kind: 'move',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: layout.left,
        origTop: layout.top,
        origWidth: layout.width,
        origHeight: layout.height,
      }
    },
    [layout.left, layout.top, layout.width, layout.height],
  )

  const beginResize = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      dragRef.current = {
        kind: 'resize',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: layout.left,
        origTop: layout.top,
        origWidth: layout.width,
        origHeight: layout.height,
      }
    },
    [layout.left, layout.top, layout.width, layout.height],
  )

  // Tap / click outside an item button dismisses the tip (keeps selection).
  useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const t = ev.target as Node | null
      if (!t || !root.contains(t)) {
        // Portaled tips live on body — don't clear when tapping the tip itself.
        if (t instanceof Element && t.closest('.hq-item-tip')) return
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
      className="hq-visit-panel hq-visit-panel--inv hq-bag hq-bag--float"
      role="dialog"
      aria-label="Inventory"
      style={{
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
      }}
    >
      <div className="hq-bag-chrome" onPointerDown={beginMove}>
        <span className="hq-bag-chrome-title">Inventory</span>
        <button
          type="button"
          className="hq-bag-close"
          aria-label="Close inventory"
          title="Close"
          onClick={(e) => {
            e.stopPropagation()
            playHarborUiClick()
            onClose()
          }}
        >
          ×
        </button>
      </div>

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
            <div className="hq-bag-filters" role="tablist" aria-label="Slot filters">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                className={`hq-bag-filter${filter === 'all' ? ' is-on' : ''}`}
                onClick={() => {
                  playHarborUiClick()
                  setFilter('all')
                  setTipId(null)
                }}
              >
                All
              </button>
              {HARBOR_GEAR_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  role="tab"
                  aria-selected={filter === slot}
                  className={`hq-bag-filter${filter === slot ? ' is-on' : ''}`}
                  onClick={() => {
                    playHarborUiClick()
                    setFilter(slot)
                    onSelectSlot(slot)
                    setTipId(null)
                  }}
                >
                  {SLOT_LABEL[slot]}
                </button>
              ))}
            </div>

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
                  // First two rows tip below so they stay readable near the chrome.
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
                <span className="hq-bag-rail-num">{Math.min(99, filteredItems.length)}</span>
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
                  {filter !== 'all'
                    ? ` · ${filteredItems.length} ${SLOT_LABEL[filter].toLowerCase()}`
                    : ` · ${bagItems.length} carried`}
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

      <button
        type="button"
        className="hq-bag-resize"
        aria-label="Resize inventory"
        title="Drag to resize"
        onPointerDown={beginResize}
      />
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
