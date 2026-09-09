import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  archiveEmailTemplate,
  draftAdminEmail,
  fetchEmailContacts,
  fetchEmailTemplates,
  previewAdminEmail,
  saveEmailTemplate,
  sendAdminEmail,
  type CampaignFields,
  type CampaignVariant,
  type EmailContact,
  type EmailTemplateItem,
} from '../lib/adminApi'
import './AdminEmailHub.css'

type GalleryView = 'thumbnails' | 'list'
type RecipientMode = 'recipients' | 'audience' | 'custom'
type PreviewWidth = 'desktop' | 'mobile'
type MobilePane = 'templates' | 'compose' | 'preview' | 'send'

const MOBILE_PANES: { id: MobilePane; label: string }[] = [
  { id: 'templates', label: 'Templates' },
  { id: 'compose', label: 'Compose' },
  { id: 'preview', label: 'Preview' },
  { id: 'send', label: 'Send' },
]

function parseCustomEmails(raw: string): string[] {
  const parts = raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return [...new Set(parts.filter((p) => emailRe.test(p)))]
}

/** Prefer a resolvable logo in the admin preview iframe (local / preview hosts). */
function fixPreviewLogoHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const local = `${window.location.origin}/apple-touch-icon.png`
  const canonical = 'https://www.jyuttranslate.com/apple-touch-icon.png'
  return html.replace(/(src=")([^"]*apple-touch-icon\.png)(")/gi, (_m, a, src, c) => {
    const use =
      /localhost|127\.0\.0\.1|\.vercel\.app/i.test(window.location.hostname) ? local : canonical
    if (src === use) return `${a}${src}${c}`
    return `${a}${use}${c}`
  })
}

type SendNotice = {
  tone: 'ok' | 'warn' | 'error'
  title: string
  summary: string
  hint?: string | null
  errors?: { email: string; message: string }[]
  sent?: number
  failed?: number
  attempted?: number
}

const FIELD_LABELS: { key: keyof CampaignFields; label: string; multiline?: boolean; hint?: string }[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'preview', label: 'Preview text', hint: 'Inbox snippet under the subject' },
  { key: 'eyebrow', label: 'Eyebrow' },
  { key: 'headline', label: 'Headline' },
  { key: 'body', label: 'Body', multiline: true, hint: 'Blank line = paragraph. **bold**, *italic*, [label](https://…). Product update: one line per bullet.' },
  { key: 'ctaLabel', label: 'CTA label' },
  { key: 'ctaUrl', label: 'CTA URL' },
  { key: 'secondary', label: 'Secondary note', multiline: true },
  { key: 'signOff', label: 'Sign-off', multiline: true },
]

function emptyFields(): CampaignFields {
  return {
    subject: '',
    preview: '',
    eyebrow: '',
    headline: '',
    body: '',
    ctaLabel: '',
    ctaUrl: '',
    secondary: '',
    signOff: '',
  }
}

function aiHintForVariant(variant: CampaignVariant): string {
  switch (variant) {
    case 'product-update':
      return 'Summarize changes since the last product-update email sent from this page'
    case 'feature-spotlight':
      return 'Draft a feature spotlight from the subject'
    case 'newsletter':
      return 'Draft a newsletter digest from the subject'
    case 'welcome':
      return 'Draft a welcome email from the subject'
    case 'plain':
      return 'Draft a plain corporate note from the subject'
    case 'announcement':
    default:
      return 'Draft an announcement from the subject'
  }
}

function SkeletonThumb({ name }: { name: string }) {
  return (
    <div className="email-hub-thumb email-hub-thumb--skeleton" aria-hidden>
      <div className="email-hub-thumb-bar" />
      <div className="email-hub-thumb-title" />
      <div className="email-hub-thumb-line" />
      <div className="email-hub-thumb-line email-hub-thumb-line--short" />
      <span className="email-hub-thumb-label">{name}</span>
    </div>
  )
}

function LiveTemplateThumb({
  variant,
  fields,
  name,
}: {
  variant: CampaignVariant
  fields: CampaignFields
  name: string
}) {
  const [html, setHtml] = useState('')
  const [failed, setFailed] = useState(false)
  const cacheKey = useMemo(
    () => `${variant}::${fields.subject}::${fields.headline}::${fields.body.slice(0, 120)}`,
    [variant, fields.subject, fields.headline, fields.body],
  )
  const cacheKeyRef = useRef(cacheKey)
  cacheKeyRef.current = cacheKey

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const { html: next } = await previewAdminEmail({
            variant,
            fields,
            includeUnsubscribe: false,
          })
          if (!cancelled && cacheKeyRef.current === cacheKey) setHtml(fixPreviewLogoHtml(next))
        } catch {
          if (!cancelled) {
            setFailed(true)
            setHtml('')
          }
        }
      })()
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [cacheKey, variant, fields])

  if (!html || failed) {
    return <SkeletonThumb name={name} />
  }

  return (
    <div className="email-hub-thumb email-hub-thumb--live" aria-hidden>
      <div className="email-hub-thumb-scale">
        <iframe title={`${name} preview`} className="email-hub-thumb-iframe" srcDoc={html} tabIndex={-1} />
      </div>
      <span className="email-hub-thumb-label">{name}</span>
    </div>
  )
}

export function AdminEmailHub() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([])
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [audienceConfigured, setAudienceConfigured] = useState(false)
  const [galleryView, setGalleryView] = useState<GalleryView>('thumbnails')
  const [galleryCollapsed, setGalleryCollapsed] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [variant, setVariant] = useState<CampaignVariant>('announcement')
  const [fields, setFields] = useState<CampaignFields>(emptyFields)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('recipients')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [customEmailsRaw, setCustomEmailsRaw] = useState('')
  const [contactQuery, setContactQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiReasoning, setAiReasoning] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sendNotice, setSendNotice] = useState<SendNotice | null>(null)
  const [saveName, setSaveName] = useState('')
  const [confirmAudience, setConfirmAudience] = useState(false)
  const [mobilePane, setMobilePane] = useState<MobilePane>('compose')
  const [bodyHistory, setBodyHistory] = useState<string[]>([])
  const bodyRef = useRef<HTMLTextAreaElement | null>(null)
  const bodyDirtyRef = useRef(false)

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedKey) || null,
    [templates, selectedKey],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 860px)').matches) {
      setPreviewWidth('mobile')
      setGalleryView('list')
    }
  }, [])

  const reload = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const [tpl, cts] = await Promise.all([fetchEmailTemplates(), fetchEmailContacts()])
      setTemplates(tpl.templates)
      setContacts(cts.contacts)
      setAudienceConfigured(cts.audienceConfigured)
      if (!selectedKey && tpl.templates[0]) {
        const first = tpl.templates[0]
        setSelectedKey(first.id)
        setVariant(first.variant)
        setFields({ ...first.defaults })
        setSaveName(first.source === 'custom' ? first.name : '')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load email hub')
    } finally {
      setBusy(false)
    }
  }, [selectedKey])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, [])

  const runPreview = useCallback(async () => {
    setPreviewBusy(true)
    setError('')
    try {
      const { html } = await previewAdminEmail({
        variant,
        fields,
        includeUnsubscribe: recipientMode === 'audience',
      })
      setPreviewHtml(fixPreviewLogoHtml(html))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setPreviewBusy(false)
    }
  }, [variant, fields, recipientMode])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runPreview()
    }, 400)
    return () => window.clearTimeout(t)
  }, [runPreview])

  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase()
    return contacts.filter((c) => {
      if (c.unsubscribed) return false
      if (!q) return true
      return c.email.includes(q) || (c.name || '').toLowerCase().includes(q)
    })
  }, [contacts, contactQuery])

  const customEmailList = useMemo(() => parseCustomEmails(customEmailsRaw), [customEmailsRaw])

  const applyTemplate = (tpl: EmailTemplateItem) => {
    setSelectedKey(tpl.id)
    setVariant(tpl.variant)
    setFields({ ...tpl.defaults })
    setSaveName(tpl.source === 'custom' ? tpl.name : '')
    setAiReasoning('')
    setMessage('')
    setError('')
    setBodyHistory([])
    bodyDirtyRef.current = false
    setMobilePane('compose')
  }

  const patchField = (key: keyof CampaignFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const pushBodyHistory = () => {
    setBodyHistory((prev) => [...prev.slice(-19), fields.body])
  }

  const undoBody = () => {
    setBodyHistory((prev) => {
      if (!prev.length) return prev
      const next = [...prev]
      const last = next.pop()
      if (last != null) {
        setFields((f) => ({ ...f, body: last }))
        bodyDirtyRef.current = false
      }
      return next
    })
  }

  const insertBodySnippet = (mode: 'paragraph' | 'bullet') => {
    pushBodyHistory()
    bodyDirtyRef.current = false
    const el = bodyRef.current
    setFields((prev) => {
      const cur = prev.body
      const start = el?.selectionStart ?? cur.length
      const end = el?.selectionEnd ?? cur.length
      const before = cur.slice(0, start)
      const after = cur.slice(end)
      let insert = ''
      if (mode === 'paragraph') {
        if (!before) insert = ''
        else if (before.endsWith('\n\n')) insert = ''
        else if (before.endsWith('\n')) insert = '\n'
        else insert = '\n\n'
      } else {
        const atLineStart = !before || before.endsWith('\n')
        insert = atLineStart ? '• ' : '\n• '
      }
      const next = `${before}${insert}${after}`
      window.requestAnimationFrame(() => {
        const node = bodyRef.current
        if (!node) return
        node.focus()
        const caret = before.length + insert.length
        node.setSelectionRange(caret, caret)
      })
      return { ...prev, body: next }
    })
  }

  const wrapBodySelection = (prefix: string, suffix: string, placeholder = 'text') => {
    pushBodyHistory()
    bodyDirtyRef.current = false
    const el = bodyRef.current
    const cur = fields.body
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    const selected = cur.slice(start, end) || placeholder
    const next = `${cur.slice(0, start)}${prefix}${selected}${suffix}${cur.slice(end)}`
    setFields((prev) => ({ ...prev, body: next }))
    window.requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      const innerStart = start + prefix.length
      const innerEnd = innerStart + selected.length
      node.setSelectionRange(innerStart, innerEnd)
    })
  }

  const insertBodyLink = () => {
    const el = bodyRef.current
    const cur = fields.body
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    const selected = cur.slice(start, end).trim() || 'Learn more'
    const url = window.prompt('Link URL (https://…)', 'https://')
    if (!url?.trim()) return
    const href = url.trim()
    if (!/^https?:\/\//i.test(href)) {
      setError('Links must start with http:// or https://')
      return
    }
    pushBodyHistory()
    bodyDirtyRef.current = false
    const markdown = `[${selected}](${href})`
    const next = `${cur.slice(0, start)}${markdown}${cur.slice(end)}`
    setFields((prev) => ({ ...prev, body: next }))
    window.requestAnimationFrame(() => {
      const node = bodyRef.current
      if (!node) return
      node.focus()
      const caret = start + markdown.length
      node.setSelectionRange(caret, caret)
    })
  }

  const goPreview = () => {
    setMobilePane('preview')
    void runPreview()
  }

  const onBodyChange = (value: string) => {
    if (!bodyDirtyRef.current) {
      pushBodyHistory()
      bodyDirtyRef.current = true
    }
    patchField('body', value)
  }

  const runAiDraft = async () => {
    setAiBusy(true)
    setError('')
    setMessage('')
    pushBodyHistory()
    bodyDirtyRef.current = false
    try {
      const draft = await draftAdminEmail({
        variant,
        fields,
        templateKey: selectedKey || undefined,
      })
      setFields({ ...draft.fields })
      setAiReasoning(draft.reasoning)
      const meta = [
        draft.model === 'fallback' ? 'Local draft' : `AI · ${draft.model}`,
        draft.usedLastSend && draft.lastSendSubject
          ? `since “${draft.lastSendSubject}”`
          : draft.usedLastSend
            ? 'used last send'
            : null,
      ]
        .filter(Boolean)
        .join(' · ')
      setMessage(meta)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI draft failed')
    } finally {
      setAiBusy(false)
    }
  }

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev)
      for (const c of filteredContacts) next.add(c.email)
      return next
    })
  }

  const clearSelected = () => setSelectedEmails(new Set())

  const onSaveTemplate = async () => {
    const name = saveName.trim() || fields.subject.trim() || 'Untitled template'
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const customId =
        selectedTemplate?.source === 'custom'
          ? selectedTemplate.id.replace(/^custom:/, '')
          : undefined
      const saved = await saveEmailTemplate({
        id: customId,
        name,
        description: selectedTemplate?.description || 'Saved from Admin Email hub',
        baseVariant: variant,
        fields,
      })
      setMessage(`Template saved.`)
      const tpl = await fetchEmailTemplates()
      setTemplates(tpl.templates)
      setSelectedKey(`custom:${saved.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const onArchive = async () => {
    if (selectedTemplate?.source !== 'custom') return
    if (!window.confirm(`Archive “${selectedTemplate.name}”?`)) return
    setBusy(true)
    try {
      await archiveEmailTemplate(selectedTemplate.id.replace(/^custom:/, ''))
      setMessage('Template archived.')
      setSelectedKey('')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Archive failed')
    } finally {
      setBusy(false)
    }
  }

  const onSend = async () => {
    setError('')
    setMessage('')
    setSendNotice(null)
    if (!fields.subject.trim()) {
      setError('Subject is required.')
      return
    }
    if (recipientMode === 'audience') {
      if (!audienceConfigured) {
        setError('Resend audience is not configured.')
        return
      }
      if (!confirmAudience) {
        setError('Confirm audience send with the checkbox.')
        return
      }
      if (
        !window.confirm(
          'Send this email to the ENTIRE Resend audience? This cannot be undone from the app.',
        )
      ) {
        return
      }
    } else if (recipientMode === 'custom') {
      if (!customEmailList.length) {
        setError('Enter at least one valid email address.')
        return
      }
    } else if (!selectedEmails.size) {
      setError('Select at least one contact.')
      return
    }

    setBusy(true)
    try {
      const result = await sendAdminEmail({
        mode: recipientMode,
        templateKey: selectedKey || `builtin:${variant}`,
        variant,
        fields,
        emails:
          recipientMode === 'recipients'
            ? [...selectedEmails]
            : recipientMode === 'custom'
              ? customEmailList
              : undefined,
        confirm: true,
      })
      if (result.mode === 'audience') {
        const summary = `Broadcast queued${result.broadcastId ? ` (${result.broadcastId})` : ''}.`
        setMessage(summary)
        setConfirmAudience(false)
        setSendNotice({
          tone: 'ok',
          title: 'Broadcast queued',
          summary,
        })
      } else {
        const sent = result.sent ?? 0
        const failed = result.failed ?? 0
        const attempted = result.attempted ?? selectedEmails.size
        const tone: SendNotice['tone'] = failed > 0 ? (sent > 0 ? 'warn' : 'error') : 'ok'
        const title =
          failed > 0
            ? sent > 0
              ? 'Partially sent'
              : 'Send failed'
            : 'Email sent'
        const summary =
          failed > 0
            ? `Sent ${sent} of ${attempted}. ${failed} failed.`
            : `Sent to ${sent} recipient${sent === 1 ? '' : 's'}.`
        setMessage(summary)
        setSendNotice({
          tone,
          title,
          summary,
          hint: result.hint,
          errors: result.errors,
          sent,
          failed,
          attempted,
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Send failed'
      setError(msg)
      setSendNotice({
        tone: 'error',
        title: 'Send failed',
        summary: msg,
        hint: /resend\.dev|verify a domain|own email|testing emails/i.test(msg)
          ? 'Resend test domains (e.g. onboarding@resend.dev) can only deliver to your Resend account email. Verify a domain and set YUE_NOTIFY_FROM to an address on that domain to email all contacts.'
          : null,
      })
    } finally {
      setBusy(false)
    }
  }

  const closeSendNotice = () => setSendNotice(null)

  return (
    <div className="email-hub">
      <div className="email-hub-top">
        <div>
          <h2 className="email-hub-title">Email</h2>
          <p className="email-hub-sub">
            Draft branded campaigns with React Email, preview live, then send via Resend — to
            selected contacts or the full audience.
          </p>
        </div>
        <div className="email-hub-top-actions">
          <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void reload()}>
            Refresh
          </button>
          <button type="button" className="admin-btn" disabled={busy || previewBusy} onClick={() => void runPreview()}>
            Refresh preview
          </button>
        </div>
      </div>

      <nav className="email-hub-mobile-nav" aria-label="Email editor steps">
        {MOBILE_PANES.map((pane) => (
          <button
            key={pane.id}
            type="button"
            className={mobilePane === pane.id ? 'is-active' : undefined}
            onClick={() => setMobilePane(pane.id)}
            aria-current={mobilePane === pane.id ? 'page' : undefined}
          >
            {pane.label}
          </button>
        ))}
      </nav>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="email-hub-ok">{message}</p> : null}

      <section
        className={`email-hub-gallery${mobilePane === 'templates' ? ' is-mobile-active' : ''}${galleryCollapsed ? ' is-collapsed' : ''}`}
        aria-label="Templates"
      >
        <div className="email-hub-gallery-head">
          <h3>Templates</h3>
          <div className="email-hub-gallery-head-actions">
            {!galleryCollapsed ? (
              <div className="email-hub-view-toggle" role="group" aria-label="Template view">
                <button
                  type="button"
                  className={galleryView === 'thumbnails' ? 'is-active' : ''}
                  onClick={() => setGalleryView('thumbnails')}
                >
                  Thumbnails
                </button>
                <button
                  type="button"
                  className={galleryView === 'list' ? 'is-active' : ''}
                  onClick={() => setGalleryView('list')}
                >
                  List
                </button>
              </div>
            ) : (
              <p className="email-hub-gallery-collapsed-label">
                {selectedTemplate?.name || 'Blank draft'}
              </p>
            )}
            <button
              type="button"
              className="email-hub-gallery-toggle"
              aria-expanded={!galleryCollapsed}
              onClick={() => setGalleryCollapsed((v) => !v)}
            >
              {galleryCollapsed ? 'Expand' : 'Minimize'}
            </button>
          </div>
        </div>

        {!galleryCollapsed ? (
          galleryView === 'thumbnails' ? (
          <div className="email-hub-thumbs">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`email-hub-card${selectedKey === tpl.id ? ' is-selected' : ''}`}
                onClick={() => applyTemplate(tpl)}
              >
                <LiveTemplateThumb variant={tpl.variant} fields={tpl.defaults} name={tpl.name} />
                <div className="email-hub-card-meta">
                  <strong>{tpl.name}</strong>
                  <span>{tpl.source === 'builtin' ? 'Built-in' : 'Custom'}</span>
                  <p>{tpl.description}</p>
                </div>
              </button>
            ))}
            <button
              type="button"
              className="email-hub-card email-hub-card--new"
              onClick={() => {
                setSelectedKey('')
                setVariant('announcement')
                setFields(emptyFields())
                setSaveName('')
                setAiReasoning('')
                setBodyHistory([])
                bodyDirtyRef.current = false
                setMobilePane('compose')
                setMessage('Blank draft — edit fields, then Save as template.')
              }}
            >
              <div className="email-hub-thumb email-hub-thumb--new" aria-hidden>
                <span>+</span>
              </div>
              <div className="email-hub-card-meta">
                <strong>New template</strong>
                <span>Custom</span>
                <p>Start from a blank draft and save it to your library.</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="email-hub-list">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`email-hub-list-row${selectedKey === tpl.id ? ' is-selected' : ''}`}
                onClick={() => applyTemplate(tpl)}
              >
                <span className="email-hub-list-name">{tpl.name}</span>
                <span className="email-hub-list-badge">{tpl.source}</span>
                <span className="email-hub-list-variant">{tpl.variant}</span>
                <span className="email-hub-list-desc">{tpl.description}</span>
              </button>
            ))}
          </div>
        )
        ) : null}
      </section>

      <div className="email-hub-workspace">
        <section
          className={`email-hub-editor${mobilePane === 'compose' ? ' is-mobile-active' : ''}`}
          aria-label="Compose"
        >
          <div className="email-hub-editor-head">
            <h3>Compose</h3>
            <label className="email-hub-inline-label">
              Layout
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value as CampaignVariant)}
              >
                <option value="announcement">Announcement</option>
                <option value="product-update">Product update</option>
                <option value="feature-spotlight">Feature spotlight</option>
                <option value="newsletter">Newsletter</option>
                <option value="welcome">Welcome</option>
                <option value="plain">Plain corporate</option>
              </select>
            </label>
          </div>

          {FIELD_LABELS.map((f) => (
            <label key={f.key} className={`email-hub-field${f.key === 'body' ? ' email-hub-field--body' : ''}`}>
              <span className="email-hub-field-label-row">
                <span>
                  {f.label}
                  {f.hint ? <em>{f.hint}</em> : null}
                </span>
                {f.key === 'body' ? (
                  <div className="email-hub-body-tools" role="toolbar" aria-label="Body editor">
                    <button
                      type="button"
                      className={`email-hub-ai-btn${aiBusy ? ' is-busy' : ''}`}
                      disabled={aiBusy || busy}
                      onClick={(e) => {
                        e.preventDefault()
                        void runAiDraft()
                      }}
                      title={aiHintForVariant(variant)}
                      aria-label={aiHintForVariant(variant)}
                    >
                      <span className="email-hub-ai-orb" aria-hidden />
                      <span className="email-hub-ai-label">{aiBusy ? 'Thinking…' : 'AI draft'}</span>
                    </button>
                    <button
                      type="button"
                      className="email-hub-tool email-hub-tool--bold"
                      onClick={(e) => {
                        e.preventDefault()
                        wrapBodySelection('**', '**', 'bold')
                      }}
                      title="Bold"
                      aria-label="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="email-hub-tool email-hub-tool--italic"
                      onClick={(e) => {
                        e.preventDefault()
                        wrapBodySelection('*', '*', 'italic')
                      }}
                      title="Italic"
                      aria-label="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="email-hub-tool"
                      onClick={(e) => {
                        e.preventDefault()
                        insertBodyLink()
                      }}
                      title="Insert link"
                      aria-label="Insert link"
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      className="email-hub-tool"
                      onClick={(e) => {
                        e.preventDefault()
                        insertBodySnippet('paragraph')
                      }}
                      title="New paragraph"
                      aria-label="New paragraph"
                    >
                      ¶
                    </button>
                    {variant === 'product-update' ? (
                      <button
                        type="button"
                        className="email-hub-tool"
                        onClick={(e) => {
                          e.preventDefault()
                          insertBodySnippet('bullet')
                        }}
                        title="Insert bullet"
                        aria-label="Insert bullet"
                      >
                        •
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="email-hub-tool"
                      disabled={bodyHistory.length === 0}
                      onClick={(e) => {
                        e.preventDefault()
                        undoBody()
                      }}
                      title="Undo body"
                      aria-label="Undo body"
                    >
                      ↶
                    </button>
                    <button
                      type="button"
                      className="email-hub-tool email-hub-tool--preview"
                      onClick={(e) => {
                        e.preventDefault()
                        goPreview()
                      }}
                      title="Jump to preview"
                      aria-label="Jump to preview"
                    >
                      Preview
                    </button>
                  </div>
                ) : null}
              </span>
              {f.multiline ? (
                <textarea
                  ref={f.key === 'body' ? bodyRef : undefined}
                  rows={f.key === 'body' ? 8 : 3}
                  value={fields[f.key]}
                  onChange={(e) =>
                    f.key === 'body' ? onBodyChange(e.target.value) : patchField(f.key, e.target.value)
                  }
                  onBlur={f.key === 'body' ? () => { bodyDirtyRef.current = false } : undefined}
                  enterKeyHint={f.key === 'body' ? 'enter' : undefined}
                  autoCapitalize={f.key === 'body' ? 'sentences' : undefined}
                />
              ) : (
                <input
                  type="text"
                  value={fields[f.key]}
                  onChange={(e) => patchField(f.key, e.target.value)}
                  inputMode={f.key === 'ctaUrl' ? 'url' : undefined}
                  autoComplete="off"
                />
              )}
            </label>
          ))}

          {aiReasoning ? (
            <div className="email-hub-ai-reason" role="status">
              <strong>AI notes</strong>
              <p>{aiReasoning}</p>
            </div>
          ) : null}

          <div className="email-hub-save-row">
            <input
              type="text"
              placeholder="Template name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              aria-label="Template name"
            />
            <button type="button" className="admin-btn" disabled={busy} onClick={() => void onSaveTemplate()}>
              {selectedTemplate?.source === 'custom' ? 'Update template' : 'Save as template'}
            </button>
            {selectedTemplate?.source === 'custom' ? (
              <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => void onArchive()}>
                Archive
              </button>
            ) : null}
          </div>
        </section>

        <section
          className={`email-hub-preview${mobilePane === 'preview' ? ' is-mobile-active' : ''}`}
          aria-label="Preview"
        >
          <div className="email-hub-preview-head">
            <h3>Preview</h3>
            <div className="email-hub-view-toggle" role="group" aria-label="Preview width">
              <button
                type="button"
                className={previewWidth === 'desktop' ? 'is-active' : ''}
                onClick={() => setPreviewWidth('desktop')}
              >
                Desktop
              </button>
              <button
                type="button"
                className={previewWidth === 'mobile' ? 'is-active' : ''}
                onClick={() => setPreviewWidth('mobile')}
              >
                Mobile
              </button>
            </div>
          </div>
          <div className={`email-hub-iframe-wrap email-hub-iframe-wrap--${previewWidth}`}>
            {previewHtml ? (
              <iframe title="Email preview" className="email-hub-iframe" srcDoc={previewHtml} />
            ) : (
              <p className="admin-muted">{previewBusy ? 'Rendering…' : 'No preview yet.'}</p>
            )}
          </div>
        </section>

        <section
          className={`email-hub-recipients${mobilePane === 'send' ? ' is-mobile-active' : ''}`}
          aria-label="Recipients"
        >
          <h3>Recipients</h3>
          <div className="email-hub-mode" role="group" aria-label="Send mode">
            <button
              type="button"
              className={recipientMode === 'recipients' ? 'is-active' : ''}
              onClick={() => setRecipientMode('recipients')}
            >
              Contacts
            </button>
            <button
              type="button"
              className={recipientMode === 'custom' ? 'is-active' : ''}
              onClick={() => setRecipientMode('custom')}
            >
              Custom
            </button>
            <button
              type="button"
              className={recipientMode === 'audience' ? 'is-active' : ''}
              onClick={() => setRecipientMode('audience')}
              disabled={!audienceConfigured}
              title={audienceConfigured ? undefined : 'Set RESEND_AUDIENCE_ID'}
            >
              Full audience
            </button>
          </div>

          {recipientMode === 'audience' ? (
            <div className="email-hub-audience-box">
              <p>
                Sends a Resend <strong>broadcast</strong> to everyone in your configured audience
                segment. Includes an unsubscribe link automatically.
              </p>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={confirmAudience}
                  onChange={(e) => setConfirmAudience(e.target.checked)}
                />
                I understand this emails the entire audience
              </label>
            </div>
          ) : recipientMode === 'custom' ? (
            <div className="email-hub-custom-box">
              <label className="email-hub-field">
                <span>
                  Addresses
                  <em>Comma, space, or newline separated</em>
                </span>
                <textarea
                  rows={5}
                  value={customEmailsRaw}
                  onChange={(e) => setCustomEmailsRaw(e.target.value)}
                  placeholder="you@example.com&#10;friend@example.com"
                  inputMode="email"
                  autoComplete="off"
                />
              </label>
              <p className="email-hub-selected-count">
                {customEmailList.length} valid address
                {customEmailList.length === 1 ? '' : 'es'}
              </p>
            </div>
          ) : (
            <>
              <div className="email-hub-contact-tools">
                <input
                  type="search"
                  placeholder="Search contacts"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  enterKeyHint="search"
                />
                <button type="button" className="admin-btn admin-btn--secondary" onClick={selectAllFiltered}>
                  Select filtered
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={clearSelected}>
                  Clear
                </button>
              </div>
              <p className="email-hub-selected-count">
                {selectedEmails.size} selected · {filteredContacts.length} shown · {contacts.length}{' '}
                in audience
              </p>
              <ul className="email-hub-contact-list">
                {filteredContacts.map((c) => (
                  <li key={c.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(c.email)}
                        onChange={() => toggleEmail(c.email)}
                      />
                      <span className="email-hub-contact-email">{c.email}</span>
                      {c.name ? <span className="email-hub-contact-name">{c.name}</span> : null}
                    </label>
                  </li>
                ))}
                {!filteredContacts.length ? (
                  <li className="admin-muted">
                    {audienceConfigured
                      ? 'No contacts match. Sync the Resend audience from the Users tab if empty.'
                      : 'Configure RESEND_AUDIENCE_ID to load contacts.'}
                  </li>
                ) : null}
              </ul>
            </>
          )}

          <button
            type="button"
            className="admin-btn email-hub-send"
            disabled={busy}
            onClick={() => void onSend()}
          >
            {recipientMode === 'audience'
              ? 'Send to audience'
              : recipientMode === 'custom'
                ? `Send to custom (${customEmailList.length})`
                : 'Send to selected'}
          </button>
        </section>
      </div>

      <div className="email-hub-mobile-dock" role="toolbar" aria-label="Quick actions">
        <button type="button" className="admin-btn admin-btn--secondary" onClick={goPreview}>
          Preview
        </button>
        <button
          type="button"
          className="admin-btn"
          onClick={() => setMobilePane('send')}
        >
          Send…
        </button>
      </div>

      {sendNotice ? (
        <div
          className="email-hub-notice-overlay"
          role="presentation"
          onClick={closeSendNotice}
        >
          <div
            className={`email-hub-notice email-hub-notice--${sendNotice.tone}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-hub-notice-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="email-hub-notice-header">
              <h3 id="email-hub-notice-title">{sendNotice.title}</h3>
              <button
                type="button"
                className="admin-btn admin-btn--secondary email-hub-notice-close"
                onClick={closeSendNotice}
                aria-label="Close"
              >
                Close
              </button>
            </header>
            <p className="email-hub-notice-summary">{sendNotice.summary}</p>
            {sendNotice.attempted != null && sendNotice.failed != null && sendNotice.failed > 0 ? (
              <p className="email-hub-notice-counts">
                {sendNotice.sent ?? 0} sent · {sendNotice.failed} failed · {sendNotice.attempted}{' '}
                attempted
              </p>
            ) : null}
            {sendNotice.hint ? <p className="email-hub-notice-hint">{sendNotice.hint}</p> : null}
            {sendNotice.errors && sendNotice.errors.length > 0 ? (
              <ul className="email-hub-notice-errors">
                {sendNotice.errors.slice(0, 12).map((err) => (
                  <li key={err.email}>
                    <span className="email-hub-notice-err-email">{err.email}</span>
                    <span className="email-hub-notice-err-msg">{err.message}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <footer className="email-hub-notice-footer">
              <button type="button" className="admin-btn" onClick={closeSendNotice}>
                Got it
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
