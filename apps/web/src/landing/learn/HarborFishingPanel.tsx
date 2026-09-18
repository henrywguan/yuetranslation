import { useEffect, useMemo, useState } from 'react'
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
  harborFishSpotById,
  sellHarborFish,
  type HarborBaitId,
  type HarborFishId,
  type HarborFishSpotId,
  type HarborFishToolId,
  type HarborFishingBag,
} from './harborFishing'
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

/**
 * Fishing Lodge (overseer) + shore spot cast UI — collection log, gear, bait, sell.
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
          <p className="hq-visit-body">
            Tool · <strong>{bag.equippedTool.replace('tool-', '')}</strong>
            {' · '}
            Bait · <strong>{bag.equippedBait.replace('bait-', '')}</strong>
            {' · '}
            {(bag.bait[bag.equippedBait] ?? 0) > 0 || bag.equippedBait === 'bait-none'
              ? `${bag.bait[bag.equippedBait] ?? '∞'} left`
              : 'empty'}
          </p>
          <p className="hq-visit-body">
            Bites here:{' '}
            {spot.fish
              .map((id) => HARBOR_FISH_CATALOG.find((f) => f.id === id)?.name.en)
              .filter(Boolean)
              .join(', ')}
          </p>
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
          <p className="hq-visit-body">Tools</p>
          <ul className="hq-fish-list">
            {HARBOR_FISH_TOOLS.map((tool) => {
              const owned = bag.tools.includes(tool.id)
              const eq = bag.equippedTool === tool.id
              return (
                <li key={tool.id}>
                  <button
                    type="button"
                    className={`hq-fish-row${eq ? ' is-on' : ''}`}
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
                  >
                    <span>
                      {tool.name.en}
                      <small lang="zh-HK"> {tool.name.zh}</small>
                    </span>
                    <span>
                      {owned ? (eq ? 'Equipped' : 'Equip') : `${tool.price}¢ · Lv ${tool.level}`}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="hq-visit-body">Bait</p>
          <ul className="hq-fish-list">
            {HARBOR_FISH_BAITS.filter((b) => b.id !== 'bait-none').map((bait) => {
              const qty = bag.bait[bait.id] ?? 0
              const eq = bag.equippedBait === bait.id
              return (
                <li key={bait.id}>
                  <button
                    type="button"
                    className={`hq-fish-row${eq ? ' is-on' : ''}`}
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
                  >
                    <span>
                      {bait.name.en}
                      <small>
                        {' '}
                        ×{qty}
                      </small>
                    </span>
                    <span>{qty > 0 ? (eq ? 'Selected' : 'Select') : `${bait.price}¢ / ${bait.pack}`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {tab === 'log' ? (
        <ul className="hq-fish-log" aria-label="Collection log">
          {fishRows.map((f) => (
            <li key={f.id} className={f.logged ? 'is-logged' : 'is-locked'}>
              <span>{f.logged ? f.name.en : '???'}</span>
              <span lang="zh-HK">{f.logged ? f.name.zh : '？？'}</span>
              <span>{f.logged ? `${f.value}¢` : `Lv ${f.level}`}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'sell' ? (
        <ul className="hq-fish-list" aria-label="Sell fish">
          {fishRows
            .filter((f) => f.qty > 0)
            .map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className="hq-fish-row"
                  onClick={() => {
                    playHarborUiClick()
                    const r = sellHarborFish(bag, f.id as HarborFishId, 1)
                    if (r.sold < 1) return
                    onBagChange(r.bag, r.coins)
                    setMsg(`Sold ${f.name.en} for ${r.coins}¢`)
                  }}
                >
                  <span>
                    {f.name.en} ×{f.qty}
                  </span>
                  <span>Sell 1 · {f.value}¢</span>
                </button>
              </li>
            ))}
          {fishRows.every((f) => f.qty < 1) ? (
            <li className="hq-fish-empty">No fish in the bag — cast at a shore spot.</li>
          ) : null}
        </ul>
      ) : null}

      {msg ? <p className="hq-visit-msg">{msg}</p> : null}
      <p className="hq-visit-body">Purse · <strong>{coins}</strong> ferry coins</p>
      <button type="button" className="hq-btn hq-btn--ghost" onClick={onClose}>
        Close
      </button>
    </aside>
  )
}
