/** Supabase Auth Send Email Hook — `email_data.email_action_type` values. */
export type AuthEmailAction =
  | 'signup'
  | 'magiclink'
  | 'recovery'
  | 'reset_password'
  | 'invite'
  | 'email_change'
  | 'login'
  | 'email'

export type AuthEmailCopy = {
  subject: string
  eyebrow: string
  title: string
  lead: string
  ctaLabel: string
  footer: string
  /** Passed to `/auth/v1/verify?type=` (defaults to raw action). */
  verifyType: string
  showOtp: boolean
}

const DEFAULT: AuthEmailCopy = {
  subject: 'JyutTranslate account email',
  eyebrow: 'Account',
  title: 'Action required',
  lead: 'Use the button below to continue.',
  ctaLabel: 'Continue',
  footer: 'If you didn’t request this, you can safely ignore this email.',
  verifyType: 'magiclink',
  showOtp: true,
}

/** Branded copy per Supabase auth email action. */
export function authEmailCopy(action: string): AuthEmailCopy {
  switch (action) {
    case 'signup':
      return {
        subject: 'Confirm your JyutTranslate account',
        eyebrow: 'Welcome',
        title: 'Confirm your email',
        lead: 'Thanks for signing up. Confirm your email to start translating English ↔ Cantonese.',
        ctaLabel: 'Confirm email',
        footer: 'If you didn’t create a JyutTranslate account, you can ignore this email.',
        verifyType: 'signup',
        showOtp: true,
      }
    case 'magiclink':
    case 'login':
      return {
        subject: 'Sign in to JyutTranslate',
        eyebrow: 'Sign in',
        title: 'Your sign-in link',
        lead: 'Tap the button below to sign in. The link expires soon for your security.',
        ctaLabel: 'Sign in',
        footer: 'If you didn’t try to sign in, you can ignore this email.',
        verifyType: action === 'login' ? 'login' : 'magiclink',
        showOtp: true,
      }
    case 'recovery':
    case 'reset_password':
      return {
        subject: 'Reset your JyutTranslate password',
        eyebrow: 'Security',
        title: 'Reset your password',
        lead: 'We received a request to reset your password. Use the button below to choose a new one.',
        ctaLabel: 'Reset password',
        footer: 'If you didn’t request a reset, you can ignore this email — your password stays the same.',
        verifyType: 'recovery',
        showOtp: true,
      }
    case 'invite':
      return {
        subject: 'You’re invited to JyutTranslate',
        eyebrow: 'Invite',
        title: 'Accept your invite',
        lead: 'Someone invited you to JyutTranslate. Confirm your email to join.',
        ctaLabel: 'Accept invite',
        footer: 'If you weren’t expecting this invite, you can ignore this email.',
        verifyType: 'invite',
        showOtp: true,
      }
    case 'email_change':
    case 'email':
      return {
        subject: 'Confirm your new email · JyutTranslate',
        eyebrow: 'Account',
        title: 'Confirm email change',
        lead: 'Confirm this address to finish updating your JyutTranslate account email.',
        ctaLabel: 'Confirm new email',
        footer: 'If you didn’t change your email, contact support immediately.',
        verifyType: 'email_change',
        showOtp: true,
      }
    default:
      return { ...DEFAULT, verifyType: action || DEFAULT.verifyType }
  }
}

/** Build Supabase `/auth/v1/verify` link for email actions. */
export function buildSupabaseVerifyUrl(input: {
  supabaseUrl: string
  tokenHash: string
  verifyType: string
  redirectTo: string
}): string {
  const base = input.supabaseUrl.replace(/\/+$/, '')
  const redirect = encodeURIComponent(input.redirectTo.trim() || 'https://jyuttranslate.com')
  const token = encodeURIComponent(input.tokenHash)
  const type = encodeURIComponent(input.verifyType)
  return `${base}/auth/v1/verify?token=${token}&type=${type}&redirect_to=${redirect}`
}
