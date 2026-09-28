/**
 * HarborRPG HUD — completely separate from Harbor Quest pedagogy chrome.
 */
import { useEffect, useState } from 'react'
import {
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_PORTALS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_VENDOR,
  HARBOR_RPG_ZONE_META,
  type HarborRpgItemId,
  type HarborRpgZoneId,
} from './harborRpgData'
import { HARBOR_RPG_META } from './harborRpgRealm'
import {
  harborRpgLevelFromXp,
  HARBOR_RPG_MAX_CHARS,
  rpgHasCompanion,
  type HarborRpgBag,
} from './harborRpgProgress'
import {
  emptyRpgParty,
  HARBOR_RPG_COMPANION_COST,
  toggleRpgFinderLooking,
  type HarborRpgPartyState,
} from './harborRpgSocial'
import type { HarborProgress } from './progressMerge'

type CombatHud = {
  hp: number
  maxHp: number
  zone: HarborRpgZoneId
  targetName: string | null
  targetHp: number
  targetMaxHp: number
}

type Props = {
  bag: HarborRpgBag
  combat: CombatHud | null
  interactId: string | null
  toast: string | null
  onInteract: () => void
  onCreateChar: (name: string) => void
  onSelectChar: (id: string) => void
  onEquip: (id: HarborRpgItemId) => void
  onBuy: (id: HarborRpgItemId) => void
  onSell: (id: HarborRpgItemId) => void
  onAcceptQuest: (id: string) => void
  onClaimQuest: (id: string) => void
  onHireCompanion: () => void
  onExitGame: () => void
}

export function HarborRpgPanel({
  bag,
  combat,
  interactId,
  toast,
  onInteract,
  onCreateChar,
  onSelectChar,
  onEquip,
  onBuy,
  onSell,
  onAcceptQuest,
  onClaimQuest,
  onHireCompanion,
  onExitGame,
}: Props) {
  const [tab, setTab] = useState<'field' | 'bag' | 'quests' | 'party'>('field')
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [party, setParty] = useState<HarborRpgPartyState>(() =>
    emptyRpgParty(bag.characters.find((c) => c.id === bag.activeCharacterId)?.name ?? 'Adventurer'),
  )
  const zoneMeta = HARBOR_RPG_ZONE_META[bag.zone]
  const lv = harborRpgLevelFromXp(bag.xp)
  const companionOn = rpgHasCompanion(bag)

  useEffect(() => {
    const name =
      bag.characters.find((c) => c.id === bag.activeCharacterId)?.name ?? 'Adventurer'
    setParty((p) => ({ ...p, members: [name, ...p.members.slice(1)] }))
  }, [bag.activeCharacterId, bag.characters])

  const interactLabel =
    interactId === 'rpg-shrine'
      ? 'Claim shrine XP'
      : interactId === 'rpg-return'
        ? 'Exit to Harbor Quest'
        : interactId === 'rpg-vendor'
          ? 'Open outfitter'
          : interactId === 'rpg-quest-board'
            ? 'Open quest board'
            : interactId === 'rpg-finder'
              ? 'Open party finder'
              : interactId?.startsWith('portal-')
                ? 'Enter portal'
                : 'Interact'

  return (
    <aside className="hq-rpg-shell" role="complementary" aria-label="HarborRPG">
      <header className="hq-rpg-top">
        <div className="hq-rpg-brand">
          <p className="hq-rpg-kicker">
            {HARBOR_RPG_META.en} · <span lang="zh-HK">{HARBOR_RPG_META.zh}</span>
          </p>
          <h1 className="hq-rpg-zone">
            {zoneMeta.en}
            <span aria-hidden="true"> · </span>
            <span lang="zh-HK">{zoneMeta.zh}</span>
          </h1>
        </div>
        <button type="button" className="hq-btn hq-btn--ghost hq-btn--tiny" onClick={onExitGame}>
          Exit game
        </button>
      </header>

      <div className="hq-rpg-vitals" aria-live="polite">
        <div className="hq-rpg-hp">
          <span className="hq-rpg-hp-label">HP</span>
          <div className="hq-rpg-hp-track">
            <div
              className="hq-rpg-hp-fill"
              style={{
                width: `${Math.max(0, Math.min(100, ((combat?.hp ?? 0) / Math.max(1, combat?.maxHp ?? 1)) * 100))}%`,
              }}
            />
          </div>
          <span className="hq-rpg-hp-val">
            {combat?.hp ?? '—'}/{combat?.maxHp ?? '—'}
          </span>
        </div>
        <div className="hq-rpg-chips">
          <span className="hq-rpg-chip">Lv {lv}</span>
          <span className="hq-rpg-chip">XP {bag.xp}</span>
          <span className="hq-rpg-chip">Gold {bag.gold}</span>
          {companionOn ? (
            <span className="hq-rpg-chip hq-rpg-chip--ally">{bag.companionName ?? 'Ally'}</span>
          ) : null}
        </div>
        {combat?.targetName ? (
          <p className="hq-rpg-target">
            Target · {combat.targetName} · {combat.targetHp}/{combat.targetMaxHp}
          </p>
        ) : (
          <p className="hq-rpg-target">Walk into packs — auto-combat when close</p>
        )}
      </div>

      <nav className="hq-rpg-tabs" aria-label="HarborRPG panels">
        {(['field', 'bag', 'quests', 'party'] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`hq-rpg-tab${tab === id ? ' is-on' : ''}`}
            onClick={() => setTab(id)}
          >
            {id === 'field' ? 'Field' : id === 'bag' ? 'Bag' : id === 'quests' ? 'Quests' : 'Party'}
          </button>
        ))}
      </nav>

      {tab === 'field' ? (
        <div className="hq-rpg-panel-body">
          <ul className="hq-rpg-chars" aria-label="Characters">
            {bag.characters.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`hq-rpg-char${bag.activeCharacterId === c.id ? ' is-on' : ''}`}
                  disabled={bag.activeCharacterId === c.id}
                  onClick={() => onSelectChar(c.id)}
                >
                  {c.name}
                </button>
              </li>
            ))}
            {bag.characters.length < HARBOR_RPG_MAX_CHARS ? (
              <li>
                <button
                  type="button"
                  className="hq-rpg-char hq-rpg-char--new"
                  onClick={() => setCreating(true)}
                >
                  + New
                </button>
              </li>
            ) : null}
          </ul>
          {creating ? (
            <form
              className="hq-rpg-create"
              onSubmit={(e) => {
                e.preventDefault()
                onCreateChar(createName || 'Adventurer')
                setCreating(false)
                setCreateName('')
              }}
            >
              <input
                className="hq-rpg-create-input"
                value={createName}
                maxLength={20}
                placeholder="Adventurer"
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
              />
              <button type="submit" className="hq-btn hq-btn--primary hq-btn--tiny">
                Create
              </button>
            </form>
          ) : null}
          <p className="hq-rpg-hint">
            {interactId
              ? `Near: ${interactLabel}`
              : 'Portals · shrine · town stalls · monsters'}
          </p>
          <button
            type="button"
            className="hq-btn hq-btn--primary"
            disabled={!interactId}
            onClick={onInteract}
          >
            {interactLabel}
          </button>
        </div>
      ) : null}

      {tab === 'bag' ? (
        <div className="hq-rpg-panel-body">
          <p className="hq-rpg-hint">
            Weapon · {bag.equippedWeapon ? HARBOR_RPG_ITEM_DEFS[bag.equippedWeapon].name.en : 'none'}{' '}
            · Armor ·{' '}
            {bag.equippedArmor ? HARBOR_RPG_ITEM_DEFS[bag.equippedArmor].name.en : 'none'}
          </p>
          <ul className="hq-rpg-inv" aria-label="Inventory">
            {bag.inventory.map((s) => {
              const def = HARBOR_RPG_ITEM_DEFS[s.id]
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="hq-rpg-inv-row"
                    onClick={() => {
                      if (def.kind === 'weapon' || def.kind === 'armor') onEquip(s.id)
                      else onSell(s.id)
                    }}
                    title={
                      def.kind === 'loot'
                        ? `Sell for ${def.value} gold`
                        : `Equip ${def.name.en}`
                    }
                  >
                    <span>
                      {def.name.en} ×{s.qty}
                    </span>
                    <span className="hq-rpg-inv-act">
                      {def.kind === 'loot' ? `Sell ${def.value}g` : 'Equip'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {interactId === 'rpg-vendor' || bag.zone === 'town' ? (
            <>
              <p className="hq-rpg-hint">{HARBOR_RPG_VENDOR.name.en}</p>
              <ul className="hq-rpg-inv">
                {HARBOR_RPG_VENDOR.stock.map((id) => {
                  const def = HARBOR_RPG_ITEM_DEFS[id]
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="hq-rpg-inv-row"
                        onClick={() => onBuy(id)}
                      >
                        <span>{def.name.en}</span>
                        <span className="hq-rpg-inv-act">Buy {def.value}g</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === 'quests' ? (
        <div className="hq-rpg-panel-body">
          <ul className="hq-rpg-quest-list">
            {HARBOR_RPG_QUESTS.map((q) => {
              const row = bag.quests.find((x) => x.id === q.id)
              return (
                <li key={q.id} className="hq-rpg-quest">
                  <strong>{q.name.en}</strong>
                  <p>{q.blurb.en}</p>
                  <p className="hq-rpg-hint">
                    {row
                      ? row.claimed
                        ? 'Claimed'
                        : `${row.progress}/${q.need}${row.complete ? ' · ready' : ''}`
                      : 'Not accepted'}
                  </p>
                  {!row ? (
                    <button
                      type="button"
                      className="hq-btn hq-btn--ghost hq-btn--tiny"
                      onClick={() => onAcceptQuest(q.id)}
                    >
                      Accept
                    </button>
                  ) : !row.claimed && (row.complete || q.kind === 'gather') ? (
                    <button
                      type="button"
                      className="hq-btn hq-btn--primary hq-btn--tiny"
                      onClick={() => onClaimQuest(q.id)}
                    >
                      Turn in
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {tab === 'party' ? (
        <div className="hq-rpg-panel-body">
          <p className="hq-rpg-hint">
            Soft party · code <strong>{party.code}</strong> (local only — no dedicated host)
          </p>
          <ul className="hq-rpg-chars">
            {party.members.map((m) => (
              <li key={m}>
                <span className="hq-rpg-char is-on">{m}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className={`hq-btn hq-btn--ghost${party.looking ? ' is-on' : ''}`}
            onClick={() => setParty((p) => toggleRpgFinderLooking(p))}
          >
            {party.looking ? 'Stop looking' : 'Party finder: Looking'}
          </button>
          <button
            type="button"
            className="hq-btn hq-btn--primary"
            onClick={onHireCompanion}
            disabled={companionOn}
          >
            {companionOn
              ? `Ally · ${bag.companionName}`
              : `Hire companion · ${HARBOR_RPG_COMPANION_COST}g`}
          </button>
          <p className="hq-rpg-hint">
            Companion shares damage taken and adds strike damage for 10 minutes.
          </p>
          <p className="hq-rpg-hint">
            Zone portals:{' '}
            {HARBOR_RPG_PORTALS.filter((p) => p.from === bag.zone)
              .map((p) => p.label.en)
              .join(' · ') || 'none here'}
          </p>
        </div>
      ) : null}

      {toast ? <p className="hq-rpg-toast">{toast}</p> : null}
    </aside>
  )
}

export function rpgBagFromProgress(p: HarborProgress): HarborRpgBag {
  return p.rpg
}
