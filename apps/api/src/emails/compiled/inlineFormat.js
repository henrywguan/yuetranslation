import { jsx } from "react/jsx-runtime";
import { Link } from "@react-email/components";
import { emailStyles } from "../brand.js";
const TOKEN = /(\*\*[^*]+?\*\*|\*[^*\n]+?\*|_[^_\n]+?_|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
function renderInlineFormat(text) {
  if (!text) return text;
  const nodes = [];
  let last = 0;
  let match;
  const re = new RegExp(TOKEN.source, "g");
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      nodes.push(/* @__PURE__ */ jsx("strong", { children: raw.slice(2, -2) }, `b-${match.index}`));
    } else if (raw.startsWith("*") && raw.endsWith("*") && !raw.startsWith("**") || raw.startsWith("_") && raw.endsWith("_")) {
      nodes.push(/* @__PURE__ */ jsx("em", { children: raw.slice(1, -1) }, `i-${match.index}`));
    } else if (match[2] && match[3]) {
      nodes.push(
        /* @__PURE__ */ jsx(Link, { href: match[3], style: emailStyles.footerLink, children: match[2] }, `a-${match.index}`)
      );
    } else {
      nodes.push(raw);
    }
    last = match.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length === 1 ? nodes[0] : nodes;
}
function stripLeadingBullet(line) {
  return line.replace(/^[•\-–—]\s+/, "").replace(/^\*\s+/, "");
}
export {
  renderInlineFormat,
  stripLeadingBullet
};
