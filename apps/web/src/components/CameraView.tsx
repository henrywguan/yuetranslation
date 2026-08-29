import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CameraArSession } from './CameraArSession'
import { CameraChoiceModal } from './CameraChoiceModal'
import { CameraDocSession } from './CameraDocSession'
import { CameraUploadEditor } from './CameraUploadEditor'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import { createCameraHeartbeat } from '../lib/camera/heartbeat'
import type { CameraTarget, CamPath } from '../lib/camera/types'
import { openAuthScreen } from '../lib/auth'
import { useYueStore } from '../lib/store'
import { biPlain, ui } from '../lib/uiCopy'
import './camera.css'

type Props = {
  /** When true, show the AR/Upload choice modal. */
  choiceOpen: boolean
  onChoiceOpenChange: (open: boolean) => void
  onLeaveCamera: () => void
}

export function CameraView({ choiceOpen, onChoiceOpenChange, onLeaveCamera }: Props) {
  const entitlement = useYueStore((s) => s.entitlement)
  const setEntitlement = useCallback((ent: NonNullable<typeof entitlement>) => {
    useYueStore.setState({ entitlement: ent })
  }, [])

  const [path, setPath] = useState<CamPath>('choice')
  const [target, setTarget] = useState<CameraTarget>('auto')
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loggedIn = Boolean(entitlement?.loggedIn)
  const canCamera = Boolean(entitlement?.allowed.camera)

  const meter = useMemo(
    () =>
      createCameraHeartbeat(
        (ent) => setEntitlement(ent),
        (message, ent) => {
          if (ent) setEntitlement(ent)
          useYueStore.setState({ error: message })
        },
      ),
    [setEntitlement],
  )

  useEffect(() => {
    if (!loggedIn) {
      onChoiceOpenChange(false)
      openAuthScreen()
    } else if (path === 'choice') {
      onChoiceOpenChange(true)
    }
  }, [loggedIn, path, onChoiceOpenChange])

  useEffect(() => {
    return () => {
      void meter.stop()
      if (uploadUrl?.startsWith('blob:')) URL.revokeObjectURL(uploadUrl)
    }
  }, [meter, uploadUrl])

  const closeChoice = () => {
    onChoiceOpenChange(false)
    if (path === 'choice') onLeaveCamera()
  }

  const startAr = () => {
    if (!canCamera) {
      useYueStore.setState({
        error: entitlement?.reason === 'login_required' ? biPlain(ui.camSignIn) : biPlain(ui.camQuota),
      })
      if (!loggedIn) openAuthScreen()
      return
    }
    onChoiceOpenChange(false)
    setPath('ar')
  }

  const startUploadPick = () => {
    if (!canCamera) {
      useYueStore.setState({
        error: entitlement?.reason === 'login_required' ? biPlain(ui.camSignIn) : biPlain(ui.camQuota),
      })
      if (!loggedIn) openAuthScreen()
      return
    }
    fileRef.current?.click()
  }

  const startDocs = () => {
    if (!canCamera) {
      useYueStore.setState({
        error: entitlement?.reason === 'login_required' ? biPlain(ui.camSignIn) : biPlain(ui.camQuota),
      })
      if (!loggedIn) openAuthScreen()
      return
    }
    onChoiceOpenChange(false)
    setPath('docs')
  }

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (uploadUrl?.startsWith('blob:')) URL.revokeObjectURL(uploadUrl)
    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : url
      // Prefer data URL for scan payload; keep object URL for display if needed
      setUploadUrl(dataUrl)
      onChoiceOpenChange(false)
      setPath('upload')
    }
    reader.readAsDataURL(file)
  }

  const backToChoice = () => {
    void meter.stop()
    setPath('choice')
    onChoiceOpenChange(true)
  }

  if (!loggedIn) {
    return (
      <div className="cam-gate">
        <p>
          <BiText copy={ui.camSignIn} size="md" />
        </p>
        <GlowRotateButton onClick={() => openAuthScreen()}>
          <BiText copy={ui.signIn} size="sm" layout="inline" />
        </GlowRotateButton>
      </div>
    )
  }

  return (
    <div className="cam-root">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="cam-file-input"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {path !== 'choice' && path !== 'ar' && path !== 'docs' ? (
        <div className="cam-target-row" role="radiogroup" aria-label="Translate target">
          {(
            [
              ['auto', ui.camTargetAuto],
              ['en', ui.camTargetEn],
              ['zh', ui.camTargetZh],
            ] as const
          ).map(([id, copy]) => (
            <label key={id} className={`cam-target-opt${target === id ? ' is-on' : ''}`}>
              <input
                type="radio"
                name="cam-target"
                checked={target === id}
                onChange={() => setTarget(id)}
              />
              <BiText copy={copy} size="sm" />
            </label>
          ))}
        </div>
      ) : null}

      {path === 'ar' ? (
        <CameraArSession
          target={target}
          onTargetChange={setTarget}
          onBack={backToChoice}
          onEntitlement={setEntitlement}
          meter={meter}
        />
      ) : null}

      {path === 'upload' && uploadUrl ? (
        <CameraUploadEditor
          imageUrl={uploadUrl}
          target={target}
          onBack={backToChoice}
          onEntitlement={setEntitlement}
          meter={meter}
        />
      ) : null}

      {path === 'docs' ? (
        <CameraDocSession onBack={backToChoice} onEntitlement={setEntitlement} />
      ) : null}

      <CameraChoiceModal
        open={choiceOpen && path === 'choice'}
        onClose={closeChoice}
        onAr={startAr}
        onUpload={startUploadPick}
        onDocs={startDocs}
      />
    </div>
  )
}
