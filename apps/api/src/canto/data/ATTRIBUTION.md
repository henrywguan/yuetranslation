# Third-party dictionary attribution

## CC-Canto (always bundled when `cc-canto-gloss.json.gz` is present)

- **Work:** CC-Canto Cantonese–English dictionary  
- **Copyright:** © 2015–17 Pleco Inc.  
- **License:** [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)  
- **Site:** https://cccanto.org/  
- **Use in Jyut:** glosses for character breakdown, and **headword attestation** to verify LLM Cantonese on finals.  
- **ShareAlike note:** if you distribute an adapted CC-Canto-derived data file, keep attribution and share adaptations under a compatible license.

Related (optional import, same family): CC-CEDICT Cantonese readings from Pleco — also CC-BY-SA 3.0 via cccanto.org.

## words.hk 粵典 (future — only with a license)

- **Work:** words.hk Cantonese dictionary data  
- **Copyright:** Hong Kong Lexicography Limited  
- **License:** [Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/)  
- **Status in Jyut:** **Not used.** Verification and glosses currently rely on **CC-Canto** + seed.  
- Revisit after obtaining a commercial license (or for a clearly non-commercial deploy). Import stubs: `npm run import:wordshk` + `YUE_ALLOW_NONCOMMERCIAL_DICTS` / `YUE_ENABLE_WORDSHK`.

## `to-jyutping` (web app)

- Pronunciation labeling library used in the client — **Jyutping source of truth** for UI display.  
- See the `to-jyutping` package license in `apps/web/node_modules/to-jyutping`.
