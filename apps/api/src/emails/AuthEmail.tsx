import { Text } from '@react-email/components'
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText,
  SoftBlock,
} from './EmailShell.js'
import type { AuthEmailCopy } from './authEmailMeta.js'
import { emailBrand, emailFonts, emailStyles } from './brand.js'

export type AuthEmailProps = {
  copy: AuthEmailCopy
  verifyUrl: string
  /** Short numeric/alphanumeric code when Supabase sends OTP-style tokens. */
  otpCode?: string | null
  appUrl?: string
  logoSrc?: string
}

/** User-facing Supabase auth emails — confirm signup, magic link, recovery, etc. */
export function AuthEmail({ copy, verifyUrl, otpCode, appUrl, logoSrc }: AuthEmailProps) {
  const code = otpCode?.trim() || ''
  const showCode = copy.showOtp && code.length > 0 && code.length <= 12

  return (
    <EmailShell
      preview={copy.lead}
      eyebrow={copy.eyebrow}
      title={copy.title}
      logoSrc={logoSrc}
      appUrl={appUrl}
    >
      <BodyText>{copy.lead}</BodyText>

      <CtaButton href={verifyUrl}>{copy.ctaLabel}</CtaButton>

      {showCode ? (
        <SoftBlock accent label="Or use this code">
          <Text style={otpStyle}>{code}</Text>
          <MutedText>Enter this code if the button doesn’t open on your device.</MutedText>
        </SoftBlock>
      ) : null}

      <MutedText>{copy.footer}</MutedText>
      <Text style={{ ...emailStyles.muted, margin: '12px 0 0', fontSize: '11px', wordBreak: 'break-all' }}>
        {verifyUrl}
      </Text>
    </EmailShell>
  )
}

export default AuthEmail

const otpStyle = {
  color: emailBrand.ink,
  fontFamily: emailFonts.mono,
  fontSize: '28px',
  fontWeight: 700 as const,
  letterSpacing: '0.18em',
  margin: '4px 0 8px',
  textAlign: 'center' as const,
}
