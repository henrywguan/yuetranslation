# Third-party dictionary attribution

## CC-Canto (always bundled when `cc-canto-gloss.json.gz` is present)

- **Work:** CC-Canto Cantonese–English dictionary  
- **Copyright:** © 2015–17 Pleco Inc.  
- **License:** [Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)  
- **Site:** https://cccanto.org/  
- **Use in Yue:** local gloss pack for character/word meanings in breakdown (and future lexicon lookups).  
- **ShareAlike note:** if you distribute an adapted CC-Canto-derived data file, keep attribution and share adaptations under a compatible license.

Related (optional import, same family): CC-CEDICT Cantonese readings from Pleco — also CC-BY-SA 3.0 via cccanto.org.

## words.hk 粵典 (optional — license-gated)

- **Work:** words.hk Cantonese dictionary data  
- **Copyright:** Hong Kong Lexicography Limited  
- **License:** [Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/)  
- **Site:** https://words.hk/  
- **Use in Yue:** richer HK 口語 glosses when explicitly enabled.  
- **Not loaded** unless both are set:
  - `YUE_ALLOW_NONCOMMERCIAL_DICTS=1`
  - `YUE_ENABLE_WORDSHK=1`
- Place a CSV dump at `apps/api/src/canto/data/vendor/wordshk.csv` and run `npm run import:wordshk`.

## `to-jyutping` (web app)

- Pronunciation labeling library used in the client — **Jyutping source of truth** for UI display.  
- See the `to-jyutping` package license in `apps/web/node_modules/to-jyutping`.
