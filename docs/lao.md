# Lao / ພາສາລາວ (Vientiane)

Target variety for JyutTranslate when lang code is **`lo`**: colloquial **Vientiane Lao**. The language is Lao; the country is Laos.

Azure Speech locale: **`lo-LA`** (TTS `lo-LA-KeomanyNeural`, `lo-LA-ChanthavongNeural`).

## Tones

Vientiane Lao has **five** phonemic tones (Enfield 2007): **mid level, high rising, low rising, high falling, low falling**.

Older textbooks list six. The extra one is a phonetic split of one of these five, not a separate phoneme to teach as a sixth tone. Writing still uses up to four marks (່ ້ ໊ ໋). As in Thai, the mark is an input to consonant class and live/dead syllable type, not the pitch by itself.

Precomposed ໜ and ໝ are high-class (leading ຫ + ນ / ມ).

## Compact vs detailed

- **Compact:** Lao script plus a tone-marked reading from `analyzeLao` (`laoTones.ts`). Diacritics: mid unmarked, low falling grave, high falling circumflex, high rising acute, low rising caron. Example: `ສະບາຍດີ` → `sá-bǎay-dǐi` (high rising, low rising, low rising).
- **Details:** tone-name chips and a note that Vientiane has five tones and the written mark is not the pitch.
- **Not used:** Chao tone letters, IPA, a sixth tone label, or a toneless official romanization as the learner line.

If a spelling will not parse, show the Lao script only.

## Register

Colloquial Vientiane by default; formal when the English source looks legal, medical, or official.

Implemented in `apps/web/src/components/LaoText.tsx` and `apps/web/src/lib/laoTones.ts`.
