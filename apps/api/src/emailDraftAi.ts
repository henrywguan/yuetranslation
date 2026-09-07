/**
 * Admin Email hub — AI draft for campaign fields.
 * Variant-specific prompts; product-update reasons from the last sent email.
 */
import { z } from 'zod'
import { env, llmChatExtras, openaiConfigured } from './env.js'
import { openaiClient } from './openaiClient.js'
import {
  getBuiltinTemplate,
  type CampaignFields,
  type CampaignVariant,
} from './emails/emailCatalog.js'
import { getLastEmailSend, type EmailSendRow } from './emailCampaign.js'

const FieldsSchema = z.object({
  subject: z.string(),
  preview: z.string(),
  eyebrow: z.string(),
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  secondary: z.string(),
  signOff: z.string(),
})

const DraftResponseSchema = z.object({
  fields: FieldsSchema,
  reasoning: z.string().min(1),
})

export type EmailDraftResult = {
  fields: CampaignFields
  reasoning: string
  model: string
  usedLastSend: boolean
  lastSendAt: string | null
  lastSendSubject: string | null
}

function variantBrief(variant: CampaignVariant): string {
  switch (variant) {
    case 'product-update':
      return [
        'Layout: product-update (changelog).',
        'body MUST be one bullet per line (no leading dashes) — each line becomes a changelog bullet.',
        'If a previous send is provided, summarize NEW improvements since that email — do not repeat the same bullets.',
        'If no previous send, invent a short plausible set of recent product improvements for JyutTranslate (Cantonese translation app: Solo, Conversation, Cam, Jyutping, multilang).',
        'Keep body to 3–6 bullets. Subject should feel like a product update.',
      ].join('\n')
    case 'feature-spotlight':
      return [
        'Layout: feature-spotlight — one feature story.',
        'Pick one concrete JyutTranslate feature and sell it clearly.',
        'body: 1–2 short paragraphs. Strong CTA.',
      ].join('\n')
    case 'newsletter':
      return [
        'Layout: newsletter — multi-section digest.',
        'body: 2–3 short sections separated by blank lines.',
        'Warm, editorial tone.',
      ].join('\n')
    case 'welcome':
      return [
        'Layout: welcome — onboarding for new users.',
        'Friendly, short. Point them to open the app and try Solo or Conversation.',
      ].join('\n')
    case 'plain':
      return [
        'Layout: plain corporate — minimal.',
        'Short paragraphs, restrained tone, clear CTA.',
      ].join('\n')
    case 'announcement':
    default:
      return [
        'Layout: announcement — product news.',
        'Clear headline + short body + CTA to open the app.',
      ].join('\n')
  }
}

function formatLastSend(row: EmailSendRow | null): string {
  if (!row) return 'No previous send found for this layout.'
  const fields = row.detail?.fields
  const variant = typeof row.detail?.variant === 'string' ? row.detail.variant : '(unknown)'
  const body =
    fields && typeof fields === 'object' && typeof (fields as CampaignFields).body === 'string'
      ? (fields as CampaignFields).body
      : '(no body snapshot — only subject was logged)'
  const headline =
    fields && typeof fields === 'object' && typeof (fields as CampaignFields).headline === 'string'
      ? (fields as CampaignFields).headline
      : ''
  return [
    `Last send at: ${row.created_at}`,
    `Subject: ${row.subject}`,
    `Variant: ${variant}`,
    `Status: ${row.status}`,
    headline ? `Headline: ${headline}` : '',
    `Body:\n${body}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function fallbackDraft(
  variant: CampaignVariant,
  current: CampaignFields,
  last: EmailSendRow | null,
): EmailDraftResult {
  const builtin = getBuiltinTemplate(`builtin:${variant}`)
  const base = builtin?.defaults || current
  if (variant === 'product-update' && last) {
    const prevBody =
      last.detail?.fields &&
      typeof last.detail.fields === 'object' &&
      typeof (last.detail.fields as CampaignFields).body === 'string'
        ? (last.detail.fields as CampaignFields).body.trim()
        : ''
    return {
      fields: {
        ...base,
        subject: current.subject.trim() || base.subject,
        preview: 'Fresh improvements since our last note.',
        eyebrow: 'Changelog',
        headline: 'What’s new since last time',
        body:
          'Language picker polish across Solo and Conversation\nSafer mobile language menus that stay on screen\nLaunch hygiene: SEO, sitemap, and social previews\nConversation jade separator and quieter brand chrome',
        secondary: prevBody
          ? 'Building on the last update we sent from the Email hub.'
          : base.secondary,
      },
      reasoning:
        'Model unavailable — used a local product-update draft that assumes recent UI polish since the last Email-hub send. Review bullets before sending.',
      model: 'fallback',
      usedLastSend: true,
      lastSendAt: last.created_at,
      lastSendSubject: last.subject,
    }
  }
  return {
    fields: {
      ...base,
      subject: current.subject.trim() || base.subject,
      preview: current.preview.trim() || base.preview,
    },
    reasoning:
      'Model unavailable — filled from the built-in template for this layout. Edit freely before sending.',
    model: 'fallback',
    usedLastSend: Boolean(last),
    lastSendAt: last?.created_at || null,
    lastSendSubject: last?.subject || null,
  }
}

export async function generateEmailDraft(input: {
  variant: CampaignVariant
  fields: CampaignFields
  templateKey?: string
  notes?: string
}): Promise<EmailDraftResult> {
  const last = await getLastEmailSend({
    variant: input.variant,
    status: 'sent',
  })
  const client = openaiClient()
  if (!client || !openaiConfigured()) {
    return fallbackDraft(input.variant, input.fields, last)
  }

  const system = [
    'You write JyutTranslate marketing emails for the admin Email hub.',
    'JyutTranslate is a live Cantonese (and multilang) translator: Solo, Conversation, Cam, Jyutping, TTS.',
    'Return ONLY valid JSON:',
    '{"fields":{"subject":"","preview":"","eyebrow":"","headline":"","body":"","ctaLabel":"","ctaUrl":"","secondary":"","signOff":""},"reasoning":"string"}',
    'Rules:',
    '- Keep copy concise, premium, and on-brand (no purple AI-slop tone).',
    '- Prefer https://www.jyuttranslate.com or https://www.jyuttranslate.com/#/app for CTAs.',
    '- reasoning: 2–4 short sentences explaining how you used the subject, layout rules, and (if present) the last sent email.',
    '- Do not invent fake legal claims or pricing.',
    variantBrief(input.variant),
  ].join('\n')

  const user = [
    `Layout variant: ${input.variant}`,
    `Template key: ${input.templateKey || '(none)'}`,
    `Current subject (treat as the intent seed): ${input.fields.subject || '(empty)'}`,
    `Current draft fields JSON:\n${JSON.stringify(input.fields, null, 2)}`,
    input.notes?.trim() ? `Admin notes:\n${input.notes.trim()}` : '',
    'Previous Email-hub send for this layout:',
    formatLastSend(last),
    'Produce an updated fields object ready to paste into the composer.',
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.45,
      max_tokens: 1100,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      ...llmChatExtras(),
    })
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(raw)
    } catch {
      throw new Error('Model returned non-JSON')
    }
    const parsed = DraftResponseSchema.parse(parsedJson)
    return {
      fields: parsed.fields,
      reasoning: parsed.reasoning.trim(),
      model: env.openaiModel,
      usedLastSend: Boolean(last),
      lastSendAt: last?.created_at || null,
      lastSendSubject: last?.subject || null,
    }
  } catch (e) {
    console.warn('[email-draft-ai] model failed, using fallback', e)
    return fallbackDraft(input.variant, input.fields, last)
  }
}
