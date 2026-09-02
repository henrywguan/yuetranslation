/**
 * Admin Email hub — render / send campaigns via React Email + Resend.
 * Keep `.tsx` off the static boot graph (dynamic-import compiled templates).
 */
import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { env, supportReplyTo } from './env.js'
import {
  BUILTIN_TEMPLATES,
  getBuiltinTemplate,
  mergeCampaignFields,
  type BuiltinTemplateMeta,
  type CampaignFields,
  type CampaignVariant,
} from './emails/emailCatalog.js'
import { getAdmin } from './supabase.js'

let client: Resend | null = null

function getResend(): Resend | null {
  if (!env.resendApiKey) return null
  if (!client) client = new Resend(env.resendApiKey)
  return client
}

function appPublicUrl(): string {
  return env.appUrl.replace(/\/+$/, '') || 'https://jyuttranslate.com'
}

function logoSrc(): string {
  return `${appPublicUrl()}/apple-touch-icon.png`
}

export type CustomTemplateRow = {
  id: string
  created_at: string
  updated_at: string
  name: string
  description: string
  base_variant: CampaignVariant
  subject: string
  preview_text: string
  fields: CampaignFields
  created_by: string | null
  archived: boolean
}

export type EmailTemplateListItem =
  | (BuiltinTemplateMeta & { source: 'builtin' })
  | {
      id: string
      source: 'custom'
      kind: 'custom'
      variant: CampaignVariant
      name: string
      description: string
      thumb: BuiltinTemplateMeta['thumb']
      defaults: CampaignFields
      updatedAt: string
    }

function variantThumb(variant: CampaignVariant): BuiltinTemplateMeta['thumb'] {
  return (
    BUILTIN_TEMPLATES.find((t) => t.variant === variant)?.thumb || 'minimal'
  )
}

export async function listEmailTemplates(includeArchived = false): Promise<EmailTemplateListItem[]> {
  const builtins: EmailTemplateListItem[] = BUILTIN_TEMPLATES.map((t) => ({
    ...t,
    source: 'builtin' as const,
  }))

  const clientSb = getAdmin()
  if (!clientSb) return builtins

  let query = clientSb
    .from('email_templates')
    .select('*')
    .order('updated_at', { ascending: false })
  if (!includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) {
    // Table may not exist yet in some envs — return builtins only.
    console.warn('[email-hub] list templates', error.message)
    return builtins
  }

  const customs: EmailTemplateListItem[] = (data || []).map((row: Record<string, unknown>) => {
    const r = row as unknown as CustomTemplateRow
    const variant = (r.base_variant || 'announcement') as CampaignVariant
    const builtin = BUILTIN_TEMPLATES.find((t) => t.variant === variant)
    const fields = mergeCampaignFields(builtin?.defaults || {
      subject: '',
      preview: '',
      eyebrow: '',
      headline: '',
      body: '',
      ctaLabel: '',
      ctaUrl: '',
      secondary: '',
      signOff: '',
    }, {
      ...(typeof r.fields === 'object' && r.fields ? r.fields : {}),
      subject: r.subject,
      preview: r.preview_text,
    })
    return {
      id: `custom:${r.id}`,
      source: 'custom' as const,
      kind: 'custom' as const,
      variant,
      name: r.name,
      description: r.description || '',
      thumb: variantThumb(variant),
      defaults: fields,
      updatedAt: r.updated_at,
    }
  })

  return [...builtins, ...customs]
}

export async function saveCustomTemplate(input: {
  name: string
  description?: string
  baseVariant: CampaignVariant
  fields: CampaignFields
  actorId: string
  id?: string
}): Promise<{ id: string }> {
  const clientSb = getAdmin()
  if (!clientSb) throw new Error('Supabase admin is not configured')
  const payload = {
    name: input.name.trim(),
    description: (input.description || '').trim(),
    base_variant: input.baseVariant,
    subject: input.fields.subject.trim(),
    preview_text: input.fields.preview.trim(),
    fields: input.fields,
    created_by: input.actorId,
    updated_at: new Date().toISOString(),
    archived: false,
  }

  if (input.id) {
    const { data, error } = await clientSb
      .from('email_templates')
      .update(payload)
      .eq('id', input.id)
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    return { id: data.id as string }
  }

  const { data, error } = await clientSb
    .from('email_templates')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return { id: data.id as string }
}

export async function archiveCustomTemplate(id: string): Promise<void> {
  const clientSb = getAdmin()
  if (!clientSb) throw new Error('Supabase admin is not configured')
  const { error } = await clientSb
    .from('email_templates')
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

async function loadCampaignElement(
  variant: CampaignVariant,
  fields: CampaignFields,
  includeUnsubscribe: boolean,
): Promise<ReactElement> {
  const [{ createElement: h }, { CampaignEmail }] = await Promise.all([
    import('react'),
    import('./emails/compiled/CampaignEmail.js'),
  ])
  return h(CampaignEmail, {
    variant,
    ...fields,
    appUrl: appPublicUrl(),
    logoSrc: logoSrc(),
    includeUnsubscribe,
  })
}

export async function renderCampaignHtml(input: {
  variant: CampaignVariant
  fields: CampaignFields
  includeUnsubscribe?: boolean
}): Promise<string> {
  const [{ render }, element] = await Promise.all([
    import('@react-email/render'),
    loadCampaignElement(input.variant, input.fields, Boolean(input.includeUnsubscribe)),
  ])
  return render(element)
}

export function resolveTemplateSelection(templateKey: string): {
  variant: CampaignVariant
  customId: string | null
} {
  if (templateKey.startsWith('custom:')) {
    return {
      variant: 'announcement',
      customId: templateKey.slice('custom:'.length),
    }
  }
  const builtin = getBuiltinTemplate(templateKey)
  if (!builtin) throw new Error('Unknown template')
  return { variant: builtin.variant, customId: null }
}

export async function resolveVariantForTemplateKey(
  templateKey: string,
): Promise<CampaignVariant> {
  if (templateKey.startsWith('custom:')) {
    const id = templateKey.slice('custom:'.length)
    const clientSb = getAdmin()
    if (!clientSb) return 'announcement'
    const { data, error } = await clientSb
      .from('email_templates')
      .select('base_variant')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return ((data?.base_variant as CampaignVariant) || 'announcement')
  }
  const builtin = getBuiltinTemplate(templateKey)
  if (!builtin) throw new Error('Unknown template')
  return builtin.variant
}

export type EmailContact = {
  id: string
  email: string
  name: string | null
  source: 'resend' | 'app'
  unsubscribed?: boolean
}

export async function listEmailContacts(): Promise<{
  contacts: EmailContact[]
  audienceId: string | null
  audienceConfigured: boolean
}> {
  const audienceId = env.resendAudienceId || null
  const resend = getResend()
  const contacts: EmailContact[] = []
  const seen = new Set<string>()

  if (resend && audienceId) {
    const listed = await resend.contacts.list({ audienceId })
    if (listed.error) {
      console.warn('[email-hub] contacts.list', listed.error.message)
    } else {
      for (const c of listed.data?.data || []) {
        const email = (c.email || '').trim().toLowerCase()
        if (!email || seen.has(email)) continue
        seen.add(email)
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || null
        contacts.push({
          id: c.id,
          email,
          name,
          source: 'resend',
          unsubscribed: Boolean(c.unsubscribed),
        })
      }
    }
  }

  return {
    contacts,
    audienceId,
    audienceConfigured: Boolean(resend && audienceId),
  }
}

async function logSend(entry: {
  actorId: string
  actorEmail: string | null
  mode: 'recipients' | 'audience'
  subject: string
  templateKey: string
  recipientCount: number
  resendId: string | null
  status: 'sent' | 'failed'
  detail?: Record<string, unknown>
}): Promise<void> {
  try {
    const clientSb = getAdmin()
    if (!clientSb) return
    await clientSb.from('email_sends').insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail,
      mode: entry.mode,
      subject: entry.subject,
      template_key: entry.templateKey,
      recipient_count: entry.recipientCount,
      resend_id: entry.resendId,
      status: entry.status,
      detail: entry.detail || {},
    })
  } catch (e) {
    console.warn('[email-hub] log send failed', e)
  }
}

export async function sendCampaignToRecipients(input: {
  actorId: string
  actorEmail: string | null
  templateKey: string
  variant: CampaignVariant
  fields: CampaignFields
  emails: string[]
}): Promise<{
  sent: number
  failed: number
  attempted: number
  resendIds: string[]
  errors: { email: string; message: string }[]
  hint: string | null
}> {
  const resend = getResend()
  if (!resend || !env.notifyFromEmail) {
    throw new Error(
      'Email sending is not configured. Set RESEND_API_KEY and YUE_NOTIFY_FROM to an address like JyutTranslate <noreply@yourdomain.com> (must include @).',
    )
  }
  const emails = [...new Set(input.emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (!emails.length) throw new Error('Select at least one recipient.')
  if (emails.length > 100) throw new Error('Select at most 100 recipients per send.')

  const html = await renderCampaignHtml({
    variant: input.variant,
    fields: input.fields,
    includeUnsubscribe: false,
  })

  const subject = input.fields.subject.trim() || 'JyutTranslate'
  const from = env.notifyFromEmail
  const replyTo = supportReplyTo()
  const resendIds: string[] = []
  const errors: { email: string; message: string }[] = []
  let sent = 0

  // Prefer batch (1 API call for up to 100) — avoids rate-limit drops mid-loop.
  const batchPayload = emails.map((to) => ({
    from,
    to: [to],
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  }))

  const batch = await resend.batch.send(batchPayload)
  // SDK types nest as `{ data: { data: { id }[] } }`; tolerate a flat `{ data: { id }[] }` too.
  const batchRows: { id?: string }[] = (() => {
    const raw = batch.data as unknown
    if (!raw || batch.error) return []
    if (Array.isArray(raw)) return raw as { id?: string }[]
    if (typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
      return (raw as { data: { id?: string }[] }).data
    }
    return []
  })()

  if (!batch.error && batchRows.length > 0) {
    for (let i = 0; i < emails.length; i++) {
      const id = batchRows[i]?.id
      if (id) {
        sent += 1
        resendIds.push(id)
      } else {
        errors.push({
          email: emails[i]!,
          message: 'No Resend id returned for this recipient.',
        })
      }
    }
  } else {
    // Batch rejected as a whole (or unavailable) — fall back to sequential with gentle pacing.
    if (batch.error) {
      console.warn('[email-hub] batch.send failed, falling back to sequential', batch.error.message)
    }
    for (let i = 0; i < emails.length; i++) {
      const to = emails[i]!
      let lastMessage = 'Send failed'
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await resend.emails.send({
          from,
          to: [to],
          subject,
          html,
          ...(replyTo ? { replyTo } : {}),
        })
        if (!error && data?.id) {
          sent += 1
          resendIds.push(data.id)
          lastMessage = ''
          break
        }
        lastMessage = error?.message || 'Send failed'
        // Brief pause then retry once on rate limit / transient errors.
        if (attempt === 0 && /rate|too many|timeout|temporar/i.test(lastMessage)) {
          await new Promise((r) => setTimeout(r, 350))
          continue
        }
        break
      }
      if (lastMessage) errors.push({ email: to, message: lastMessage })
      if (i < emails.length - 1) await new Promise((r) => setTimeout(r, 120))
    }
  }

  const testingDomainHint =
    /resend\.dev/i.test(from) && errors.some((e) => /only send testing|own email|verify a domain/i.test(e.message))
      ? `YUE_NOTIFY_FROM uses a Resend test domain (${from}). Test domains can only deliver to your Resend account email — verify your domain at resend.com/domains and set YUE_NOTIFY_FROM to an address on that domain to email all contacts.`
      : errors.some((e) => /only send testing|own email|verify a domain/i.test(e.message))
        ? 'Resend rejected some recipients. Verify your sending domain at resend.com/domains and ensure YUE_NOTIFY_FROM uses that domain.'
        : null

  await logSend({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    mode: 'recipients',
    subject: input.fields.subject,
    templateKey: input.templateKey,
    recipientCount: sent,
    resendId: resendIds[0] || null,
    status: sent > 0 ? 'sent' : 'failed',
    detail: {
      resendIds,
      errors: errors.slice(0, 40),
      attempted: emails.length,
      failed: errors.length,
      hint: testingDomainHint,
    },
  })

  if (!sent) {
    throw new Error(
      testingDomainHint ||
        errors[0]?.message ||
        'Send failed for all recipients.',
    )
  }

  return {
    sent,
    failed: errors.length,
    attempted: emails.length,
    resendIds,
    errors: errors.slice(0, 40),
    hint: testingDomainHint,
  }
}


export async function sendCampaignToAudience(input: {
  actorId: string
  actorEmail: string | null
  templateKey: string
  variant: CampaignVariant
  fields: CampaignFields
}): Promise<{ broadcastId: string }> {
  const resend = getResend()
  if (!resend || !env.notifyFromEmail) {
    throw new Error(
      'Email sending is not configured. Set RESEND_API_KEY and YUE_NOTIFY_FROM to an address like JyutTranslate <noreply@yourdomain.com> (must include @).',
    )
  }
  if (!env.resendAudienceId) {
    throw new Error('Resend audience is not configured (RESEND_AUDIENCE_ID).')
  }

  const html = await renderCampaignHtml({
    variant: input.variant,
    fields: input.fields,
    includeUnsubscribe: true,
  })

  const { data, error } = await resend.broadcasts.create({
    audienceId: env.resendAudienceId,
    from: env.notifyFromEmail,
    ...(supportReplyTo() ? { replyTo: supportReplyTo() } : {}),
    subject: input.fields.subject.trim() || 'JyutTranslate',
    previewText: input.fields.preview.trim() || undefined,
    html,
    name: `Admin hub · ${input.fields.subject.trim().slice(0, 60) || 'campaign'}`,
  })

  if (error) {
    await logSend({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      mode: 'audience',
      subject: input.fields.subject,
      templateKey: input.templateKey,
      recipientCount: 0,
      resendId: null,
      status: 'failed',
      detail: { error: error.message },
    })
    throw new Error(error.message || 'Broadcast create failed')
  }

  const broadcastId = data?.id
  if (!broadcastId) throw new Error('Broadcast create returned no id')

  const sent = await resend.broadcasts.send(broadcastId, {})
  if (sent.error) {
    await logSend({
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      mode: 'audience',
      subject: input.fields.subject,
      templateKey: input.templateKey,
      recipientCount: 0,
      resendId: broadcastId,
      status: 'failed',
      detail: { error: sent.error.message, phase: 'send' },
    })
    throw new Error(sent.error.message || 'Broadcast send failed')
  }

  await logSend({
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    mode: 'audience',
    subject: input.fields.subject,
    templateKey: input.templateKey,
    recipientCount: 0,
    resendId: broadcastId,
    status: 'sent',
    detail: { broadcastId },
  })

  return { broadcastId }
}
