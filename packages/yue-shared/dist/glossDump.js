/**
 * Dictionary-dump detector shared by API lexicon MT and the web translation guard.
 * Rejects strings that still look like glossary / meta notes, not conversational copy.
 */
const DEMO_RE = /^(（示範）|\(demo\))/i;
const META_WORD_RE = /\b(question mark|full stop|exclamation mark|comma|particle|interjection|colloquial|softening|classifier|measure word|variant of|same as|see also|archaic|literary|written|greeting word|literally means|used to mean|dictionary)\b/i;
/** True when a string still looks like a dictionary dump, not a conversational translation. */
export function looksLikeGlossDump(text) {
    const t = text.trim();
    if (!t)
        return true;
    if (DEMO_RE.test(t))
        return true;
    if (/^\d+\.\s/.test(t))
        return true;
    if (/\[[^\]]+\]/.test(t))
        return true;
    // Parenthetical sense notes: "(of answering phone calls) hello"
    if (/\([^)]{2,}\)/.test(t))
        return true;
    if (/\s\/\s/.test(t))
        return true;
    // Dictionary frames: "It is a greeting word, 'hi everybody' full stop"
    if (/\bit is a\b.+\bword\b/i.test(t))
        return true;
    if (META_WORD_RE.test(t))
        return true;
    // Lemma lists joined with " / " already covered; also "foo; bar; baz" dumps
    if ((t.match(/;/g) || []).length >= 2)
        return true;
    // Mixed "you 聽 not 聽" gloss joins
    if (/[A-Za-z]{2,}.+[一-龥].+[A-Za-z]{2,}/.test(t) && t.split(/\s+/).length >= 3) {
        return true;
    }
    // Long space-joined lemma lists — but allow natural English sentences.
    const words = t.split(/\s+/).filter(Boolean);
    if (words.length >= 6) {
        const looksSentence = /[.?!…]$/.test(t) ||
            (/^[A-Z“"]/.test(t) && /[.?!…]$/.test(t)) ||
            (/^[A-Z]/.test(t) && words.length <= 16 && !/\s\/\s/.test(t) && (t.match(/;/g) || []).length < 2);
        if (!looksSentence)
            return true;
    }
    return false;
}
