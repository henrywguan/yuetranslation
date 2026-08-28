import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

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

const colors = {
  harbor: '#07131f',
  surface: '#0f2133',
  card: '#13283c',
  border: 'rgba(154, 240, 222, 0.18)',
  jade: '#3dcfb6',
  jadeBright: '#9af0de',
  ink: '#e8f4f1',
  muted: 'rgba(232, 244, 241, 0.62)',
  danger: '#e36b6b',
  warn: '#e0a106',
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <Column style={metaCell}>
      <Text style={metaLabel}>{label}</Text>
      <Text style={metaValue}>{value}</Text>
    </Column>
  )
}

/** Beautiful admin bug-report email — React Email + Resend. */
export function BugReportEmail(props: BugReportEmailProps) {
  const preview = `${props.issueLabel} · ${props.email || props.userId} · ${props.shortId}`

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={hero}>
            <Text style={kicker}>JyutTranslate · Bug report</Text>
            <Heading style={h1}>{props.issueLabel}</Heading>
            <Text style={sub}>
              Self-reported by a signed-in user. Key signals below — open the admin dashboard for the full diagnosis.
            </Text>
          </Section>

          <Section style={badgeRow}>
            <Text style={badge}>
              <span style={badgeDot} />
              {props.shortId}
            </Text>
            <Text style={badgeMuted}>{props.issueType}</Text>
          </Section>

          <Section style={card}>
            <Row>
              <MetaCell label="User" value={props.email || '—'} />
              <MetaCell label="Plan" value={props.plan || '—'} />
            </Row>
            <Hr style={divider} />
            <Row>
              <MetaCell label="Route" value={props.route || '—'} />
              <MetaCell label="Mode" value={props.mode || '—'} />
            </Row>
            <Hr style={divider} />
            <Row>
              <MetaCell
                label="Session"
                value={[
                  props.live ? 'live on' : 'live off',
                  props.translating ? 'translating' : null,
                  props.demoMode ? 'demo mode' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'idle'}
              />
              <MetaCell
                label="Engines"
                value={[
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
                  .join(' · ') || '—'}
              />
            </Row>
            <Hr style={divider} />
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
            <Section style={card}>
              <Text style={sectionLabel}>User note</Text>
              <Text style={bodyText}>{props.note}</Text>
            </Section>
          ) : null}

          {props.hasScreenshot ? (
            <Section style={card}>
              <Text style={sectionLabel}>Screenshot</Text>
              <Text style={mutedText}>User opted in to visual diagnostics.</Text>
              <Img
                src="cid:bug-screenshot"
                alt="User-submitted diagnostic screenshot"
                width="520"
                style={shot}
              />
            </Section>
          ) : null}

          {props.recentEvents.length ? (
            <Section style={card}>
              <Text style={sectionLabel}>Recent trail</Text>
              {props.recentEvents.map((line) => (
                <Text key={line} style={eventLine}>
                  {line}
                </Text>
              ))}
            </Section>
          ) : null}

          <Section style={ctaSection}>
            <Button href={props.adminUrl} style={button}>
              Open Reports dashboard
            </Button>
            <Text style={footerId}>
              Report ID <span style={mono}>{props.reportId}</span>
            </Text>
            <Text style={footerId}>
              User ID <span style={mono}>{props.userId}</span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: colors.harbor,
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  padding: '28px 12px',
}

const container = {
  margin: '0 auto',
  maxWidth: '560px',
}

const hero = {
  padding: '8px 4px 18px',
}

const kicker = {
  color: colors.jadeBright,
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}

const h1 = {
  color: colors.ink,
  fontSize: '24px',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: '1.25',
  margin: '0 0 8px',
}

const sub = {
  color: colors.muted,
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
}

const badgeRow = {
  marginBottom: '12px',
}

const badge = {
  display: 'inline-block',
  backgroundColor: 'rgba(61, 207, 182, 0.14)',
  border: `1px solid ${colors.border}`,
  borderRadius: '999px',
  color: colors.jadeBright,
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
  backgroundColor: colors.jade,
  marginRight: '8px',
}

const badgeMuted = {
  display: 'inline-block',
  color: colors.muted,
  fontSize: '12px',
  margin: '0',
}

const card = {
  backgroundColor: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: '14px',
  padding: '14px 16px',
  marginBottom: '12px',
}

const metaCell = {
  width: '50%',
  verticalAlign: 'top' as const,
  paddingRight: '8px',
}

const metaLabel = {
  color: colors.muted,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const metaValue = {
  color: colors.ink,
  fontSize: '13px',
  lineHeight: '1.4',
  margin: '0',
  wordBreak: 'break-word' as const,
}

const divider = {
  borderColor: colors.border,
  borderTop: `1px solid ${colors.border}`,
  margin: '10px 0',
}

const alertCard = {
  backgroundColor: 'rgba(227, 107, 107, 0.12)',
  border: '1px solid rgba(227, 107, 107, 0.35)',
  borderRadius: '14px',
  padding: '14px 16px',
  marginBottom: '12px',
}

const alertLabel = {
  color: colors.danger,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  margin: '0 0 6px',
}

const alertBody = {
  color: colors.ink,
  fontSize: '13px',
  lineHeight: '1.45',
  margin: '0',
  wordBreak: 'break-word' as const,
}

const sectionLabel = {
  color: colors.muted,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}

const bodyText = {
  color: colors.ink,
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}

const mutedText = {
  color: colors.muted,
  fontSize: '12px',
  margin: '0 0 10px',
}

const shot = {
  display: 'block',
  width: '100%',
  maxWidth: '520px',
  borderRadius: '10px',
  border: `1px solid ${colors.border}`,
}

const eventLine = {
  color: colors.muted,
  fontSize: '12px',
  lineHeight: '1.45',
  margin: '0 0 4px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

const ctaSection = {
  textAlign: 'center' as const,
  padding: '8px 0 4px',
}

const button = {
  backgroundColor: colors.jade,
  borderRadius: '999px',
  color: colors.harbor,
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: 700,
  padding: '12px 22px',
  textDecoration: 'none',
}

const footerId = {
  color: colors.muted,
  fontSize: '11px',
  margin: '10px 0 0',
}

const mono = {
  color: colors.jadeBright,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}
