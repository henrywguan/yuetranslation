import { Text } from '@react-email/components'
import {
  BodyText,
  CtaButton,
  EmailShell,
  MetaRow,
  SoftBlock,
} from './EmailShell.js'
import { emailStyles } from './brand.js'

export type SignupEmailProps = {
  email: string
  userId: string
  provider: string
  emailConfirmed: string
  createdAt: string
  adminUrl: string
  appUrl?: string
  logoSrc?: string
}

export function SignupEmail({
  email,
  userId,
  provider,
  emailConfirmed,
  createdAt,
  adminUrl,
  appUrl,
  logoSrc,
}: SignupEmailProps) {
  return (
    <EmailShell
      preview={`New signup · ${email}`}
      eyebrow="Admin · Growth"
      title="New signup"
      logoSrc={logoSrc}
      appUrl={appUrl}
    >
      <BodyText>Someone just created an account on JyutTranslate.</BodyText>

      <SoftBlock accent>
        <MetaRow label="Email · " value={email} />
        <MetaRow label="User ID · " value={userId} />
        <MetaRow label="Provider · " value={provider} />
        <MetaRow label="Email confirmed · " value={emailConfirmed} />
        <MetaRow label="When · " value={createdAt} />
      </SoftBlock>

      <CtaButton href={adminUrl}>Open admin</CtaButton>
      <Text style={{ ...emailStyles.muted, margin: '8px 0 0', textAlign: 'center' }}>
        {adminUrl}
      </Text>
    </EmailShell>
  )
}

export default SignupEmail
