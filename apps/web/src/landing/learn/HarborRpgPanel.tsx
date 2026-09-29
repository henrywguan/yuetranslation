/**
 * HarborRPG HUD — completely separate from Harbor Quest pedagogy chrome.
 */
import { useEffect, useRef, useState } from 'react'
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
  type HarborRpgDifficulty,
  type HarborRpgItemId,
  type HarborRpgZoneId,
} from './harborRpgData'
import {
  HARBOR_RPG_FINDER_DUNGEONS,
  HARBOR_RPG_FINDER_ROLES,
  companionNameForRole,
  finderDungeonLabel,
  finderRoleFromClassId,
  matchRpgFinderListings,
  missingFinderRoles,
  type HarborRpgFinderDungeon,
  type HarborRpgFinderListing,
  type HarborRpgFinderRole,
} from './harborRpgFinder'
import { harborRpgQuestUnlocked } from './harborRpgQuests'
import {
  HARBOR_RPG_ACHIEVEMENT_IDS,
  HARBOR_RPG_ACHIEVEMENTS,
  harborRpgAchievementDone,
  harborRpgAchievementProgress,
  harborRpgTitleLabel,
} from './harborRpgAchievements'
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
  HARBOR_RPG_MOUNT_DEFS,
  HARBOR_RPG_MOUNT_IDS,
  type HarborRpgMountId,
} from './harborRpgMounts'
import {
  HARBOR_RPG_COSMETIC_DEFS,
  HARBOR_RPG_COSMETIC_IDS,
  type HarborRpgCosmeticId,
} from './harborRpgCosmetics'
import {
  HARBOR_RPG_EMOTES,
  harborRpgWeatherForZone,
  type HarborRpgMediumAction,
} from './harborRpgMedium'
import {
  harborRpgMightBonus,
  harborRpgWorldBoard,
  lockpickPattern,
  worldQuestProgress,
} from './harborRpgDepth'
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
  setRpgFinderQueue,
  setRpgMemberReady,
  type HarborRpgPartyState,
} from './harborRpgSocial'
import { HARBOR_RPG_CAMPAIGN, HARBOR_RPG_CHAPTERS } from './harborRpgLore'
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
  selfUserId?: string
  remotes: {
    userId: string
    username: string
    lookingRole?: HarborRpgFinderRole | null
    lookingDungeon?: HarborRpgFinderDungeon | null
    afk?: boolean
    fleetName?: string | null
    activeTitleId?: string | null
    weaponId?: string | null
    level?: number
  }[]
  partyLive: HarborRpgPartyState | null
  partyInvite: import('./harborRpgSocial').HarborRpgPartyInvite | null
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
  onInviteParty: (peerId: string) => void
  onAcceptPartyInvite: () => void
  onDeclinePartyInvite: () => void
  onSetDifficulty: (d: HarborRpgDifficulty) => void
  onFinderQueueChange: (party: HarborRpgPartyState) => void
  onBroadcastParty?: (party: HarborRpgPartyState) => void
  onFillCompanionRole: (role: HarborRpgFinderRole) => void
  onBuyMount: (id: HarborRpgMountId) => void
  onSummonMount: (id: HarborRpgMountId | null) => void
  onBuyCosmetic: (id: HarborRpgCosmeticId) => void
  onEquipCosmetic: (id: HarborRpgCosmeticId | null) => void
  onMedium: (action: HarborRpgMediumAction) => void
  onSetTitle: (id: string | null) => void
  onOpenWiki: (page?: import('./harborRpgWiki').HarborRpgWikiPage) => void
  onExitGame: () => void
}

export function HarborRpgPanel({
  bag,
  combat,
  interactId,
  toast,
  lootPrompt,
  trade,
  selfUserId,
  remotes,
  partyLive,
  partyInvite,
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
  onInviteParty,
  onAcceptPartyInvite,
  onDeclinePartyInvite,
  onSetDifficulty,
  onFinderQueueChange,
  onBroadcastParty,
  onFillCompanionRole,
  onBuyMount,
  onSummonMount,
  onBuyCosmetic,
  onEquipCosmetic,
  onMedium,
  onSetTitle,
  onOpenWiki,
  onExitGame,
}: Props) {
  const [tab, setTab] = useState<
    | 'field'
    | 'bag'
    | 'quests'
    | 'party'
    | 'craft'
    | 'market'
    | 'class'
    | 'spellbook'
    | 'trade'
    | 'stable'
    | 'wardrobe'
    | 'social'
    | 'frontiers'
    | 'achievements'
  >('field')
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)
  const [spellTip, setSpellTip] = useState<string | null>(null)
  const [castFlash, setCastFlash] = useState<string | null>(null)
  const [finderRole, setFinderRole] = useState<HarborRpgFinderRole>(() =>
    finderRoleFromClassId(bag.classId),
  )
  const [finderDungeon, setFinderDungeon] = useState<HarborRpgFinderDungeon>('crypt')
  const [friendName, setFriendName] = useState('')
  const [mailTo, setMailTo] = useState('')
  const [mailBody, setMailBody] = useState('')
  const [fleetDraft, setFleetDraft] = useState('')
  const [delveFloor, setDelveFloor] = useState(1)
  const [mailGold, setMailGold] = useState(0)
  const [whisperTo, setWhisperTo] = useState('')
  const [whisperBody, setWhisperBody] = useState('')
  const [pledgeText, setPledgeText] = useState('')
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [pins, setPins] = useState<[number, number, number]>([1, 1, 1])
  const raceT = useRef(0)
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
    if (partyLive) setParty(partyLive)
  }, [partyLive])

  const lastRaceInteract = useRef<string | null>(null)
  useEffect(() => {
    if (interactId === 'rpg-stable') setTab('stable')
    if (interactId === 'rpg-vendor') setTab('wardrobe')
    if (interactId === 'rpg-ravenpost') setTab('social')
    if (interactId === 'rpg-reliquary') setTab('frontiers')
    if (interactId === lastRaceInteract.current) return
    lastRaceInteract.current = interactId
    if (interactId === 'rpg-race-start') {
      raceT.current = performance.now()
      onMedium({ type: 'race-mark', gate: 'start' })
    }
    if (interactId === 'rpg-race-mid') onMedium({ type: 'race-mark', gate: 'mid' })
    if (interactId === 'rpg-race-finish' && raceT.current) {
      const elapsed = performance.now() - raceT.current
      raceT.current = 0
      onMedium({
        type: 'race',
        elapsedMs: elapsed,
        mounted: Boolean(bag.activeMountId),
        checkpoint: true,
      })
    }
  }, [interactId, bag.activeMountId, onMedium])

  useEffect(() => {
    onMedium({ type: 'sync-world' })
  }, [bag.zone, bag.worldDay, bag.worldWeek])

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
                    : interactId === 'rpg-stable'
                      ? 'Open Ferry Stable'
                      : interactId === 'rpg-ravenpost'
                        ? 'Open Ravenpost'
                        : interactId === 'rpg-reliquary'
                          ? 'Open Reliquary'
                          : interactId === 'rpg-race-start'
                            ? 'Start mount race'
                            : interactId === 'rpg-race-mid'
                              ? 'Mid gate'
                              : interactId === 'rpg-race-finish'
                                ? 'Finish mount race'
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
            {bag.activeTitleId && harborRpgTitleLabel(bag.activeTitleId) ? (
              <span className="hq-rpg-chip hq-rpg-chip--title">
                «{harborRpgTitleLabel(bag.activeTitleId)!.en}»
              </span>
            ) : null}
            {harborRpgMightBonus(bag.buffs, Date.now()) > 0 ? (
              <span className="hq-rpg-chip">Might</span>
            ) : null}
            {(combat?.guardBuffSec ?? 0) > 0 ? (
              <span className="hq-rpg-chip">Guard {Math.ceil(combat?.guardBuffSec ?? 0)}s</span>
            ) : null}
            <button type="button" className="hq-rpg-chip" onClick={() => onMedium({ type: 'drink-might' })}>
              Drink might
            </button>
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
            ['wardrobe', 'Wardrobe'],
            ['social', 'Social'],
            ['frontiers', 'Frontiers'],
            ['stable', 'Stable'],
            ['achievements', 'Deeds'],
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
            <FieldTracker bag={bag} />
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
            <button type="button" className="hq-btn hq-btn--ghost" onClick={() => onOpenWiki()}>
              HarborRPG Wiki
            </button>
            <button
              type="button"
              className="hq-btn hq-btn--ghost"
              onClick={() => setTab('achievements')}
            >
              Achievements
            </button>
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
                      <button
                        type="button"
                        onClick={() => onOpenWiki({ section: 'items', id: s.id })}
                      >
                        Wiki
                      </button>
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
                    <span className="hq-rpg-inv-act">
                      <button
                        type="button"
                        onClick={() => onOpenWiki({ section: 'items', id })}
                      >
                        Wiki
                      </button>
                      <button type="button" onClick={() => onBuy(id)}>
                        Buy
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}

        {tab === 'stable' ? (
          <>
            <p className="hq-rpg-hint">
              Ferry Stable · Tide Horse is free. Summon to ride · Dismount clears the saddle.
              {bag.activeMountId
                ? ` Riding ${HARBOR_RPG_MOUNT_DEFS[bag.activeMountId].name.en}.`
                : ' On foot.'}
            </p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_MOUNT_IDS.map((id) => {
                const def = HARBOR_RPG_MOUNT_DEFS[id]
                const owned = bag.ownedMounts.includes(id)
                const active = bag.activeMountId === id
                return (
                  <li key={id} className="hq-rpg-inv-row">
                    <span>
                      {def.name.en}{' '}
                      <small>
                        {def.pack} · ×{def.speedMult.toFixed(2)} · {def.cost === 0 ? 'free' : `${def.cost}g`}
                      </small>
                      <br />
                      <small>{def.blurb.en}</small>
                    </span>
                    <span className="hq-rpg-inv-act">
                      <button
                        type="button"
                        onClick={() => onOpenWiki({ section: 'mounts', id })}
                      >
                        Wiki
                      </button>
                      {!owned ? (
                        <button
                          type="button"
                          disabled={bag.gold < def.cost}
                          onClick={() => onBuyMount(id)}
                        >
                          Buy
                        </button>
                      ) : active ? (
                        <button type="button" onClick={() => onSummonMount(null)}>
                          Dismount
                        </button>
                      ) : (
                        <button type="button" onClick={() => onSummonMount(id)}>
                          Summon
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}

        {tab === 'wardrobe' ? (
          <>
            <p className="hq-rpg-hint">
              Wardrobe · Quaternius Modular Outfits (CC0) + soft placeholders. Equip one look at a
              time · outfits replace Scout · hoods/pauldrons layer on.
              {bag.equippedCosmetic && HARBOR_RPG_COSMETIC_DEFS[bag.equippedCosmetic as HarborRpgCosmeticId]
                ? ` Wearing ${HARBOR_RPG_COSMETIC_DEFS[bag.equippedCosmetic as HarborRpgCosmeticId].name.en}.`
                : ' Nothing equipped.'}
            </p>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className="hq-btn hq-btn--ghost"
                onClick={() => onEquipCosmetic(null)}
              >
                Clear look
              </button>
            </div>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_COSMETIC_IDS.map((id) => {
                const def = HARBOR_RPG_COSMETIC_DEFS[id]
                const owned = bag.ownedCosmetics.includes(id)
                const active = bag.equippedCosmetic === id
                return (
                  <li key={id} className="hq-rpg-inv-row">
                    <span>
                      {def.name.en}{' '}
                      <small>
                        {def.pack} · {def.kind} · {def.slot}
                        {def.cost === 0 ? ' · free' : ` · ${def.cost}g`}
                        {def.src ? '' : ' · soft'}
                      </small>
                      <br />
                      <small>{def.blurb.en}</small>
                    </span>
                    <span className="hq-rpg-inv-act">
                      {!owned ? (
                        <button
                          type="button"
                          disabled={bag.gold < def.cost}
                          onClick={() => onBuyCosmetic(id)}
                        >
                          Buy
                        </button>
                      ) : active ? (
                        <button type="button" onClick={() => onEquipCosmetic(null)}>
                          Unequip
                        </button>
                      ) : (
                        <button type="button" onClick={() => onEquipCosmetic(id)}>
                          Equip
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}

        {tab === 'social' ? (
          <>
            <p className="hq-rpg-hint">
              Friends show online or AFK from presence. Whispers and Ravenpost reach the other sailor.
              {bag.afk ? ` AFK${bag.afkNote ? ` · ${bag.afkNote}` : ''}.` : ''}
              {bag.fleetName ? ` Fleet: ${bag.fleetName} · ${bag.fleetRank}.` : ''}
            </p>
            <form
              className="hq-rpg-inv-act"
              onSubmit={(e) => {
                e.preventDefault()
                onMedium({ type: 'add-friend', name: friendName })
                setFriendName('')
              }}
            >
              <input
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                placeholder="Friend name"
                maxLength={24}
              />
              <button type="submit">Add</button>
              <button type="button" onClick={() => onMedium({ type: 'afk', on: !bag.afk, note: bag.afkNote })}>
                {bag.afk ? 'Back' : 'AFK'}
              </button>
            </form>
            <ul className="hq-rpg-inv">
              {bag.friends.map((name) => {
                const online = remotes.find((r) => r.username === name)
                return (
                  <li key={name} className="hq-rpg-inv-row">
                    <span>
                      {name}
                      {online ? (online.afk ? ' · AFK' : ' · online') : ' · offline'}
                    </span>
                    <span className="hq-rpg-inv-act">
                      <button type="button" onClick={() => { setWhisperTo(name) }}>
                        Whisper
                      </button>
                      <button type="button" onClick={() => onMedium({ type: 'duel', foe: name })}>
                        Duel
                      </button>
                      <button type="button" onClick={() => onMedium({ type: 'remove-friend', name })}>
                        Remove
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
            <form
              className="hq-rpg-inv-act"
              onSubmit={(e) => {
                e.preventDefault()
                onMedium({ type: 'whisper', to: whisperTo, body: whisperBody })
                setWhisperBody('')
              }}
            >
              <input value={whisperTo} onChange={(e) => setWhisperTo(e.target.value)} placeholder="Whisper to" maxLength={24} />
              <input value={whisperBody} onChange={(e) => setWhisperBody(e.target.value)} placeholder="Whisper" maxLength={140} />
              <button type="submit">Send whisper</button>
            </form>
            <ul className="hq-rpg-inv">
              {bag.whispers.slice(0, 6).map((w) => (
                <li key={w.id} className="hq-rpg-inv-row">
                  <span>
                    {w.read ? '' : '• '}
                    {w.from}: {w.body}
                  </span>
                  <button type="button" onClick={() => onMedium({ type: 'read-whisper', id: w.id })}>
                    Read
                  </button>
                </li>
              ))}
            </ul>
            <p className="hq-rpg-hint">Emotes</p>
            <div className="hq-rpg-inv-act">
              {HARBOR_RPG_EMOTES.map((em) => (
                <button key={em.id} type="button" onClick={() => onMedium({ type: 'emote', id: em.id })}>
                  {em.en}
                </button>
              ))}
              <button type="button" onClick={() => onMedium({ type: 'duel', foe: 'training-post' })}>
                Duel post
              </button>
            </div>
            {bag.duel ? (
              <div className="hq-rpg-inv-act" style={{ marginTop: 8 }}>
                <span>
                  Duel {bag.duel.foe} · {bag.duel.phase} · you {bag.duel.selfHp} / foe {bag.duel.foeHp}
                </span>
                {bag.duel.phase === 'challenge' ? (
                  <button type="button" onClick={() => onMedium({ type: 'duel-accept' })}>
                    Accept duel
                  </button>
                ) : (
                  <button type="button" onClick={() => onMedium({ type: 'duel-hit' })}>
                    Strike
                  </button>
                )}
              </div>
            ) : null}
            <form
              className="hq-rpg-inv-act"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault()
                onMedium({ type: 'fleet', name: fleetDraft, motto: 'Soft fleet' })
                setFleetDraft('')
              }}
            >
              <input
                value={fleetDraft}
                onChange={(e) => setFleetDraft(e.target.value)}
                placeholder="Fleet name"
                maxLength={24}
              />
              <button type="submit">Found fleet</button>
              <button type="button" onClick={() => onMedium({ type: 'fleet', name: null, motto: '' })}>
                Leave
              </button>
            </form>
            {bag.fleetName ? (
              <>
                <p className="hq-rpg-hint">
                  Roster · {bag.fleetName}. Bank withdraw is officer or leader.
                </p>
                <ul className="hq-rpg-inv">
                  <li className="hq-rpg-inv-row">
                    <span>You · {bag.fleetRank}</span>
                    <span className="hq-rpg-inv-act">
                      {(['member', 'officer', 'leader'] as const).map((rank) => (
                        <button key={rank} type="button" onClick={() => onMedium({ type: 'fleet-rank', rank })}>
                          {rank}
                        </button>
                      ))}
                    </span>
                  </li>
                  {remotes
                    .filter((r) => r.fleetName && r.fleetName === bag.fleetName)
                    .map((r) => (
                      <li key={r.userId} className="hq-rpg-inv-row">
                        <span>
                          {r.username}
                          {r.afk ? ' · AFK' : ' · online'}
                        </span>
                      </li>
                    ))}
                </ul>
                <div className="hq-rpg-inv-act">
                  {bag.inventory.slice(0, 4).map((s) => (
                    <button key={s.id} type="button" onClick={() => onMedium({ type: 'fleet-deposit', id: s.id })}>
                      Deposit {HARBOR_RPG_ITEM_DEFS[s.id].name.en}
                    </button>
                  ))}
                </div>
                <ul className="hq-rpg-inv">
                  {bag.fleetBank.map((s) => (
                    <li key={s.id} className="hq-rpg-inv-row">
                      <span>
                        {HARBOR_RPG_ITEM_DEFS[s.id as HarborRpgItemId]?.name.en ?? s.id} ×{s.qty}
                      </span>
                      <button
                        type="button"
                        disabled={bag.fleetRank === 'member'}
                        onClick={() => onMedium({ type: 'fleet-withdraw', id: s.id as HarborRpgItemId })}
                      >
                        Withdraw
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="hq-rpg-inv-act"
                  onSubmit={(e) => {
                    e.preventDefault()
                    onMedium({ type: 'fleet-pledge', text: pledgeText })
                    setPledgeText('')
                  }}
                >
                  <input value={pledgeText} onChange={(e) => setPledgeText(e.target.value)} placeholder="Pledge" maxLength={80} />
                  <button type="submit">Post pledge</button>
                </form>
                <ul className="hq-rpg-inv">
                  {bag.fleetPledges.map((p) => (
                    <li key={p.id}>
                      {p.by}: {p.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <form
              className="hq-rpg-inv-act"
              style={{ marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault()
                onMedium({ type: 'mail', to: mailTo, subject: 'Raven', body: mailBody, gold: mailGold })
                setMailBody('')
              }}
            >
              <input value={mailTo} onChange={(e) => setMailTo(e.target.value)} placeholder="To" maxLength={24} />
              <input
                value={mailBody}
                onChange={(e) => setMailBody(e.target.value)}
                placeholder="Ravenpost letter"
                maxLength={180}
              />
              <input
                type="number"
                min={0}
                max={5000}
                value={mailGold}
                onChange={(e) => setMailGold(Number(e.target.value) || 0)}
                aria-label="Attached gold"
              />
              <button type="submit">Send</button>
            </form>
            <p className="hq-rpg-hint">Nearby sailors — tap to inspect gear, title, and fleet.</p>
            <ul className="hq-rpg-inv">
              {remotes.length === 0 ? <li className="hq-rpg-hint">No one else in the realm.</li> : null}
              {remotes.map((r) => (
                <li key={r.userId} className="hq-rpg-inv-row">
                  <button type="button" onClick={() => setInspectId(inspectId === r.userId ? null : r.userId)}>
                    {r.username}
                    {r.afk ? ' · AFK' : ''}
                  </button>
                  {inspectId === r.userId ? (
                    <span>
                      <small>
                        Lv {r.level ?? 1}
                        {r.activeTitleId && harborRpgTitleLabel(r.activeTitleId)
                          ? ` · «${harborRpgTitleLabel(r.activeTitleId)!.en}»`
                          : ''}
                        {r.weaponId && HARBOR_RPG_ITEM_DEFS[r.weaponId as HarborRpgItemId]
                          ? ` · ${HARBOR_RPG_ITEM_DEFS[r.weaponId as HarborRpgItemId].name.en}`
                          : ''}
                        {r.fleetName ? ` · fleet ${r.fleetName}` : ''}
                      </small>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <ul className="hq-rpg-inv">
              {bag.inbox.map((m) => (
                <li key={m.id} className="hq-rpg-inv-row">
                  <span>
                    {m.read ? '' : '• '}
                    {m.from}: {m.subject}
                    <br />
                    <small>{m.body}</small>
                  </span>
                  <button type="button" onClick={() => onMedium({ type: 'read-mail', id: m.id })}>
                    Read
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'frontiers' ? (
          <>
            <p className="hq-rpg-hint">
              Second-act frontiers, rift, delve, mount race, and Reliquary shelves. Weather here is{' '}
              {harborRpgWeatherForZone(bag.zone)} (render only).
            </p>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => onMedium({ type: 'zone', zone: 'ashreach' })}>
                Ash Reach
              </button>
              <button type="button" onClick={() => onMedium({ type: 'zone', zone: 'moonpier' })}>
                Moon Pier
              </button>
              <button type="button" onClick={() => onMedium({ type: 'zone', zone: 'town' })}>
                Town
              </button>
              <button type="button" onClick={() => onMedium({ type: 'enter-rift' })}>
                Open rift
              </button>
              <button type="button" onClick={() => onMedium({ type: 'claim-rift', roll: Math.random() })}>
                Rift chest
              </button>
            </div>
            <p className="hq-rpg-hint">Rift seed {bag.riftSeed} — the pack changes each time you open it.</p>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => setDelveFloor((n) => Math.max(1, n - 1))}>
                −
              </button>
              <span>Delve {delveFloor}</span>
              <button type="button" onClick={() => setDelveFloor((n) => Math.min(8, n + 1))}>
                +
              </button>
              <button type="button" onClick={() => onMedium({ type: 'enter-delve', floor: delveFloor })}>
                Enter delve
              </button>
              <button type="button" onClick={() => onMedium({ type: 'claim-delve', pins })}>
                Lockpick chest
              </button>
            </div>
            <p className="hq-rpg-hint">
              Lock pattern {lockpickPattern(delveFloor).join(' · ')}. Set the pins, then open the chest.
            </p>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              {pins.map((pin, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setPins((prev) => {
                      const next: [number, number, number] = [prev[0], prev[1], prev[2]]
                      next[i] = pin >= 3 ? 1 : pin + 1
                      return next
                    })
                  }
                >
                  Pin {i + 1}: {pin}
                </button>
              ))}
            </div>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => onMedium({ type: 'draw-chart' })}>
                Draw tide chart
              </button>
              <button type="button" onClick={() => onMedium({ type: 'dig-chart', x: 0, z: 0 })}>
                Dig here
              </button>
            </div>
            {bag.tideChart ? (
              <p className="hq-rpg-hint">
                Chart: {bag.tideChart.zone} ({bag.tideChart.x}, {bag.tideChart.z})
                {bag.tideChart.dug ? ' · dug' : ' · buried'}
              </p>
            ) : null}
            <p className="hq-rpg-hint">
              Mount race: start gate, mid gate, then finish, mounted. Under 45s pays 20g.
              {bag.raceBestMs ? ` Best ${(bag.raceBestMs / 1000).toFixed(1)}s.` : ''} Runs {bag.raceRuns}. Rifts{' '}
              {bag.riftClears}. Delve best {bag.delveBest}.
            </p>
            <p className="hq-rpg-hint">Reliquary shelves — claimed deeds stay on the wall.</p>
            <ul className="hq-rpg-inv">
              {bag.claimedDeeds.length === 0 ? <li className="hq-rpg-hint">Shelves empty.</li> : null}
              {bag.claimedDeeds.map((id) => (
                <li key={`shelf-${id}`}>
                  {HARBOR_RPG_ACHIEVEMENTS[id as keyof typeof HARBOR_RPG_ACHIEVEMENTS]?.name.en ?? id} · shelved
                </li>
              ))}
            </ul>
            <p className="hq-rpg-hint">Claim a finished deed once for gold.</p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_ACHIEVEMENT_IDS.filter((id) => harborRpgAchievementDone(bag, id)).map((id) => (
                <li key={id} className="hq-rpg-inv-row">
                  <span>
                    {HARBOR_RPG_ACHIEVEMENTS[id].name.en}
                    {bag.claimedDeeds.includes(id) ? ' · shelved' : ''}
                  </span>
                  <button
                    type="button"
                    disabled={bag.claimedDeeds.includes(id)}
                    onClick={() => onMedium({ type: 'claim-deed', id })}
                  >
                    Claim
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {tab === 'achievements' ? (
          <>
            <p className="hq-rpg-hint">
              Book of Deeds · soft progress from your bag · unlock titles to pin on Field.
              {bag.activeTitleId && harborRpgTitleLabel(bag.activeTitleId)
                ? ` Active: «${harborRpgTitleLabel(bag.activeTitleId)!.en}».`
                : ' No title equipped.'}
            </p>
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button type="button" className="hq-btn hq-btn--ghost" onClick={() => onSetTitle(null)}>
                Clear title
              </button>
              <button
                type="button"
                className="hq-btn hq-btn--ghost"
                onClick={() => onOpenWiki({ section: 'achievements', id: 'ach-first-char' })}
              >
                Open wiki
              </button>
            </div>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_ACHIEVEMENT_IDS.map((id) => {
                const def = HARBOR_RPG_ACHIEVEMENTS[id]
                const progress = harborRpgAchievementProgress(bag, id)
                const done = harborRpgAchievementDone(bag, id)
                const unlocked = bag.unlockedTitles.includes(id)
                const active = bag.activeTitleId === id
                const pct = Math.min(100, Math.round((progress / Math.max(1, def.target)) * 100))
                return (
                  <li key={id} className="hq-rpg-inv-row">
                    <span>
                      {done ? '✓ ' : ''}
                      {def.name.en}{' '}
                      <small>
                        {def.category} · {progress}/{def.target}
                      </small>
                      <br />
                      <small>{def.how.en}</small>
                      <span
                        className="hq-rpg-hp-track"
                        style={{ display: 'block', marginTop: 4, height: 6 }}
                        aria-hidden
                      >
                        <span className="hq-rpg-hp-fill" style={{ width: `${pct}%` }} />
                      </span>
                    </span>
                    <span className="hq-rpg-inv-act">
                      <button
                        type="button"
                        onClick={() => onOpenWiki({ section: 'achievements', id })}
                      >
                        Wiki
                      </button>
                      {unlocked || done ? (
                        <button
                          type="button"
                          disabled={active}
                          onClick={() => onSetTitle(id)}
                        >
                          {active ? 'Pinned' : 'Pin title'}
                        </button>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        ) : null}

        {tab === 'quests' ? (
          <>
            <WorldBoard bag={bag} onMedium={onMedium} />
            <p className="hq-rpg-hint">
              {HARBOR_RPG_CAMPAIGN.title.en} — {HARBOR_RPG_CAMPAIGN.tagline.en}
            </p>
            <p className="hq-rpg-hint">
              Instance difficulty:{' '}
              <button
                type="button"
                className={`hq-btn ${bag.difficulty === 'normal' ? 'hq-btn--solid' : 'hq-btn--ghost'}`}
                onClick={() => onSetDifficulty('normal')}
              >
                Normal
              </button>{' '}
              <button
                type="button"
                className={`hq-btn ${bag.difficulty === 'heroic' ? 'hq-btn--solid' : 'hq-btn--ghost'}`}
                onClick={() => onSetDifficulty('heroic')}
              >
                Heroic
              </button>
              {bag.difficulty === 'heroic' ? ' · +HP/ATK/loot in instances' : ''}
            </p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_CHAPTERS.map((ch) => (
                <li key={ch.id} className="hq-rpg-inv-row">
                  <span>
                    <strong>
                      Ch.{ch.order} {ch.name.en}
                    </strong>{' '}
                    <span lang="zh-HK">{ch.name.zh}</span>
                    <br />
                    <small>{ch.blurb.en}</small>
                  </span>
                </li>
              ))}
            </ul>
            <ul className="hq-rpg-quest-list">
              {HARBOR_RPG_QUESTS.map((q) => {
                const prog = bag.quests.find((row) => row.id === q.id)
                const unlocked = harborRpgQuestUnlocked(bag, q.id)
                return (
                  <li key={q.id} className="hq-rpg-quest">
                    <strong>{q.name.en}</strong>
                    <p>{q.blurb.en}</p>
                    {!unlocked && !prog ? (
                      <span className="hq-rpg-hint">Locked — finish prior quests</span>
                    ) : prog?.claimed ? (
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
          </>
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
                <p className="hq-rpg-hint">
                  Loadout {bag.activeLoadout.toUpperCase()}
                  {bag.loadoutB ? ' · B saved' : ''}
                </p>
                <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
                  <button type="button" onClick={() => onMedium({ type: 'save-loadout' })}>
                    Save as B
                  </button>
                  <button type="button" onClick={() => onMedium({ type: 'swap-loadout' })}>
                    Swap loadout
                  </button>
                </div>
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
                  <span className="hq-rpg-inv-act">
                    <button
                      type="button"
                      onClick={() => onOpenWiki({ section: 'items', id: r.output })}
                    >
                      Wiki
                    </button>
                    <button type="button" onClick={() => onCraft(r.id)}>
                      Craft
                    </button>
                  </span>
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
              Party {party.code} · {party.members.length}/5 · Dungeon Finder roles
            </p>
            {partyInvite ? (
              <div className="hq-rpg-loot-roll" role="dialog" aria-label="Party invite">
                <p>
                  Invite from {partyInvite.fromName} · code {partyInvite.code}
                </p>
                <div className="hq-rpg-create-actions">
                  <button
                    type="button"
                    className="hq-btn hq-btn--solid"
                    onClick={onAcceptPartyInvite}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={onDeclinePartyInvite}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : null}
            <div className="hq-rpg-inv-act" style={{ marginBottom: 8 }}>
              <button
                type="button"
                className="hq-btn hq-btn--solid"
                onClick={() => {
                  const self = selfUserId || party.leaderId
                  const mine = party.members.find((m) => m.userId === self)
                  const next = setRpgMemberReady(party, self, !mine?.ready)
                  setParty(next)
                  ;(onBroadcastParty ?? onFinderQueueChange)(next)
                }}
              >
                Ready check
              </button>
            </div>
            <ul className="hq-rpg-inv">
              {party.members.map((m) => (
                <li key={m.userId}>
                  {m.name}
                  {m.role ? ` · ${m.role}` : ''}
                  {m.ready ? ' · ready' : ' · waiting'}
                </li>
              ))}
            </ul>
            <p className="hq-rpg-hint">Your role</p>
            <div className="hq-rpg-create-actions">
              {HARBOR_RPG_FINDER_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`hq-btn ${finderRole === r ? 'hq-btn--solid' : 'hq-btn--ghost'}`}
                  onClick={() => setFinderRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="hq-rpg-hint">Dungeon</p>
            <ul className="hq-rpg-inv">
              {HARBOR_RPG_FINDER_DUNGEONS.map((d) => {
                const label = finderDungeonLabel(d)
                return (
                  <li key={d} className="hq-rpg-inv-row">
                    <span>
                      {label.en} <span lang="zh-HK">{label.zh}</span>
                    </span>
                    <button type="button" onClick={() => setFinderDungeon(d)}>
                      {finderDungeon === d ? 'Selected' : 'Select'}
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              className="hq-btn hq-btn--solid"
              onClick={() => {
                const next = setRpgFinderQueue(party, {
                  looking: !party.looking,
                  role: finderRole,
                  dungeon: finderDungeon,
                })
                setParty(next)
                onFinderQueueChange(next)
                onPartySizeChange(Math.max(1, next.members.length))
              }}
            >
              {party.looking
                ? `Stop looking (${party.lookingRole ?? finderRole} · ${party.lookingDungeon ?? finderDungeon})`
                : `Looking as ${finderRole} · ${finderDungeonLabel(finderDungeon).en}`}
            </button>
            {(() => {
              const listings: HarborRpgFinderListing[] = remotes
                .filter((r) => r.lookingRole && r.lookingDungeon)
                .map((r) => ({
                  userId: r.userId,
                  username: r.username,
                  role: r.lookingRole!,
                  dungeon: r.lookingDungeon!,
                  t: Date.now(),
                }))
              const matches = party.looking
                ? matchRpgFinderListings({
                    selfRole: party.lookingRole ?? finderRole,
                    dungeon: party.lookingDungeon ?? finderDungeon,
                    listings,
                    selfUserId: party.leaderId,
                  })
                : []
              const missing = missingFinderRoles([
                party.lookingRole ?? finderRole,
                ...matches.map((m) => m.role),
                ...party.members.map((m) => m.role).filter(Boolean) as HarborRpgFinderRole[],
              ])
              return (
                <>
                  <p className="hq-rpg-hint">
                    Matches · need {missing.length ? missing.join(', ') : 'full soft comp'}
                  </p>
                  <ul className="hq-rpg-inv">
                    {matches.length === 0 ? (
                      <li className="hq-rpg-hint">No complementary remotes yet</li>
                    ) : null}
                    {matches.map((m) => (
                      <li key={m.userId} className="hq-rpg-inv-row">
                        <span>
                          {m.username} · {m.role}
                        </span>
                        <button type="button" onClick={() => onInviteParty(m.userId)}>
                          Invite
                        </button>
                      </li>
                    ))}
                  </ul>
                  {missing[0] ? (
                    <button
                      type="button"
                      className="hq-btn hq-btn--ghost"
                      onClick={() => onFillCompanionRole(missing[0]!)}
                    >
                      Fill {missing[0]} with {companionNameForRole(missing[0]!)} (
                      {HARBOR_RPG_COMPANION_COST}g)
                    </button>
                  ) : null}
                </>
              )
            })()}
            <p className="hq-rpg-hint">Invite nearby remotes</p>
            <ul className="hq-rpg-inv">
              {remotes.length === 0 ? (
                <li className="hq-rpg-hint">No remotes in channel yet</li>
              ) : null}
              {remotes.map((r) => (
                <li key={r.userId} className="hq-rpg-inv-row">
                  <span>
                    {r.username}
                    {r.lookingRole ? ` · LFG ${r.lookingRole}` : ''}
                  </span>
                  <button type="button" onClick={() => onInviteParty(r.userId)}>
                    Invite
                  </button>
                </li>
              ))}
            </ul>
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

function FieldTracker({ bag }: { bag: HarborRpgBag }) {
  const chapter = bag.quests
    .filter((q) => !q.claimed)
    .slice(0, 2)
    .map((q) => {
      const def = HARBOR_RPG_QUESTS.find((row) => row.id === q.id)
      return def ? `${def.name.en}${q.complete ? ' · turn in' : ''}` : q.id
    })
  const world = harborRpgWorldBoard()
    .filter((q) => !bag.worldClaims.includes(q.id))
    .slice(0, Math.max(0, 2 - chapter.length))
    .map((q) => {
      const n = worldQuestProgress({
        quest: q,
        kills: bag.kills,
        killMark: bag.worldKillMark,
        visits: bag.worldVisits,
      })
      return `${q.en} ${Math.min(n, q.need)}/${q.need}`
    })
  const lines = [...chapter, ...world].slice(0, 2)
  if (lines.length === 0) return null
  return (
    <div className="hq-rpg-hint" aria-label="Active objectives">
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  )
}

function WorldBoard({
  bag,
  onMedium,
}: {
  bag: HarborRpgBag
  onMedium: (action: HarborRpgMediumAction) => void
}) {
  const board = harborRpgWorldBoard()
  return (
    <>
      <p className="hq-rpg-hint">Today’s board — three dailies and one weekly.</p>
      <ul className="hq-rpg-inv">
        {board.map((q) => {
          const n = worldQuestProgress({
            quest: q,
            kills: bag.kills,
            killMark: bag.worldKillMark,
            visits: bag.worldVisits,
          })
          const claimed = bag.worldClaims.includes(q.id)
          return (
            <li key={q.id} className="hq-rpg-inv-row">
              <span>
                {q.period === 'week' ? 'Weekly' : 'Daily'} · {q.en} {Math.min(n, q.need)}/{q.need}
              </span>
              <button
                type="button"
                disabled={claimed || n < q.need}
                onClick={() => onMedium({ type: 'claim-world', id: q.id })}
              >
                {claimed ? 'Done' : 'Claim'}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
