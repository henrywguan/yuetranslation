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

/**
 * OSRS-style item examine tip — yellow name, Chinese line, slot/price meta.
 * Shown on desktop hover and on mobile tap (parent drives `open`).
 */
export function HarborItemTooltip({
  item,
  wearing = false,
  open,
  placement = 'above',
}: Props) {
  if (!open) return null
  const slot = SLOT_LABEL[item.slot]
  const price =
    item.price > 0 ? `${item.price}¢` : item.tier === 'vip' ? 'VIP' : 'Starter'
  return (
    <div
      className={`hq-item-tip hq-item-tip--${placement}`}
      role="tooltip"
      data-item={item.id}
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
    </div>
  )
}
