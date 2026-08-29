import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Hr, Link, Section, Text } from "@react-email/components";
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText,
  SoftBlock
} from "./EmailShell.js";
import { emailBrand, emailFonts, emailStyles } from "../brand.js";
function paragraphs(body) {
  return body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}
function lines(body) {
  return body.split(/\n+/).map((l) => l.trim()).filter(Boolean);
}
function CampaignEmail(props) {
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
    includeUnsubscribe
  } = props;
  const showCta = Boolean(ctaLabel?.trim() && ctaUrl?.trim());
  const shellPreview = preview?.trim() || subject || headline || "JyutTranslate";
  return /* @__PURE__ */ jsxs(
    EmailShell,
    {
      preview: shellPreview,
      eyebrow: eyebrow?.trim() || void 0,
      title: headline?.trim() || subject || "Update",
      logoSrc,
      appUrl,
      children: [
        variant === "product-update" ? /* @__PURE__ */ jsx(SoftBlock, { accent: true, label: "What\u2019s included", children: lines(body).map((line) => /* @__PURE__ */ jsxs(Text, { style: bullet, children: [
          /* @__PURE__ */ jsx("span", { style: bulletDot, children: "\u25CF" }),
          " ",
          line
        ] }, line)) }) : variant === "newsletter" ? paragraphs(body).map((block, i) => /* @__PURE__ */ jsx(SoftBlock, { children: /* @__PURE__ */ jsx(Text, { style: emailStyles.pre, children: block }) }, `${i}-${block.slice(0, 24)}`)) : variant === "feature-spotlight" ? /* @__PURE__ */ jsx(SoftBlock, { accent: true, children: paragraphs(body).map((p) => /* @__PURE__ */ jsx(BodyText, { children: p }, p.slice(0, 32))) }) : paragraphs(body).map((p) => /* @__PURE__ */ jsx(BodyText, { children: p }, p.slice(0, 32))),
        showCta ? /* @__PURE__ */ jsx(CtaButton, { href: ctaUrl.trim(), children: ctaLabel.trim() }) : null,
        secondary?.trim() ? /* @__PURE__ */ jsx(MutedText, { children: secondary.trim() }) : null,
        signOff?.trim() ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Hr, { style: emailStyles.hr }),
          /* @__PURE__ */ jsx(Text, { style: signOffStyle, children: signOff.trim() })
        ] }) : null,
        includeUnsubscribe ? /* @__PURE__ */ jsx(Section, { style: { marginTop: "18px" }, children: /* @__PURE__ */ jsx(Text, { style: unsub, children: /* @__PURE__ */ jsx(Link, { href: "{{{RESEND_UNSUBSCRIBE_URL}}}", style: emailStyles.footerLink, children: "Unsubscribe" }) }) }) : null
      ]
    }
  );
}
var CampaignEmail_default = CampaignEmail;
const bullet = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 8px"
};
const bulletDot = {
  color: emailBrand.jade,
  marginRight: "8px"
};
const signOffStyle = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: "14px",
  lineHeight: "1.55",
  margin: "0",
  whiteSpace: "pre-wrap"
};
const unsub = {
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: "12px",
  textAlign: "center",
  margin: "0"
};
export {
  CampaignEmail,
  CampaignEmail_default as default
};
