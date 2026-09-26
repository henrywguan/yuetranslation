# Thai / ภาษาไทย (Central)

Target variety for JyutTranslate when lang code is **`th`**: colloquial **Central Thai** (Bangkok). Not Isan, not Northern (คำเมือง), not Southern.

Azure Speech locale: **`th-TH`** (TTS `th-TH-PremwadeeNeural`, `th-TH-NiwatNeural`).

## Tones

Five lexical tones: **mid, low, falling, high, rising**.

Four written marks (ไม้เอก ่, ไม้โท ้, ไม้ตรี ๊, ไม้จัตวา ๋) are **not** the tone names. The spoken pitch is the product of:

1. Effective consonant class (mid / high / low; leading ห and อักษรนำ can change class)
2. Live syllable (long open vowel or sonorant ending) vs dead (short open vowel or stop ending)
3. Vowel length, when the syllable is dead
4. The tone mark, if any

RTGS romanization drops tones. Do **not** show RTGS as the learner line.

## Compact vs detailed

- **Compact** (Solo / Conversation / Cam): Thai script plus a **tone-marked reading** under the line when `analyzeThai` parses the syllable (`thaiTones.ts`). Diacritics: mid unmarked, low grave, falling circumflex, high acute, rising caron. Example: `สวัสดี` → `sà-wát-dii` (low, high, mid).
- **Details:** tone-name chips (Mid / Low / Falling / High / Rising) and this note: the written mark is not the spoken tone.
- **Not used:** Chao tone letters, IPA, ASCII tone digits, RTGS on the learner line.

If a spelling will not parse, show the Thai script only — do not invent a tone.

## Register

Colloquial Central Thai by default; formal when the English source looks legal, medical, or official. Particles and pronouns stay Bangkok-colloquial unless the source is formal.

Implemented in `apps/web/src/components/ThaiText.tsx` and `apps/web/src/lib/thaiTones.ts`.
