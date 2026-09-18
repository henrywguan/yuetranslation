import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HARBOR_GEAR_SLOTS,
  HARBOR_GEAR_TIER_LABEL,
  harborGearForSlot,
  harborVipSetFor,
  type HarborGearId,
  type HarborGearItem,
  type HarborGearSlot,
  type HarborLook,
} from './harborGear'
import { HarborGearModelIcon } from './HarborGearModelIcon'
import { HarborItemTooltip } from './HarborItemTooltip'
import { playHarborUiClick } from './harborInteractSfx'

/** RS bank / general-store qty toggles (Harbor gear is unique — buy still takes 1). */
export const HARBOR_SHOP_QTY = [1, 5, 10, 50] as const
export type HarborShopQty = (typeof HARBOR_SHOP_QTY)[number]

const QTY_LABEL: Record<HarborShopQty, string> = {
  1: '1',
  5: '5',
  10: '10',
  50: 'All',
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

/** Pad to a full RS-style plate (8 columns × 3 rows minimum). */
const SHOP_GRID_COLS = 8
const SHOP_GRID_MIN = 24

type ShelfKind = 'outfitter' | 'bank'

type Props = {
  kind: ShelfKind
  title: string
  kicker: string
  body: string
  coins: number
  owned: readonly string[]
  banked?: readonly string[]
  look: HarborLook
  selectedSlot: HarborGearSlot
  onSelectSlot: (slot: HarborGearSlot) => void
  onBuy?: (id: HarborGearId) => void
  onEquip?: (slot: HarborGearSlot, id: HarborGearId) => void
  onDeposit?: (id: HarborGearId) => void
  onWithdraw?: (id: HarborGearId) => void
  onOpenCodex?: () => void
  onClose: () => void
  message?: string | null
}

function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * OSRS-style shop / bank shelf — stone frame, slot tabs, visible item sprites
 * with yellow stock/price badges, Value check + Quantity footer.
 */
export function HarborShopShelf({
  kind,
  title,
  kicker,
  body,
  coins,
  owned,
  banked = [],
  look,
  selectedSlot,
  onSelectSlot,
  onBuy,
  onEquip,
  onDeposit,
  onWithdraw,
  onOpenCodex,
  onClose,
  message,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [bankTab, setBankTab] = useState<'pack' | 'vault'>('pack')
  const [pickedId, setPickedId] = useState<HarborGearId | null>(null)
  const [tipId, setTipId] = useState<HarborGearId | null>(null)
  const [valueCheck, setValueCheck] = useState(false)
  const [qty, setQty] = useState<HarborShopQty>(1)
  const [valueFlash, setValueFlash] = useState<string | null>(null)

  const items = useMemo(() => {
    const slotItems = harborGearForSlot(selectedSlot)
    if (kind === 'outfitter') {
      // Hide empty-hands from the shop floor — not a sold piece.
      return slotItems.filter((item) => item.id !== 'hand-none')
    }
    if (bankTab === 'pack') {
      return slotItems.filter((item) => owned.includes(item.id) && item.price > 0)
    }
    return slotItems.filter((item) => banked.includes(item.id))
  }, [kind, selectedSlot, owned, banked, bankTab])

  const cells = useMemo(() => {
    const list: (HarborGearItem | null)[] = [...items]
    while (list.length < SHOP_GRID_MIN) list.push(null)
    while (list.length % SHOP_GRID_COLS !== 0) list.push(null)
    return list
  }, [items])

  const filledCount = items.length
  const capacityLabel = `${filledCount} / ${cells.length}`

  const picked = pickedId ? items.find((i) => i.id === pickedId) ?? null : null
  const ownedPicked = picked ? owned.includes(picked.id) : false
  const equippedPicked = picked ? look[selectedSlot] === picked.id : false
  const lockedPicked = picked ? !ownedPicked && coins < picked.price : false

  useEffect(() => {
    // Slot / bank-tab change clears stale picks that aren’t on this shelf.
    if (pickedId && !items.some((i) => i.id === pickedId)) {
      setPickedId(null)
      setTipId(null)
    }
  }, [items, pickedId])

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
      if (!el?.closest('.hq-shop-cell-btn')) setTipId(null)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

  const stockBadge = (item: HarborGearItem) => {
    if (kind === 'bank') return bankTab === 'vault' ? 'B' : '1'
    if (owned.includes(item.id)) return '✓'
    // Unowned stock reads as 1 (unique piece). Yellow RS-style stock digit.
    return '1'
  }

  const onCellActivate = (item: HarborGearItem) => {
    setPickedId(item.id)
    onSelectSlot(item.slot)
    if (isCoarsePointer()) {
      setTipId((cur) => (cur === item.id ? null : item.id))
    }
    if (valueCheck) {
      const vip = item.tier === 'vip' ? harborVipSetFor(item.id) : undefined
      const price =
        item.price === 0
          ? 'Starter · free'
          : `${item.price.toLocaleString()} ferry coins`
      setValueFlash(
        `${item.name.en} · ${price}${vip ? ` · VIP ${vip.name.en}` : ''}${
          qty > 1 ? ` · qty ${qty} (unique — buys 1)` : ''
        }`,
      )
      return
    }
    setValueFlash(null)
    // Double-click / RS left-click buy path via primary action below;
    // single click selects + examines.
  }

  const runPrimary = () => {
    if (!picked) return
    if (kind === 'outfitter') {
      if (!ownedPicked) {
        onBuy?.(picked.id)
        return
      }
      if (!equippedPicked) onEquip?.(selectedSlot, picked.id)
      return
    }
    if (bankTab === 'pack') onDeposit?.(picked.id)
    else onWithdraw?.(picked.id)
  }

  const primaryLabel = (() => {
    if (!picked) return kind === 'outfitter' ? 'Buy' : bankTab === 'pack' ? 'Bank' : 'Take'
    if (kind === 'outfitter') {
      if (!ownedPicked) return lockedPicked ? 'Locked' : 'Buy'
      return equippedPicked ? 'Wearing' : 'Wear'
    }
    return bankTab === 'pack' ? 'Bank' : 'Take'
  })()

  const primaryDisabled =
    !picked ||
    valueCheck ||
    (kind === 'outfitter' && ownedPicked && equippedPicked) ||
    (kind === 'outfitter' && !ownedPicked && lockedPicked)

  const statusLine = valueFlash ?? message

  return (
    <aside
      ref={rootRef}
      className={`hq-visit-panel hq-visit-panel--shop hq-shop-shelf hq-shop-shelf--bank-chrome${kind === 'bank' ? ' hq-visit-panel--bank hq-shop-shelf--bank' : ''}`}
      role="dialog"
      aria-label={title}
    >
      <header className="hq-shop-head hq-shop-head--bank">
        <p className="hq-shop-capacity" title={body}>
          {capacityLabel}
        </p>
        <div className="hq-shop-head-center">
          <h2 className="hq-shop-title">{title}</h2>
          <p className="hq-shop-sub">{kicker}</p>
        </div>
        <button
          type="button"
          className="hq-shop-close"
          aria-label="Close"
          title="Close"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="hq-shop-tab-strip" role="tablist" aria-label={kind === 'bank' ? 'Bank shelves' : 'Gear slots'}>
        {kind === 'bank' ? (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={bankTab === 'pack'}
              className={`hq-shop-mode-tab${bankTab === 'pack' ? ' is-on' : ''}`}
              onClick={() => {
                playHarborUiClick()
                setBankTab('pack')
                setPickedId(null)
                setTipId(null)
                setValueFlash(null)
              }}
            >
              Pack
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={bankTab === 'vault'}
              className={`hq-shop-mode-tab${bankTab === 'vault' ? ' is-on' : ''}`}
              onClick={() => {
                playHarborUiClick()
                setBankTab('vault')
                setPickedId(null)
                setTipId(null)
                setValueFlash(null)
              }}
            >
              Vault
            </button>
          </>
        ) : null}
        {HARBOR_GEAR_SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            role="tab"
            aria-selected={selectedSlot === slot}
            className={`hq-shop-slot-tab${selectedSlot === slot ? ' is-on' : ''}`}
            onClick={() => {
              playHarborUiClick()
              onSelectSlot(slot)
              setPickedId(null)
              setTipId(null)
              setValueFlash(null)
            }}
          >
            {SLOT_LABEL[slot]}
          </button>
        ))}
      </div>

      <div className="hq-shop-grid-wrap">
        <ul className="hq-shop-grid" aria-label={`${title} stock`}>
          {cells.map((item, i) => {
            if (!item) {
              return (
                <li
                  key={`empty-${i}`}
                  className="hq-shop-cell is-empty"
                  onPointerDown={() => setTipId(null)}
                />
              )
            }
            const ownedItem = owned.includes(item.id)
            const equipped = look[selectedSlot] === item.id
            const locked = kind === 'outfitter' && !ownedItem && coins < item.price
            const on = pickedId === item.id
            const tipOpen = tipId === item.id
            const tipBelow = i < SHOP_GRID_COLS
            const vip = item.tier === 'vip'
            const showPrice =
              kind === 'outfitter' && !ownedItem && item.price > 0
            return (
              <li key={item.id} className="hq-shop-cell">
                <button
                  type="button"
                  className={`hq-shop-cell-btn${on ? ' is-on' : ''}${equipped ? ' is-equipped' : ''}${vip ? ' is-vip' : ''}${locked ? ' is-locked' : ''}${ownedItem && kind === 'outfitter' ? ' is-owned' : ''}`}
                  aria-pressed={on}
                  aria-label={`${item.name.en}${equipped ? ' (wearing)' : ''}${locked ? ' (locked)' : ''}`}
                  onPointerEnter={() => {
                    if (!isCoarsePointer()) setTipId(item.id)
                  }}
                  onPointerLeave={() => {
                    if (!isCoarsePointer()) {
                      setTipId((cur) => (cur === item.id ? null : cur))
                    }
                  }}
                  onClick={() => onCellActivate(item)}
                  onDoubleClick={() => {
                    if (valueCheck) return
                    setPickedId(item.id)
                    onSelectSlot(item.slot)
                    if (kind === 'outfitter') {
                      if (!owned.includes(item.id)) onBuy?.(item.id)
                      else if (look[selectedSlot] !== item.id) onEquip?.(selectedSlot, item.id)
                    } else if (bankTab === 'pack') {
                      onDeposit?.(item.id)
                    } else {
                      onWithdraw?.(item.id)
                    }
                  }}
                >
                  <span className="hq-shop-stock" aria-hidden="true">
                    {stockBadge(item)}
                  </span>
                  <HarborGearModelIcon item={item} compact />
                  {showPrice ? (
                    <span className="hq-shop-price-badge" aria-hidden="true">
                      {item.price.toLocaleString()}
                    </span>
                  ) : null}
                  <HarborItemTooltip
                    item={item}
                    wearing={equipped}
                    open={tipOpen}
                    placement={tipBelow ? 'below' : 'above'}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="hq-shop-inspect" onPointerDown={() => setTipId(null)}>
        {picked ? (
          <>
            <div className="hq-shop-inspect-icon" aria-hidden="true">
              <HarborGearModelIcon item={picked} compact />
            </div>
            <div className="hq-shop-inspect-copy">
              <p className="hq-shop-inspect-name">{picked.name.en}</p>
              <p className="hq-shop-inspect-zh" lang="zh-HK">
                {picked.name.zh}
              </p>
              <p className="hq-shop-inspect-meta">
                {HARBOR_GEAR_TIER_LABEL[picked.tier].en}
                {picked.price === 0 ? ' · Starter' : ` · ${picked.price.toLocaleString()}¢`}
                {ownedPicked ? ' · owned' : ''}
                {equippedPicked ? ' · on' : ''}
                {picked.tier === 'vip' && harborVipSetFor(picked.id)
                  ? ` · ${harborVipSetFor(picked.id)!.name.en}`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="hq-shop-action-btn"
              disabled={primaryDisabled}
              title={
                valueCheck
                  ? 'Turn off Value check to buy / wear'
                  : lockedPicked
                    ? `Need ${picked.price.toLocaleString()} ferry coins`
                    : primaryLabel
              }
              onClick={runPrimary}
            >
              {primaryLabel}
            </button>
          </>
        ) : (
          <p className="hq-shop-inspect-hint">
            Tap an item to examine · double-tap to{' '}
            {kind === 'outfitter' ? 'buy / wear' : bankTab === 'pack' ? 'bank' : 'withdraw'}
          </p>
        )}
      </div>

      {statusLine ? <p className="hq-shop-status">{statusLine}</p> : null}

      <footer className="hq-shop-foot">
        <div className="hq-shop-value">
          <span className="hq-shop-foot-label">Value:</span>
          <button
            type="button"
            className={`hq-shop-value-btn${valueCheck ? ' is-on' : ''}`}
            aria-pressed={valueCheck}
            title="Show item value instead of buying"
            onClick={() => {
              playHarborUiClick()
              setValueCheck((v) => !v)
              setValueFlash(null)
            }}
          >
            <span className="hq-shop-coin-pouch" aria-hidden="true" />
          </button>
        </div>
        <div className="hq-shop-qty" role="group" aria-label="Quantity">
          <span className="hq-shop-foot-label">Withdraw:</span>
          {HARBOR_SHOP_QTY.map((n) => (
            <button
              key={n}
              type="button"
              className={`hq-shop-qty-btn${qty === n ? ' is-on' : ''}`}
              aria-pressed={qty === n}
              onClick={() => {
                playHarborUiClick()
                setQty(n)
              }}
            >
              {QTY_LABEL[n]}
            </button>
          ))}
        </div>
        <div className="hq-shop-coins" title="Ferry coins">
          <span className="hq-bag-coin-stack" aria-hidden="true" />
          <span className="hq-bag-coin-qty">{coins.toLocaleString()}</span>
        </div>
        {onOpenCodex ? (
          <button type="button" className="hq-shop-foot-link" onClick={onOpenCodex}>
            Codex
          </button>
        ) : null}
      </footer>
    </aside>
  )
}
