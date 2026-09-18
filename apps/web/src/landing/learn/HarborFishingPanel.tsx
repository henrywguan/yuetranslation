import { useEffect, useMemo, useState } from 'react'
import type { HarborBaitId, HarborFishId, HarborFishMethod, HarborFishSpotId, HarborFishToolId, HarborFishingBag } from './harborFishing'
import {
  GUAN_FISHING_OVERSEER_NAME,
  HARBOR_FISH_BAITS,
  HARBOR_FISH_CATALOG,
  HARBOR_FISH_TOOLS,
  attemptHarborFishCast,
  buyHarborFishBait,
  buyHarborFishTool,
  fishingXpForLevel,
  fishingXpToLevel,
  harborFishBaitById,
  harborFishSpotById,
  harborFishToolById,
  sellHarborFish,
} from './harborFishing'
import { HarborFishModelIcon } from './HarborFishModelIcon'
import {
  playHarborFishCast,
  playHarborFishCatch,
  playHarborFishMiss,
  playHarborFishSplash,
} from './harborFishingSfx'
import { playHarborUiClick } from './harborInteractSfx'

type Mode = 'lodge' | 'spot'

type Props = {
  mode: Mode
  spotId?: HarborFishSpotId | null
  bag: HarborFishingBag
  coins: number
  casting?: boolean
  onBagChange: (bag: HarborFishingBag, coinsDelta?: number) => void
  onCastAnim?: () => void
  onClose: () => void
}

type TileProps = {
  kind: 'fish' | 'tool' | 'bait'
  id: string
  label: string
  zh?: string
  meta?: string
  method?: HarborFishMethod
  locked?: boolean
  selected?: boolean
  onClick?: () => void
  as?: 'button' | 'div'
}

function FishItemTile({
  kind,
  id,
  label,
  zh,
  meta,
  method,
  locked = false,
  selected = false,
  onClick,
  as = onClick ? 'button' : 'div',
}: TileProps) {
  const className = `hq-fish-tile${selected ? ' is-on' : ''}${locked ? ' is-locked' : ''}${onClick ? ' is-action' : ''}`
  const body = (
    <>
      <HarborFishModelIcon kind={kind} id={id} method={method} locked={locked} />
      <span className="hq-fish-tile-copy">
        <span className="hq-fish-tile-label">{label}</span>
        {zh ? (
          <span className="hq-fish-tile-zh" lang="zh-HK">
            {zh}
          </span>
        ) : null}
        {meta ? <span className="hq-fish-tile-meta">{meta}</span> : null}
      </span>
    </>
  )
  if (as === 'button' && onClick) {
    return (
      <button type="button" className={className} onClick={onClick} aria-pressed={selected || undefined}>
        {body}
      </button>
    )
  }
  return (
    <div className={className} role="group" aria-label={label}>
      {body}
    </div>
  )
}

/**
 * Fishing Lodge (overseer) + shore spot cast UI — collection log, gear, bait, sell.
 * Cast / gear / log / sell use contained model tiles so tools, bait, and fish are visible.
 */
export function HarborFishingPanel({
  mode,
  spotId,
  bag,
  coins,
  casting = false,
  onBagChange,
  onCastAnim,
  onClose,
}: Props) {
  const [tab, setTab] = useState<'cast' | 'gear' | 'log' | 'sell'>(mode === 'spot' ? 'cast' : 'gear')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const level = fishingXpToLevel(bag.fishingXp)
  const nextXp = fishingXpForLevel(Math.min(99, level + 1))
  const spot = spotId ? harborFishSpotById(spotId) : null
  const equippedTool = harborFishToolById(bag.equippedTool)
  const equippedBait = harborFishBaitById(bag.equippedBait)
  const baitLeft = bag.bait[bag.equippedBait] ?? 0
  const baitMeta =
    bag.equippedBait === 'bait-none' ? 'no bait' : baitLeft > 0 ? `${baitLeft} left` : 'empty'

  useEffect(() => {
    setTab(mode === 'spot' ? 'cast' : 'gear')
    setMsg(null)
  }, [mode, spotId])

  const fishRows = useMemo(() => {
    return HARBOR_FISH_CATALOG.map((f) => ({
      ...f,
      qty: bag.fish[f.id] ?? 0,
      logged: bag.log.includes(f.id),
    }))
  }, [bag.fish, bag.log])

  const biteFish = useMemo(() => {
    if (!spot) return []
    return spot.fish
      .map((id) => HARBOR_FISH_CATALOG.find((f) => f.id === id))
      .filter((f): f is (typeof HARBOR_FISH_CATALOG)[number] => Boolean(f))
  }, [spot])

  const cast = () => {
    if (!spotId || busy || casting) return
    setBusy(true)
    playHarborFishCast()
    onCastAnim?.()
    window.setTimeout(() => {
      playHarborFishSplash()
      const result = attemptHarborFishCast(bag, spotId)
      if (result.ok) {
        playHarborFishCatch()
        onBagChange(result.bag)
        setMsg(result.message)
      } else {
        playHarborFishMiss()
        onBagChange(result.bag)
        setMsg(result.message)
      }
      setBusy(false)
    }, 900)
  }

  return (
    <aside className="hq-visit-panel hq-visit-panel--fish" role="dialog" aria-label="Guan fishing">
      <p className="hq-visit-kicker">
        {mode === 'lodge' ? (
          <>
            Fishing Lodge · <span lang="zh-HK">漁寮</span>
          </>
        ) : (
          <>
            {spot?.name.en ?? 'Fishing spot'} · <span lang="zh-HK">{spot?.name.zh}</span>
          </>
        )}
      </p>
      <h2 className="hq-visit-title">
        {mode === 'lodge' ? GUAN_FISHING_OVERSEER_NAME : spot?.region ?? 'Cast'}
      </h2>
      <p className="hq-visit-body">
        Fishing Lv <strong>{level}</strong> · {bag.fishingXp} XP
        {level < 99 ? ` · next ${nextXp}` : ' · max'}
      </p>

      <div className="hq-fish-tabs" role="tablist" aria-label="Fishing panels">
        {(mode === 'spot'
          ? (['cast', 'gear', 'log', 'sell'] as const)
          : (['gear', 'log', 'sell'] as const)
        ).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`hq-fish-tab${tab === t ? ' is-on' : ''}`}
            onClick={() => {
              playHarborUiClick()
              setTab(t)
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'cast' && spot ? (
        <div className="hq-fish-cast">
          <div className="hq-fish-req" aria-label="Equipped for this cast">
            <p className="hq-fish-req-label">Ready</p>
            <div className="hq-fish-tile-row">
              <FishItemTile
                kind="tool"
                id={bag.equippedTool}
                method={equippedTool?.method}
                label={equippedTool?.name.en ?? bag.equippedTool}
                zh={equippedTool?.name.zh}
                meta="Tool"
                selected
              />
              <FishItemTile
                kind="bait"
                id={bag.equippedBait}
                label={equippedBait?.name.en ?? bag.equippedBait}
                zh={equippedBait?.name.zh}
                meta={baitMeta}
                selected
              />
            </div>
          </div>

          <div className="hq-fish-req" aria-label="Fish that bite here">
            <p className="hq-fish-req-label">Bites here</p>
            <div className="hq-fish-tile-grid">
              {biteFish.map((f) => (
                <FishItemTile
                  key={f.id}
                  kind="fish"
                  id={f.id}
                  method={f.method}
                  label={f.name.en}
                  zh={f.name.zh}
                  meta={`Lv ${f.level}`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`hq-btn hq-btn--primary${busy || casting ? ' is-casting' : ''}`}
            disabled={busy || casting}
            onClick={cast}
          >
            {busy || casting ? 'Fishing…' : 'Cast'}
          </button>
        </div>
      ) : null}

      {tab === 'gear' ? (
        <div className="hq-fish-gear">
          <p className="hq-fish-req-label">Tools</p>
          <div className="hq-fish-tile-grid hq-fish-tile-grid--gear">
            {HARBOR_FISH_TOOLS.map((tool) => {
              const owned = bag.tools.includes(tool.id)
              const eq = bag.equippedTool === tool.id
              return (
                <FishItemTile
                  key={tool.id}
                  kind="tool"
                  id={tool.id}
                  method={tool.method}
                  label={tool.name.en}
                  zh={tool.name.zh}
                  meta={owned ? (eq ? 'Equipped' : 'Equip') : `${tool.price}¢ · Lv ${tool.level}`}
                  selected={eq}
                  onClick={() => {
                    playHarborUiClick()
                    if (owned) {
                      onBagChange({ ...bag, equippedTool: tool.id })
                      setMsg(`Equipped ${tool.name.en}`)
                      return
                    }
                    const r = buyHarborFishTool(bag, tool.id as HarborFishToolId, coins)
                    if (!r.ok) {
                      setMsg(r.message)
                      return
                    }
                    onBagChange(r.bag, r.coins - coins)
                    setMsg(`Bought ${tool.name.en}`)
                  }}
                />
              )
            })}
          </div>
          <p className="hq-fish-req-label">Bait</p>
          <div className="hq-fish-tile-grid hq-fish-tile-grid--gear">
            {HARBOR_FISH_BAITS.filter((b) => b.id !== 'bait-none').map((bait) => {
              const qty = bag.bait[bait.id] ?? 0
              const eq = bag.equippedBait === bait.id
              return (
                <FishItemTile
                  key={bait.id}
                  kind="bait"
                  id={bait.id}
                  label={bait.name.en}
                  zh={bait.name.zh}
                  meta={qty > 0 ? (eq ? `×${qty} · Selected` : `×${qty} · Select`) : `${bait.price}¢ / ${bait.pack}`}
                  selected={eq}
                  onClick={() => {
                    playHarborUiClick()
                    if (qty > 0) {
                      onBagChange({ ...bag, equippedBait: bait.id as HarborBaitId })
                      setMsg(`Using ${bait.name.en}`)
                      return
                    }
                    const r = buyHarborFishBait(bag, bait.id as HarborBaitId, coins)
                    if (!r.ok) {
                      setMsg(r.message)
                      return
                    }
                    onBagChange(r.bag, r.coins - coins)
                    setMsg(`Bought ${bait.pack}× ${bait.name.en}`)
                  }}
                />
              )
            })}
          </div>
        </div>
      ) : null}

      {tab === 'log' ? (
        <div className="hq-fish-tile-grid hq-fish-tile-grid--log" aria-label="Collection log">
          {fishRows.map((f) => (
            <FishItemTile
              key={f.id}
              kind="fish"
              id={f.id}
              method={f.method}
              label={f.logged ? f.name.en : '???'}
              zh={f.logged ? f.name.zh : '？？'}
              meta={f.logged ? `${f.value}¢` : `Lv ${f.level}`}
              locked={!f.logged}
            />
          ))}
        </div>
      ) : null}

      {tab === 'sell' ? (
        <div className="hq-fish-tile-grid hq-fish-tile-grid--gear" aria-label="Sell fish">
          {fishRows
            .filter((f) => f.qty > 0)
            .map((f) => (
              <FishItemTile
                key={f.id}
                kind="fish"
                id={f.id}
                method={f.method}
                label={f.name.en}
                zh={f.name.zh}
                meta={`×${f.qty} · Sell 1 · ${f.value}¢`}
                onClick={() => {
                  playHarborUiClick()
                  const r = sellHarborFish(bag, f.id as HarborFishId, 1)
                  if (r.sold < 1) return
                  onBagChange(r.bag, r.coins)
                  setMsg(`Sold ${f.name.en} for ${r.coins}¢`)
                }}
              />
            ))}
          {fishRows.every((f) => f.qty < 1) ? (
            <p className="hq-fish-empty">No fish in the bag — cast at a shore spot.</p>
          ) : null}
        </div>
      ) : null}

      {msg ? <p className="hq-visit-msg">{msg}</p> : null}
      <p className="hq-visit-body">
        Purse · <strong>{coins}</strong> ferry coins
      </p>
      <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
        Close
      </button>
    </aside>
  )
}
