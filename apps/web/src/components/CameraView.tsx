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
import { consumePendingLaunchFile } from '../lib/pwaLaunch'
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
  const [docSeedFile, setDocSeedFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loggedIn = Boolean(entitlement?.loggedIn)
  const canCamera = Boolean(entitlement?.allowed.camera)
  const canDocs = Boolean(entitlement?.allowed.docs)

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
    // Guests with remaining camera trial can use AR/Upload; docs still need sign-in.
    if (!loggedIn && !canCamera) {
      onChoiceOpenChange(false)
      openAuthScreen()
    } else if (path === 'choice') {
      onChoiceOpenChange(true)
    }
  }, [loggedIn, canCamera, path, onChoiceOpenChange])

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
        error: !loggedIn
          ? biPlain(ui.guestTrialExhaustedCam)
          : biPlain(ui.camQuota),
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
        error: !loggedIn
          ? biPlain(ui.guestTrialExhaustedCam)
          : biPlain(ui.camQuota),
      })
      if (!loggedIn) openAuthScreen()
      return
    }
    fileRef.current?.click()
  }

  const startDocs = () => {
    if (!canDocs) {
      useYueStore.setState({
        error: !loggedIn ? biPlain(ui.guestDocsSignIn) : biPlain(ui.camDocQuota),
      })
      if (!loggedIn) openAuthScreen()
      return
    }
    onChoiceOpenChange(false)
    setPath('docs')
  }

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (uploadUrl?.startsWith('blob:')) URL.revokeObjectURL(uploadUrl)
      const url = URL.createObjectURL(file)
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : url
        setUploadUrl(dataUrl)
        onChoiceOpenChange(false)
        setPath('upload')
      }
      reader.readAsDataURL(file)
    },
    [onChoiceOpenChange, uploadUrl],
  )

  useEffect(() => {
    if (!loggedIn && !canCamera) return
    const file = consumePendingLaunchFile()
    if (!file) return
    const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (pdf) {
      if (!canDocs) {
        useYueStore.setState({ error: biPlain(ui.guestDocsSignIn) })
        openAuthScreen()
        return
      }
      onChoiceOpenChange(false)
      setDocSeedFile(file)
      setPath('docs')
      return
    }
    if (!canCamera) {
      useYueStore.setState({ error: biPlain(ui.guestTrialExhaustedCam) })
      if (!loggedIn) openAuthScreen()
      return
    }
    onFile(file)
  }, [loggedIn, canCamera, canDocs, onChoiceOpenChange, onFile])

  const backToChoice = () => {
    void meter.stop()
    setPath('choice')
    onChoiceOpenChange(true)
  }

  if (!loggedIn && !canCamera) {
    return (
      <div className="cam-gate">
        <p>
          <BiText
            copy={entitlement?.reason === 'guest_trial_exhausted' ? ui.guestTrialExhaustedCam : ui.camSignIn}
            size="md"
          />
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
              ['yue', ui.camTargetYue],
              ['cmn', ui.camTargetCmn],
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
        <CameraDocSession
          onBack={backToChoice}
          onEntitlement={setEntitlement}
          entitlement={entitlement}
          initialFile={docSeedFile}
          onInitialFileConsumed={() => setDocSeedFile(null)}
        />
      ) : null}

      <CameraChoiceModal
        open={choiceOpen && path === 'choice'}
        onClose={closeChoice}
        onAr={startAr}
        onUpload={startUploadPick}
        onDocs={startDocs}
        docsDisabled={!canDocs}
      />
    </div>
  )
}
