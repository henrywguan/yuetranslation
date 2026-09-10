# Sichuanese (四川话) / 四川话拼音

Canonical scheme for Sichuanese romanization in JyutTranslate: **四川话拼音** (Sichuanese Pinyin), with tone numbers on the phrase/character (e.g. `ni3 hao3`, `yao4 de2`).

粤译以四川话拼音为成都四川话罗马化依据。

## Product rules / 产品规则

- Target variety: **colloquial Chengdu Sichuanese** (成都四川话), not Mandarin-with-accent, not Cantonese.
- Writing: Chinese characters with dialectal spellings when natural (要得、巴适、啥子、莫得…).
- Romanization: **四川话拼音** under the Han line when available (phrase-level on translate).
- **Skip Yue scrub / Yue lexicon** — meta notes `sichuan-no-yue-scrub`, `sichuan-colloquial`, `sichuan-pinyin`.
- Azure Speech locale: `zh-CN-sichuan` (TTS: YunxiNeural / related Mandarin neural voices wired for Sichuanese elsewhere).

## Compact vs detailed / 紧凑与详细

- **Compact** (translation line): Sichuanese Han + 四川话拼音 underneath (romanization left-aligned under the characters; scheme label trails), e.g. `要得` / `yao4 de2` Sichuanese
- **Details:** **DETAILED per-char pedagogy** — model returns per-char 四川话拼音 in the reused `jyutping` field (same shape as Yue/Cmn), with English glosses that fit the phrase
- **Not gloss-only:** unlike Shanghainese (`wuu`), Sichuanese Details keep romanization ruby / per-char readings

Implemented in `apps/web/src/components/SichuaneseText.tsx`. API path: `translateSichuanese` in `apps/api/src/translate.ts` (`Lang` code `sichuan`). Breakdown: `sichuanBreakdown` in `apps/api/src/breakdown.ts`.

## API field

Translate responses targeting `sichuan` include optional `romanization` (四川话拼音) and, when alternatives are present, `alternativeRomanizations` (same order as `alternatives`). Solo, History, Conversation, and Other variations render Han + Sichuanese Pinyin on compact lines. Phrase seeds store 四川话拼音 on `romanization` / `alternativeRomanizations`; successful dict/model hits add meta note `sichuan-pinyin`. Character breakdown for `sichuan` is **per-char pedagogy** (`jyutping` = 四川话拼音), not gloss-only like `wuu`.
