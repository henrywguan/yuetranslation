import { jsx, jsxs } from "react/jsx-runtime";
import {
  Column,
  Hr,
  Img,
  Row,
  Section,
  Text
} from "@react-email/components";
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText
} from "./EmailShell.js";
import { emailBrand, emailFonts, emailStyles } from "../brand.js";
import { issueTypeLabel, shortReportId } from "../bugReportMeta.js";
function MetaCell({ label, value }) {
  return /* @__PURE__ */ jsxs(Column, { style: metaCell, children: [
    /* @__PURE__ */ jsx(Text, { style: metaLabel, children: label }),
    /* @__PURE__ */ jsx(Text, { style: metaValue, children: value })
  ] });
}
function BugReportEmail(props) {
  const preview = `${props.issueLabel} \xB7 ${props.email || props.userId} \xB7 ${props.shortId}`;
  const session = [
    props.live ? "live on" : "live off",
    props.translating ? "translating" : null,
    props.demoMode ? "demo mode" : null
  ].filter(Boolean).join(" \xB7 ") || "idle";
  const engines = [
    props.cloudReady == null ? null : props.cloudReady ? "cloud" : "no-cloud",
    props.modelConfigured == null ? null : props.modelConfigured ? "model" : "no-model",
    props.visionConfigured == null ? null : props.visionConfigured ? "vision" : "no-vision"
  ].filter(Boolean).join(" \xB7 ") || "\u2014";
  return /* @__PURE__ */ jsxs(
    EmailShell,
    {
      preview,
      eyebrow: "Admin \xB7 Bug report",
      title: props.issueLabel,
      logoSrc: props.logoSrc,
      appUrl: props.appUrl,
      children: [
        /* @__PURE__ */ jsx(BodyText, { children: "Self-reported by a signed-in user. Key signals below \u2014 open the admin dashboard for the full diagnosis." }),
        /* @__PURE__ */ jsxs(Section, { style: { marginBottom: "12px" }, children: [
          /* @__PURE__ */ jsxs(Text, { style: badge, children: [
            /* @__PURE__ */ jsx("span", { style: badgeDot }),
            props.shortId
          ] }),
          /* @__PURE__ */ jsx(Text, { style: badgeMuted, children: props.issueType })
        ] }),
        /* @__PURE__ */ jsxs(Section, { style: emailStyles.softBlock, children: [
          /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(MetaCell, { label: "User", value: props.email || "\u2014" }),
            /* @__PURE__ */ jsx(MetaCell, { label: "Plan", value: props.plan || "\u2014" })
          ] }),
          /* @__PURE__ */ jsx(Hr, { style: emailStyles.hr }),
          /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(MetaCell, { label: "Route", value: props.route || "\u2014" }),
            /* @__PURE__ */ jsx(MetaCell, { label: "Mode", value: props.mode || "\u2014" })
          ] }),
          /* @__PURE__ */ jsx(Hr, { style: emailStyles.hr }),
          /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(MetaCell, { label: "Session", value: session }),
            /* @__PURE__ */ jsx(MetaCell, { label: "Engines", value: engines })
          ] }),
          /* @__PURE__ */ jsx(Hr, { style: emailStyles.hr }),
          /* @__PURE__ */ jsxs(Row, { children: [
            /* @__PURE__ */ jsx(MetaCell, { label: "App", value: props.appVersion || "\u2014" }),
            /* @__PURE__ */ jsx(
              MetaCell,
              {
                label: "Device",
                value: [props.theme, props.viewport].filter(Boolean).join(" \xB7 ") || "\u2014"
              }
            )
          ] })
        ] }),
        props.lastError ? /* @__PURE__ */ jsxs(Section, { style: alertCard, children: [
          /* @__PURE__ */ jsx(Text, { style: alertLabel, children: "Last visible error" }),
          /* @__PURE__ */ jsx(Text, { style: alertBody, children: props.lastError })
        ] }) : null,
        props.note ? /* @__PURE__ */ jsxs(Section, { style: emailStyles.softBlock, children: [
          /* @__PURE__ */ jsx(Text, { style: emailStyles.sectionLabel, children: "User note" }),
          /* @__PURE__ */ jsx(Text, { style: emailStyles.pre, children: props.note })
        ] }) : null,
        props.hasScreenshot ? /* @__PURE__ */ jsxs(Section, { style: emailStyles.softBlock, children: [
          /* @__PURE__ */ jsx(Text, { style: emailStyles.sectionLabel, children: "Screenshot" }),
          /* @__PURE__ */ jsx(MutedText, { children: "User opted in to visual diagnostics." }),
          /* @__PURE__ */ jsx(
            Img,
            {
              src: "cid:bug-screenshot",
              alt: "User-submitted diagnostic screenshot",
              width: "520",
              style: emailStyles.screenshot
            }
          )
        ] }) : null,
        props.recentEvents.length ? /* @__PURE__ */ jsxs(Section, { style: emailStyles.softBlock, children: [
          /* @__PURE__ */ jsx(Text, { style: emailStyles.sectionLabel, children: "Recent trail" }),
          props.recentEvents.map((line) => /* @__PURE__ */ jsx(Text, { style: eventLine, children: line }, line))
        ] }) : null,
        /* @__PURE__ */ jsx(CtaButton, { href: props.adminUrl, children: "Open Reports dashboard" }),
        /* @__PURE__ */ jsxs(Text, { style: { ...emailStyles.muted, margin: "10px 0 0", textAlign: "center" }, children: [
          "Report ID",
          " ",
          /* @__PURE__ */ jsx("span", { style: { color: emailBrand.harborMid, fontFamily: emailFonts.mono }, children: props.reportId })
        ] }),
        /* @__PURE__ */ jsxs(Text, { style: { ...emailStyles.muted, margin: "4px 0 0", textAlign: "center" }, children: [
          "User ID",
          " ",
          /* @__PURE__ */ jsx("span", { style: { color: emailBrand.harborMid, fontFamily: emailFonts.mono }, children: props.userId })
        ] })
      ]
    }
  );
}
var BugReportEmail_default = BugReportEmail;
const metaCell = {
  width: "50%",
  verticalAlign: "top",
  paddingRight: "8px"
};
const metaLabel = {
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: "0 0 4px"
};
const metaValue = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: "13px",
  lineHeight: "1.4",
  margin: "0",
  wordBreak: "break-word"
};
const badge = {
  display: "inline-block",
  backgroundColor: "rgba(61, 207, 182, 0.14)",
  border: `1px solid rgba(61, 207, 182, 0.35)`,
  borderRadius: "999px",
  color: emailBrand.harborMid,
  fontFamily: emailFonts.body,
  fontSize: "12px",
  fontWeight: 700,
  padding: "6px 12px",
  margin: "0 8px 0 0"
};
const badgeDot = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  borderRadius: "999px",
  backgroundColor: emailBrand.jade,
  marginRight: "8px"
};
const badgeMuted = {
  display: "inline-block",
  color: emailBrand.inkMuted,
  fontFamily: emailFonts.body,
  fontSize: "12px",
  margin: "0"
};
const alertCard = {
  backgroundColor: emailBrand.dangerSoft,
  border: `1px solid rgba(196, 92, 92, 0.35)`,
  borderRadius: "12px",
  padding: "14px 16px",
  marginBottom: "14px"
};
const alertLabel = {
  color: emailBrand.danger,
  fontFamily: emailFonts.body,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: "0 0 6px"
};
const alertBody = {
  color: emailBrand.ink,
  fontFamily: emailFonts.body,
  fontSize: "13px",
  lineHeight: "1.45",
  margin: "0",
  wordBreak: "break-word"
};
const eventLine = {
  color: emailBrand.inkMuted,
  fontSize: "12px",
  lineHeight: "1.45",
  margin: "0 0 4px",
  fontFamily: emailFonts.mono
};
export {
  BugReportEmail,
  BugReportEmail_default as default,
  issueTypeLabel,
  shortReportId
};
