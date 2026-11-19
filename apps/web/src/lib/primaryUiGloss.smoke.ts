import assert from 'node:assert/strict'
import { primaryGlossHtmlLang, primaryReplacesChinese, resolvePrimaryUiGloss } from './primaryUiGloss'
import { ui } from './uiCopy'

/** Offline: Tagalog/Spanish/… replace Chinese; Mandarin keeps 漢字 + pinyin gloss. */
function main() {
  assert.equal(primaryReplacesChinese('tl'), true)
  assert.equal(primaryReplacesChinese('es'), true)
  // eses (Peninsular Spanish) replaces Chinese with a Spain gloss like es/vi/tl.
  assert.equal(primaryReplacesChinese('eses'), true)
  assert.equal(primaryReplacesChinese('ja'), true)
  assert.equal(primaryReplacesChinese('de'), true)
  assert.equal(primaryReplacesChinese('cmn'), false)
  assert.equal(primaryReplacesChinese('yue'), false)
  assert.equal(primaryReplacesChinese('en'), false)

  // Newer primaries: no catalog gloss yet → undefined (BiText falls back to English-only).
  assert.equal(resolvePrimaryUiGloss(ui.modeSolo, 'ja'), undefined)
  assert.equal(resolvePrimaryUiGloss(ui.modeSolo, 'nl'), undefined)
  assert.equal(resolvePrimaryUiGloss(ui.modeSolo, 'ar'), undefined)
  assert.equal(primaryGlossHtmlLang('ar'), 'ar-EG')
  assert.equal(primaryGlossHtmlLang('arsa'), 'ar-SA')
  assert.equal(primaryGlossHtmlLang('ta'), 'ta-IN')
  assert.equal(primaryGlossHtmlLang('ptpt'), 'pt-PT')
  assert.equal(primaryGlossHtmlLang('pt'), 'pt-BR')
  assert.equal(primaryGlossHtmlLang('tr'), 'tr-TR')
  assert.equal(primaryGlossHtmlLang('bn'), 'bn-IN')
  assert.equal(primaryGlossHtmlLang('te'), 'te-IN')
  assert.equal(primaryGlossHtmlLang('gu'), 'gu-IN')
  assert.equal(primaryGlossHtmlLang('kn'), 'kn-IN')
  assert.equal(primaryGlossHtmlLang('pl'), 'pl-PL')
  assert.equal(primaryGlossHtmlLang('ro'), 'ro-RO')
  assert.equal(primaryGlossHtmlLang('cs'), 'cs-CZ')
  assert.equal(primaryGlossHtmlLang('el'), 'el-GR')
  assert.equal(primaryGlossHtmlLang('hu'), 'hu-HU')
  assert.equal(primaryGlossHtmlLang('sv'), 'sv-SE')
  assert.equal(primaryGlossHtmlLang('ru'), 'ru-RU')
  assert.equal(primaryGlossHtmlLang('uk'), 'uk-UA')
  assert.equal(primaryGlossHtmlLang('he'), 'he-IL')
  assert.equal(primaryGlossHtmlLang('fa'), 'fa-IR')
  assert.equal(primaryGlossHtmlLang('ur'), 'ur-IN')
  assert.equal(primaryGlossHtmlLang('ml'), 'ml-IN')
  assert.equal(primaryGlossHtmlLang('mr'), 'mr-IN')
  assert.equal(primaryGlossHtmlLang('pa'), 'pa-IN')
  assert.equal(primaryGlossHtmlLang('or'), 'or-IN')
  assert.equal(primaryGlossHtmlLang('si'), 'si-LK')
  assert.equal(primaryGlossHtmlLang('ne'), 'ne-NP')
  assert.equal(primaryGlossHtmlLang('da'), 'da-DK')
  assert.equal(primaryGlossHtmlLang('nb'), 'nb-NO')
  assert.equal(primaryGlossHtmlLang('fi'), 'fi-FI')
  assert.equal(primaryGlossHtmlLang('sk'), 'sk-SK')
  assert.equal(primaryGlossHtmlLang('hr'), 'hr-HR')
  assert.equal(primaryGlossHtmlLang('ca'), 'ca-ES')
  assert.equal(primaryGlossHtmlLang('az'), 'az-AZ')
  assert.equal(primaryGlossHtmlLang('kk'), 'kk-KZ')
  assert.equal(primaryGlossHtmlLang('uz'), 'uz-UZ')
  assert.equal(primaryGlossHtmlLang('bg'), 'bg-BG')
  assert.equal(primaryGlossHtmlLang('sr'), 'sr-RS')
  assert.equal(primaryGlossHtmlLang('sw'), 'sw-KE')
  assert.equal(primaryGlossHtmlLang('af'), 'af-ZA')
  assert.equal(resolvePrimaryUiGloss(ui.modeSolo, 'ta'), undefined)

  const solo = ui.modeSolo
  assert.equal(resolvePrimaryUiGloss(solo, 'yue'), undefined)
  assert.equal(resolvePrimaryUiGloss(solo, 'en'), undefined)
  assert.equal(resolvePrimaryUiGloss(solo, 'tl'), 'Solo')
  assert.equal(resolvePrimaryUiGloss(solo, 'es'), 'Solo')
  assert.equal(resolvePrimaryUiGloss(solo, 'vi'), 'Solo')

  const hold = ui.holdOrTapToSpeak
  assert.match(resolvePrimaryUiGloss(hold, 'tl') || '', /Pindutin|tap|magsalita/i)
  assert.match(resolvePrimaryUiGloss(hold, 'es') || '', /Mantén|habla/i)
  assert.match(resolvePrimaryUiGloss(hold, 'vi') || '', /Giữ|nói/i)

  const face = ui.modeFace
  assert.equal(resolvePrimaryUiGloss(face, 'tl'), 'Usapan')
  assert.equal(resolvePrimaryUiGloss(face, 'es'), 'Conversación')
  assert.equal(resolvePrimaryUiGloss(face, 'vi'), 'Hội thoại')

  const cam = ui.modeCamera
  assert.equal(resolvePrimaryUiGloss(cam, 'es'), 'Cámara')
  assert.equal(resolvePrimaryUiGloss(cam, 'vi'), 'Camera')

  console.log('primaryUiGloss.smoke: ok')
}

main()
