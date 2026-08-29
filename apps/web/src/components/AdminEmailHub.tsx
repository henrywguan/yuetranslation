import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  archiveEmailTemplate,
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
type RecipientMode = 'recipients' | 'audience'
type PreviewWidth = 'desktop' | 'mobile'

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
  { key: 'body', label: 'Body', multiline: true, hint: 'Blank line = new paragraph. Product update uses one line per bullet.' },
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

function TemplateThumb({ thumb, name }: { thumb: EmailTemplateItem['thumb']; name: string }) {
  return (
    <div className={`email-hub-thumb email-hub-thumb--${thumb}`} aria-hidden>
      <div className="email-hub-thumb-bar" />
      <div className="email-hub-thumb-title" />
      <div className="email-hub-thumb-line" />
      <div className="email-hub-thumb-line email-hub-thumb-line--short" />
      {thumb === 'spotlight' || thumb === 'hero' || thumb === 'welcome' ? (
        <div className="email-hub-thumb-cta" />
      ) : null}
      <span className="email-hub-thumb-label">{name}</span>
    </div>
  )
}

export function AdminEmailHub() {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([])
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [audienceConfigured, setAudienceConfigured] = useState(false)
  const [galleryView, setGalleryView] = useState<GalleryView>('thumbnails')
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [variant, setVariant] = useState<CampaignVariant>('announcement')
  const [fields, setFields] = useState<CampaignFields>(emptyFields)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>('desktop')
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('recipients')
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [contactQuery, setContactQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sendNotice, setSendNotice] = useState<SendNotice | null>(null)
  const [saveName, setSaveName] = useState('')
  const [confirmAudience, setConfirmAudience] = useState(false)

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedKey) || null,
    [templates, selectedKey],
  )

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
      setPreviewHtml(html)
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

  const applyTemplate = (tpl: EmailTemplateItem) => {
    setSelectedKey(tpl.id)
    setVariant(tpl.variant)
    setFields({ ...tpl.defaults })
    setSaveName(tpl.source === 'custom' ? tpl.name : '')
    setMessage('')
    setError('')
  }

  const patchField = (key: keyof CampaignFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
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
        emails: recipientMode === 'recipients' ? [...selectedEmails] : undefined,
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

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="email-hub-ok">{message}</p> : null}

      <section className="email-hub-gallery" aria-label="Templates">
        <div className="email-hub-gallery-head">
          <h3>Templates</h3>
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
        </div>

        {galleryView === 'thumbnails' ? (
          <div className="email-hub-thumbs">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className={`email-hub-card${selectedKey === tpl.id ? ' is-selected' : ''}`}
                onClick={() => applyTemplate(tpl)}
              >
                <TemplateThumb thumb={tpl.thumb} name={tpl.name} />
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
        )}
      </section>

      <div className="email-hub-workspace">
        <section className="email-hub-editor" aria-label="Compose">
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
            <label key={f.key} className="email-hub-field">
              <span>
                {f.label}
                {f.hint ? <em>{f.hint}</em> : null}
              </span>
              {f.multiline ? (
                <textarea
                  rows={f.key === 'body' ? 8 : 3}
                  value={fields[f.key]}
                  onChange={(e) => patchField(f.key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  value={fields[f.key]}
                  onChange={(e) => patchField(f.key, e.target.value)}
                />
              )}
            </label>
          ))}

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

        <section className="email-hub-preview" aria-label="Preview">
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

        <section className="email-hub-recipients" aria-label="Recipients">
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
          ) : (
            <>
              <div className="email-hub-contact-tools">
                <input
                  type="search"
                  placeholder="Search contacts"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
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
            {recipientMode === 'audience' ? 'Send to audience' : 'Send to selected'}
          </button>
        </section>
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
