# Wugniu (吴语学堂) / 吴拼

Canonical scheme for Shanghainese romanization in JyutTranslate: **Wugniu** (吴语学堂拼音), as used by [吴语学堂](https://www.wugniu.com/).

粤译以吴语学堂拼音为上海话罗马化依据。

## Product rules / 产品规则

- Target variety: **colloquial spoken Shanghainese** (上海话 / 沪语), not Mandarin-with-accent, not textbook literary Wu.
- Writing: Chinese characters with dialectal spellings when natural for Shanghainese.
- Romanization: **Wugniu** under the Han line when available.
- **Sandhi honesty:** Wu is left-dominant tone sandhi. Compact UI must **not** invent Cantonese-style per-syllable tone digits after sandhi. Prefer word-level Wugniu; detailed tone pedagogy can come later.
- Azure Speech locale: `wuu-CN` (TTS: `wuu-CN-XiaotongNeural`, `wuu-CN-YunzheNeural`).

## Compact vs detailed / 紧凑与详细

- **Compact** (translation line): Shanghainese Han + Wugniu underneath, e.g. `侬好` / `non ho`
- **Not used:** Mandarin pinyin ruby, Jyutping tone numbers (`zou2 san4`)

Implemented in `apps/web/src/components/ShanghaineseText.tsx`. API path: `translateShanghainese` in `apps/api/src/translate.ts` (`Lang` code `wuu`).
