import { useState } from 'react'
import { BiText } from './BiText'
import { GlowRotateButton } from './GlowRotateButton'
import {
  downloadBase64File,
  fileToDataUrl,
  translateDocumentFile,
  type DocLang,
} from '../lib/docsApi'
import { translatePdfHybrid, getPdfPageCount } from '../lib/pdfDocTranslate'
import type { Entitlement } from '../lib/types'
import { biPlain, ui } from '../lib/uiCopy'
import './camera.css'

type Props = {
  onBack: () => void
  onEntitlement: (ent: Entitlement) => void
  entitlement?: Entitlement | null
}

const ACCEPT =
  '.pdf,.docx,.pptx,.xlsx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv'

function docsRemainingLabel(ent: Entitlement | null | undefined): string | null {
  if (!ent?.loggedIn) return null
  if (ent.docsUnlimited || (ent.remaining.docsPages ?? 0) < 0) {
    return biPlain(ui.camDocUnlimited)
  }
  const left = ent.remaining.docsPages
  if (left === undefined) return null
  return `${biPlain(ui.camDocRemaining)}: ${left}`
}

export function CameraDocSession({ onBack, onEntitlement, entitlement }: Props) {
  const [from, setFrom] = useState<DocLang>('en')
  const [to, setTo] = useState<DocLang>('yue')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    filename: string
    mime: string
    dataBase64: string
    note: string
  } | null>(null)

  const canDocs = Boolean(entitlement?.allowed.docs)
  const remainingHint = docsRemainingLabel(entitlement)

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const onPick = async (file: File | undefined) => {
    if (!file || busy) return
    if (!canDocs) {
      setError(biPlain(ui.camDocQuota))
      return
    }
    setError('')
    setResult(null)
    setBusy(true)
    setStatus(biPlain(ui.camDocWorking))
    try {
      const name = file.name || 'document'
      const isPdf = /\.pdf$/i.test(name) || file.type === 'application/pdf'
      if (isPdf) {
        const pageCount = await getPdfPageCount(file)
        const rem = entitlement?.remaining.docsPages
        if (
          !entitlement?.docsUnlimited &&
          typeof rem === 'number' &&
          rem >= 0 &&
          pageCount > rem
        ) {
          throw new Error(
            `${biPlain(ui.camDocNeedPages)} (${pageCount} needed, ${rem} left)`,
          )
        }
        const out = await translatePdfHybrid(
          file,
          from,
          to,
          (msg) => setStatus(msg),
          onEntitlement,
        )
        setResult({
          filename: out.filename,
          mime: out.mime,
          dataBase64: out.dataBase64,
          note: `PDF hybrid · ${out.pages} page(s) · text layer when present, vision when scanned`,
        })
      } else {
        setStatus(biPlain(ui.camDocOffice))
        const data = await fileToDataUrl(file)
        const out = await translateDocumentFile({
          filename: name,
          data,
          from,
          to,
        })
        if (out.entitlement) onEntitlement(out.entitlement)
        setResult({
          filename: out.filename,
          mime: out.mime,
          dataBase64: out.dataBase64,
          note: `Layout-keep · ${out.engine.toUpperCase()} · ${out.pages} page(s)`,
        })
      }
      setStatus(biPlain(ui.camDocDone))
    } catch (e) {
      const ent = (e as { entitlement?: Entitlement }).entitlement
      if (ent) onEntitlement(ent)
      setError(e instanceof Error ? e.message : 'Document translation failed')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cam-session cam-session--docs">
      <div className="cam-docs-bar">
        <button type="button" className="cam-back" onClick={onBack} disabled={busy}>
          <BiText copy={ui.camBack} size="sm" />
        </button>
        <h2 className="cam-docs-title">
          <BiText copy={ui.camChoiceDocs} size="md" />
        </h2>
      </div>

      <p className="cam-docs-lead">
        <BiText copy={ui.camDocLead} size="sm" />
      </p>

      {remainingHint ? <p className="cam-docs-meter">{remainingHint}</p> : null}

      <div className="cam-docs-dir" role="group" aria-label={biPlain(ui.direction)}>
        <label>
          <span className="cam-docs-dir-label">
            <BiText copy={ui.camDocFrom} size="sm" />
          </span>
          <select
            value={from}
            disabled={busy || !canDocs}
            onChange={(e) => setFrom(e.target.value as DocLang)}
          >
            <option value="en">English</option>
            <option value="yue">粵語</option>
          </select>
        </label>
        <button
          type="button"
          className="cam-docs-swap"
          onClick={swap}
          disabled={busy || !canDocs}
        >
          ↔
        </button>
        <label>
          <span className="cam-docs-dir-label">
            <BiText copy={ui.camDocTo} size="sm" />
          </span>
          <select
            value={to}
            disabled={busy || !canDocs}
            onChange={(e) => setTo(e.target.value as DocLang)}
          >
            <option value="yue">粵語</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <label className={`cam-docs-drop${busy ? ' is-busy' : ''}${!canDocs ? ' is-disabled' : ''}`}>
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy || !canDocs}
          onChange={(e) => {
            void onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <span className="cam-docs-drop-title">
          <BiText copy={!canDocs ? ui.camDocQuota : busy ? ui.camDocWorking : ui.camDocPick} size="md" />
        </span>
        <span className="cam-docs-drop-hint">
          <BiText copy={ui.camDocFormats} size="sm" />
        </span>
      </label>

      {status ? <p className="cam-docs-status">{status}</p> : null}
      {error ? <p className="cam-docs-error">{error}</p> : null}

      {result ? (
        <div className="cam-docs-result">
          <p className="cam-docs-result-name">{result.filename}</p>
          <p className="cam-docs-result-note">{result.note}</p>
          <GlowRotateButton
            onClick={() =>
              downloadBase64File(result.filename, result.mime, result.dataBase64)
            }
          >
            <BiText copy={ui.camDocDownload} size="sm" layout="inline" />
          </GlowRotateButton>
        </div>
      ) : null}

      <p className="cam-docs-privacy">
        <BiText copy={ui.camDocPrivacy} size="sm" />
      </p>
    </div>
  )
}
