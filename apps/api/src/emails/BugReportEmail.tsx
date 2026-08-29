import {
  Column,
  Hr,
  Img,
  Row,
  Section,
  Text,
} from '@react-email/components'
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText,
} from './EmailShell.js'
import { emailBrand, emailFonts, emailStyles } from './brand.js'

export type BugReportEmailProps = {
  reportId: string
  shortId: string
  issueType: string
  issueLabel: string
  email: string | null
  userId: string
  route: string | null
  mode: string | null
  plan: string | null
  lastError: string | null
  note: string | null
  appVersion: string | null
  theme: string | null
  viewport: string | null
  live: boolean
  translating: boolean
  demoMode: boolean
  cloudReady: boolean | null
  modelConfigured: boolean | null
  visionConfigured: boolean | null
  recentEvents: string[]
  adminUrl: string
  appUrl?: string
  logoSrc?: string
  /** When true, template references cid:bug-screenshot */
  hasScreenshot: boolean
}

const ISSUE_LABELS: Record<string, string> = {
  translation: 'Translation wrong',
  mic: 'Mic / live speech',
  tts: 'Voice / TTS',
  camera: 'Camera / OCR',
  account: 'Login / billing',
  ui: 'UI / layout',
  crash: 'Crash / freeze',
  other: 'Other',
}

export function issueTypeLabel(type: string): string {
  return ISSUE_LABELS[type] || type
}

export function shortReportId(id: string): string {
  return `rpt_${id.replace(/-/g, '').slice(0, 6)}`
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <Column style={metaCell}>
      <Text style={metaLabel}>{label}</Text>
      <Text style={metaValue}>{value}</Text>
    </Column>
  )
}

/** Admin bug-report email — branded shell + rich diagnostics. */
export function BugReportEmail(props: BugReportEmailProps) {
  const preview = `${props.issueLabel} · ${props.email || props.userId} · ${props.shortId}`
  const session =
    [
      props.live ? 'live on' : 'live off',
      props.translating ? 'translating' : null,
      props.demoMode ? 'demo mode' : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'idle'
  const engines =
    [
      props.cloudReady == null ? null : props.cloudReady ? 'cloud' : 'no-cloud',
      props.modelConfigured == null
        ? null
        : props.modelConfigured
          ? 'model'
          : 'no-model',
      props.visionConfigured == null
        ? null
        : props.visionConfigured
          ? 'vision'
          : 'no-vision',
    ]
      .filter(Boolean)
      .join(' · ') || '—'

  return (
    <EmailShell
      preview={preview}
      eyebrow="Admin · Bug report"
      title={props.issueLabel}
      logoSrc={props.logoSrc}
      appUrl={props.appUrl}
    >
      <BodyText>
        Self-reported by a signed-in user. Key signals below — open the admin
        dashboard for the full diagnosis.
      </BodyText>

      <Section style={{ marginBottom: '12px' }}>
        <Text style={badge}>
          <span style={badgeDot} />
          {props.shortId}
        </Text>
        <Text style={badgeMuted}>{props.issueType}</Text>
      </Section>

      <Section style={emailStyles.softBlock}>
        <Row>
          <MetaCell label="User" value={props.email || '—'} />
          <MetaCell label="Plan" value={props.plan || '—'} />
        </Row>
        <Hr style={emailStyles.hr} />
        <Row>
          <MetaCell label="Route" value={props.route || '—'} />
          <MetaCell label="Mode" value={props.mode || '—'} />
        </Row>
        <Hr style={emailStyles.hr} />
        <Row>
          <MetaCell label="Session" value={session} />
          <MetaCell label="Engines" value={engines} />
        </Row>
        <Hr style={emailStyles.hr} />
        <Row>
          <MetaCell label="App" value={props.appVersion || '—'} />
          <MetaCell
            label="Device"
            value={[props.theme, props.viewport].filter(Boolean).join(' · ') || '—'}
          />
        </Row>
      </Section>

      {props.lastError ? (
        <Section style={alertCard}>
          <Text style={alertLabel}>Last visible error</Text>
          <Text style={alertBody}>{props.lastError}</Text>
        </Section>
      ) : null}

      {props.note ? (
        <Section style={emailStyles.softBlock}>
          <Text style={emailStyles.sectionLabel}>User note</Text>
          <Text style={emailStyles.pre}>{props.note}</Text>
        </Section>
      ) : null}

      {props.hasScreenshot ? (
        <Section style={emailStyles.softBlock}>
          <Text style={emailStyles.sectionLabel}>Screenshot</Text>
          <MutedText>User opted in to visual diagnostics.</MutedText>
          <Img
            src="cid:bug-screenshot"
            alt="User-submitted diagnostic screenshot"
            width="520"
            style={emailStyles.screenshot}
          />
        </Section>
      ) : null}

      {props.recentEvents.length ? (
        <Section style={emailStyles.softBlock}>
          <Text style={emailStyles.sectionLabel}>Recent trail</Text>
          {props.recentEvents.map((line) => (
            <Text key={line} style={eventLine}>
              {line}
            </Text>
          ))}
        </Section>
      ) : null}

      <CtaButton href={props.adminUrl}>Open Reports dashboard</CtaButton>
      <Text style={{ ...emailStyles.muted, margin: '10px 0 0', textAlign: 'center' }}>
        Report ID{' '}
        <span style={{ color: emailBrand.harborMid, fontFamily: emailFonts.mono }}>
          {props.reportId}
        </span>
      </Text>
      <Text style={{ ...emailStyles.muted, margin: '4px 0 0', textAlign: 'center' }}>
        User ID{' '}
        <span style={{ color: emailBrand.harborMid, fontFamily: emailFonts.mono }}>
          {props.userId}
        </span>
      </Text>
    </EmailShell>
  )
}

export default BugReportEmail

const metaCell = {
  width: '50%',
  verticalAlign: 'top' as const,
  paddingRight: '8px',
}

const metaLabel = {
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const metaValue = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: '13px',
  lineHeight: '1.4',
  margin: '0',
  wordBreak: 'break-word' as const,
}

const badge = {
  display: 'inline-block',
  backgroundColor: 'rgba(61, 207, 182, 0.14)',
  border: `1px solid rgba(61, 207, 182, 0.35)`,
  borderRadius: '999px',
  color: emailBrand.harborMid,
  fontFamily: emailFonts.body,
  fontSize: '12px',
  fontWeight: 700,
  padding: '6px 12px',
  margin: '0 8px 0 0',
}

const badgeDot = {
  display: 'inline-block',
  width: '6px',
  height: '6px',
  borderRadius: '999px',
  backgroundColor: emailBrand.jade,
  marginRight: '8px',
}

const badgeMuted = {
  display: 'inline-block',
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: '12px',
  margin: '0',
}

const alertCard = {
  backgroundColor: emailBrand.dangerSoft,
  border: `1px solid rgba(196, 92, 92, 0.35)`,
  borderRadius: '12px',
  padding: '14px 16px',
  marginBottom: '14px',
}

const alertLabel = {
  color: emailBrand.danger,
  fontFamily: emailFonts.body,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
}

const alertBody = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: '13px',
  lineHeight: '1.45',
  margin: '0',
  wordBreak: 'break-word' as const,
}

const eventLine = {
  color: emailBrand.inkMuted,
  fontSize: '12px',
  lineHeight: '1.45',
  margin: '0 0 4px',
  fontFamily: emailFonts.mono,
}
