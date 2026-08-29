import { jsx, jsxs } from "react/jsx-runtime";
import { Text } from "@react-email/components";
import {
  BodyText,
  CtaButton,
  EmailShell,
  MetaRow,
  SoftBlock
} from "./EmailShell.js";
import { emailBrand, emailStyles } from "../brand.js";
function UpgradeEmail({
  email,
  userId,
  fromPlan,
  toPlan,
  source,
  when,
  stripeCustomerId,
  adminUrl,
  appUrl,
  logoSrc
}) {
  return /* @__PURE__ */ jsxs(
    EmailShell,
    {
      preview: `Upgrade \xB7 ${email} \xB7 ${fromPlan} \u2192 ${toPlan}`,
      eyebrow: "Admin \xB7 Billing",
      title: "Plan upgrade",
      logoSrc,
      appUrl,
      children: [
        /* @__PURE__ */ jsx(BodyText, { children: "A user moved to a higher plan on JyutTranslate." }),
        /* @__PURE__ */ jsxs(SoftBlock, { accent: true, children: [
          /* @__PURE__ */ jsx(MetaRow, { label: "Email \xB7 ", value: email }),
          /* @__PURE__ */ jsx(MetaRow, { label: "User ID \xB7 ", value: userId }),
          /* @__PURE__ */ jsxs(Text, { style: emailStyles.metaRow, children: [
            /* @__PURE__ */ jsx("span", { style: emailStyles.metaLabel, children: "Plan \xB7 " }),
            /* @__PURE__ */ jsx("span", { style: { textDecoration: "line-through", color: emailBrand.inkMuted }, children: fromPlan }),
            " \u2192 ",
            /* @__PURE__ */ jsx("span", { style: { color: emailBrand.harborMid, fontWeight: 700 }, children: toPlan })
          ] }),
          /* @__PURE__ */ jsx(MetaRow, { label: "Source \xB7 ", value: source }),
          stripeCustomerId ? /* @__PURE__ */ jsx(MetaRow, { label: "Stripe customer \xB7 ", value: stripeCustomerId }) : null,
          /* @__PURE__ */ jsx(MetaRow, { label: "When \xB7 ", value: when })
        ] }),
        /* @__PURE__ */ jsx(CtaButton, { href: adminUrl, children: "Open admin" }),
        /* @__PURE__ */ jsx(Text, { style: { ...emailStyles.muted, margin: "8px 0 0", textAlign: "center" }, children: adminUrl })
      ]
    }
  );
}
var UpgradeEmail_default = UpgradeEmail;
export {
  UpgradeEmail,
  UpgradeEmail_default as default
};
