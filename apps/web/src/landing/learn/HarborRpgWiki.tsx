/**
 * HarborRPG Wiki — fullscreen encyclopaedia for every item, mount, monster,
 * zone, quest, class, profession, and achievement (with loot / obtain sources).
 */
import { useMemo, useState } from 'react'
import {
  HARBOR_RPG_CRAFT_RECIPES,
  HARBOR_RPG_ITEM_DEFS,
  HARBOR_RPG_MONSTER_DEFS,
  HARBOR_RPG_PROFESSION_META,
  HARBOR_RPG_QUESTS,
  HARBOR_RPG_ZONE_META,
  HARBOR_RPG_ZONE_SPAWNS,
} from './harborRpgData'
import {
  HARBOR_RPG_ACHIEVEMENTS,
  harborRpgAchievementDone,
  harborRpgAchievementProgress,
} from './harborRpgAchievements'
import { HARBOR_RPG_CLASS_DEFS } from './harborRpgClasses'
import { HARBOR_RPG_MOUNT_DEFS, HARBOR_RPG_STABLE } from './harborRpgMounts'
import type { HarborRpgBag } from './harborRpgProgress'
import {
  HARBOR_RPG_WIKI_SECTIONS,
  harborRpgClassSpecLine,
  harborRpgItemLootSources,
  harborRpgMountObtainSources,
  harborRpgWikiList,
  harborRpgWikiPageTitle,
  harborRpgWikiSearchHay,
  harborRpgWikiStats,
  type HarborRpgLootSource,
  type HarborRpgWikiPage,
  type HarborRpgWikiSection,
} from './harborRpgWiki'

type Props = {
  bag: HarborRpgBag
  onClose: () => void
  /** Optional deep-link when opening. */
  initial?: HarborRpgWikiPage
}

function sourceRow(s: HarborRpgLootSource) {
  return (
    <li key={`${s.kind}-${s.label.en}`} className="hq-rpg-wiki-source">
      <span>{s.label.en}</span>
      <small lang="zh-HK">{s.label.zh}</small>
      {s.kind === 'drop' && s.zones.length > 0 ? (
        <em>
          Zones:{' '}
          {s.zones.map((z) => HARBOR_RPG_ZONE_META[z].en).join(', ')}
        </em>
      ) : null}
      {s.kind === 'craft' ? (
        <em>
          Inputs:{' '}
          {s.inputs
            .map((i) => `${i.qty}× ${HARBOR_RPG_ITEM_DEFS[i.id].name.en}`)
            .join(', ')}
        </em>
      ) : null}
    </li>
  )
}

export function HarborRpgWiki({ bag, onClose, initial }: Props) {
  const stats = useMemo(() => harborRpgWikiStats(), [])
  const [section, setSection] = useState<HarborRpgWikiSection>(initial?.section ?? 'home')
  const [page, setPage] = useState<HarborRpgWikiPage>(initial ?? { section: 'home', id: 'home' })
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const pages = harborRpgWikiList(section).filter((p) => p.section !== 'home')
    const q = query.trim().toLowerCase()
    if (!q) return pages
    return pages.filter((p) => harborRpgWikiSearchHay(p).includes(q))
  }, [section, query])

  const openPage = (next: HarborRpgWikiPage) => {
    setSection(next.section)
    setPage(next)
  }

  const title = harborRpgWikiPageTitle(page)

  return (
    <div className="hq-rpg-wiki-screen" role="dialog" aria-modal="true" aria-label="HarborRPG Wiki">
      <div className="hq-rpg-wiki-inner">
        <header className="hq-rpg-wiki-header">
          <div className="hq-rpg-wiki-header-copy">
            <p className="hq-visit-kicker">HarborRPG Wiki · 冒險洲百科</p>
            <h2 className="hq-visit-title">{title.en}</h2>
            <p className="hq-visit-body" lang="zh-HK">
              {title.zh}
            </p>
            <p className="hq-rpg-wiki-stats">
              {stats.items} items · {stats.mounts} mounts · {stats.monsters} monsters ·{' '}
              {stats.quests} quests · {stats.achievements} achievements
              {stats.missingItemSources > 0
                ? ` · ⚠ ${stats.missingItemSources} items missing sources`
                : ' · all items have loot sources'}
            </p>
          </div>
          <button type="button" className="hq-btn hq-btn--ghost hq-rpg-wiki-close" onClick={onClose}>
            Close wiki
          </button>
        </header>

        <nav className="hq-rpg-wiki-nav" aria-label="Wiki sections">
          {HARBOR_RPG_WIKI_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`hq-rpg-wiki-nav-btn${section === s.id ? ' is-on' : ''}`}
              onClick={() => {
                setSection(s.id)
                setQuery('')
                if (s.id === 'home') setPage({ section: 'home', id: 'home' })
                else {
                  const first = harborRpgWikiList(s.id).find((p) => p.section !== 'home')
                  if (first) setPage(first)
                }
              }}
            >
              {s.label.en}
            </button>
          ))}
        </nav>

        {section !== 'home' ? (
          <label className="hq-rpg-wiki-search">
            <span>Search {section}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, source, pack…"
              autoComplete="off"
            />
          </label>
        ) : null}

        <div className="hq-rpg-wiki-body">
          {section !== 'home' ? (
            <ul className="hq-rpg-wiki-list" aria-label={`${section} index`}>
              {list.map((p) => {
                const t = harborRpgWikiPageTitle(p)
                const on =
                  page.section === p.section && page.id === (p as { id: string }).id
                return (
                  <li key={`${p.section}:${(p as { id: string }).id}`}>
                    <button
                      type="button"
                      className={`hq-rpg-wiki-list-btn${on ? ' is-on' : ''}`}
                      onClick={() => openPage(p)}
                    >
                      <span>{t.en}</span>
                      <small lang="zh-HK">{t.zh}</small>
                    </button>
                  </li>
                )
              })}
              {list.length === 0 ? <li className="hq-rpg-hint">No matches.</li> : null}
            </ul>
          ) : null}

          <article className="hq-rpg-wiki-article">
            {page.section === 'home' ? (
              <>
                <p>
                  Soft-trust encyclopaedia for HarborRPG. Every item lists where it drops, sells,
                  crafts, or gathers. Mounts and achievements show how to obtain them.
                </p>
                <ul className="hq-rpg-wiki-home-grid">
                  {HARBOR_RPG_WIKI_SECTIONS.filter((s) => s.id !== 'home').map((s) => {
                    const count = harborRpgWikiList(s.id).length
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="hq-rpg-wiki-home-card"
                          onClick={() => {
                            setSection(s.id)
                            const first = harborRpgWikiList(s.id)[0]
                            if (first) setPage(first)
                          }}
                        >
                          <strong>{s.label.en}</strong>
                          <span lang="zh-HK">{s.label.zh}</span>
                          <em>{count} pages</em>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : null}

            {page.section === 'items' ? (
              <>
                {(() => {
                  const d = HARBOR_RPG_ITEM_DEFS[page.id]
                  const sources = harborRpgItemLootSources(page.id)
                  const owned =
                    bag.inventory.some((s) => s.id === page.id) ||
                    bag.bank.some((s) => s.id === page.id) ||
                    Object.values(bag.gear).includes(page.id)
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {d.kind} · {d.rarity} · {d.value}g · power {d.power}
                        {d.craft ? ` · craft:${d.craft}` : ''}
                        {owned ? ' · in bag' : ''}
                      </p>
                      <h3>Loot sources</h3>
                      {sources.length === 0 ? (
                        <p className="hq-rpg-hint">No sources registered — flag for data fix.</p>
                      ) : (
                        <ul className="hq-rpg-wiki-sources">{sources.map(sourceRow)}</ul>
                      )}
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'mounts' ? (
              <>
                {(() => {
                  const d = HARBOR_RPG_MOUNT_DEFS[page.id]
                  const sources = harborRpgMountObtainSources(page.id)
                  const owned = bag.ownedMounts.includes(page.id)
                  const active = bag.activeMountId === page.id
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {d.pack} pack · speed ×{d.speedMult.toFixed(2)} ·{' '}
                        {d.cost === 0 ? 'free' : `${d.cost}g`}
                        {owned ? ' · owned' : ''}
                        {active ? ' · summoned' : ''}
                      </p>
                      <p>{d.blurb.en}</p>
                      <p lang="zh-HK">{d.blurb.zh}</p>
                      <h3>How to obtain</h3>
                      <ul className="hq-rpg-wiki-sources">{sources.map(sourceRow)}</ul>
                      <p className="hq-rpg-hint">
                        Interact with {HARBOR_RPG_STABLE.name.en} in Town, or open the Stable tab.
                      </p>
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'monsters' ? (
              <>
                {(() => {
                  const d = HARBOR_RPG_MONSTER_DEFS[page.id]
                  const zones = Object.entries(HARBOR_RPG_ZONE_SPAWNS)
                    .filter(([, packs]) => packs.some((p) => p.kind === page.id))
                    .map(([z]) => z as keyof typeof HARBOR_RPG_ZONE_META)
                  const kills = bag.kills[page.id] ?? 0
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        HP {d.hp} · ATK {d.atk} · XP {d.xp} · gold {d.gold}
                        {d.boss ? ' · boss' : ''} · kills {kills}
                      </p>
                      <p>
                        Zones:{' '}
                        {zones.length
                          ? zones.map((z) => HARBOR_RPG_ZONE_META[z].en).join(', ')
                          : '—'}
                      </p>
                      <h3>Loot table</h3>
                      <ul className="hq-rpg-wiki-sources">
                        {d.loot.map((row) => (
                          <li key={row.item} className="hq-rpg-wiki-source">
                            <button
                              type="button"
                              className="hq-rpg-wiki-link"
                              onClick={() => openPage({ section: 'items', id: row.item })}
                            >
                              {HARBOR_RPG_ITEM_DEFS[row.item].name.en}
                            </button>
                            <em>
                              {Math.round(row.chance * 100)}% · ×{row.qty}
                            </em>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'zones' ? (
              <>
                {(() => {
                  const meta = HARBOR_RPG_ZONE_META[page.id]
                  const packs = HARBOR_RPG_ZONE_SPAWNS[page.id]
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {meta.instance ? 'Instance' : 'Overworld'}
                      </p>
                      <h3>Spawns</h3>
                      {packs.length === 0 ? (
                        <p className="hq-rpg-hint">Safe hub — no combat packs.</p>
                      ) : (
                        <ul className="hq-rpg-wiki-sources">
                          {packs.map((p) => (
                            <li key={p.kind} className="hq-rpg-wiki-source">
                              <button
                                type="button"
                                className="hq-rpg-wiki-link"
                                onClick={() => openPage({ section: 'monsters', id: p.kind })}
                              >
                                {HARBOR_RPG_MONSTER_DEFS[p.kind].name.en}
                              </button>
                              <em>×{p.count}</em>
                            </li>
                          ))}
                        </ul>
                      )}
                      <h3>Quests here</h3>
                      <ul className="hq-rpg-wiki-sources">
                        {HARBOR_RPG_QUESTS.filter((q) => q.zone === page.id).map((q) => (
                          <li key={q.id} className="hq-rpg-wiki-source">
                            <button
                              type="button"
                              className="hq-rpg-wiki-link"
                              onClick={() => openPage({ section: 'quests', id: q.id })}
                            >
                              {q.name.en}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'quests' ? (
              <>
                {(() => {
                  const q = HARBOR_RPG_QUESTS.find((x) => x.id === page.id)
                  if (!q) return <p>Missing quest.</p>
                  const prog = bag.quests.find((x) => x.id === q.id)
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {HARBOR_RPG_ZONE_META[q.zone].en} · {q.kind} · need {q.need} · +{q.xp} XP · +
                        {q.gold}g
                        {prog?.claimed ? ' · claimed' : prog?.complete ? ' · complete' : ''}
                      </p>
                      <p>{q.blurb.en}</p>
                      <p lang="zh-HK">{q.blurb.zh}</p>
                      {'target' in q && q.target ? (
                        <p>
                          Kill target:{' '}
                          <button
                            type="button"
                            className="hq-rpg-wiki-link"
                            onClick={() =>
                              openPage({ section: 'monsters', id: q.target as never })
                            }
                          >
                            {HARBOR_RPG_MONSTER_DEFS[q.target as keyof typeof HARBOR_RPG_MONSTER_DEFS]
                              ?.name.en ?? String(q.target)}
                          </button>
                        </p>
                      ) : null}
                      {'targetItem' in q && q.targetItem ? (
                        <p>
                          Gather / turn-in:{' '}
                          <button
                            type="button"
                            className="hq-rpg-wiki-link"
                            onClick={() =>
                              openPage({ section: 'items', id: q.targetItem as never })
                            }
                          >
                            {HARBOR_RPG_ITEM_DEFS[q.targetItem as keyof typeof HARBOR_RPG_ITEM_DEFS]
                              .name.en}
                          </button>
                        </p>
                      ) : null}
                      {'requires' in q && q.requires?.length ? (
                        <p className="hq-rpg-hint">
                          Requires: {(q.requires as readonly string[]).join(', ')}
                        </p>
                      ) : null}
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'classes' ? (
              <>
                {(() => {
                  const d = HARBOR_RPG_CLASS_DEFS[page.id]
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {bag.classId === page.id ? 'active · ' : ''}
                        specs: {harborRpgClassSpecLine(page.id)}
                      </p>
                      <p>{d.pitch.en}</p>
                      <p lang="zh-HK">{d.pitch.zh}</p>
                      <h3>How to obtain</h3>
                      <p>Open Class tab in HarborRPG HUD and select {d.name.en}.</p>
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'professions' ? (
              <>
                {(() => {
                  const meta = HARBOR_RPG_PROFESSION_META[page.id]
                  const recipes = HARBOR_RPG_CRAFT_RECIPES.filter((r) => r.profession === page.id)
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {meta.kind} · XP {bag.professions[page.id] ?? 0}
                      </p>
                      {meta.kind === 'gather' ? (
                        <p>
                          Gather nodes in the field (herbs / ore / reeds). Open interact when near a
                          node.
                        </p>
                      ) : (
                        <p>Use Town Craft Bench to craft the recipes below.</p>
                      )}
                      {recipes.length > 0 ? (
                        <>
                          <h3>Recipes</h3>
                          <ul className="hq-rpg-wiki-sources">
                            {recipes.map((r) => (
                              <li key={r.id} className="hq-rpg-wiki-source">
                                <button
                                  type="button"
                                  className="hq-rpg-wiki-link"
                                  onClick={() => openPage({ section: 'items', id: r.output })}
                                >
                                  {HARBOR_RPG_ITEM_DEFS[r.output].name.en}
                                </button>
                                <em>
                                  skill {r.skillNeed} ·{' '}
                                  {r.inputs
                                    .map((i) => `${i.qty}× ${HARBOR_RPG_ITEM_DEFS[i.id].name.en}`)
                                    .join(', ')}
                                </em>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </>
                  )
                })()}
              </>
            ) : null}

            {page.section === 'achievements' ? (
              <>
                {(() => {
                  const d = HARBOR_RPG_ACHIEVEMENTS[page.id]
                  const prog = harborRpgAchievementProgress(bag, page.id)
                  const done = harborRpgAchievementDone(bag, page.id)
                  const pct = Math.min(100, Math.round((prog / Math.max(1, d.target)) * 100))
                  return (
                    <>
                      <p className="hq-rpg-wiki-meta">
                        {d.category}
                        {done ? ' · complete' : ` · ${prog}/${d.target}`}
                      </p>
                      <p>{d.blurb.en}</p>
                      <p lang="zh-HK">{d.blurb.zh}</p>
                      <h3>How to obtain</h3>
                      <p>{d.how.en}</p>
                      <p lang="zh-HK">{d.how.zh}</p>
                      <div
                        className="hq-rpg-wiki-progress"
                        role="progressbar"
                        aria-valuenow={prog}
                        aria-valuemin={0}
                        aria-valuemax={d.target}
                      >
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  )
                })()}
              </>
            ) : null}
          </article>
        </div>
      </div>
    </div>
  )
}
