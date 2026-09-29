/**
 * HarborRPG character lobby. Create (name, rigged body, class) or pick a sailor, then enter.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { HarborGender } from './harborAppearance'
import {
  HARBOR_RPG_CLASSES,
  HARBOR_RPG_CLASS_DEFS,
  type HarborRpgClassId,
} from './harborRpgClasses'
import {
  disposeHarborRpgCosmetic,
  loadHarborRpgCosmetic,
  type HarborRpgCosmeticInstance,
} from './harborRpgCosmeticRuntime'
import { loadHarborGlb } from './harborGlbAssets'
import {
  harborRpgComposeStarterLook,
  harborRpgDefaultStarterPick,
  harborRpgStarterBottoms,
  harborRpgStarterFeet,
  harborRpgStarterHair,
  harborRpgStarterTops,
  harborRpgWornLayerIds,
  type HarborRpgEquippedLooks,
} from './harborRpgLooks'
import { HARBOR_RPG_COSMETIC_DEFS, type HarborRpgCosmeticId } from './harborRpgCosmetics'
import { HARBOR_RPG_MAX_CHARS, type HarborRpgBag } from './harborRpgProgress'
import { harborRpgJoinPhase } from './harborRpgJoin'

type CreateStep = 'name' | 'body' | 'class' | 'confirm'

type Props = {
  bag: HarborRpgBag
  onCreate: (input: {
    name: string
    gender: HarborGender
    classId: HarborRpgClassId
    looks: HarborRpgEquippedLooks
  }) => void
  onEnter: (input: { characterId: string; classId: HarborRpgClassId | null }) => void
  onBack: () => void
}

/** Night alley behind the rotating sailor. Procedural lanterns stay if a GLB is missing. */
function paperLantern(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'rpg-join-lantern'
  g.userData.joinLantern = true
  const paper = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.28, 12),
    new THREE.MeshLambertMaterial({ color: 0xc4202a, emissive: 0xff2a32, emissiveIntensity: 0.95 }),
  )
  const capMat = new THREE.MeshLambertMaterial({ color: 0x2a1214 })
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.035, 10), capMat)
  capTop.position.y = 0.15
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.03, 10), capMat)
  capBot.position.y = -0.15
  const tassel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.02, 0.12, 6),
    new THREE.MeshLambertMaterial({ color: 0x6a1018 }),
  )
  tassel.position.y = -0.24
  const light = new THREE.PointLight(0xff3038, 1.55, 3.6, 2)
  g.add(paper, capTop, capBot, tassel, light)
  return g
}

function hangLantern(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.42, 4),
    new THREE.MeshLambertMaterial({ color: 0x1a1012 }),
  )
  cord.position.set(x, y + 0.2, z)
  const lantern = paperLantern()
  lantern.position.set(x, y, z)
  parent.add(cord, lantern)
  return lantern
}

function windowGlow(x: number, y: number, z: number): THREE.Mesh {
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.36),
    new THREE.MeshBasicMaterial({ color: 0xff4030, transparent: true, opacity: 0.82 }),
  )
  glow.position.set(x, y, z)
  return glow
}

async function placeJoinBuilding(
  scene: THREE.Scene,
  file: string,
  x: number,
  z: number,
  height: number,
  rot: number,
  alive: () => boolean,
): Promise<void> {
  const g = await loadHarborGlb(file, { targetHeight: height, name: 'rpg-join-building' })
  if (!g || !alive()) return
  g.position.set(x, 0, z)
  g.rotation.y = rot
  scene.add(g)
}

function dressJoinStreet(scene: THREE.Scene, alive: () => boolean): THREE.Group[] {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 28),
    new THREE.MeshLambertMaterial({ color: 0x161014 }),
  )
  ground.rotation.x = -Math.PI / 2
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x24161c }),
  )
  path.rotation.x = -Math.PI / 2
  path.position.y = 0.012
  const wire = new THREE.Mesh(
    new THREE.BoxGeometry(5.4, 0.02, 0.02),
    new THREE.MeshLambertMaterial({ color: 0x140c0e }),
  )
  wire.position.set(0, 2.62, -0.35)
  scene.add(ground, path, wire)
  const lanterns = [
    hangLantern(scene, -1.35, 2.15, 0.55),
    hangLantern(scene, 1.2, 2.28, 0.15),
    hangLantern(scene, -0.15, 2.42, -1.15),
    hangLantern(scene, -2.05, 2.2, -1.55),
    hangLantern(scene, 2.15, 2.12, -1.35),
    hangLantern(scene, 0.35, 2.55, -2.7),
  ]
  scene.add(
    windowGlow(-2.35, 1.35, -1.15),
    windowGlow(2.25, 1.5, -1.25),
    windowGlow(-0.35, 1.7, -3.35),
    windowGlow(1.15, 1.45, -3.2),
  )
  const buildings: Array<[string, number, number, number, number]> = [
    ['v2/house-village.glb', -2.55, -2.15, 2.55, 0.45],
    ['v2/house-village.glb', 2.6, -2.35, 2.7, -0.4],
    ['v2/outfitter.glb', 0.15, -4.15, 3.15, 0.05],
    ['v2/stall-market.glb', -1.85, -3.15, 1.55, 0.3],
    ['v2/save-shack.glb', 2.15, -3.7, 2.45, -0.2],
  ]
  for (const [file, x, z, height, rot] of buildings) {
    void placeJoinBuilding(scene, file, x, z, height, rot, alive)
  }
  return lanterns
}

function disposeJoinProps(scene: THREE.Scene) {
  const geos = new Set<THREE.BufferGeometry>()
  const mats = new Set<THREE.Material>()
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || mesh.userData.harborGlbMesh) return
    if (mesh.geometry) geos.add(mesh.geometry)
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of list) if (mat) mats.add(mat)
  })
  for (const geo of geos) geo.dispose()
  for (const mat of mats) mat.dispose()
}

function RpgLookPreview({ looks }: { looks: HarborRpgEquippedLooks }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const sailorsRef = useRef<HarborRpgCosmeticInstance[]>([])
  const pieceKey = [looks.body, ...harborRpgWornLayerIds(looks)].join('|')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let raf = 0
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0c0608)
    scene.fog = new THREE.FogExp2(0x10060a, 0.065)
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)
    camera.position.set(0.9, 1.38, 3.55)
    camera.lookAt(0, 0.95, -0.6)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    scene.add(new THREE.AmbientLight(0x4a2024, 0.55))
    const key = new THREE.DirectionalLight(0xffe6d4, 1.05)
    key.position.set(1.6, 3.2, 2.6)
    scene.add(key)
    const redFill = new THREE.DirectionalLight(0xff2230, 0.38)
    redFill.position.set(-2.2, 1.6, -1.2)
    scene.add(redFill)
    const lanterns = dressJoinStreet(scene, () => !disposed && sceneRef.current === scene)
    const size = () => {
      const w = Math.max(1, host.clientWidth)
      const h = Math.max(1, host.clientHeight)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    size()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null
    ro?.observe(host)
    const clock = new THREE.Clock()
    const loop = () => {
      if (disposed) return
      raf = requestAnimationFrame(loop)
      const dt = clock.getDelta()
      const t = clock.elapsedTime
      const insts = sailorsRef.current
      const leader = insts[0]
      if (leader) {
        leader.mixer?.update(dt)
        leader.root.rotation.y += dt * 0.35
      }
      for (const inst of insts.slice(1)) {
        if (leader) {
          inst.root.rotation.y = leader.root.rotation.y
          lockTime(leader, inst)
        }
        inst.mixer?.update(0)
      }
      for (const lantern of lanterns) {
        const sway = Math.sin(t * 0.85 + lantern.position.x * 2.2) * 0.07
        lantern.rotation.z = sway
        const bulb = lantern.children.find((c) => (c as THREE.PointLight).isPointLight) as THREE.PointLight | undefined
        if (bulb) bulb.intensity = 1.35 + Math.sin(t * 1.7 + lantern.position.x * 3) * 0.4
      }
      renderer.render(scene, camera)
    }
    loop()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      disposeJoinProps(scene)
      renderer.dispose()
      sceneRef.current = null
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    let cancelled = false
    const ids = pieceKey.split('|').filter((id): id is HarborRpgCosmeticId => Boolean(id))
    void Promise.all(ids.map((id) => loadHarborRpgCosmetic(id))).then((loaded) => {
      if (cancelled || sceneRef.current !== scene) {
        for (const inst of loaded) if (inst) disposeHarborRpgCosmetic(inst)
        return
      }
      for (const old of sailorsRef.current) {
        old.root.parent?.remove(old.root)
        disposeHarborRpgCosmetic(old)
      }
      const next: HarborRpgCosmeticInstance[] = []
      for (const inst of loaded) {
        if (!inst) continue
        inst.root.userData.joinSailor = true
        scene.add(inst.root)
        next.push(inst)
      }
      sailorsRef.current = next
    })
    return () => {
      cancelled = true
      for (const inst of sailorsRef.current) {
        inst.root.parent?.remove(inst.root)
        disposeHarborRpgCosmetic(inst)
      }
      sailorsRef.current = []
    }
  }, [pieceKey])

  return <div className="hq-rpg-join-preview" ref={hostRef} />
}

function lockTime(leader: HarborRpgCosmeticInstance, follower: HarborRpgCosmeticInstance) {
  if (!leader.action || !follower.mixer) return
  const name = leader.action.getClip().name
  if (!follower.action || follower.action.getClip().name !== name) {
    const clip = follower.clips.find((c) => c.name === name)
    if (!clip) return
    const next = follower.mixer.clipAction(clip)
    next.reset()
    next.setLoop(THREE.LoopRepeat, Infinity)
    next.play()
    follower.action = next
  }
  if (follower.action) follower.action.time = leader.action.time
}

function pieceName(id: string | null | undefined): string | null {
  if (!id) return null
  const def = HARBOR_RPG_COSMETIC_DEFS[id as HarborRpgCosmeticId]
  return def?.name.en ?? null
}

function chipOf(id: HarborRpgCosmeticId): { id: HarborRpgCosmeticId; label: string } {
  return { id, label: HARBOR_RPG_COSMETIC_DEFS[id].name.en }
}

function LookRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: HarborRpgCosmeticId | null; label: string }[]
  value: HarborRpgCosmeticId | null
  onChange: (id: HarborRpgCosmeticId | null) => void
}) {
  return (
    <div>
      <p className="hq-rpg-join-row-label">{label}</p>
      <div className="hq-rpg-join-row">
        {options.map((opt) => (
          <button
            key={`${label}-${opt.label}`}
            type="button"
            className={`hq-rpg-join-chip${value === opt.id ? ' is-on' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function HarborRpgJoin({ bag, onCreate, onEnter, onBack }: Props) {
  const phase = harborRpgJoinPhase(bag.characters.length)
  const [making, setMaking] = useState(phase === 'create')
  const [step, setStep] = useState<CreateStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [gender, setGender] = useState<HarborGender>('male')
  const [pick, setPick] = useState(() => harborRpgDefaultStarterPick('male'))
  const [classId, setClassId] = useState<HarborRpgClassId | null>(bag.classId)
  const [pickedId, setPickedId] = useState<string | null>(bag.activeCharacterId ?? bag.characters[0]?.id ?? null)
  const picked = bag.characters.find((c) => c.id === pickedId) ?? bag.characters[0] ?? null
  const previewGender: HarborGender = making ? gender : (picked?.gender ?? 'male')
  const draftLooks = harborRpgComposeStarterLook(gender, pick)
  const previewLooks =
    making
      ? draftLooks
      : (picked?.looks ??
        harborRpgComposeStarterLook(previewGender, harborRpgDefaultStarterPick(previewGender)))
  const needsClass = !bag.classId
  const chooseGender = (next: HarborGender) => {
    setGender(next)
    setPick(harborRpgDefaultStarterPick(next))
  }

  const acceptName = () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setNameError('Use at least two letters.')
      return
    }
    const taken = bag.characters.some((c) => c.name.trim().toLowerCase() === trimmed.toLowerCase())
    if (taken) {
      setNameError('That name is already on the roster.')
      return
    }
    setName(trimmed)
    setNameError(null)
    setStep('body')
  }

  const finishCreate = () => {
    if (!classId) return
    onCreate({ name: name.trim(), gender, classId, looks: harborRpgComposeStarterLook(gender, pick) })
  }

  return (
    <div className="hq-rpg-join" role="dialog" aria-modal="true" aria-label="HarborRPG character">
      <div className="hq-rpg-join-stage">
        <RpgLookPreview looks={previewLooks} />
        <p className="hq-rpg-join-caption">
          {pieceName(previewLooks.head) ?? 'Bare'} · {pieceName(previewLooks.top)} · {pieceName(previewLooks.bottom)} · {pieceName(previewLooks.feet)}
        </p>
      </div>
      <div className="hq-rpg-join-sheet">
        <p className="hq-rpg-join-kicker">HarborRPG</p>
        <h2>{making ? 'Create your sailor' : 'Choose a sailor'}</h2>
        {making ? (
          <>
            {step === 'name' ? (
              <form
                className="hq-rpg-create"
                onSubmit={(e) => {
                  e.preventDefault()
                  acceptName()
                }}
              >
                <label className="hq-rpg-create-label">
                  Name
                  <input
                    className="hq-rpg-create-input"
                    value={name}
                    autoFocus
                    maxLength={20}
                    onChange={(e) => {
                      setName(e.target.value)
                      setNameError(null)
                    }}
                  />
                </label>
                {nameError ? <p className="hq-rpg-join-error">{nameError}</p> : null}
                <div className="hq-rpg-create-actions">
                  <button type="submit" className="hq-btn hq-btn--solid">
                    Next
                  </button>
                </div>
              </form>
            ) : null}
            {step === 'body' ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">Body, hair, tunic, trousers, and shoes. Sleeves follow the tunic.</p>
                <div className="hq-rpg-join-row">
                  <button type="button" className={`hq-rpg-join-chip${gender === 'male' ? ' is-on' : ''}`} onClick={() => chooseGender('male')}>
                    Male
                  </button>
                  <button type="button" className={`hq-rpg-join-chip${gender === 'female' ? ' is-on' : ''}`} onClick={() => chooseGender('female')}>
                    Female
                  </button>
                </div>
                <LookRow
                  label="Hair"
                  options={harborRpgStarterHair(gender).map((row) => ({ id: row.id, label: row.label }))}
                  value={pick.hair}
                  onChange={(id) => setPick((prev) => ({ ...prev, hair: id }))}
                />
                <LookRow
                  label="Top"
                  options={harborRpgStarterTops(gender).map(chipOf)}
                  value={pick.top}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, top: id }))
                  }}
                />
                <LookRow
                  label="Bottom"
                  options={harborRpgStarterBottoms(gender).map(chipOf)}
                  value={pick.bottom}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, bottom: id }))
                  }}
                />
                <LookRow
                  label="Shoes"
                  options={harborRpgStarterFeet(gender).map(chipOf)}
                  value={pick.feet}
                  onChange={(id) => {
                    if (!id) return
                    setPick((prev) => ({ ...prev, feet: id }))
                  }}
                />
                <div className="hq-rpg-create-actions">
                  <button type="button" className="hq-btn hq-btn--solid" onClick={() => setStep(needsClass ? 'class' : 'confirm')}>
                    Next
                  </button>
                  <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setStep('name')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}
            {step === 'class' ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">Class. This is the adventure’s class. Specs stay in the Class tab after you enter.</p>
                <ul className="hq-rpg-join-classes">
                  {HARBOR_RPG_CLASSES.map((id) => {
                    const def = HARBOR_RPG_CLASS_DEFS[id]
                    const on = classId === id
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`hq-rpg-join-class${on ? ' is-on' : ''}`}
                          onClick={() => setClassId(id)}
                        >
                          <strong>{def.name.en}</strong>{' '}
                          <span lang="zh-HK">{def.name.zh}</span>
                          <small>
                            {def.role} · {def.pitch.en}
                          </small>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="hq-rpg-create-actions">
                  <button
                    type="button"
                    className="hq-btn hq-btn--solid"
                    disabled={!classId}
                    onClick={() => setStep('confirm')}
                  >
                    Next
                  </button>
                  <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setStep('body')}>
                    Back
                  </button>
                </div>
              </div>
            ) : null}
            {step === 'confirm' && classId ? (
              <div className="hq-rpg-join-choices">
                <p className="hq-rpg-hint">
                  {name.trim()} · {gender === 'female' ? 'Female' : 'Male'} · {pieceName(pick.hair) ?? 'Bare'} · {pieceName(pick.top)} · {HARBOR_RPG_CLASS_DEFS[classId].name.en}
                </p>
                <div className="hq-rpg-create-actions">
                  <button type="button" className="hq-btn hq-btn--solid" onClick={finishCreate}>
                    Enter the harbor
                  </button>
                  <button
                    type="button"
                    className="hq-btn hq-btn--ghost"
                    onClick={() => setStep(needsClass ? 'class' : 'body')}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="hq-rpg-join-choices">
            <div className="hq-rpg-chars">
              {bag.characters.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`hq-rpg-char${c.id === pickedId ? ' is-on' : ''}`}
                  onClick={() => setPickedId(c.id)}
                >
                  {c.name}
                </button>
              ))}
              {bag.characters.length < HARBOR_RPG_MAX_CHARS ? (
                <button
                  type="button"
                  className="hq-rpg-char hq-rpg-char--new"
                  onClick={() => {
                    setMaking(true)
                    setStep('name')
                    setName('')
                  }}
                >
                  + New
                </button>
              ) : null}
            </div>
            {needsClass ? (
              <>
                <p className="hq-rpg-hint">Choose a class before entering.</p>
                <ul className="hq-rpg-join-classes">
                  {HARBOR_RPG_CLASSES.map((id) => {
                    const def = HARBOR_RPG_CLASS_DEFS[id]
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`hq-rpg-join-class${classId === id ? ' is-on' : ''}`}
                          onClick={() => setClassId(id)}
                        >
                          <strong>{def.name.en}</strong> · {def.role}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </>
            ) : (
              <p className="hq-rpg-hint">
                {HARBOR_RPG_CLASS_DEFS[bag.classId!].name.en} · enter with {picked?.name ?? 'your sailor'}.
              </p>
            )}
            <div className="hq-rpg-create-actions">
              <button
                type="button"
                className="hq-btn hq-btn--solid"
                disabled={!picked || (needsClass && !classId)}
                onClick={() => {
                  if (!picked) return
                  onEnter({ characterId: picked.id, classId: needsClass ? classId : bag.classId })
                }}
              >
                Enter the harbor
              </button>
            </div>
          </div>
        )}
        <div className="hq-rpg-create-actions">
          {making && phase === 'select' ? (
            <button type="button" className="hq-btn hq-btn--ghost" onClick={() => setMaking(false)}>
              Sailors
            </button>
          ) : null}
          <button type="button" className="hq-btn hq-btn--ghost" onClick={onBack}>
            Back to the voyage
          </button>
        </div>
      </div>
    </div>
  )
}
