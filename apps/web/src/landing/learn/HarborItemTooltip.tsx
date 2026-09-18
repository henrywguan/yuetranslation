import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { HarborGearItem, HarborGearSlot } from './harborGear'
import {
  HARBOR_SHOP_QTY,
  HARBOR_SHOP_QTY_LABEL,
  type HarborShopQty,
} from './harborShopQty'
import { playHarborUiClick } from './harborInteractSfx'

const SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

/** Buy / Sell + quantity row for shop examine tips (Outfitter, Fishing Lodge, …). */
export type HarborTipShopActions = {
  qty: HarborShopQty
  onQtyChange: (q: HarborShopQty) => void
  /** Unique items still show qty, but Buy/Sell always acts once. */
  qtyHint?: string
  buyLabel?: string
  sellLabel?: string
  buyDisabled?: boolean
  sellDisabled?: boolean
  buyTitle?: string
  sellTitle?: string
  onBuy?: () => void
  onSell?: () => void
}

type Props = {
  open: boolean
  placement?: 'above' | 'below'
  /** Gear catalog item — preferred when available. */
  item?: HarborGearItem
  /** Freeform tip (fishing bait/tools/fish). Ignored when `item` is set. */
  name?: { en: string; zh: string }
  meta?: string
  tipId?: string
  vip?: boolean
  /** True when this piece is currently equipped in its slot. */
  wearing?: boolean
  /** Shop actions — tip becomes interactive (pointer-events). */
  shop?: HarborTipShopActions
}

type TipCoords = { left: number; top: number; placement: 'above' | 'below' }

/**
 * OSRS-style item examine tip — yellow name, Chinese line, slot/price meta.
 * Optional shop Buy/Sell + qty. Portaled to document.body with position:fixed
 * so bag/shop overflow and sibling chrome never clip or cover the tip.
 */
export function HarborItemTooltip({
  item,
  name,
  meta,
  tipId,
  vip = false,
  wearing = false,
  open,
  placement = 'above',
  shop,
}: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<TipCoords | null>(null)

  const en = item?.name.en ?? name?.en ?? ''
  const zh = item?.name.zh ?? name?.zh ?? ''
  const id = item?.id ?? tipId ?? en
  const isVip = item ? item.tier === 'vip' : vip
  const derivedMeta = (() => {
    if (meta) return meta
    if (!item) return ''
    const slot = SLOT_LABEL[item.slot]
    const price = item.price > 0 ? `${item.price}¢` : isVip ? 'VIP' : 'Starter'
    return `${slot}${wearing ? ' · Worn' : ''} · ${price}`
  })()

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    const update = () => {
      const anchor = anchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      if (r.width < 1 && r.height < 1) return
      // Prefer requested placement; flip if it would leave the viewport.
      let place = placement
      const tipH = shop ? 148 : 78
      if (place === 'above' && r.top < tipH + 8) place = 'below'
      if (place === 'below' && window.innerHeight - r.bottom < tipH + 8) place = 'above'
      setCoords({
        left: Math.min(window.innerWidth - 12, Math.max(12, r.left + r.width / 2)),
        top: place === 'below' ? r.bottom + 6 : r.top - 6,
        placement: place,
      })
    }
    update()
    // Second pass after layout/paint — docked bag cells settle a frame late on iOS.
    const raf = window.requestAnimationFrame(() => update())
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, placement, id, shop])

  let shopRow: ReactNode = null
  if (shop) {
    const buyLabel = shop.buyLabel ?? 'Buy'
    const sellLabel = shop.sellLabel ?? 'Sell'
    shopRow = (
      <div
        className="hq-item-tip-shop"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hq-item-tip-qty" role="group" aria-label="Quantity">
          <span className="hq-item-tip-qty-label">Qty</span>
          {HARBOR_SHOP_QTY.map((n) => (
            <button
              key={n}
              type="button"
              className={`hq-item-tip-qty-btn${shop.qty === n ? ' is-on' : ''}`}
              aria-pressed={shop.qty === n}
              onClick={() => {
                playHarborUiClick()
                shop.onQtyChange(n)
              }}
            >
              {HARBOR_SHOP_QTY_LABEL[n]}
            </button>
          ))}
        </div>
        {shop.qtyHint ? <p className="hq-item-tip-qty-hint">{shop.qtyHint}</p> : null}
        <div className="hq-item-tip-actions">
          <button
            type="button"
            className="hq-item-tip-action hq-item-tip-action--buy"
            disabled={shop.buyDisabled || !shop.onBuy}
            title={shop.buyTitle ?? buyLabel}
            onClick={() => {
              if (!shop.onBuy || shop.buyDisabled) return
              playHarborUiClick()
              shop.onBuy()
            }}
          >
            {buyLabel}
          </button>
          <button
            type="button"
            className="hq-item-tip-action hq-item-tip-action--sell"
            disabled={shop.sellDisabled || !shop.onSell}
            title={shop.sellTitle ?? sellLabel}
            onClick={() => {
              if (!shop.onSell || shop.sellDisabled) return
              playHarborUiClick()
              shop.onSell()
            }}
          >
            {sellLabel}
          </button>
        </div>
      </div>
    )
  }

  return (
    <span className="hq-item-tip-host" aria-hidden={!open}>
      <span ref={anchorRef} className="hq-item-tip-anchor" aria-hidden="true" />
      {open && coords
        ? createPortal(
            <div
              className={`hq-item-tip hq-item-tip--fixed hq-item-tip--${coords.placement}${isVip ? ' is-vip' : ''}${shop ? ' is-shop' : ''}`}
              role={shop ? 'dialog' : 'tooltip'}
              data-item={id}
              data-tier={item?.tier}
              style={{ left: coords.left, top: coords.top }}
            >
              <p className="hq-item-tip-name">{en}</p>
              {zh ? (
                <p className="hq-item-tip-zh" lang="zh-HK">
                  {zh}
                </p>
              ) : null}
              {derivedMeta ? <p className="hq-item-tip-meta">{derivedMeta}</p> : null}
              {shopRow}
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
