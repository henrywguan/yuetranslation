/**
 * Built-in campaign template catalog (no JSX — safe on API boot path).
 */
export type CampaignVariant =
  | 'announcement'
  | 'product-update'
  | 'feature-spotlight'
  | 'newsletter'
  | 'welcome'
  | 'plain'

export type CampaignFields = {
  subject: string
  preview: string
  eyebrow: string
  headline: string
  body: string
  ctaLabel: string
  ctaUrl: string
  secondary: string
  signOff: string
}

export type BuiltinTemplateMeta = {
  id: string
  kind: 'builtin'
  variant: CampaignVariant
  name: string
  description: string
  /** CSS thumbnail layout hint */
  thumb: 'hero' | 'split' | 'digest' | 'minimal' | 'spotlight' | 'welcome'
  defaults: CampaignFields
}

const APP = 'https://jyuttranslate.com'

export const BUILTIN_TEMPLATES: BuiltinTemplateMeta[] = [
  {
    id: 'builtin:announcement',
    kind: 'builtin',
    variant: 'announcement',
    name: 'Announcement',
    description: 'Corporate product announcement with clear headline and CTA.',
    thumb: 'hero',
    defaults: {
      subject: 'What’s new at JyutTranslate',
      preview: 'A short update from the JyutTranslate team.',
      eyebrow: 'Product news',
      headline: 'Something new for Cantonese learners',
      body:
        'We shipped improvements that make live translation feel faster and clearer.\n\nOpen the app to try them on your next conversation.',
      ctaLabel: 'Open JyutTranslate',
      ctaUrl: APP,
      secondary: 'Questions? Just reply to this email.',
      signOff: '— The JyutTranslate team',
    },
  },
  {
    id: 'builtin:product-update',
    kind: 'builtin',
    variant: 'product-update',
    name: 'Product update',
    description: 'Changelog-style update with bullet lines from the body.',
    thumb: 'digest',
    defaults: {
      subject: 'JyutTranslate product update',
      preview: 'This week’s improvements, in brief.',
      eyebrow: 'Changelog',
      headline: 'This week’s update',
      body:
        'Faster text translation with smarter pacing\nClearer Jyutping in details\nMore reliable live mic sessions\nAdmin tools for support and email',
      ctaLabel: 'See it in the app',
      ctaUrl: APP,
      secondary: 'You’re receiving this because you use JyutTranslate.',
      signOff: 'Thanks for building with us.',
    },
  },
  {
    id: 'builtin:feature-spotlight',
    kind: 'builtin',
    variant: 'feature-spotlight',
    name: 'Feature spotlight',
    description: 'Single-feature story with a strong call to action.',
    thumb: 'spotlight',
    defaults: {
      subject: 'Try Camera translation',
      preview: 'Point, capture, and read Cantonese in context.',
      eyebrow: 'Feature',
      headline: 'Translate what you see',
      body:
        'Camera mode helps you read menus, signs, and study materials with Cantonese-aware results — including Jyutping when you need it.',
      ctaLabel: 'Try Camera mode',
      ctaUrl: `${APP}/#/app`,
      secondary: 'Available on plans that include Cam.',
      signOff: 'Happy translating.',
    },
  },
  {
    id: 'builtin:newsletter',
    kind: 'builtin',
    variant: 'newsletter',
    name: 'Newsletter',
    description: 'Digest layout for multi-topic updates.',
    thumb: 'digest',
    defaults: {
      subject: 'JyutTranslate notes',
      preview: 'Tips, product notes, and Cantonese context.',
      eyebrow: 'Newsletter',
      headline: 'Notes from harbor & jade',
      body:
        'Tip — Hold to speak when you want full control of a turn.\n\nProduct — Account hub now surfaces plan usage at a glance.\n\nCommunity — Tell us what blocked you via Report a bug.',
      ctaLabel: 'Open the app',
      ctaUrl: APP,
      secondary: 'Unsubscribe anytime via the link in the footer.',
      signOff: 'Until next time.',
    },
  },
  {
    id: 'builtin:welcome',
    kind: 'builtin',
    variant: 'welcome',
    name: 'Welcome',
    description: 'Warm onboarding note for new accounts.',
    thumb: 'welcome',
    defaults: {
      subject: 'Welcome to JyutTranslate',
      preview: 'English ↔ Cantonese, built for real conversations.',
      eyebrow: 'Welcome',
      headline: 'You’re in — 歡迎',
      body:
        'JyutTranslate helps you speak and understand Cantonese with live speech, text, and camera modes.\n\nStart with Solo mode, then try Conversation when you’re face-to-face.',
      ctaLabel: 'Start translating',
      ctaUrl: `${APP}/#/app`,
      secondary: 'Need help? Reply to this email.',
      signOff: 'Glad you’re here.',
    },
  },
  {
    id: 'builtin:plain',
    kind: 'builtin',
    variant: 'plain',
    name: 'Plain corporate',
    description: 'Minimal professional letter — subject, body, optional CTA.',
    thumb: 'minimal',
    defaults: {
      subject: 'A note from JyutTranslate',
      preview: 'A short message from the team.',
      eyebrow: '',
      headline: 'Hello',
      body: 'We wanted to share a quick update with you.\n\nThank you for using JyutTranslate.',
      ctaLabel: '',
      ctaUrl: '',
      secondary: '',
      signOff: 'Best regards,\nJyutTranslate',
    },
  },
]

export function getBuiltinTemplate(id: string): BuiltinTemplateMeta | undefined {
  return BUILTIN_TEMPLATES.find((t) => t.id === id)
}

export function emptyCampaignFields(): CampaignFields {
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

export function mergeCampaignFields(
  base: CampaignFields,
  patch: Partial<CampaignFields> | null | undefined,
): CampaignFields {
  const out = { ...base }
  if (!patch) return out
  for (const key of Object.keys(out) as (keyof CampaignFields)[]) {
    if (typeof patch[key] === 'string') out[key] = patch[key] as string
  }
  return out
}
