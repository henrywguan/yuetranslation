import {
  Body,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import {
  EMAIL_FONTS_CSS,
  EMAIL_LOGO_SIZE,
  emailBrand,
  emailStyles,
} from "./brand.js";

type EmailShellProps = {
  preview: string;
  title: string;
  /** Small uppercase label above the title (e.g. Admin · Bug report). */
  eyebrow?: string;
  children: ReactNode;
  /**
   * Logo image src. Prefer an absolute https URL (e.g. `/apple-touch-icon.png`)
   * — Gmail/webmail reliably load hosted images; CID is reserved for one-off
   * screenshots that cannot be hosted.
   */
  logoSrc?: string;
  appUrl?: string;
};

/**
 * Shared branded envelope for all transactional / admin emails.
 * Harbor + jade palette, Syne + Noto Sans HK, logo mark.
 */
export function EmailShell({
  preview,
  title,
  eyebrow,
  children,
  logoSrc,
  appUrl = "https://jyuttranslate.com",
}: EmailShellProps) {
  const base = appUrl.replace(/\/+$/, "") || "https://jyuttranslate.com";
  const imgSrc = logoSrc?.trim() || `${base}/apple-touch-icon.png`;

  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href={EMAIL_FONTS_CSS} />
        <Font
          fontFamily="Syne"
          fallbackFontFamily={["Helvetica", "Arial"]}
          fontWeight={700}
          fontStyle="normal"
        />
        <Font
          fontFamily="Noto Sans HK"
          fallbackFontFamily={["Helvetica", "Arial"]}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={emailStyles.header}>
            <Img
              src={imgSrc}
              width={EMAIL_LOGO_SIZE}
              height={EMAIL_LOGO_SIZE}
              alt="JyutTranslate"
              style={emailStyles.logo}
            />
            <Heading as="h1" style={emailStyles.brandName}>
              JyutTranslate
            </Heading>
            <Text style={emailStyles.brandTag}>
              English ↔ Cantonese · 粵語翻譯
            </Text>
          </Section>

          <Section style={emailStyles.card}>
            {eyebrow ? <Text style={emailStyles.eyebrow}>{eyebrow}</Text> : null}
            <Heading as="h2" style={emailStyles.title}>
              {title}
            </Heading>
            {children}
          </Section>

          <Section style={emailStyles.footer}>
            <Text style={emailStyles.footerText}>
              Sent by{" "}
              <Link href={appUrl} style={emailStyles.footerLink}>
                JyutTranslate
              </Link>
              {" · "}
              <span style={{ color: emailBrand.jadeBright }}>harbor & jade</span>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={emailStyles.metaRow}>
      <span style={emailStyles.metaLabel}>{label}</span>
      {value}
    </Text>
  );
}

export function SoftBlock({
  label,
  children,
  accent,
}: {
  label?: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <Section style={accent ? emailStyles.softBlockAccent : emailStyles.softBlock}>
      {label ? <Text style={emailStyles.sectionLabel}>{label}</Text> : null}
      {children}
    </Section>
  );
}

export function BodyText({ children }: { children: ReactNode }) {
  return <Text style={emailStyles.bodyText}>{children}</Text>;
}

export function MutedText({ children }: { children: ReactNode }) {
  return <Text style={emailStyles.muted}>{children}</Text>;
}

export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ textAlign: "center", margin: "20px 0 8px" }}>
      <Link href={href} style={emailStyles.cta}>
        {children}
      </Link>
    </Section>
  );
}
