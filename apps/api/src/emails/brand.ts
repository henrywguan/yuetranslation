/**
 * Shared brand tokens for transactional / admin emails.
 * Mirrors apps/web design system (harbor + jade, Syne + Noto Sans HK).
 */

export const emailBrand = {
  harbor: "#07131f",
  harborDeep: "#040b14",
  harborMid: "#0c1a2a",
  jade: "#3dcfb6",
  jadeBright: "#5eead4",
  jadeSoft: "#e8faf6",
  mint: "#a8e6cf",
  foam: "#f4fbf8",
  ink: "#0b1220",
  inkMuted: "#5a6b7d",
  line: "#d4e4dc",
  white: "#ffffff",
  danger: "#c45c5c",
  dangerSoft: "#fdf2f2",
} as const;

/** Google Fonts CSS — same families as apps/web/index.html */
export const EMAIL_FONTS_CSS =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap";

export const emailFonts = {
  display: '"Syne", "Helvetica Neue", Helvetica, Arial, sans-serif',
  body: '"Noto Sans HK", "Helvetica Neue", Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
} as const;

/** CID used when attaching the logo PNG to every branded email. */
export const EMAIL_LOGO_CID = "jyut-logo";

export const EMAIL_LOGO_SIZE = 56;

export const emailStyles = {
  body: {
    backgroundColor: emailBrand.harbor,
    backgroundImage:
      "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(61, 207, 182, 0.18), transparent 55%)",
    fontFamily: emailFonts.body,
    margin: "0",
    padding: "32px 12px",
  },
  container: {
    margin: "0 auto",
    maxWidth: "560px",
  },
  header: {
    textAlign: "center" as const,
    padding: "8px 0 20px",
  },
  logo: {
    display: "block",
    margin: "0 auto 12px",
    borderRadius: "14px",
    border: `1px solid rgba(61, 207, 182, 0.35)`,
  },
  brandName: {
    color: emailBrand.white,
    fontFamily: emailFonts.display,
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    margin: "0 0 4px",
    lineHeight: "1.2",
  },
  brandTag: {
    color: emailBrand.jadeBright,
    fontFamily: emailFonts.body,
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.04em",
    margin: "0",
    opacity: 0.9,
  },
  card: {
    backgroundColor: emailBrand.foam,
    borderRadius: "16px",
    border: `1px solid rgba(61, 207, 182, 0.28)`,
    padding: "28px 24px",
  },
  eyebrow: {
    color: emailBrand.jade,
    fontFamily: emailFonts.body,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: "0 0 8px",
  },
  title: {
    color: emailBrand.ink,
    fontFamily: emailFonts.display,
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    lineHeight: "1.25",
    margin: "0 0 16px",
  },
  bodyText: {
    color: emailBrand.ink,
    fontFamily: emailFonts.body,
    fontSize: "15px",
    lineHeight: "1.55",
    margin: "0 0 12px",
  },
  muted: {
    color: emailBrand.inkMuted,
    fontFamily: emailFonts.body,
    fontSize: "13px",
    lineHeight: "1.5",
    margin: "0 0 8px",
  },
  softBlock: {
    backgroundColor: emailBrand.white,
    borderRadius: "12px",
    border: `1px solid ${emailBrand.line}`,
    padding: "14px 16px",
    margin: "0 0 14px",
  },
  softBlockAccent: {
    backgroundColor: emailBrand.jadeSoft,
    borderRadius: "12px",
    border: `1px solid rgba(61, 207, 182, 0.35)`,
    padding: "14px 16px",
    margin: "0 0 14px",
  },
  sectionLabel: {
    color: emailBrand.inkMuted,
    fontFamily: emailFonts.body,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    margin: "0 0 6px",
  },
  metaRow: {
    color: emailBrand.ink,
    fontFamily: emailFonts.body,
    fontSize: "13px",
    lineHeight: "1.55",
    margin: "0 0 4px",
  },
  metaLabel: {
    color: emailBrand.inkMuted,
    fontWeight: 600,
  },
  mono: {
    fontFamily: emailFonts.mono,
    fontSize: "12px",
    wordBreak: "break-all" as const,
  },
  pre: {
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
    fontFamily: emailFonts.body,
    fontSize: "14px",
    lineHeight: "1.5",
    color: emailBrand.ink,
    margin: "0",
  },
  hr: {
    borderColor: emailBrand.line,
    borderTop: `1px solid ${emailBrand.line}`,
    margin: "18px 0",
  },
  link: {
    color: emailBrand.harborMid,
    fontWeight: 600,
  },
  cta: {
    backgroundColor: emailBrand.jade,
    borderRadius: "999px",
    color: emailBrand.harbor,
    display: "inline-block",
    fontFamily: emailFonts.display,
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    padding: "12px 22px",
    textDecoration: "none",
  },
  footer: {
    textAlign: "center" as const,
    padding: "20px 8px 8px",
  },
  footerText: {
    color: "rgba(244, 251, 248, 0.55)",
    fontFamily: emailFonts.body,
    fontSize: "12px",
    lineHeight: "1.45",
    margin: "0",
  },
  footerLink: {
    color: emailBrand.jadeBright,
    textDecoration: "underline",
  },
  screenshot: {
    display: "block",
    width: "100%",
    maxWidth: "100%",
    height: "auto",
    borderRadius: "10px",
    border: `1px solid ${emailBrand.line}`,
  },
} as const;
