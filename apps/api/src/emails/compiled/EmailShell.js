import { jsx, jsxs } from "react/jsx-runtime";
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
  Text
} from "@react-email/components";
import {
  EMAIL_FONTS_CSS,
  EMAIL_LOGO_SIZE,
  emailBrand,
  emailStyles
} from "../brand.js";
function EmailShell({
  preview,
  title,
  eyebrow,
  children,
  logoSrc,
  appUrl = "https://jyuttranslate.com"
}) {
  const base = appUrl.replace(/\/+$/, "") || "https://jyuttranslate.com";
  const imgSrc = logoSrc?.trim() || `${base}/apple-touch-icon.png`;
  return /* @__PURE__ */ jsxs(Html, { lang: "en", children: [
    /* @__PURE__ */ jsxs(Head, { children: [
      /* @__PURE__ */ jsx("link", { rel: "stylesheet", href: EMAIL_FONTS_CSS }),
      /* @__PURE__ */ jsx(
        Font,
        {
          fontFamily: "Syne",
          fallbackFontFamily: ["Helvetica", "Arial"],
          fontWeight: 700,
          fontStyle: "normal"
        }
      ),
      /* @__PURE__ */ jsx(
        Font,
        {
          fontFamily: "Noto Sans HK",
          fallbackFontFamily: ["Helvetica", "Arial"],
          fontWeight: 400,
          fontStyle: "normal"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(Preview, { children: preview }),
    /* @__PURE__ */ jsx(Body, { style: emailStyles.body, children: /* @__PURE__ */ jsxs(Container, { style: emailStyles.container, children: [
      /* @__PURE__ */ jsxs(Section, { style: emailStyles.header, children: [
        /* @__PURE__ */ jsx(
          Img,
          {
            src: imgSrc,
            width: EMAIL_LOGO_SIZE,
            height: EMAIL_LOGO_SIZE,
            alt: "JyutTranslate",
            style: emailStyles.logo
          }
        ),
        /* @__PURE__ */ jsx(Heading, { as: "h1", style: emailStyles.brandName, children: "JyutTranslate" }),
        /* @__PURE__ */ jsx(Text, { style: emailStyles.brandTag, children: "English \u2194 Cantonese \xB7 \u7CB5\u8A9E\u7FFB\u8B6F" })
      ] }),
      /* @__PURE__ */ jsxs(Section, { style: emailStyles.card, children: [
        eyebrow ? /* @__PURE__ */ jsx(Text, { style: emailStyles.eyebrow, children: eyebrow }) : null,
        /* @__PURE__ */ jsx(Heading, { as: "h2", style: emailStyles.title, children: title }),
        children
      ] }),
      /* @__PURE__ */ jsx(Section, { style: emailStyles.footer, children: /* @__PURE__ */ jsxs(Text, { style: emailStyles.footerText, children: [
        "Sent by",
        " ",
        /* @__PURE__ */ jsx(Link, { href: appUrl, style: emailStyles.footerLink, children: "JyutTranslate" }),
        " \xB7 ",
        /* @__PURE__ */ jsx("span", { style: { color: emailBrand.jadeBright }, children: "harbor & jade" })
      ] }) })
    ] }) })
  ] });
}
function MetaRow({ label, value }) {
  return /* @__PURE__ */ jsxs(Text, { style: emailStyles.metaRow, children: [
    /* @__PURE__ */ jsx("span", { style: emailStyles.metaLabel, children: label }),
    value
  ] });
}
function SoftBlock({
  label,
  children,
  accent
}) {
  return /* @__PURE__ */ jsxs(Section, { style: accent ? emailStyles.softBlockAccent : emailStyles.softBlock, children: [
    label ? /* @__PURE__ */ jsx(Text, { style: emailStyles.sectionLabel, children: label }) : null,
    children
  ] });
}
function BodyText({ children }) {
  return /* @__PURE__ */ jsx(Text, { style: emailStyles.bodyText, children });
}
function MutedText({ children }) {
  return /* @__PURE__ */ jsx(Text, { style: emailStyles.muted, children });
}
function CtaButton({ href, children }) {
  return /* @__PURE__ */ jsx(Section, { style: { textAlign: "center", margin: "20px 0 8px" }, children: /* @__PURE__ */ jsx(Link, { href, style: emailStyles.cta, children }) });
}
export {
  BodyText,
  CtaButton,
  EmailShell,
  MetaRow,
  MutedText,
  SoftBlock
};
