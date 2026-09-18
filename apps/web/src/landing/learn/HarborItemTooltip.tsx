import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { HarborGearItem, HarborGearSlot } from './harborGear'

const SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

type Props = {
  item: HarborGearItem
  /** True when this piece is currently equipped in its slot. */
  wearing?: boolean
  open: boolean
  placement?: 'above' | 'below'
}

type TipCoords = { left: number; top: number; placement: 'above' | 'below' }

/**
 * OSRS-style item examine tip — yellow name, Chinese line, slot/price meta.
 * Portaled to document.body with position:fixed so bag/shop overflow and
 * sibling chrome never clip or cover the tip.
 */
export function HarborItemTooltip({
  item,
  wearing = false,
  open,
  placement = 'above',
}: Props) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<TipCoords | null>(null)

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
      const tipH = 78
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
  }, [open, placement, item.id])

  const slot = SLOT_LABEL[item.slot]
  const isVip = item.tier === 'vip'
  const price = item.price > 0 ? `${item.price}¢` : isVip ? 'VIP' : 'Starter'

  return (
    <span className="hq-item-tip-host" aria-hidden={!open}>
      <span ref={anchorRef} className="hq-item-tip-anchor" aria-hidden="true" />
      {open && coords
        ? createPortal(
            <div
              className={`hq-item-tip hq-item-tip--fixed hq-item-tip--${coords.placement}${isVip ? ' is-vip' : ''}`}
              role="tooltip"
              data-item={item.id}
              data-tier={item.tier}
              style={{ left: coords.left, top: coords.top }}
            >
              <p className="hq-item-tip-name">{item.name.en}</p>
              <p className="hq-item-tip-zh" lang="zh-HK">
                {item.name.zh}
              </p>
              <p className="hq-item-tip-meta">
                {slot}
                {wearing ? ' · Worn' : ''}
                {` · ${price}`}
              </p>
            </div>,
            document.body,
          )
        : null}
    </span>
  )
}
