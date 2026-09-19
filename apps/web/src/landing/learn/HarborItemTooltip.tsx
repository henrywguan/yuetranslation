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

export type HarborTipAnchorBox = {
  left: number
  top: number
  width: number
  height: number
  bottom: number
}

export type HarborTipSize = { width: number; height: number }

export type HarborTipViewport = { width: number; height: number; pad?: number }

const TIP_PAD = 12
const TIP_ESTIMATE: HarborTipSize = { width: 176, height: 78 }
const SHOP_TIP_ESTIMATE: HarborTipSize = { width: 216, height: 168 }

/**
 * Pin a portaled examine tip inside the viewport.
 * `left`/`top` are the box's top-left (no translateX(-50%)).
 */
export function clampHarborTipBox(
  anchor: HarborTipAnchorBox,
  tip: HarborTipSize,
  viewport: HarborTipViewport,
  prefer: 'above' | 'below',
): TipCoords {
  const pad = viewport.pad ?? TIP_PAD
  const vw = Math.max(1, viewport.width)
  const vh = Math.max(1, viewport.height)
  const tw = Math.min(Math.max(1, tip.width), Math.max(1, vw - pad * 2))
  const th = Math.max(1, tip.height)

  const spaceAbove = anchor.top - pad
  const spaceBelow = vh - anchor.bottom - pad
  let place = prefer
  if (place === 'above' && spaceAbove < th && spaceBelow >= Math.min(th, spaceAbove)) place = 'below'
  if (place === 'below' && spaceBelow < th && spaceAbove > spaceBelow) place = 'above'

  const center = anchor.left + anchor.width / 2
  const left = Math.min(Math.max(center - tw / 2, pad), vw - pad - tw)

  let top = place === 'below' ? anchor.bottom + 6 : anchor.top - 6 - th
  top = Math.min(Math.max(top, pad), Math.max(pad, vh - pad - th))

  return { left, top, placement: place }
}

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
  const tipRef = useRef<HTMLDivElement>(null)
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
      const measured = tipRef.current?.getBoundingClientRect()
      const estimate = shop ? SHOP_TIP_ESTIMATE : TIP_ESTIMATE
      const next = clampHarborTipBox(
        r,
        {
          width: measured && measured.width > 1 ? measured.width : estimate.width,
          height: measured && measured.height > 1 ? measured.height : estimate.height,
        },
        { width: window.innerWidth, height: window.innerHeight, pad: TIP_PAD },
        placement,
      )
      setCoords((prev) => {
        if (
          prev &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.top - next.top) < 0.5 &&
          prev.placement === next.placement
        ) {
          return prev
        }
        return next
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
              ref={tipRef}
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
