import { useState } from 'react'
import type { HarborGearId, HarborGearSlot, HarborLook } from './harborGear'
import { harborGearById, lookColors } from './harborGear'
import { HarborGearModelIcon } from './HarborGearModelIcon'
import { HarborItemTooltip } from './HarborItemTooltip'

const SLOT_LABEL: Record<HarborGearSlot, string> = {
  hat: 'Hat',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  hand: 'Hand',
  boat: 'Boat',
  lantern: 'Lantern',
}

/** OSRS Worn Equipment–style slot ring around a paperdoll. */
const WORN_LAYOUT: { slot: HarborGearSlot; className: string }[] = [
  { slot: 'hat', className: 'hq-worn-slot--hat' },
  { slot: 'lantern', className: 'hq-worn-slot--lantern' },
  { slot: 'hand', className: 'hq-worn-slot--hand' },
  { slot: 'top', className: 'hq-worn-slot--top' },
  { slot: 'bottom', className: 'hq-worn-slot--bottom' },
  { slot: 'shoes', className: 'hq-worn-slot--shoes' },
  { slot: 'boat', className: 'hq-worn-slot--boat' },
]

function hexCss(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`
}

function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

type Props = {
  look: HarborLook
  selected: HarborGearSlot
  onSelect: (slot: HarborGearSlot) => void
}

/**
 * OSRS-inspired Worn Equipment board: slots ring a silhouette that
 * recolors from the equipped look. Slot cells show item model icons
 * (not flat color swatches) with hover/tap examine tips.
 */
export function HarborWornBoard({ look, selected, onSelect }: Props) {
  const colors = lookColors(look)
  const hand = harborGearById(look.hand)
  const boat = harborGearById(look.boat)
  const lantern = harborGearById(look.lantern)
  const [hoverSlot, setHoverSlot] = useState<HarborGearSlot | null>(null)

  return (
    <div className="hq-worn" role="group" aria-label="Worn equipment">
      <div className="hq-worn-frame" aria-hidden="true">
        <div className="hq-worn-figure">
          <span className="hq-worn-fig hq-worn-fig--hat" style={{ background: hexCss(colors.hat) }} />
          <span className="hq-worn-fig hq-worn-fig--head" />
          <span className="hq-worn-fig hq-worn-fig--torso" style={{ background: hexCss(colors.top) }} />
          <span className="hq-worn-fig hq-worn-fig--legs" style={{ background: hexCss(colors.bottom) }} />
          <span className="hq-worn-fig hq-worn-fig--feet" style={{ background: hexCss(colors.shoes) }} />
        </div>
      </div>

      {WORN_LAYOUT.map(({ slot, className }) => {
        const id = look[slot] as HarborGearId
        const item = harborGearById(id)
        const on = selected === slot
        const tipOpen = Boolean(item) && (hoverSlot === slot || on)
        const tipBelow = slot === 'hat'
        return (
          <button
            key={slot}
            type="button"
            className={`hq-worn-slot ${className}${on ? ' is-on' : ''}${item ? ' has-item' : ''}`}
            aria-pressed={on}
            aria-label={`${SLOT_LABEL[slot]}${item ? `: ${item.name.en}` : ''}`}
            onPointerEnter={() => {
              if (!isCoarsePointer() && item) setHoverSlot(slot)
            }}
            onPointerLeave={() => {
              if (!isCoarsePointer()) setHoverSlot((cur) => (cur === slot ? null : cur))
            }}
            onClick={() => {
              onSelect(slot)
              if (isCoarsePointer() && item) setHoverSlot(slot)
            }}
          >
            {item ? (
              <span className="hq-worn-model" aria-hidden="true">
                <HarborGearModelIcon item={item} compact />
              </span>
            ) : (
              <span className="hq-worn-empty" aria-hidden="true">
                ·
              </span>
            )}
            <span className="hq-worn-slot-tag">{SLOT_LABEL[slot]}</span>
            {item ? (
              <HarborItemTooltip
                item={item}
                wearing
                open={tipOpen}
                placement={tipBelow ? 'below' : 'above'}
              />
            ) : null}
          </button>
        )
      })}

      <p className="hq-worn-caption">
        {harborGearById(look[selected])?.name.en ?? SLOT_LABEL[selected]}
        {selected === 'hand' && hand ? ` · ${hand.name.zh}` : null}
        {selected === 'boat' && boat ? ` · ${boat.name.zh}` : null}
        {selected === 'lantern' && lantern ? ` · ${lantern.name.zh}` : null}
      </p>
    </div>
  )
}

export { SLOT_LABEL as HARBOR_WORN_SLOT_LABEL }
