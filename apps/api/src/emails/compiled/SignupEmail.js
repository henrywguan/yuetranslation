import { jsx, jsxs } from "react/jsx-runtime";
import { Text } from "@react-email/components";
import {
  BodyText,
  CtaButton,
  EmailShell,
  MetaRow,
  SoftBlock
} from "./EmailShell.js";
import { emailStyles } from "../brand.js";
function SignupEmail({
  email,
  userId,
  provider,
  emailConfirmed,
  createdAt,
  adminUrl,
  appUrl,
  logoSrc
}) {
  return /* @__PURE__ */ jsxs(
    EmailShell,
    {
      preview: `New signup \xB7 ${email}`,
      eyebrow: "Admin \xB7 Growth",
      title: "New signup",
      logoSrc,
      appUrl,
      children: [
        /* @__PURE__ */ jsx(BodyText, { children: "Someone just created an account on JyutTranslate." }),
        /* @__PURE__ */ jsxs(SoftBlock, { accent: true, children: [
          /* @__PURE__ */ jsx(MetaRow, { label: "Email \xB7 ", value: email }),
          /* @__PURE__ */ jsx(MetaRow, { label: "User ID \xB7 ", value: userId }),
          /* @__PURE__ */ jsx(MetaRow, { label: "Provider \xB7 ", value: provider }),
          /* @__PURE__ */ jsx(MetaRow, { label: "Email confirmed \xB7 ", value: emailConfirmed }),
          /* @__PURE__ */ jsx(MetaRow, { label: "When \xB7 ", value: createdAt })
        ] }),
        /* @__PURE__ */ jsx(CtaButton, { href: adminUrl, children: "Open admin" }),
        /* @__PURE__ */ jsx(Text, { style: { ...emailStyles.muted, margin: "8px 0 0", textAlign: "center" }, children: adminUrl })
      ]
    }
  );
}
var SignupEmail_default = SignupEmail;
export {
  SignupEmail,
  SignupEmail_default as default
};
