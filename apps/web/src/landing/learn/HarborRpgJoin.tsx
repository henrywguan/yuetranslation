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
import { harborRpgFallbackBodyId } from './harborRpgLooks'
import { HARBOR_RPG_MAX_CHARS, type HarborRpgBag } from './harborRpgProgress'
import { harborRpgJoinPhase } from './harborRpgJoin'

type CreateStep = 'name' | 'body' | 'class' | 'confirm'

type Props = {
  bag: HarborRpgBag
  onCreate: (input: { name: string; gender: HarborGender; classId: HarborRpgClassId }) => void
  onEnter: (input: { characterId: string; classId: HarborRpgClassId | null }) => void
  onBack: () => void
}

function RpgBodyPreview({ gender }: { gender: HarborGender }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const bodyId = harborRpgFallbackBodyId(gender)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let raf = 0
    let inst: HarborRpgCosmeticInstance | null = null
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x12100e)
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20)
    camera.position.set(1.15, 1.35, 2.35)
    camera.lookAt(0, 0.95, 0)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    scene.add(new THREE.AmbientLight(0xfff4e4, 0.85))
    const sun = new THREE.DirectionalLight(0xffe2b0, 1.15)
    sun.position.set(2, 4, 3)
    scene.add(sun)
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
      inst?.mixer?.update(dt)
      if (inst) inst.root.rotation.y += dt * 0.35
      renderer.render(scene, camera)
    }
    void loadHarborRpgCosmetic(bodyId).then((loaded) => {
      if (disposed) {
        if (loaded) disposeHarborRpgCosmetic(loaded)
        return
      }
      inst = loaded
      if (!inst) return
      scene.add(inst.root)
    })
    loop()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      if (inst) {
        inst.root.parent?.remove(inst.root)
        disposeHarborRpgCosmetic(inst)
      }
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
    }
  }, [bodyId])

  return <div className="hq-rpg-join-preview" ref={hostRef} />
}

export function HarborRpgJoin({ bag, onCreate, onEnter, onBack }: Props) {
  const phase = harborRpgJoinPhase(bag.characters.length)
  const [making, setMaking] = useState(phase === 'create')
  const [step, setStep] = useState<CreateStep>('name')
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [gender, setGender] = useState<HarborGender>('male')
  const [classId, setClassId] = useState<HarborRpgClassId | null>(bag.classId)
  const [pickedId, setPickedId] = useState<string | null>(bag.activeCharacterId ?? bag.characters[0]?.id ?? null)
  const picked = bag.characters.find((c) => c.id === pickedId) ?? bag.characters[0] ?? null
  const previewGender: HarborGender = making ? gender : (picked?.gender ?? 'male')
  const needsClass = !bag.classId

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
    onCreate({ name: name.trim(), gender, classId })
  }

  return (
    <div className="hq-rpg-join" role="dialog" aria-modal="true" aria-label="HarborRPG character">
      <div className="hq-rpg-join-stage">
        <RpgBodyPreview gender={previewGender} />
        <p className="hq-rpg-join-caption">
          Rigged harbor kit · {previewGender === 'female' ? 'female' : 'male'}. Wardrobe outfits unlock with gold after you enter.
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
                <p className="hq-rpg-hint">Body. Both kits are fully rigged and use the animation library.</p>
                <div className="hq-rpg-create-actions">
                  <button
                    type="button"
                    className={`hq-btn${gender === 'male' ? ' hq-btn--solid' : ' hq-btn--ghost'}`}
                    onClick={() => setGender('male')}
                  >
                    Male
                  </button>
                  <button
                    type="button"
                    className={`hq-btn${gender === 'female' ? ' hq-btn--solid' : ' hq-btn--ghost'}`}
                    onClick={() => setGender('female')}
                  >
                    Female
                  </button>
                </div>
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
                  {name.trim()} · {gender === 'female' ? 'Female' : 'Male'} kit · {HARBOR_RPG_CLASS_DEFS[classId].name.en}
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
