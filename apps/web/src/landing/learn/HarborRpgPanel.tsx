/**
 * HarborRPG HUD — completely separate from Harbor Quest pedagogy chrome.
 */
import { useEffect, useState } from 'react'
import {
  HARBOR_RPG_ABILITIES,
  HARBOR_RPG_CRAFT_RECIPES,
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_PORTALS,
  HARBOR_RPG_PROFESSION_META,
  HARBOR_RPG_PROFESSIONS,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_VENDOR,
  HARBOR_RPG_ZONE_META,
  type HarborRpgItemId,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  HARBOR_RPG_CLASSES,
  HARBOR_RPG_CLASS_DEFS,
  HARBOR_RPG_CLASS_LEVEL_CAP,
  harborRpgClassLevelFromXp,
  harborRpgSkillById,
  harborRpgUnlockedSkills,
  type HarborRpgClassId,
} from './harborRpgClasses'
import {
  harborRpgSpecById,
  harborRpgSpecsForClass,
  type HarborRpgSpecId,
} from './harborRpgSpecs'
import { HARBOR_RPG_META } from './harborRpgRealm'
import {
  harborRpgActiveSkillRank,
  harborRpgLevelFromXp,
  harborRpgTalentPointsLeft,
  HARBOR_RPG_MAX_CHARS,
  rpgHasCompanion,
  type HarborRpgBag,
  type HarborRpgInvStack,
} from './harborRpgProgress'
import { professionLevelFromXp } from './harborRpgProfessions'
import {
  createRpgParty,
  HARBOR_RPG_COMPANION_COST,
  toggleRpgFinderLooking,
  type HarborRpgPartyState,
} from './harborRpgSocial'
import {
  HARBOR_RPG_TRADE_SLOTS,
  type HarborRpgTradeSession,
} from './harborRpgTrade'

type CombatHud = {
  hp: number
  maxHp: number
  mp?: number
  maxMp?: number
  zone: HarborRpgZoneId
  targetName: string | null
  targetHp: number
  targetMaxHp: number
  gcd?: number
  abilityCds?: Partial<Record<string, number>>
  guardBuffSec?: number
}

type Props = {
  bag: HarborRpgBag
  combat: CombatHud | null
  interactId: string | null
  toast: string | null
  lootPrompt: {
    monsterId: string
    loot: { id: HarborRpgItemId; qty: number }[]
  } | null
  trade: HarborRpgTradeSession | null
  remotes: { userId: string; username: string }[]
  onInteract: () => void
  onCreateChar: (name: string) => void
  onSelectChar: (id: string) => void
  onEquip: (id: HarborRpgItemId) => void
  onBuy: (id: HarborRpgItemId) => void
  onSell: (id: HarborRpgItemId) => void
  onAcceptQuest: (id: string) => void
  onClaimQuest: (id: string) => void
  onHireCompanion: () => void
  onCastAbility: (id: string) => void
  onCraft: (recipeId: string) => void
  onListMarket: (itemId: HarborRpgItemId, price: number) => void
  onBuyMarket: (listingId: string) => void
  onDepositBank: (id: HarborRpgItemId) => void
  onWithdrawBank: (id: HarborRpgItemId) => void
  onPartySizeChange: (n: number) => void
  onLootVote: (vote: 'need' | 'greed' | 'pass') => void
  onSelectClass: (id: HarborRpgClassId) => void
  onSelectSpec: (id: HarborRpgSpecId) => void
  onSpendTalent: (id: string) => void
  onPrestige: () => void
  onStartTrade: (peerId: string, peerName: string) => void
  onTradeSetGold: (gold: number) => void
  onTradeAddItem: (id: HarborRpgItemId) => void
  onTradeLock: () => void
  onTradeCancel: () => void
  onTradeAccept: () => void
  onExitGame: () => void
}

export function HarborRpgPanel({
  bag,
  combat,
  interactId,
  toast,
  lootPrompt,
  trade,
  remotes,
  onInteract,
  onCreateChar,
  onSelectChar,
  onEquip,
  onBuy,
  onSell,
  onAcceptQuest,
  onClaimQuest,
  onHireCompanion,
  onCastAbility,
  onCraft,
  onListMarket,
  onBuyMarket,
  onDepositBank,
  onWithdrawBank,
  onPartySizeChange,
  onLootVote,
  onSelectClass,
  onSelectSpec,
  onSpendTalent,
  onPrestige,
  onStartTrade,
  onTradeSetGold,
  onTradeAddItem,
  onTradeLock,
  onTradeCancel,
  onTradeAccept,
  onExitGame,
}: Props) {
  const [tab, setTab] = useState<
    'field' | 'bag' | 'quests' | 'party' | 'craft' | 'market' | 'class' | 'spellbook' | 'trade'
  >('field')
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [spellTip, setSpellTip] = useState<string | null>(null)
  const [castFlash, setCastFlash] = useState<string | null>(null)
  const [party, setParty] = useState<HarborRpgPartyState>(() =>
    createRpgParty(
      'local',
      bag.characters.find((c) => c.id === bag.activeCharacterId)?.name ?? 'Adventurer',
    ),
  )
  const zoneMeta = HARBOR_RPG_ZONE_META[bag.zone]
  const lv = harborRpgLevelFromXp(bag.xp)
  const companionOn = rpgHasCompanion(bag)
  const classDef = bag.classId ? HARBOR_RPG_CLASS_DEFS[bag.classId] : null
  const classLevel = harborRpgClassLevelFromXp(bag.classXp)
  const talentLeft = harborRpgTalentPointsLeft(bag)
  const activeSpec = bag.specId ? harborRpgSpecById(bag.specId) : null
  const barSkills = bag.classId
    ? bag.skillBar
        .map((id) => harborRpgSkillById(id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
    : null

  useEffect(() => {
    const name =
      bag.characters.find((c) => c.id === bag.activeCharacterId)?.name ?? 'Adventurer'
    setParty((p) => ({
      ...p,
      members: [{ userId: p.leaderId, name }, ...p.members.slice(1)],
    }))
  }, [bag.activeCharacterId, bag.characters])

  useEffect(() => {
    onPartySizeChange(Math.max(1, party.members.length))
  }, [party.members.length, onPartySizeChange])

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
              : interactId === 'rpg-market'
                ? 'Open market'
                : interactId === 'rpg-craft'
                  ? 'Open craft bench'
                  : interactId === 'rpg-bank'
                    ? 'Open bank'
                    : interactId?.startsWith('node-')
                      ? 'Gather node'
                      : interactId?.startsWith('portal-')
                        ? 'Enter portal'
                        : 'Interact'

  return (
    <div className="hq-rpg-shell" role="region" aria-label="HarborRPG">
      <div className="hq-rpg-top">
        <div>
          <p className="hq-rpg-kicker">
            {HARBOR_RPG_META.en} · <span lang="zh-HK">{HARBOR_RPG_META.zh}</span>
          </p>
          <p className="hq-rpg-zone">
            {zoneMeta.en}
            {zoneMeta.instance ? ' · Instance' : ''} · Lv {lv}
          </p>
        </div>
        <div className="hq-rpg-vitals">
          <div className="hq-rpg-hp" aria-label={`HP ${combat?.hp ?? 0} of ${combat?.maxHp ?? 0}`}>
            <span className="hq-rpg-hp-label">HP</span>
            <span className="hq-rpg-hp-track">
              <span
                className="hq-rpg-hp-fill"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((combat?.hp ?? 0) / Math.max(1, combat?.maxHp ?? 1)) * 100),
                  )}%`,
                }}
              />
            </span>
            <span className="hq-rpg-hp-val">
              {combat?.hp ?? 0}/{combat?.maxHp ?? 0}
            </span>
          </div>
          <div
            className="hq-rpg-hp hq-rpg-mp"
            aria-label={`MP ${combat?.mp ?? 0} of ${combat?.maxMp ?? 0}`}
          >
            <span className="hq-rpg-hp-label">MP</span>
            <span className="hq-rpg-hp-track">
              <span
                className="hq-rpg-hp-fill hq-rpg-mp-fill"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, ((combat?.mp ?? 0) / Math.max(1, combat?.maxMp ?? 1)) * 100),
                  )}%`,
                }}
              />
            </span>
            <span className="hq-rpg-hp-val">
              {combat?.mp ?? 0}/{combat?.maxMp ?? 0}
            </span>
          </div>
          <div className="hq-rpg-chips">
            <span className="hq-rpg-chip">XP {bag.xp}</span>
            <span className="hq-rpg-chip">Gold {bag.gold}</span>
            {classDef ? (
              <span className="hq-rpg-chip">
                {classDef.name.en}
                {activeSpec ? ` · ${activeSpec.name.en}` : ''} {classLevel}
                {bag.prestige > 0 ? ` ★${bag.prestige}` : ''}
              </span>
            ) : null}
            {companionOn ? (
              <span className="hq-rpg-chip hq-rpg-chip--ally">{bag.companionName}</span>
            ) : null}
          </div>
        </div>
        {combat?.targetName ? (
          <p className="hq-rpg-target">
            Target: {combat.targetName} ({combat.targetHp}/{combat.targetMaxHp})
          </p>
        ) : null}
      </div>

      <div className="hq-rpg-tabs" role="tablist">
        {(
          [
            ['field', 'Field'],
            ['class', 'Class'],
            ['spellbook', 'Spells'],
            ['bag', 'Bag'],
            ['quests', 'Quests'],
            ['craft', 'Craft'],
            ['market', 'Market'],
            ['trade', 'Trade'],
            ['party', 'Party'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`hq-rpg-tab${tab === id ? ' is-on' : ''}`}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hq-rpg-panel-body">
        {tab === 'field' ? (
          <>
            <div className="hq-rpg-chars">
              {bag.characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`hq-rpg-char${c.id === bag.activeCharacterId ? ' is-on' : ''}`}
                  onClick={() => onSelectChar(c.id)}
                >
                  {c.name}
                </button>
              ))}
              {bag.characters.length < HARBOR_RPG_MAX_CHARS ? (
                <button
                  type="button"
                  className="hq-rpg-char hq-rpg-char--new"
                  onClick={() => setCreating(true)}
                >
                  + New
                </button>
              ) : null}
            </div>
            {creating ? (
              <form
                className="hq-rpg-create"
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = createName.trim()
                  if (!name) return
                  onCreateChar(name)
                  setCreateName('')
                  setCreating(false)
                }}
              >
                <label className="hq-rpg-create-label">
                  Name
                  <input
                    className="hq-rpg-create-input"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    maxLength={20}
                    autoFocus
                  />
                </label>
                <div className="hq-rpg-create-actions">
                  <button type="submit" className="hq-btn hq-btn--solid">
                    Create
                  </button>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
            <div className="hq-rpg-ability-bar" role="toolbar" aria-label="Abilities">
              {(barSkills
                ? barSkills.map((ab) => ({
                    id: ab.id,
                    name: ab.name,
                    blurb: ab.blurb,
                    gcd: ab.gcd,
                    cd: ab.cd,
                    mpCost: ab.mpCost ?? 0,
                    anim: ab.anim,
                    rank: harborRpgActiveSkillRank(bag, ab.id),
                  }))
                : HARBOR_RPG_ABILITIES.map((a) => ({
                    id: a.id,
                    name: a.name,
                    blurb: { en: a.name.en, zh: a.name.zh },
                    gcd: a.gcd,
                    cd: a.cd,
                    mpCost: 0,
                    anim: undefined as undefined | string,
                    rank: 1,
                  }))
              ).map((ab) => {
                const cd = combat?.abilityCds?.[ab.id] ?? 0
                const gcd = combat?.gcd ?? 0
                const locked = cd > 0.05 || gcd > 0.05
                return (
                  <button
                    key={ab.id}
                    type="button"
                    className={`hq-rpg-ability${castFlash === ab.id ? ' is-cast' : ''}${ab.anim ? ` hq-rpg-ability--${ab.anim}` : ''}`}
                    disabled={locked}
                    title={`${ab.name.en} · R${ab.rank} · GCD ${ab.gcd}s${ab.mpCost ? ` · ${ab.mpCost} MP` : ''}\n${ab.blurb.en}`}
                    onMouseEnter={() => setSpellTip(`${ab.name.en}: ${ab.blurb.en}`)}
                    onMouseLeave={() => setSpellTip(null)}
                    onClick={() => {
                      setCastFlash(ab.id)
                      window.setTimeout(() => setCastFlash(null), 280)
                      onCastAbility(ab.id)
                    }}
                  >
                    <span>{ab.name.en}</span>
                    <small>R{ab.rank}</small>
                    {cd > 0.05 ? <em>{cd.toFixed(1)}s</em> : null}
                  </button>
                )
              })}
            </div>
            {spellTip ? <p className="hq-rpg-spell-tip">{spellTip}</p> : null}
            {!bag.classId ? (
              <p className="hq-rpg-hint">Pick a class in the Class tab for a full skill kit.</p>
            ) : null}
            <button
              type="button"
              className="hq-btn hq-btn--solid"
              disabled={!interactId}
              onClick={onInteract}
            >
              {interactLabel}
            </button>
            <p className="hq-rpg-hint">
              Zone portals:{' '}
              {HARBOR_RPG_PORTALS.filter((p) => p.from === bag.zone)
                .map((p) => p.label.en)
                .join(' · ') || '—'}
            </p>
            <button type="button" className="hq-btn hq-btn--ghost" onClick={onExitGame}>
              Leave HarborRPG
            </button>
          </>
        ) : null}

        {tab === 'bag' ? (
          <>
            <p className="hq-rpg-hint">
              Gear:{' '}
              {Object.entries(bag.gear)
                .filter(([, id]) => id)
                .map(([slot, id]) => `${slot}:${HARBOR_RPG_ITEM_DEFS[id!].name.en}`)
                .join(' · ') || 'none'}
            </p>
            <ul className="hq-rpg-inv">
              {bag.inventory.map((s) => {
                const def = HARBOR_RPG_ITEM_DEFS[s.id]
                return (
                  <li key={s.id} className="hq-rpg-inv-row">
                    <span>
                      {def.name.en} ×{s.qty}{' '}
                      <small>{def.rarity}</small>
                    </span>
                    <span className="hq-rpg-inv-act">
                      {(
                        ['weapon', 'offhand', 'head', 'chest', 'legs', 'feet', 'ring', 'trinket'] as const
                      ).includes(def.kind as never) ? (
                        <button type="button" onClick={() => onEquip(s.id)}>
                          Equip
                        </button>
                      ) : null}
                      <button type="button" onClick={() => onDepositBank(s.id)}>
                        Bank
                      </button>
                      <button type="button" onClick={() => onSell(s.id)}>
                        Sell
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className="hq-rpg-hint">Bank</p>
            <ul className="hq-rpg-inv">
              {bag.bank.length === 0 ? <li className="hq-rpg-hint">Empty</li> : null}
              {bag.bank.map((s) => (
                <li key={s.id} className="hq-rpg-inv-row">
                  <span>
                    {HARBOR_RPG_ITEM_DEFS[s.id].name.en} ×{s.qty}
                  </span>
                  <button type="button" onClick={() => onWithdrawBank(s.id)}>
                    Withdraw
                  </button>
                </li>
              ))}
            </ul>
            <p className="hq-rpg-hint">{HARBOR_RPG_VENDOR.name.en}</p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_VENDOR.stock.map((id) => {
                const def = HARBOR_RPG_ITEM_DEFS[id]
                return (
                  <li key={id} className="hq-rpg-inv-row">
                    <span>
                      {def.name.en} · {def.value}g
                    </span>
                    <button type="button" onClick={() => onBuy(id)}>
                      Buy
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}

        {tab === 'quests' ? (
          <ul className="hq-rpg-quest-list">
            {HARBOR_RPG_QUESTS.map((q) => {
              const prog = bag.quests.find((row) => row.id === q.id)
              return (
                <li key={q.id} className="hq-rpg-quest">
                  <strong>{q.name.en}</strong>
                  <p>{q.blurb.en}</p>
                  {prog?.claimed ? (
                    <span className="hq-rpg-hint">Claimed</span>
                  ) : prog ? (
                    <button
                      type="button"
                      className="hq-btn hq-btn--solid"
                      onClick={() => onClaimQuest(q.id)}
                    >
                      Turn in ({prog.progress}/{q.need})
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hq-btn hq-btn--ghost"
                      onClick={() => onAcceptQuest(q.id)}
                    >
                      Accept
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        {tab === 'class' ? (
          <>
            <p className="hq-rpg-hint">
              Nine Harbor classes · 3 specs each (27) · skill ranks · spellbook · prestige ★
            </p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_CLASSES.map((id) => {
                const def = HARBOR_RPG_CLASS_DEFS[id]
                const on = bag.classId === id
                return (
                  <li key={id} className="hq-rpg-inv-row">
                    <span>
                      <strong>{def.name.en}</strong>{' '}
                      <span lang="zh-HK">{def.name.zh}</span> · {def.role}
                      <br />
                      <small>{def.pitch.en}</small>
                    </span>
                    <button type="button" onClick={() => onSelectClass(id)}>
                      {on ? 'Active' : 'Choose'}
                    </button>
                  </li>
                )
              })}
            </ul>
            {classDef && bag.classId ? (
              <>
                <p className="hq-rpg-hint">
                  {classDef.name.en} Lv {classLevel}/{HARBOR_RPG_CLASS_LEVEL_CAP} · class XP{' '}
                  {bag.classXp} · talent pts {talentLeft}
                  {bag.prestige > 0 ? ` · prestige ★${bag.prestige}` : ''}
                </p>
                <p className="hq-rpg-hint">Specs</p>
                <ul className="hq-rpg-inv">
                  {harborRpgSpecsForClass(bag.classId).map((sp) => (
                    <li key={sp.id} className="hq-rpg-inv-row">
                      <span>
                        <strong>{sp.name.en}</strong> <span lang="zh-HK">{sp.name.zh}</span> ·{' '}
                        {sp.role} · {sp.resource}
                        <br />
                        <small>{sp.pitch.en}</small>
                      </span>
                      <button type="button" onClick={() => onSelectSpec(sp.id)}>
                        {bag.specId === sp.id ? 'Active' : 'Spec'}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="hq-rpg-hint">Talents{activeSpec ? ` · ${activeSpec.name.en}` : ''}</p>
                <ul className="hq-rpg-inv">
                  {classDef.talents
                    .filter((t) => !activeSpec || t.tree === activeSpec.tree)
                    .map((t) => (
                      <li key={t.id} className="hq-rpg-inv-row">
                        <span>
                          [{t.tree}] {t.name.en} ({bag.talents[t.id] ?? 0}/{t.max})
                        </span>
                        <button
                          type="button"
                          disabled={talentLeft <= 0 || (bag.talents[t.id] ?? 0) >= t.max}
                          onClick={() => onSpendTalent(t.id)}
                        >
                          +
                        </button>
                      </li>
                    ))}
                </ul>
                <p className="hq-rpg-hint">Passives</p>
                <ul className="hq-rpg-inv">
                  {classDef.passives.map((p) => (
                    <li key={p.level} className="hq-rpg-inv-row">
                      <span>
                        Lv {p.level}: {p.name.en}
                        {classLevel >= p.level ? ' ✓' : ''} — {p.blurb.en}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  disabled={classLevel < HARBOR_RPG_CLASS_LEVEL_CAP}
                  onClick={onPrestige}
                >
                  Prestige (reset class XP, keep skill ranks)
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {tab === 'spellbook' ? (
          <>
            <p className="hq-rpg-hint">
              Full spellbook · hover for tooltips · tap to cast · ranks power skills
            </p>
            {!bag.classId ? (
              <p className="hq-rpg-hint">Choose a class first.</p>
            ) : (
              <ul className="hq-rpg-spellbook">
                {harborRpgUnlockedSkills(bag.classId, classLevel).map((s) => {
                  const rank = harborRpgActiveSkillRank(bag, s.id)
                  const specMatch = activeSpec && s.specTree === activeSpec.tree
                  const locked = (combat?.abilityCds?.[s.id] ?? 0) > 0.05
                  return (
                    <li
                      key={s.id}
                      className={`hq-rpg-spell${specMatch ? ' is-spec' : ''}${castFlash === s.id ? ' is-cast' : ''}`}
                    >
                      <button
                        type="button"
                        className={`hq-rpg-spell-btn hq-rpg-ability--${s.anim ?? 'slash'}`}
                        disabled={locked}
                        title={`${s.name.en}\n${s.blurb.en}\nRank ${rank} · GCD ${s.gcd}s · CD ${s.cd}s${s.mpCost ? ` · ${s.mpCost} MP` : ''}`}
                        onMouseEnter={() =>
                          setSpellTip(
                            `${s.name.en} (R${rank}): ${s.blurb.en} · ${s.mpCost ?? 0} MP · range ${s.range}`,
                          )
                        }
                        onMouseLeave={() => setSpellTip(null)}
                        onClick={() => {
                          setCastFlash(s.id)
                          window.setTimeout(() => setCastFlash(null), 320)
                          onCastAbility(s.id)
                        }}
                      >
                        <strong>{s.name.en}</strong>
                        <span lang="zh-HK">{s.name.zh}</span>
                        <small>
                          R{rank} · unlock {s.unlockLevel}
                          {s.specTree ? ` · ${s.specTree}` : ''}
                        </small>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {spellTip ? <p className="hq-rpg-spell-tip">{spellTip}</p> : null}
          </>
        ) : null}

        {tab === 'trade' ? (
          <>
            <p className="hq-rpg-hint">
              Soft trade windows · {HARBOR_RPG_TRADE_SLOTS} slots · both lock then accept
            </p>
            {!trade ? (
              <>
                <p className="hq-rpg-hint">Nearby adventurers</p>
                <ul className="hq-rpg-inv">
                  {remotes.length === 0 ? (
                    <li className="hq-rpg-hint">No remotes — invite a peer or wait for presence</li>
                  ) : null}
                  {remotes.map((r) => (
                    <li key={r.userId} className="hq-rpg-inv-row">
                      <span>{r.username}</span>
                      <button type="button" onClick={() => onStartTrade(r.userId, r.username)}>
                        Trade
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="hq-rpg-trade">
                <p className="hq-rpg-hint">
                  Trading with {trade.peerName}
                  {trade.selfLocked ? ' · you locked' : ''}
                  {trade.peerLocked ? ' · peer locked' : ''}
                </p>
                <label className="hq-rpg-create-label">
                  Offer gold
                  <input
                    className="hq-rpg-create-input"
                    type="number"
                    min={0}
                    max={bag.gold}
                    value={trade.selfGold}
                    disabled={trade.selfLocked}
                    onChange={(e) => onTradeSetGold(Math.max(0, Number(e.target.value) || 0))}
                  />
                </label>
                <p className="hq-rpg-hint">Your offer</p>
                <ul className="hq-rpg-inv">
                  {trade.selfItems.map((s: HarborRpgInvStack) => (
                    <li key={`self-${s.id}`}>
                      {HARBOR_RPG_ITEM_DEFS[s.id].name.en} ×{s.qty}
                    </li>
                  ))}
                </ul>
                {!trade.selfLocked ? (
                  <ul className="hq-rpg-inv">
                    {bag.inventory.slice(0, 8).map((s) => (
                      <li key={`add-${s.id}`} className="hq-rpg-inv-row">
                        <span>
                          {HARBOR_RPG_ITEM_DEFS[s.id].name.en} ×{s.qty}
                        </span>
                        <button type="button" onClick={() => onTradeAddItem(s.id)}>
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="hq-rpg-hint">
                  Their offer · {trade.peerGold}g
                </p>
                <ul className="hq-rpg-inv">
                  {trade.peerItems.map((s) => (
                    <li key={`peer-${s.id}`}>
                      {HARBOR_RPG_ITEM_DEFS[s.id].name.en} ×{s.qty}
                    </li>
                  ))}
                </ul>
                <div className="hq-rpg-create-actions">
                  {!trade.selfLocked ? (
                    <button type="button" className="hq-btn hq-btn--solid" onClick={onTradeLock}>
                      Lock
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="hq-btn hq-btn--solid"
                      disabled={!trade.peerLocked}
                      onClick={onTradeAccept}
                    >
                      Accept trade
                    </button>
                  )}
                  <button type="button" className="hq-btn hq-btn--ghost" onClick={onTradeCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}

        {tab === 'craft' ? (
          <>
            <p className="hq-rpg-hint">
              {HARBOR_RPG_PROFESSIONS.map(
                (id) =>
                  `${HARBOR_RPG_PROFESSION_META[id].en} ${professionLevelFromXp(bag.professions[id] ?? 0)}`,
              ).join(' · ')}
            </p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_CRAFT_RECIPES.map((r) => (
                <li key={r.id} className="hq-rpg-inv-row">
                  <span>
                    {HARBOR_RPG_ITEM_DEFS[r.output].name.en} ←{' '}
                    {r.inputs.map((i) => `${i.qty} ${HARBOR_RPG_ITEM_DEFS[i.id].name.en}`).join(', ')}
                  </span>
                  <button type="button" onClick={() => onCraft(r.id)}>
                    Craft
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'market' ? (
          <>
            <p className="hq-rpg-hint">List from bag · buy remote soft listings</p>
            <ul className="hq-rpg-inv">
              {bag.inventory
                .filter((s) => HARBOR_RPG_ITEM_DEFS[s.id].value > 0)
                .slice(0, 8)
                .map((s) => (
                  <li key={`list-${s.id}`} className="hq-rpg-inv-row">
                    <span>{HARBOR_RPG_ITEM_DEFS[s.id].name.en}</span>
                    <button
                      type="button"
                      onClick={() =>
                        onListMarket(s.id, Math.max(1, HARBOR_RPG_ITEM_DEFS[s.id].value))
                      }
                    >
                      List @{HARBOR_RPG_ITEM_DEFS[s.id].value}g
                    </button>
                  </li>
                ))}
            </ul>
            <ul className="hq-rpg-inv">
              {bag.market.length === 0 ? (
                <li className="hq-rpg-hint">No listings yet</li>
              ) : null}
              {bag.market.map((l) => (
                <li key={l.id} className="hq-rpg-inv-row">
                  <span>
                    {HARBOR_RPG_ITEM_DEFS[l.itemId].name.en} ×{l.qty} · {l.price}g · {l.sellerName}
                  </span>
                  <button type="button" onClick={() => onBuyMarket(l.id)}>
                    Buy
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'party' ? (
          <>
            <p className="hq-rpg-hint">
              Party {party.code} · {party.members.length}/5 · Realtime soft invite
            </p>
            <ul className="hq-rpg-inv">
              {party.members.map((m) => (
                <li key={m.userId}>{m.name}</li>
              ))}
            </ul>
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => {
                setParty((p) => {
                  const next = toggleRpgFinderLooking(p)
                  // Soft simulate a second member when looking (demo / offline).
                  if (next.looking && next.members.length < 2) {
                    const withAlly = {
                      ...next,
                      members: [
                        ...next.members,
                        { userId: `ally-${Date.now().toString(36)}`, name: 'Reed Ally' },
                      ],
                    }
                    return withAlly
                  }
                  return next
                })
              }}
            >
              {party.looking ? 'Stop looking' : 'Find party (soft)'}
            </button>
            <button type="button" className="hq-btn hq-btn--solid" onClick={onHireCompanion}>
              Hire companion ({HARBOR_RPG_COMPANION_COST}g)
            </button>
          </>
        ) : null}
      </div>

      {lootPrompt ? (
        <div className="hq-rpg-loot-roll" role="dialog" aria-label="Contested loot">
          <p>
            Contested loot:{' '}
            {lootPrompt.loot.map((l) => `${HARBOR_RPG_ITEM_DEFS[l.id].name.en}×${l.qty}`).join(', ')}
          </p>
          <div className="hq-rpg-create-actions">
            <button type="button" className="hq-btn hq-btn--solid" onClick={() => onLootVote('need')}>
              Need
            </button>
            <button type="button" className="hq-btn hq-btn--ghost" onClick={() => onLootVote('greed')}>
              Greed
            </button>
            <button type="button" className="hq-btn hq-btn--ghost" onClick={() => onLootVote('pass')}>
              Pass
            </button>
          </div>
        </div>
      ) : null}

      {toast ? <p className="hq-rpg-toast">{toast}</p> : null}
    </div>
  )
}
