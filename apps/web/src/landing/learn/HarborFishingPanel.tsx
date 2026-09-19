import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { HarborBaitId, HarborFishId, HarborFishMethod, HarborFishSpotId, HarborFishToolId, HarborFishingBag } from './harborFishing'
import {
  GUAN_FISHING_OVERSEER_NAME,
  HARBOR_FISH_BAITS,
  HARBOR_FISH_CATALOG,
  HARBOR_FISH_METHOD_LABEL,
  HARBOR_FISH_TOOLS,
  attemptHarborFishCast,
  buyHarborFishBait,
  buyHarborFishTool,
  fishingXpForLevel,
  fishingXpToLevel,
  harborFishBaitsRequiredForSpot,
  harborFishExamineMeta,
  harborFishEmptyBiteMessage,
  harborFishSpotById,
  harborFishSpotDescription,
  harborFishSpotRequirementText,
  harborFishSpotSetupBlocked,
  harborFishToolsRequiredForSpot,
  sellHarborFish,
} from './harborFishing'
import { HarborFishModelIcon } from './HarborFishModelIcon'
import { HarborItemTooltip } from './HarborItemTooltip'
import { type HarborShopQty } from './harborShopQty'
import {
  playHarborFishCast,
  playHarborFishCatch,
  playHarborFishMiss,
  playHarborFishSplash,
} from './harborFishingSfx'
import { HARBOR_FISH_CAST_MS, HARBOR_FISH_RESOLVE_MS } from './harborFishingAnim'
import { playHarborVo } from './harborVo'
import { playHarborUiClick } from './harborInteractSfx'

type Mode = 'lodge' | 'spot'

type Props = {
  mode: Mode
  spotId?: HarborFishSpotId | null
  bag: HarborFishingBag
  coins: number
  casting?: boolean
  onBagChange: (bag: HarborFishingBag, coinsDelta?: number) => void
  /** World cast pose (rod swing + bobber). */
  onCastAnim?: () => void
  /** World catch / miss reel-in after the bite resolves. */
  onCastResult?: (ok: boolean) => void
  onClose: () => void
}

type TileProps = {
  kind: 'fish' | 'tool' | 'bait'
  id: string
  label: string
  zh?: string
  meta?: string
  badge?: string
  price?: string
  method?: HarborFishMethod
  locked?: boolean
  selected?: boolean
  /** Compact RS bank/shop cell (icon + badges only). */
  compact?: boolean
  tipOpen?: boolean
  tipPlacement?: 'above' | 'below'
  shop?: Parameters<typeof HarborItemTooltip>[0]['shop']
  onClick?: () => void
  onPointerEnter?: () => void
  as?: 'button' | 'div'
}

function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

function FishItemTile({
  kind,
  id,
  label,
  zh,
  meta,
  badge,
  price,
  method,
  locked = false,
  selected = false,
  compact = false,
  tipOpen = false,
  tipPlacement = 'above',
  shop,
  onClick,
  onPointerEnter,
  as = onClick ? 'button' : 'div',
}: TileProps) {
  const className = compact
    ? `hq-shop-cell-btn hq-fish-cell-btn${selected ? ' is-on' : ''}${locked ? ' is-locked' : ''}${onClick ? ' is-action' : ''}`
    : `hq-fish-tile${selected ? ' is-on' : ''}${locked ? ' is-locked' : ''}${onClick ? ' is-action' : ''}`

  const tip = (
    <HarborItemTooltip
      tipId={id}
      name={{ en: label, zh: zh ?? '' }}
      meta={meta}
      open={Boolean(tipOpen)}
      placement={tipPlacement}
      shop={shop}
    />
  )

  const body = compact ? (
    <>
      {badge ? (
        <span className="hq-shop-stock" aria-hidden="true">
          {badge}
        </span>
      ) : null}
      <HarborFishModelIcon kind={kind} id={id} method={method} locked={locked} />
      {price ? (
        <span className="hq-shop-price-badge" aria-hidden="true">
          {price}
        </span>
      ) : null}
      {tip}
    </>
  ) : (
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
      {tip}
    </>
  )

  if (as === 'button' && onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        aria-pressed={selected || undefined}
        aria-label={meta ? `${label} · ${meta}` : label}
        title={meta ? `${label} · ${meta}` : label}
      >
        {body}
      </button>
    )
  }
  return (
    <div
      className={className}
      role="group"
      aria-label={label}
      title={meta ? `${label} · ${meta}` : label}
      onPointerEnter={onPointerEnter}
    >
      {body}
    </div>
  )
}

function FishShopCell({
  children,
  empty = false,
}: {
  children?: ReactNode
  empty?: boolean
}) {
  return <li className={`hq-shop-cell${empty ? ' is-empty' : ''}`}>{children}</li>
}

/**
 * Fishing Lodge (overseer) + shore spot cast UI — collection log, gear, bait, sell.
 * Lodge / gear / log / sell use RS bank-style stone shop chrome + icon grids.
 */
export function HarborFishingPanel({
  mode,
  spotId,
  bag,
  coins,
  casting = false,
  onBagChange,
  onCastAnim,
  onCastResult,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const [tab, setTab] = useState<'cast' | 'gear' | 'log' | 'sell'>(mode === 'spot' ? 'cast' : 'gear')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tipId, setTipId] = useState<string | null>(null)
  const [qty, setQty] = useState<HarborShopQty>(1)

  const level = fishingXpToLevel(bag.fishingXp)
  const nextXp = fishingXpForLevel(Math.min(99, level + 1))
  const spot = spotId ? harborFishSpotById(spotId) : null

  useEffect(() => {
    setTab(mode === 'spot' ? 'cast' : 'gear')
    setMsg(null)
    setTipId(null)
  }, [mode, spotId])

  useEffect(() => {
    setTipId(null)
  }, [tab])

  useEffect(() => {
    const onPointerDown = (ev: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      const t = ev.target as Node | null
      if (!t || !root.contains(t)) {
        if (t instanceof Element && t.closest('.hq-item-tip')) return
        setTipId(null)
        return
      }
      const el = t instanceof Element ? t : t.parentElement
      if (!el?.closest('.hq-shop-cell-btn, .hq-fish-tile')) setTipId(null)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [])

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

  const requiredTools = useMemo(
    () => (spot ? harborFishToolsRequiredForSpot(spot) : []),
    [spot],
  )
  const requiredBaits = useMemo(
    () => (spot ? harborFishBaitsRequiredForSpot(spot) : []),
    [spot],
  )
  const setupBlocked = Boolean(spot && harborFishSpotSetupBlocked(bag, spot))
  const requirementText = spot ? harborFishSpotRequirementText(spot, bag) : null
  const spotBlurb = spot ? harborFishSpotDescription(spot) : null
  const emptyBiteHint =
    spot && !setupBlocked ? harborFishEmptyBiteMessage(spot, bag) : null
  const showCastHint = Boolean(
    tab === 'cast' && spot && (setupBlocked ? requirementText : emptyBiteHint?.startsWith('Need ')),
  )
  const statusIsRequirement =
    Boolean(msg && /^(Need |Out of |Wrong bait)/i.test(msg)) || showCastHint

  const logCount = bag.log.length
  const title = mode === 'lodge' ? GUAN_FISHING_OVERSEER_NAME : (spot?.region ?? 'Cast')
  const kicker =
    mode === 'lodge'
      ? 'Fishing Lodge · 漁寮'
      : `${spot?.name.en ?? 'Fishing spot'} · ${spot?.name.zh ?? ''}`

  const openTip = (id: string) => {
    if (isCoarsePointer()) {
      setTipId((cur) => (cur === id ? null : id))
    } else {
      setTipId(id)
    }
  }

  const resolveBuyPacks = (unitPrice: number): number => {
    if (qty === 50) {
      return Math.max(1, Math.floor(coins / Math.max(1, unitPrice)))
    }
    return qty
  }

  const resolveSellQty = (have: number): number => {
    if (qty === 50) return have
    return Math.min(have, qty)
  }

  const cast = () => {
    if (!spotId || busy || casting) return
    setBusy(true)
    playHarborFishCast()
    onCastAnim?.()
    // Splash as the bobber lands, then resolve the bite after wait
    window.setTimeout(() => playHarborFishSplash(), HARBOR_FISH_CAST_MS)
    window.setTimeout(() => {
      const result = attemptHarborFishCast(bag, spotId)
      if (result.ok) {
        playHarborFishCatch()
        playHarborVo('niceCatch')
        onCastResult?.(true)
        onBagChange(result.bag)
        setMsg(result.message)
      } else {
        playHarborFishMiss()
        onCastResult?.(false)
        onBagChange(result.bag)
        setMsg(result.message)
      }
      setBusy(false)
    }, HARBOR_FISH_RESOLVE_MS)
  }

  const tabs =
    mode === 'spot'
      ? (['cast', 'gear', 'log', 'sell'] as const)
      : (['gear', 'log', 'sell'] as const)

  return (
    <aside
      ref={rootRef}
      className="hq-visit-panel hq-visit-panel--shop hq-shop-shelf hq-shop-shelf--bank-chrome hq-visit-panel--fish"
      role="dialog"
      aria-label="Guan fishing"
    >
      <header className="hq-shop-head hq-shop-head--bank">
        <p className="hq-shop-capacity" title={`Fishing Lv ${level}`}>
          Lv {level}
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

      <p className="hq-shop-status hq-fish-xp-line">
        {bag.fishingXp} XP
        {level < 99 ? ` · next ${nextXp}` : ' · max'}
        {mode === 'lodge' ? ` · log ${logCount}/${HARBOR_FISH_CATALOG.length}` : ''}
      </p>

      {spotBlurb && mode === 'spot' ? (
        <div className="hq-fish-spot-blurb">
          <p className="hq-fish-spot-blurb-en">{spotBlurb.en}</p>
          <p className="hq-fish-spot-blurb-zh" lang="zh-HK">
            {spotBlurb.zh}
          </p>
        </div>
      ) : null}

      <div className="hq-shop-tab-strip hq-fish-tabs" role="tablist" aria-label="Fishing panels">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`hq-shop-slot-tab hq-fish-tab${tab === t ? ' is-on' : ''}`}
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
          <div className="hq-fish-req" aria-label="Gear required for this spot">
            <p className="hq-fish-req-label">Required</p>
            <p className="hq-fish-req-hint">
              {spot.methods.map((m) => HARBOR_FISH_METHOD_LABEL[m]).join(' · ')}
            </p>
            <div
              className={`hq-fish-tile-row hq-fish-tile-row--req${requiredTools.length + requiredBaits.length > 2 ? ' is-wide' : ''}`}
            >
              {requiredTools.map((tool) => {
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
                    meta={
                      eq
                        ? 'Equipped · works here'
                        : owned
                          ? `Owned · Lv ${tool.level}`
                          : `Buy ${tool.price}¢ · Lv ${tool.level}`
                    }
                    locked={!owned}
                    selected={eq}
                    tipOpen={tipId === `req-${tool.id}`}
                    onPointerEnter={() => {
                      if (!isCoarsePointer()) setTipId(`req-${tool.id}`)
                    }}
                    onClick={() => {
                      playHarborUiClick()
                      openTip(`req-${tool.id}`)
                      if (owned) {
                        onBagChange({ ...bag, equippedTool: tool.id })
                        setMsg(`Equipped ${tool.name.en}`)
                      } else {
                        setTab('gear')
                        setMsg(`Buy ${tool.name.en} on the Gear tab`)
                      }
                    }}
                  />
                )
              })}
              {requiredBaits.map((bait) => {
                const have = bag.bait[bait.id] ?? 0
                const eq = bag.equippedBait === bait.id
                return (
                  <FishItemTile
                    key={bait.id}
                    kind="bait"
                    id={bait.id}
                    label={bait.name.en}
                    zh={bait.name.zh}
                    meta={
                      have > 0
                        ? eq
                          ? `${have} left · selected`
                          : `${have} left · tap to use`
                        : `Buy ${bait.price}¢ / ${bait.pack}`
                    }
                    locked={have < 1}
                    selected={eq}
                    tipOpen={tipId === `req-${bait.id}`}
                    onPointerEnter={() => {
                      if (!isCoarsePointer()) setTipId(`req-${bait.id}`)
                    }}
                    onClick={() => {
                      playHarborUiClick()
                      openTip(`req-${bait.id}`)
                      if (have > 0) {
                        onBagChange({ ...bag, equippedBait: bait.id })
                        setMsg(`Using ${bait.name.en}`)
                      } else {
                        setTab('gear')
                        setMsg(`Buy ${bait.name.en} on the Gear tab`)
                      }
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div className="hq-fish-req" aria-label="Fish that bite here">
            <p className="hq-fish-req-label">Bites here</p>
            <ul className="hq-shop-grid hq-fish-shop-grid" aria-label="Bites here">
              {biteFish.map((f, i) => {
                const examine = harborFishExamineMeta(f)
                return (
                  <FishShopCell key={f.id}>
                    <FishItemTile
                      compact
                      kind="fish"
                      id={f.id}
                      method={f.method}
                      label={f.name.en}
                      zh={f.name.zh}
                      meta={examine}
                      badge={`Lv${f.level}`}
                      tipOpen={tipId === f.id}
                      tipPlacement={i < 8 ? 'below' : 'above'}
                      onPointerEnter={() => {
                        if (!isCoarsePointer()) setTipId(f.id)
                      }}
                      onClick={() => openTip(f.id)}
                    />
                  </FishShopCell>
                )
              })}
            </ul>
          </div>

          <button
            type="button"
            className={`hq-shop-action-btn hq-fish-cast-btn${busy || casting ? ' is-casting' : ''}`}
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
          <ul className="hq-shop-grid hq-fish-shop-grid" aria-label="Fishing tools">
            {HARBOR_FISH_TOOLS.map((tool, i) => {
              const owned = bag.tools.includes(tool.id)
              const eq = bag.equippedTool === tool.id
              const locked = !owned && coins < tool.price
              return (
                <FishShopCell key={tool.id}>
                  <FishItemTile
                    compact
                    kind="tool"
                    id={tool.id}
                    method={tool.method}
                    label={tool.name.en}
                    zh={tool.name.zh}
                    meta={owned ? (eq ? 'Equipped' : 'Owned') : `${tool.price}¢ · Lv ${tool.level}`}
                    badge={owned ? (eq ? '✓' : '1') : '0'}
                    price={owned ? undefined : String(tool.price)}
                    locked={locked}
                    selected={eq}
                    tipOpen={tipId === tool.id}
                    tipPlacement={i < 8 ? 'below' : 'above'}
                    onPointerEnter={() => {
                      if (!isCoarsePointer()) setTipId(tool.id)
                    }}
                    onClick={() => {
                      playHarborUiClick()
                      openTip(tool.id)
                      if (owned) {
                        onBagChange({ ...bag, equippedTool: tool.id })
                        setMsg(`Equipped ${tool.name.en}`)
                      }
                    }}
                    shop={{
                      qty,
                      onQtyChange: setQty,
                      qtyHint: 'Unique tool · buys 1',
                      buyLabel: owned ? 'Owned' : locked ? `Buy · ${tool.price}¢` : 'Buy',
                      sellLabel: '—',
                      buyDisabled: owned,
                      sellDisabled: true,
                      buyTitle: owned
                        ? 'Already owned — click cell to equip'
                        : locked
                          ? `Need ${tool.price}¢ — tap Buy to confirm`
                          : `Buy for ${tool.price}¢ · Lv ${tool.level}`,
                      sellTitle: 'Tools stay in the lodge kit',
                      onBuy: () => {
                        if (owned) return
                        const r = buyHarborFishTool(bag, tool.id as HarborFishToolId, coins)
                        if (!r.ok) {
                          setMsg(r.message)
                          return
                        }
                        onBagChange(r.bag, r.coins - coins)
                        setMsg(`Bought ${tool.name.en}`)
                      },
                    }}
                  />
                </FishShopCell>
              )
            })}
          </ul>
          <p className="hq-fish-req-label">Bait</p>
          <ul className="hq-shop-grid hq-fish-shop-grid" aria-label="Fishing bait">
            {HARBOR_FISH_BAITS.filter((b) => b.id !== 'bait-none').map((bait, i) => {
              const have = bag.bait[bait.id] ?? 0
              const eq = bag.equippedBait === bait.id
              const locked = coins < bait.price
              const packs = resolveBuyPacks(bait.price)
              return (
                <FishShopCell key={bait.id}>
                  <FishItemTile
                    compact
                    kind="bait"
                    id={bait.id}
                    label={bait.name.en}
                    zh={bait.name.zh}
                    meta={
                      have > 0
                        ? eq
                          ? `×${have} · Selected`
                          : `×${have} · Select`
                        : `${bait.price}¢ / ${bait.pack}`
                    }
                    badge={have > 0 ? String(have) : '0'}
                    price={String(bait.price)}
                    locked={locked && have < 1}
                    selected={eq}
                    tipOpen={tipId === bait.id}
                    tipPlacement={i < 8 ? 'below' : 'above'}
                    onPointerEnter={() => {
                      if (!isCoarsePointer()) setTipId(bait.id)
                    }}
                    onClick={() => {
                      playHarborUiClick()
                      openTip(bait.id)
                      if (have > 0) {
                        onBagChange({ ...bag, equippedBait: bait.id as HarborBaitId })
                        setMsg(`Using ${bait.name.en}`)
                      }
                    }}
                    shop={{
                      qty,
                      onQtyChange: setQty,
                      qtyHint: `Pack ×${bait.pack} · ${bait.price}¢ each`,
                      buyLabel: locked ? `Buy · ${bait.price}¢` : `Buy ×${packs}`,
                      sellLabel: '—',
                      buyDisabled: false,
                      sellDisabled: true,
                      buyTitle: locked
                        ? `Need ${bait.price}¢ — tap Buy to confirm`
                        : `Buy ${packs} pack${packs === 1 ? '' : 's'} (${packs * bait.pack} bait)`,
                      sellTitle: 'Bait is spent on casts — no sell-back',
                      onBuy: () => {
                        const r = buyHarborFishBait(
                          bag,
                          bait.id as HarborBaitId,
                          coins,
                          resolveBuyPacks(bait.price),
                        )
                        if (!r.ok) {
                          setMsg(r.message)
                          return
                        }
                        onBagChange(r.bag, r.coins - coins)
                        setMsg(
                          `Bought ${r.packsBought} pack${r.packsBought === 1 ? '' : 's'} · ${bait.name.en}`,
                        )
                      },
                    }}
                  />
                </FishShopCell>
              )
            })}
          </ul>
        </div>
      ) : null}

      {tab === 'log' ? (
        <ul className="hq-shop-grid hq-fish-shop-grid hq-fish-shop-grid--log" aria-label="Collection log">
          {fishRows.map((f) => (
            <FishShopCell key={f.id}>
              <FishItemTile
                compact
                kind="fish"
                id={f.id}
                method={f.method}
                label={f.logged ? f.name.en : '???'}
                zh={f.logged ? f.name.zh : '？？'}
                meta={f.logged ? `${f.value}¢` : `Lv ${f.level}`}
                badge={f.logged ? '✓' : '?'}
                locked={!f.logged}
              />
            </FishShopCell>
          ))}
        </ul>
      ) : null}

      {tab === 'sell' ? (
        <div className="hq-fish-gear">
          {fishRows.every((f) => f.qty < 1) ? (
            <p className="hq-fish-empty">No fish in the bag — cast at a shore spot.</p>
          ) : (
            <ul className="hq-shop-grid hq-fish-shop-grid" aria-label="Sell fish">
              {fishRows
                .filter((f) => f.qty > 0)
                .map((f, i) => {
                  const sellN = resolveSellQty(f.qty)
                  return (
                    <FishShopCell key={f.id}>
                      <FishItemTile
                        compact
                        kind="fish"
                        id={f.id}
                        method={f.method}
                        label={f.name.en}
                        zh={f.name.zh}
                        meta={`×${f.qty} · ${f.value}¢ each`}
                        badge={String(f.qty)}
                        price={String(f.value)}
                        tipOpen={tipId === f.id}
                        tipPlacement={i < 8 ? 'below' : 'above'}
                        onPointerEnter={() => {
                          if (!isCoarsePointer()) setTipId(f.id)
                        }}
                        onClick={() => {
                          playHarborUiClick()
                          openTip(f.id)
                        }}
                        shop={{
                          qty,
                          onQtyChange: setQty,
                          qtyHint: `Have ×${f.qty} · ${f.value}¢ each`,
                          buyLabel: 'Buy',
                          sellLabel: `Sell ×${sellN}`,
                          buyDisabled: true,
                          sellDisabled: f.qty < 1,
                          buyTitle: 'Catch more at a shore spot',
                          sellTitle: `Sell ${sellN}× for ${sellN * f.value}¢`,
                          onSell: () => {
                            const r = sellHarborFish(bag, f.id as HarborFishId, sellN)
                            if (r.sold < 1) return
                            onBagChange(r.bag, r.coins)
                            setMsg(`Sold ${r.sold}× ${f.name.en} for ${r.coins}¢`)
                          },
                        }}
                      />
                    </FishShopCell>
                  )
                })}
            </ul>
          )}
        </div>
      ) : null}

      {msg || (tab === 'cast' && showCastHint) ? (
        <p
          className={`hq-shop-status${statusIsRequirement ? ' hq-fish-req-warn' : ''}`}
          role={statusIsRequirement ? 'status' : undefined}
        >
          {msg ?? (setupBlocked ? requirementText : emptyBiteHint)}
        </p>
      ) : null}

      <footer className="hq-shop-foot">
        <span className="hq-shop-foot-label">Purse</span>
        <div className="hq-shop-coins" title="Ferry coins">
          <span className="hq-bag-coin-stack" aria-hidden="true" />
          <span className="hq-bag-coin-qty">{coins.toLocaleString()}</span>
        </div>
      </footer>
    </aside>
  )
}
