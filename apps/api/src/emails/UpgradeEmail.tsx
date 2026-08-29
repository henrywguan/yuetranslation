import { Text } from '@react-email/components'
import {
  BodyText,
  CtaButton,
  EmailShell,
  MetaRow,
  SoftBlock,
} from './EmailShell.js'
import { emailBrand, emailStyles } from './brand.js'

export type UpgradeEmailProps = {
  email: string
  userId: string
  fromPlan: string
  toPlan: string
  source: string
  when: string
  stripeCustomerId?: string | null
  adminUrl: string
  appUrl?: string
  logoSrc?: string
}

export function UpgradeEmail({
  email,
  userId,
  fromPlan,
  toPlan,
  source,
  when,
  stripeCustomerId,
  adminUrl,
  appUrl,
  logoSrc,
}: UpgradeEmailProps) {
  return (
    <EmailShell
      preview={`Upgrade · ${email} · ${fromPlan} → ${toPlan}`}
      eyebrow="Admin · Billing"
      title="Plan upgrade"
      logoSrc={logoSrc}
      appUrl={appUrl}
    >
      <BodyText>A user moved to a higher plan on JyutTranslate.</BodyText>

      <SoftBlock accent>
        <MetaRow label="Email · " value={email} />
        <MetaRow label="User ID · " value={userId} />
        <Text style={emailStyles.metaRow}>
          <span style={emailStyles.metaLabel}>Plan · </span>
          <span style={{ textDecoration: 'line-through', color: emailBrand.inkMuted }}>
            {fromPlan}
          </span>
          {' → '}
          <span style={{ color: emailBrand.harborMid, fontWeight: 700 }}>{toPlan}</span>
        </Text>
        <MetaRow label="Source · " value={source} />
        {stripeCustomerId ? (
          <MetaRow label="Stripe customer · " value={stripeCustomerId} />
        ) : null}
        <MetaRow label="When · " value={when} />
      </SoftBlock>

      <CtaButton href={adminUrl}>Open admin</CtaButton>
      <Text style={{ ...emailStyles.muted, margin: '8px 0 0', textAlign: 'center' }}>
        {adminUrl}
      </Text>
    </EmailShell>
  )
}

export default UpgradeEmail
