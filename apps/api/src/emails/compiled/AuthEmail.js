import { jsx, jsxs } from "react/jsx-runtime";
import { Text } from "@react-email/components";
import {
  BodyText,
  CtaButton,
  EmailShell,
  MutedText,
  SoftBlock
} from "./EmailShell.js";
import { emailBrand, emailFonts, emailStyles } from "../brand.js";
function AuthEmail({ copy, verifyUrl, otpCode, appUrl, logoSrc }) {
  const code = otpCode?.trim() || "";
  const showCode = copy.showOtp && code.length > 0 && code.length <= 12;
  return /* @__PURE__ */ jsxs(
    EmailShell,
    {
      preview: copy.lead,
      eyebrow: copy.eyebrow,
      title: copy.title,
      logoSrc,
      appUrl,
      children: [
        /* @__PURE__ */ jsx(BodyText, { children: copy.lead }),
        /* @__PURE__ */ jsx(CtaButton, { href: verifyUrl, children: copy.ctaLabel }),
        showCode ? /* @__PURE__ */ jsxs(SoftBlock, { accent: true, label: "Or use this code", children: [
          /* @__PURE__ */ jsx(Text, { style: otpStyle, children: code }),
          /* @__PURE__ */ jsx(MutedText, { children: "Enter this code if the button doesn\u2019t open on your device." })
        ] }) : null,
        /* @__PURE__ */ jsx(MutedText, { children: copy.footer }),
        /* @__PURE__ */ jsx(Text, { style: { ...emailStyles.muted, margin: "12px 0 0", fontSize: "11px", wordBreak: "break-all" }, children: verifyUrl })
      ]
    }
  );
}
var AuthEmail_default = AuthEmail;
const otpStyle = {
  color: emailBrand.ink,
  fontFamily: emailFonts.mono,
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "0.18em",
  margin: "4px 0 8px",
  textAlign: "center"
};
export {
  AuthEmail,
  AuthEmail_default as default
};
