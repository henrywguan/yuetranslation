import type { ReactNode } from 'react'
import { romanizeIndicIso15919 } from '../lib/indicIso15919'
import { INDIC_HONESTY_NOTE, INDIC_HTML_LANG, detectIndicAddress, type IndicLang } from '../lib/indicPedagogy'
import { EURO_HONESTY_NOTE, EURO_HTML_LANG, detectEuroAddress, type EuroLang } from '../lib/euroPedagogy'
import {
  CYRILLIC_HONESTY_NOTE,
  CYRILLIC_HTML_LANG,
  CYRILLIC_READING_LABEL,
  detectCyrillicAddress,
  romanizeCyrillic,
  type CyrillicLang,
} from '../lib/cyrillicPedagogy'
import { RTL_HONESTY_NOTE, RTL_HTML_LANG, detectRtlAddress, type RtlFamilyLang } from '../lib/rtlPedagogy'
import {
  SCRIPT_FAMILY_HONESTY_NOTE,
  SCRIPT_FAMILY_HTML_LANG,
  detectScriptFamilyAddress,
  type ScriptFamilyLang,
} from '../lib/scriptPedagogy'
import type { AddressHit } from '../lib/langFamilyAddress'
import {
  isCyrillicFamilyLang,
  isEuroFamilyLang,
  isIndicFamilyLang,
  isRtlFamilyLang,
  type LangFamilyLang,
} from '../lib/langFamily'

type CommonProps = {
  text: string
  definition?: string
  definitions?: string[]
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  /** Details pane: optional reading + address chip + honesty (compact stays native script only). */
  showDetail?: boolean
}

type Detail = {
  family: 'indic' | 'euro' | 'cyrillic' | 'rtl' | 'script'
  lang: LangFamilyLang
  htmlLang: string
  reading: { text: string; label: string; htmlLang: string } | null
  address: AddressHit | null
  honesty: string | null
}

function FamilyLine({ detail, text, className, onActivate, activateLabel }: CommonProps & { detail: Detail }) {
  const { family, lang, htmlLang, reading, address, honesty } = detail
  const rtl = family === 'rtl'
  const body = (
    <span
      className={`lang-family-block lang-family-block--${family} lang-family-block--${lang}${honesty ? ' lang-family-block--detail' : ''}`}
      dir={rtl ? 'rtl' : undefined}
    >
      <span className={className || undefined} lang={htmlLang}>
        {text}
      </span>
      {reading ? (
        <span className="lang-family-reading-row" dir="ltr" aria-label={`${reading.label} romanization`}>
          <span className="lang-family-reading" lang={reading.htmlLang}>
            {reading.text}
          </span>
          <span className="lang-family-reading-label" aria-hidden="true">
            {reading.label}
          </span>
        </span>
      ) : null}
      {address ? (
        <span className="lang-family-address-row" aria-label="Address form">
          <span className="lang-family-address-scheme" aria-hidden="true">
            Form
          </span>
          <span
            className={`lang-family-address-chip lang-family-address-chip--${address.kind}`}
            title={address.label}
            lang={htmlLang}
          >
            {address.chip}
          </span>
        </span>
      ) : null}
      {honesty ? (
        <span className="lang-family-honesty" dir="ltr">
          {honesty}
        </span>
      ) : null}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className={`lang-family-activate${rtl ? ' lang-family-activate--rtl' : ''}`}
      onClick={() => onActivate(text)}
      aria-label={
        activateLabel || (reading ? `${text}. ${reading.text}. Open details.` : `${text}. Open details.`)
      }
    >
      {body}
    </button>
  )
}

/** Telugu / Gujarati / Kannada / Malayalam / Marathi / Punjabi / Odia / Sinhala / Nepali / Assamese — native script on compact; Details add ISO 15919 + address + honesty. */
export function IndicText({ lang, ...props }: CommonProps & { lang: IndicLang }) {
  const trimmed = props.text.trim()
  if (!trimmed) return props.placeholder ? <>{props.placeholder}</> : null
  const reading = props.showDetail ? romanizeIndicIso15919(trimmed, lang) : null
  const detail: Detail = {
    family: 'indic',
    lang,
    htmlLang: INDIC_HTML_LANG[lang],
    reading: reading ? { text: reading, label: 'ISO 15919', htmlLang: `${lang}-Latn` } : null,
    address: props.showDetail ? detectIndicAddress(trimmed, lang) : null,
    honesty: props.showDetail ? INDIC_HONESTY_NOTE[lang] : null,
  }
  return <FamilyLine {...props} text={trimmed} detail={detail} />
}

/** Polish … Afrikaans plus Batch 4 Latin langs (et lv lt ga cy eu gl mt is bs sq zu so) — orthography only; Details add address + honesty. */
export function EuroText({ lang, ...props }: CommonProps & { lang: EuroLang }) {
  const trimmed = props.text.trim()
  if (!trimmed) return props.placeholder ? <>{props.placeholder}</> : null
  const detail: Detail = {
    family: 'euro',
    lang,
    htmlLang: EURO_HTML_LANG[lang],
    reading: null,
    address: props.showDetail ? detectEuroAddress(trimmed, lang) : null,
    honesty: props.showDetail ? EURO_HONESTY_NOTE[lang] : null,
  }
  return <FamilyLine {...props} text={trimmed} detail={detail} />
}

/** Russian / Ukrainian / Kazakh / Bulgarian / Serbian / Macedonian / Mongolian — Cyrillic only on compact; Details add Latin reading (not Serbian) + address chips + honesty. */
export function CyrillicText({ lang, ...props }: CommonProps & { lang: CyrillicLang }) {
  const trimmed = props.text.trim()
  if (!trimmed) return props.placeholder ? <>{props.placeholder}</> : null
  const reading = props.showDetail ? romanizeCyrillic(trimmed, lang) : null
  const detail: Detail = {
    family: 'cyrillic',
    lang,
    htmlLang: CYRILLIC_HTML_LANG[lang],
    reading: reading ? { text: reading, label: CYRILLIC_READING_LABEL[lang], htmlLang: `${lang}-Latn` } : null,
    address: props.showDetail ? detectCyrillicAddress(trimmed, lang) : null,
    honesty: props.showDetail ? CYRILLIC_HONESTY_NOTE[lang] : null,
  }
  return <FamilyLine {...props} text={trimmed} detail={detail} />
}

/** Hebrew / Persian / Urdu / Pashto — RTL native script (Arabic-style chrome); Details add honesty + address. */
export function RtlText({ lang, ...props }: CommonProps & { lang: RtlFamilyLang }) {
  const trimmed = props.text.trim()
  if (!trimmed) return props.placeholder ? <>{props.placeholder}</> : null
  const detail: Detail = {
    family: 'rtl',
    lang,
    htmlLang: RTL_HTML_LANG[lang],
    reading: null,
    address: props.showDetail ? detectRtlAddress(trimmed, lang) : null,
    honesty: props.showDetail ? RTL_HONESTY_NOTE[lang] : null,
  }
  return <FamilyLine {...props} text={trimmed} detail={detail} />
}

/** Armenian / Georgian / Amharic — own-alphabet native script on compact; Details add address + honesty (no Latin reading). */
export function ScriptText({ lang, ...props }: CommonProps & { lang: ScriptFamilyLang }) {
  const trimmed = props.text.trim()
  if (!trimmed) return props.placeholder ? <>{props.placeholder}</> : null
  const detail: Detail = {
    family: 'script',
    lang,
    htmlLang: SCRIPT_FAMILY_HTML_LANG[lang],
    reading: null,
    address: props.showDetail ? detectScriptFamilyAddress(trimmed, lang) : null,
    honesty: props.showDetail ? SCRIPT_FAMILY_HONESTY_NOTE[lang] : null,
  }
  return <FamilyLine {...props} text={trimmed} detail={detail} />
}

/** Single call-site branch for every Batch 2–4 language (`isLangFamilyLang`). */
export function LangFamilyText({ lang, ...props }: CommonProps & { lang: LangFamilyLang }) {
  if (isIndicFamilyLang(lang)) return <IndicText lang={lang} {...props} />
  if (isEuroFamilyLang(lang)) return <EuroText lang={lang} {...props} />
  if (isCyrillicFamilyLang(lang)) return <CyrillicText lang={lang} {...props} />
  if (isRtlFamilyLang(lang)) return <RtlText lang={lang} {...props} />
  return <ScriptText lang={lang} {...props} />
}
