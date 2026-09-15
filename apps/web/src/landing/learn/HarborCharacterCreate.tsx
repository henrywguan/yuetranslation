import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { saveUsername } from '../../lib/api'
import {
  HARBOR_DEFAULT_APPEARANCE,
  HARBOR_HAIR_COLORS,
  HARBOR_HAIR_STYLE_LABEL,
  HARBOR_HAIR_STYLES,
  HARBOR_SKIN_TONES,
  harborUsernameHint,
  normalizeHarborUsernameInput,
  type HarborAppearance,
  type HarborGender,
} from './harborAppearance'
import {
  HARBOR_DEFAULT_LOOK,
  applyLookToProtagonist,
  harborGearForSlot,
  type HarborLook,
} from './harborGear'
import { buildHarborProtagonist } from './harborProtagonist'

export type HarborCharacterCreateResult = {
  username: string
  gender: HarborGender
  appearance: HarborAppearance
  look: HarborLook
  /** True when username was saved to Account Hub (signed-in). */
  savedAccountUsername: boolean
}

type Props = {
  existingUsername?: string | null
  signedIn: boolean
  /** full = first create; username-only = claim a name; barber = restyle at the shop. */
  mode?: 'full' | 'username-only' | 'barber'
  initialGender?: HarborGender
  initialAppearance?: HarborAppearance
  initialLook?: HarborLook
  onComplete: (result: HarborCharacterCreateResult) => void
  onCancel?: () => void
}

type Step = 'name' | 'body' | 'design' | 'confirm'

const FREE_TOPS = harborGearForSlot('top').filter((g) => g.price === 0 || g.tier === 'common')
const FREE_BOTTOMS = harborGearForSlot('bottom').filter((g) => g.price === 0 || g.tier === 'common')
const FREE_SHOES = harborGearForSlot('shoes').filter((g) => g.price === 0 || g.tier === 'common')
const FREE_HATS = harborGearForSlot('hat').filter((g) => g.price === 0 || g.tier === 'common')

function cycleIndex(length: number, index: number, dir: -1 | 1): number {
  if (length <= 0) return 0
  return (index + dir + length * 8) % length
}

/**
 * First-time Harbor Quest character creation — OSRS-style arrow rows + gender,
 * Harbor jade/ink palette. Blocks the river until Accept.
 */
export function HarborCharacterCreate({
  existingUsername,
  signedIn,
  mode = 'full',
  initialGender,
  initialAppearance,
  initialLook,
  onComplete,
  onCancel,
}: Props) {
  const isBarber = mode === 'barber'
  const needsName = !isBarber && !existingUsername?.trim()
  const [step, setStep] = useState<Step>(() => {
    if (isBarber) return 'body'
    if (needsName || mode === 'username-only') return 'name'
    return 'body'
  })
  const [username, setUsername] = useState(existingUsername?.trim() ?? '')
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [gender, setGender] = useState<HarborGender>(initialGender ?? 'male')
  const [appearance, setAppearance] = useState<HarborAppearance>({
    ...(initialAppearance ?? HARBOR_DEFAULT_APPEARANCE),
  })
  const seedLook = initialLook ?? HARBOR_DEFAULT_LOOK
  const [topIdx, setTopIdx] = useState(() =>
    Math.max(0, FREE_TOPS.findIndex((g) => g.id === seedLook.top)),
  )
  const [bottomIdx, setBottomIdx] = useState(() =>
    Math.max(0, FREE_BOTTOMS.findIndex((g) => g.id === seedLook.bottom)),
  )
  const [shoesIdx, setShoesIdx] = useState(() =>
    Math.max(0, FREE_SHOES.findIndex((g) => g.id === seedLook.shoes)),
  )
  const [hatIdx, setHatIdx] = useState(() =>
    Math.max(0, FREE_HATS.findIndex((g) => g.id === seedLook.hat)),
  )
  const [hatOn, setHatOn] = useState(() => FREE_HATS.some((g) => g.id === seedLook.hat))

  const look = useMemo(() => {
    const next: HarborLook = { ...HARBOR_DEFAULT_LOOK }
    if (hatOn && FREE_HATS[hatIdx]) next.hat = FREE_HATS[hatIdx]!.id as HarborLook['hat']
    if (FREE_TOPS[topIdx]) next.top = FREE_TOPS[topIdx]!.id as HarborLook['top']
    if (FREE_BOTTOMS[bottomIdx]) next.bottom = FREE_BOTTOMS[bottomIdx]!.id as HarborLook['bottom']
    if (FREE_SHOES[shoesIdx]) next.shoes = FREE_SHOES[shoesIdx]!.id as HarborLook['shoes']
    return next
  }, [hatOn, hatIdx, topIdx, bottomIdx, shoesIdx])

  const previewRef = useRef<HTMLDivElement>(null)
  const previewState = useRef({ gender, appearance, look, hatOn })
  previewState.current = { gender, appearance, look, hatOn }

  useEffect(() => {
    const host = previewRef.current
    if (!host || mode === 'username-only') return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1c24)
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    host.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.1))
    const key = new THREE.DirectionalLight(0xfff5e6, 1.25)
    key.position.set(2.2, 3.5, 2)
    scene.add(key)
    scene.add(new THREE.HemisphereLight(0xa8e8ff, 0x2a4a38, 0.5))

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.05, 24),
      new THREE.MeshLambertMaterial({ color: 0x143038, flatShading: true }),
    )
    floor.rotation.x = -Math.PI / 2
    scene.add(floor)

    let scout = buildHarborProtagonist({
      pose: 'standing',
      gender: previewState.current.gender,
      appearance: previewState.current.appearance,
      bareHead: !previewState.current.hatOn,
    })
    applyLookToProtagonist(scout, previewState.current.look)
    scene.add(scout)

    let yaw = 0.35
    let raf = 0
    let disposed = false

    const size = () => {
      const w = Math.max(220, host.clientWidth || 280)
      const h = Math.max(260, host.clientHeight || 320)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    size()

    const rebuild = () => {
      scene.remove(scout)
      scout.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | THREE.Material[]
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
        else mat?.dispose()
      })
      scout = buildHarborProtagonist({
        pose: 'standing',
        gender: previewState.current.gender,
        appearance: previewState.current.appearance,
        bareHead: !previewState.current.hatOn,
      })
      applyLookToProtagonist(scout, previewState.current.look)
      scene.add(scout)
    }

    const paint = () => {
      if (disposed) return
      raf = requestAnimationFrame(paint)
      yaw += 0.012
      const d = 3.1
      camera.position.set(Math.sin(yaw) * d, 1.25, Math.cos(yaw) * d)
      camera.lookAt(0, 0.82, 0)
      renderer.render(scene, camera)
    }
    paint()

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(size) : null
    ro?.observe(host)
    const onVis = () => rebuild()
    host.addEventListener('hq-preview-rebuild', onVis)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      host.removeEventListener('hq-preview-rebuild', onVis)
      ro?.disconnect()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [mode])

  useEffect(() => {
    previewRef.current?.dispatchEvent(new Event('hq-preview-rebuild'))
  }, [gender, appearance, look, hatOn])

  const hairStyleIndex = Math.max(0, HARBOR_HAIR_STYLES.indexOf(appearance.hairStyle))

  const bumpAppearance = (patch: Partial<HarborAppearance>) => {
    setAppearance((a) => ({ ...a, ...patch }))
  }

  const validateName = (): string | null => {
    const normalized = normalizeHarborUsernameInput(username)
    if (!normalized) {
      setNameError(`Pick a sailor name — ${harborUsernameHint()}`)
      return null
    }
    setNameError(null)
    return normalized
  }

  const finish = async () => {
    const normalized = isBarber
      ? (existingUsername?.trim() || normalizeHarborUsernameInput(username) || 'sailor')
      : needsName || mode === 'username-only'
        ? validateName()
        : normalizeHarborUsernameInput(username) ?? existingUsername?.trim() ?? null
    if (!normalized) {
      setStep('name')
      return
    }
    setBusy(true)
    setNameError(null)
    let savedAccountUsername = false
    try {
      if (!isBarber && signedIn && (needsName || mode === 'username-only')) {
        await saveUsername(normalized)
        savedAccountUsername = true
      }
      onComplete({
        username: normalized,
        gender,
        appearance,
        look,
        savedAccountUsername,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save username'
      setNameError(message)
      setStep('name')
      setBusy(false)
    }
  }

  const stepTitle = isBarber
    ? step === 'body'
      ? 'Barber chair · pick a form'
      : step === 'design'
        ? 'Fresh cut & colors'
        : 'Love the new look?'
    : step === 'name'
      ? 'Choose your sailor name'
      : step === 'body'
        ? 'Choose your form'
        : step === 'design'
          ? 'Design your River Scout'
          : 'Ready for the harbor?'

  const stepZh = isBarber
    ? step === 'body'
      ? '理髮椅 · 選外形'
      : step === 'design'
        ? '新髮型與膚色'
        : '滿意新造型？'
    : step === 'name'
      ? '選水手名'
      : step === 'body'
        ? '選外形'
        : step === 'design'
          ? '設計河上偵察'
          : '準備出航？'

  const steps: Step[] =
    mode === 'username-only' ? ['name'] : isBarber ? ['body', 'design', 'confirm'] : ['name', 'body', 'design', 'confirm']

  return (
    <div className="hq-charcreate" role="dialog" aria-modal="true" aria-label="Harbor character creation">
      <div className="hq-charcreate-wash" aria-hidden="true" />
      <div className="hq-charcreate-frame">
        <header className="hq-charcreate-head">
          <p className="hq-charcreate-kicker">{isBarber ? 'Harbor Barber · 港灣理髮' : 'Harbor Quest'}</p>
          <h1 className="hq-charcreate-title">{stepTitle}</h1>
          <p className="hq-charcreate-title-zh" lang="zh-HK">
            {stepZh}
          </p>
          <ol className="hq-charcreate-steps" aria-label="Creation steps">
            {steps.map((s) => (
              <li key={s} className={step === s ? 'is-on' : ''} aria-current={step === s ? 'step' : undefined}>
                {s === 'name' ? 'Name' : s === 'body' ? 'Body' : s === 'design' ? 'Look' : 'Sail'}
              </li>
            ))}
          </ol>
        </header>

        <div className={`hq-charcreate-body${mode === 'username-only' ? ' is-name-only' : ''}`}>
          {mode !== 'username-only' ? (
            <div className="hq-charcreate-preview" ref={previewRef} aria-hidden="true" />
          ) : null}

          <div className="hq-charcreate-panel">
            {step === 'name' ? (
              <div className="hq-charcreate-block">
                <label className="hq-charcreate-label" htmlFor="hq-char-username">
                  Sailor name
                </label>
                <input
                  id="hq-char-username"
                  className="hq-charcreate-input"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setNameError(null)
                  }}
                  maxLength={24}
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                  placeholder="e.g. JadeFerry"
                  disabled={busy}
                />
                <p className="hq-charcreate-hint">{harborUsernameHint()}</p>
                {nameError ? (
                  <p className="hq-charcreate-error" role="alert">
                    {nameError}
                  </p>
                ) : (
                  <p className="hq-charcreate-hint">
                    {signedIn
                      ? 'Saved to your Account Hub — other sailors will see this above your head.'
                      : 'Stored on this device for Harbor Quest. Sign in later to claim it across devices.'}
                  </p>
                )}
              </div>
            ) : null}

            {step === 'body' ? (
              <div className="hq-charcreate-block">
                <p className="hq-charcreate-label">Body</p>
                <div className="hq-charcreate-gender">
                  <button
                    type="button"
                    className={`hq-charcreate-gender-btn${gender === 'male' ? ' is-on' : ''}`}
                    onClick={() => setGender('male')}
                  >
                    <span className="hq-charcreate-gender-en">Male</span>
                    <span className="hq-charcreate-gender-zh" lang="zh-HK">
                      男
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`hq-charcreate-gender-btn${gender === 'female' ? ' is-on' : ''}`}
                    onClick={() => setGender('female')}
                  >
                    <span className="hq-charcreate-gender-en">Female</span>
                    <span className="hq-charcreate-gender-zh" lang="zh-HK">
                      女
                    </span>
                  </button>
                </div>
                <p className="hq-charcreate-hint">Looks come next — body choice shapes the Scout silhouette.</p>
              </div>
            ) : null}

            {step === 'design' ? (
              <div className="hq-charcreate-block hq-charcreate-block--rows">
                <ArrowRow
                  label="Head"
                  value={HARBOR_HAIR_STYLE_LABEL[appearance.hairStyle].en}
                  onPrev={() =>
                    bumpAppearance({
                      hairStyle: HARBOR_HAIR_STYLES[cycleIndex(HARBOR_HAIR_STYLES.length, hairStyleIndex, -1)]!,
                    })
                  }
                  onNext={() =>
                    bumpAppearance({
                      hairStyle: HARBOR_HAIR_STYLES[cycleIndex(HARBOR_HAIR_STYLES.length, hairStyleIndex, 1)]!,
                    })
                  }
                />
                <SwatchRow
                  label="Skin"
                  colors={HARBOR_SKIN_TONES}
                  index={appearance.skinTone}
                  onPrev={() =>
                    bumpAppearance({ skinTone: cycleIndex(HARBOR_SKIN_TONES.length, appearance.skinTone, -1) })
                  }
                  onNext={() =>
                    bumpAppearance({ skinTone: cycleIndex(HARBOR_SKIN_TONES.length, appearance.skinTone, 1) })
                  }
                />
                <SwatchRow
                  label="Hair"
                  colors={HARBOR_HAIR_COLORS}
                  index={appearance.hairColor}
                  onPrev={() =>
                    bumpAppearance({ hairColor: cycleIndex(HARBOR_HAIR_COLORS.length, appearance.hairColor, -1) })
                  }
                  onNext={() =>
                    bumpAppearance({ hairColor: cycleIndex(HARBOR_HAIR_COLORS.length, appearance.hairColor, 1) })
                  }
                />
                <ArrowRow
                  label="Hat"
                  value={hatOn ? (FREE_HATS[hatIdx]?.name.en ?? 'Hat') : 'None'}
                  onPrev={() => {
                    if (!hatOn) {
                      setHatOn(true)
                      return
                    }
                    if (hatIdx === 0) setHatOn(false)
                    else setHatIdx((i) => cycleIndex(FREE_HATS.length, i, -1))
                  }}
                  onNext={() => {
                    if (!hatOn) {
                      setHatOn(true)
                      return
                    }
                    if (hatIdx >= FREE_HATS.length - 1) setHatOn(false)
                    else setHatIdx((i) => cycleIndex(FREE_HATS.length, i, 1))
                  }}
                />
                <ArrowRow
                  label="Shirt"
                  value={FREE_TOPS[topIdx]?.name.en ?? 'Top'}
                  onPrev={() => setTopIdx((i) => cycleIndex(FREE_TOPS.length, i, -1))}
                  onNext={() => setTopIdx((i) => cycleIndex(FREE_TOPS.length, i, 1))}
                />
                <ArrowRow
                  label="Legs"
                  value={FREE_BOTTOMS[bottomIdx]?.name.en ?? 'Bottom'}
                  onPrev={() => setBottomIdx((i) => cycleIndex(FREE_BOTTOMS.length, i, -1))}
                  onNext={() => setBottomIdx((i) => cycleIndex(FREE_BOTTOMS.length, i, 1))}
                />
                <ArrowRow
                  label="Boots"
                  value={FREE_SHOES[shoesIdx]?.name.en ?? 'Shoes'}
                  onPrev={() => setShoesIdx((i) => cycleIndex(FREE_SHOES.length, i, -1))}
                  onNext={() => setShoesIdx((i) => cycleIndex(FREE_SHOES.length, i, 1))}
                />
              </div>
            ) : null}

            {step === 'confirm' ? (
              <div className="hq-charcreate-block">
                <p className="hq-charcreate-confirm-name">{username.trim() || 'Sailor'}</p>
                <p className="hq-charcreate-hint">
                  {gender === 'female' ? 'Female' : 'Male'} River Scout ·{' '}
                  {HARBOR_HAIR_STYLE_LABEL[appearance.hairStyle].en}
                </p>
                <p className="hq-charcreate-hint">
                  Accept to step onto the pier. Outfitter &amp; Save Shack can refine gear later.
                </p>
              </div>
            ) : null}

            <div className="hq-charcreate-actions">
              {step !== 'name' && mode !== 'username-only' ? (
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  disabled={busy}
                  onClick={() =>
                    setStep(
                      step === 'confirm' ? 'design' : step === 'design' ? 'body' : isBarber ? 'body' : 'name',
                    )
                  }
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              {isBarber && onCancel ? (
                <button
                  type="button"
                  className="hq-btn hq-btn--ghost"
                  disabled={busy}
                  onClick={onCancel}
                >
                  Leave chair
                </button>
              ) : null}
              {step === 'confirm' || (mode === 'username-only' && step === 'name') ? (
                <button
                  type="button"
                  className="hq-btn hq-btn--primary hq-charcreate-accept"
                  disabled={busy}
                  onClick={() => void finish()}
                >
                  {busy ? 'Saving…' : isBarber ? 'Done · 完成' : 'Accept'}
                </button>
              ) : (
                <button
                  type="button"
                  className="hq-btn hq-btn--primary"
                  disabled={busy}
                  onClick={() => {
                    if (step === 'name') {
                      if (!validateName()) return
                      setStep('body')
                      return
                    }
                    if (step === 'body') setStep('design')
                    else if (step === 'design') setStep('confirm')
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ArrowRow({
  label,
  value,
  onPrev,
  onNext,
}: {
  label: string
  value: string
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="hq-charcreate-row">
      <span className="hq-charcreate-row-label">{label}</span>
      <button type="button" className="hq-charcreate-arrow" onClick={onPrev} aria-label={`Previous ${label}`}>
        ‹
      </button>
      <span className="hq-charcreate-row-value">{value}</span>
      <button type="button" className="hq-charcreate-arrow" onClick={onNext} aria-label={`Next ${label}`}>
        ›
      </button>
    </div>
  )
}

function SwatchRow({
  label,
  colors,
  index,
  onPrev,
  onNext,
}: {
  label: string
  colors: readonly number[]
  index: number
  onPrev: () => void
  onNext: () => void
}) {
  const hex = `#${(colors[index] ?? 0xe8c4a8).toString(16).padStart(6, '0')}`
  return (
    <div className="hq-charcreate-row">
      <span className="hq-charcreate-row-label">{label}</span>
      <button type="button" className="hq-charcreate-arrow" onClick={onPrev} aria-label={`Previous ${label}`}>
        ‹
      </button>
      <span className="hq-charcreate-swatch" style={{ background: hex }} title={hex} />
      <button type="button" className="hq-charcreate-arrow" onClick={onNext} aria-label={`Next ${label}`}>
        ›
      </button>
    </div>
  )
}
