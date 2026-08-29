import { Hr, Link, Section, Text } from '@react-email/components'
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText,
  SoftBlock,
} from './EmailShell.js'
import type { CampaignFields, CampaignVariant } from './emailCatalog.js'
import { emailBrand, emailFonts, emailStyles } from './brand.js'

export type CampaignEmailProps = CampaignFields & {
  variant: CampaignVariant
  appUrl?: string
  logoSrc?: string
  /** Append Resend broadcast unsubscribe token line when sending to an audience. */
  includeUnsubscribe?: boolean
}

function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function lines(body: string): string[] {
  return body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/** Branded marketing / campaign email used by the Admin Email hub. */
export function CampaignEmail(props: CampaignEmailProps) {
  const {
    variant,
    subject,
    preview,
    eyebrow,
    headline,
    body,
    ctaLabel,
    ctaUrl,
    secondary,
    signOff,
    appUrl,
    logoSrc,
    includeUnsubscribe,
  } = props

  const showCta = Boolean(ctaLabel?.trim() && ctaUrl?.trim())
  const shellPreview = preview?.trim() || subject || headline || 'JyutTranslate'

  return (
    <EmailShell
      preview={shellPreview}
      eyebrow={eyebrow?.trim() || undefined}
      title={headline?.trim() || subject || 'Update'}
      logoSrc={logoSrc}
      appUrl={appUrl}
    >
      {variant === 'product-update' ? (
        <SoftBlock accent label="What’s included">
          {lines(body).map((line) => (
            <Text key={line} style={bullet}>
              <span style={bulletDot}>●</span> {line}
            </Text>
          ))}
        </SoftBlock>
      ) : variant === 'newsletter' ? (
        paragraphs(body).map((block, i) => (
          <SoftBlock key={`${i}-${block.slice(0, 24)}`}>
            <Text style={emailStyles.pre}>{block}</Text>
          </SoftBlock>
        ))
      ) : variant === 'feature-spotlight' ? (
        <SoftBlock accent>
          {paragraphs(body).map((p) => (
            <BodyText key={p.slice(0, 32)}>{p}</BodyText>
          ))}
        </SoftBlock>
      ) : (
        paragraphs(body).map((p) => <BodyText key={p.slice(0, 32)}>{p}</BodyText>)
      )}

      {showCta ? <CtaButton href={ctaUrl.trim()}>{ctaLabel.trim()}</CtaButton> : null}

      {secondary?.trim() ? <MutedText>{secondary.trim()}</MutedText> : null}

      {signOff?.trim() ? (
        <>
          <Hr style={emailStyles.hr} />
          <Text style={signOffStyle}>{signOff.trim()}</Text>
        </>
      ) : null}

      {includeUnsubscribe ? (
        <Section style={{ marginTop: '18px' }}>
          <Text style={unsub}>
            <Link href="{{{RESEND_UNSUBSCRIBE_URL}}}" style={emailStyles.footerLink}>
              Unsubscribe
            </Link>
          </Text>
        </Section>
      ) : null}
    </EmailShell>
  )
}

export default CampaignEmail

const bullet = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 8px',
}

const bulletDot = {
  color: emailBrand.jade,
  marginRight: '8px',
}

const signOffStyle = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: '14px',
  lineHeight: '1.55',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const unsub = {
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '0',
}
