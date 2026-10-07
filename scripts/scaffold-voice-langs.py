#!/usr/bin/env python3
"""
Scaffold 12 new VoiceLang codes into JyutTranslate shared wiring.

Idempotent-ish: safe to re-run only on a clean pre-scaffold tree.
Per-language cloud agents own pedagogy polish after this lands.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# code, en, native, mark, flag, azure_locale, html_lang, female_voice, male_voice,
# female_label, male_label, preview, script_kind ('latin'|'cjk'|'indic'|'sea')
LANGS = [
    ("ja", "Japanese", "日本語", "Ja", "🇯🇵", "ja-JP", "ja",
     "ja-JP-NanamiNeural", "ja-JP-KeitaNeural", "Nanami", "Keita",
     "こんにちは — 日本語の音声です。", "cjk"),
    ("id", "Indonesian", "Bahasa Indonesia", "Id", "🇮🇩", "id-ID", "id",
     "id-ID-GadisNeural", "id-ID-ArdiNeural", "Gadis", "Ardi",
     "Halo — ini suara Bahasa Indonesia Anda.", "latin"),
    ("ms", "Malay", "Bahasa Melayu", "Ms", "🇲🇾", "ms-MY", "ms",
     "ms-MY-YasminNeural", "ms-MY-OsmanNeural", "Yasmin", "Osman",
     "Halo — ini suara Bahasa Melayu anda.", "latin"),
    ("pt", "Portuguese (BR)", "Português (BR)", "Pt", "🇧🇷", "pt-BR", "pt-BR",
     "pt-BR-FranciscaNeural", "pt-BR-AntonioNeural", "Francisca", "Antonio",
     "Olá — esta é a sua voz em português do Brasil.", "latin"),
    ("fr", "French", "Français", "Fr", "🇫🇷", "fr-FR", "fr-FR",
     "fr-FR-DeniseNeural", "fr-FR-HenriNeural", "Denise", "Henri",
     "Bonjour — voici votre voix en français.", "latin"),
    ("hi", "Hindi", "हिन्दी", "Hi", "🇮🇳", "hi-IN", "hi",
     "hi-IN-AnanyaNeural", "hi-IN-AaravNeural", "Ananya", "Aarav",
     "नमस्ते — यह आपकी हिंदी आवाज़ है।", "indic"),
    ("km", "Khmer", "ភាសាខ្មែរ", "Km", "🇰🇭", "km-KH", "km",
     "km-KH-SreymomNeural", "km-KH-PisethNeural", "Sreymom", "Piseth",
     "សួស្តី — នេះជាសំឡេងខ្មែររបស់អ្នក។", "sea"),
    ("my", "Burmese", "မြန်မာ", "My", "🇲🇲", "my-MM", "my",
     "my-MM-NilarNeural", "my-MM-ThihaNeural", "Nilar", "Thiha",
     "မင်္ဂလာပါ — ဤသည်မှာ သင့်မြန်မာအသံဖြစ်သည်။", "sea"),
    ("jv", "Javanese", "Basa Jawa", "Jv", "🇮🇩", "jv-ID", "jv",
     "jv-ID-SitiNeural", "jv-ID-DimasNeural", "Siti", "Dimas",
     "Halo — iki swara Basa Jawa sampeyan.", "latin"),
    ("it", "Italian", "Italiano", "It", "🇮🇹", "it-IT", "it-IT",
     "it-IT-ElsaNeural", "it-IT-DiegoNeural", "Elsa", "Diego",
     "Ciao — questa è la tua voce in italiano.", "latin"),
    ("de", "German", "Deutsch", "De", "🇩🇪", "de-DE", "de-DE",
     "de-DE-KatjaNeural", "de-DE-ConradNeural", "Katja", "Conrad",
     "Hallo — das ist Ihre deutsche Stimme.", "latin"),
    ("nl", "Dutch", "Nederlands", "Nl", "🇳🇱", "nl-NL", "nl-NL",
     "nl-NL-FennaNeural", "nl-NL-MaartenNeural", "Fenna", "Maarten",
     "Hallo — dit is je Nederlandse stem.", "latin"),
]

CODES = [L[0] for L in LANGS]
OLD_VOICE = "'en' | 'yue' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko'"
NEW_VOICE = OLD_VOICE + "".join(f" | '{c}'" for c in CODES)
OLD_ENUM = "'en', 'yue', 'cmn', 'wuu', 'sichuan', 'tl', 'es', 'eses', 'vi', 'th', 'lo', 'ko'"
NEW_ENUM = OLD_ENUM + "".join(f", '{c}'" for c in CODES)
# Often followed by text-only
OLD_FULL = OLD_ENUM + ", 'ceb', 'ilo', 'bcl'"
NEW_FULL = NEW_ENUM + ", 'ceb', 'ilo', 'bcl'"

# Native Conversation mic placeholders — cloud agents should polish.
MIC = {
    "ja": {
        "holdOrTapToSpeak": "押すか長押しで話す",
        "releaseWhenDone": "聞いています — 終わったら離す",
        "tapListening": "聞いています — 停止するかもう一度タップ",
        "speaking": "話しています…",
        "translating": "翻訳中",
        "friendLooksHere": "友だちはこの側を見てください",
        "holdFacingYou": "画面を自分に向けて持ってください",
    },
    "id": {
        "holdOrTapToSpeak": "Tahan atau ketuk untuk berbicara",
        "releaseWhenDone": "Mendengarkan — lepas jika selesai",
        "tapListening": "Mendengarkan — jeda atau ketuk untuk berhenti",
        "speaking": "Berbicara…",
        "translating": "Menerjemahkan",
        "friendLooksHere": "Teman menghadap sisi ini",
        "holdFacingYou": "Arahkan ponsel ke arah Anda",
    },
    "ms": {
        "holdOrTapToSpeak": "Tahan atau ketik untuk bercakap",
        "releaseWhenDone": "Mendengar — lepaskan bila selesai",
        "tapListening": "Mendengar — jeda atau ketik untuk berhenti",
        "speaking": "Bercakap…",
        "translating": "Menterjemah",
        "friendLooksHere": "Rakan menghadap sisi ini",
        "holdFacingYou": "Halakan telefon ke arah anda",
    },
    "pt": {
        "holdOrTapToSpeak": "Segure ou toque para falar",
        "releaseWhenDone": "Ouvindo — solte ao terminar",
        "tapListening": "Ouvindo — pause ou toque para parar",
        "speaking": "Falando…",
        "translating": "Traduzindo",
        "friendLooksHere": "O amigo olha para este lado",
        "holdFacingYou": "Segure o telefone virado para você",
    },
    "fr": {
        "holdOrTapToSpeak": "Maintenir ou appuyer pour parler",
        "releaseWhenDone": "Écoute — relâchez quand c’est fini",
        "tapListening": "Écoute — pause ou appuyez pour arrêter",
        "speaking": "Parole…",
        "translating": "Traduction",
        "friendLooksHere": "L’ami regarde de ce côté",
        "holdFacingYou": "Tenez le téléphone face à vous",
    },
    "hi": {
        "holdOrTapToSpeak": "बोलने के लिए दबाएँ या होल्ड करें",
        "releaseWhenDone": "सुन रहा है — खत्म होने पर छोड़ें",
        "tapListening": "सुन रहा है — रोकें या फिर टैप करें",
        "speaking": "बोल रहा है…",
        "translating": "अनुवाद हो रहा है",
        "friendLooksHere": "मित्र इस ओर देखें",
        "holdFacingYou": "फ़ोन अपनी ओर रखें",
    },
    "km": {
        "holdOrTapToSpeak": "ចុចឬសង្កត់ដើម្បីនិយាយ",
        "releaseWhenDone": "កំពុងស្តាប់ — �ាយ",
        "releaseWhenDone": "កំពុងស្តាប់ — រួចហើយសូមលែង",
        "tapListening": "កំពុងស្តាប់ — ផ្អាក ឬចុចម្ដងទៀត",
        "speaking": "កំពុងនិយាយ…",
        "translating": "កំពុងបកប្រែ",
        "friendLooksHere": "មិត្តភក្តិមើលមកផ្នែកនេះ",
        "holdFacingYou": "តម្រង់ទូរស�ះ",
        "holdFacingYou": "តម្រង់ទូរស័ព្ទមករកខ្លួនអ្នក",
    },
    "my": {
        "holdOrTapToSpeak": "ပြောရန် နှိပ်ပါ သို့မဟုတ် ဖိထားပါ",
        "releaseWhenDone": "နားထောင်နေသည် — ပြီးရင် လွှတ်ပါ",
        "tapListening": "နားထောင်နေသည် — ရပ်ပါ သို့မဟုတ် ထပ်နှိပ်ပါ",
        "speaking": "ပြောနေသည်…",
        "translating": "ဘာသာပြန်နေသည်",
        "friendLooksHere": "သူငယ်ချင်း ဒီဘက်ကို ကြည့်ပါ",
        "holdFacingYou": "ဖုန်းကို ကိုယ့်ဘက်လှည့်ထားပါ",
    },
    "jv": {
        "holdOrTapToSpeak": "Pencet utawa tahan kanggo ngomong",
        "releaseWhenDone": "Ngrungokake — lepaske yen wis rampung",
        "tapListening": "Ngrungokake — mandheg utawa pencet maneh",
        "speaking": "Ngomong…",
        "translating": "Nerjemahake",
        "friendLooksHere": "Kanca madhep sisih iki",
        "holdFacingYou": "Arahake HP menyang sampeyan",
    },
    "it": {
        "holdOrTapToSpeak": "Tieni premuto o tocca per parlare",
        "releaseWhenDone": "In ascolto — rilascia quando hai finito",
        "tapListening": "In ascolto — pausa o tocca per fermare",
        "speaking": "Parlando…",
        "translating": "Traduzione",
        "friendLooksHere": "L’amico guarda da questo lato",
        "holdFacingYou": "Tieni il telefono rivolto verso di te",
    },
    "de": {
        "holdOrTapToSpeak": "Gedrückt halten oder tippen zum Sprechen",
        "releaseWhenDone": "Hört zu — loslassen wenn fertig",
        "tapListening": "Hört zu — Pause oder tippen zum Stoppen",
        "speaking": "Spricht…",
        "translating": "Übersetzt",
        "friendLooksHere": "Freund schaut auf diese Seite",
        "holdFacingYou": "Handy zu dir zeigen",
    },
    "nl": {
        "holdOrTapToSpeak": "Vasthouden of tikken om te spreken",
        "releaseWhenDone": "Luisteren — loslaten als je klaar bent",
        "tapListening": "Luisteren — pauzeer of tik om te stoppen",
        "speaking": "Spreken…",
        "translating": "Vertalen",
        "friendLooksHere": "Vriend kijkt naar deze kant",
        "holdFacingYou": "Houd de telefoon naar jezelf gericht",
    },
}

TITLE = {
    "ja": "Japanese / 日本語",
    "id": "Indonesian / Bahasa Indonesia",
    "ms": "Malay / Bahasa Melayu",
    "pt": "Brazilian Portuguese / Português (Brasil)",
    "fr": "French / Français (France)",
    "hi": "Hindi / हिन्दी",
    "km": "Khmer / ភាសាខ្មែរ",
    "my": "Burmese / မြန်မာ",
    "jv": "Javanese / Basa Jawa",
    "it": "Italian / Italiano",
    "de": "German / Deutsch",
    "nl": "Dutch / Nederlands",
}


def replace_once(path: Path, old: str, new: str, required: bool = True) -> None:
    text = path.read_text()
    if old not in text:
        if required and new not in text:
            raise SystemExit(f"MISSING pattern in {path}: {old[:80]!r}")
        return
    path.write_text(text.replace(old, new, 1))


def replace_all(path: Path, old: str, new: str) -> int:
    text = path.read_text()
    count = text.count(old)
    if count:
        path.write_text(text.replace(old, new))
    return count


def insert_before(path: Path, marker: str, block: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    if marker not in text:
        raise SystemExit(f"MISSING marker in {path}: {marker[:80]!r}")
    path.write_text(text.replace(marker, block + marker, 1))


def pascal(code: str) -> str:
    return {"pt": "Pt", "id": "Id", "ms": "Ms", "my": "My"}.get(code, code[:1].upper() + code[1:])


def write_text_component(code: str, html_lang: str, en: str) -> None:
    name = f"{pascal(code)}Text"
    path = ROOT / f"apps/web/src/components/{name}.tsx"
    if path.exists():
        return
    path.write_text(
        f'''import type {{ ReactNode }} from 'react'

/**
 * Scaffold compact line for {en} (`{code}`).
 * Cloud agent: replace with real pedagogy (readings / chips / honesty notes).
 */
export function {name}({{
  text,
  className,
  placeholder,
  onActivate,
  activateLabel,
  showDetail = false,
}}: {{
  text: string
  className?: string
  placeholder?: ReactNode
  onActivate?: (text: string) => void
  activateLabel?: string
  showDetail?: boolean
}}) {{
  const trimmed = text.trim()
  if (!trimmed) return placeholder ? <>{{placeholder}}</> : null

  const body = (
    <span className={{className || undefined}} lang="{html_lang}" data-scaffold-lang="{code}">
      {{trimmed}}
      {{showDetail ? null : null}}
    </span>
  )

  if (!onActivate) return body

  return (
    <button
      type="button"
      className="scaffold-lang-activate"
      onClick={{() => onActivate(trimmed)}}
      aria-label={{activateLabel || `${{trimmed}}. Open details.`}}
    >
      {{body}}
    </button>
  )
}}
'''
    )


def write_doc(code: str, locale: str, f_voice: str, m_voice: str) -> None:
    slug = {
        "ja": "japanese",
        "id": "indonesian",
        "ms": "malay",
        "pt": "brazilian-portuguese",
        "fr": "french",
        "hi": "hindi",
        "km": "khmer",
        "my": "burmese",
        "jv": "javanese",
        "it": "italian",
        "de": "german",
        "nl": "dutch",
    }[code]
    path = ROOT / f"docs/{slug}.md"
    if path.exists():
        return
    path.write_text(
        f"""# {TITLE[code]}

Target variety for JyutTranslate when lang code is **`{code}`**.

Azure Speech locale: **`{locale}`** (TTS `{f_voice}`, `{m_voice}`).

## Status

**Scaffold** — wired into Solo / Conversation / Cam / Docs / STT / TTS prefs with stub pedagogy.
A dedicated cloud agent should polish: native Conversation copy, translate register prompts,
Details pedagogy, compact line helpers, and phrase seeds.

## Product rules (scaffold defaults)

- Colloquial register by default; formal when the English source looks legal / medical / official.
- Compact UI shows the native script/orthography only until pedagogy lands.
- Not in `PRIMARY_LANGS` (no BiText gloss pass yet).

## Implementation pointers

- Conversation: `apps/web/src/lib/conversationUi.ts`
- Translate: `apps/api/src/translateScaffold.ts` + router in `translate.ts`
- Compact UI: `apps/web/src/components/{pascal(code)}Text.tsx`
- Azure: `{locale}` STT/TTS; iPhone stays on Web Speech (not Azure-forced)
- Prefs: `tts_voice_{code}` (`supabase/migrations/038_tts_voice_scaffold_12.sql`)
"""
    )


def write_translate_scaffold() -> None:
    path = ROOT / "apps/api/src/translateScaffold.ts"
    cases = ",\n".join(
        f"""  {c}: {{
    label: {TITLE[c].split(' / ')[0]!r},
    locale: {L[5]!r},
    scriptNote: {('Latin orthography' if L[12]=='latin' else 'native script')!r},
  }}"""
        for c, L in zip(CODES, LANGS)
    )
    path.write_text(
        f'''/**
 * Generic EN↔lang translate stubs for newly scaffolded VoiceLang codes.
 * Per-language cloud agents should replace these with dedicated translate* modules
 * (see translateKorean / translateThai) when polishing pedagogy + register.
 */
import {{ z }} from 'zod'
import {{ env }} from './env.js'
import {{ openaiClient, llmChatExtras }} from './openai.js'
import {{ dictionaryTranslate }} from './canto/dictionary.js'
import {{ looksLikeGlossDump }} from '@jyut/shared/glossDump'
import {{ emptyMeta, parsePayload, parseYuePayload, type TranslateResult, type TranslateStage }} from './translateShared.js'

export const ScaffoldLangZ = z.enum([{', '.join(repr(c) for c in CODES)}])
export type ScaffoldLang = z.infer<typeof ScaffoldLangZ>

const META: Record<
  ScaffoldLang,
  {{ label: string; locale: string; scriptNote: string }}
> = {{
{cases}
}}

function hasHan(s: string): boolean {{
  return /[\\u3400-\\u9FFF]/.test(s)
}}

type TranslateLang = ScaffoldLang | 'en'

export async function translateScaffoldLang(opts: {{
  from: TranslateLang
  to: TranslateLang
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}}): Promise<TranslateResult> {{
  const {{ from, to, text, stage, wantAlts, fallbackDefinition }} = opts
  const lang = (to === 'en' ? from : to) as ScaffoldLang
  const meta = META[lang]
  const toTarget = to === lang

  const dictHit = dictionaryTranslate({{
    sourceLang: from as never,
    targetLang: to as never,
    source: text,
    wantAlternatives: wantAlts,
  }})
  if (dictHit) {{
    return {{
      text: dictHit.text,
      definition: toTarget ? fallbackDefinition : '',
      alternatives: wantAlts ? dictHit.alternatives : [],
      engine: 'dictionary',
      from: from as never,
      to: to as never,
      stage,
      meta: {{
        dictionaryHit: true,
        scrubbed: false,
        colloquialScore: 8,
        rewritten: false,
        notes: [`dict:${{dictHit.entry.id}}`, `${{lang}}-scaffold`],
      }},
    }}
  }}

  const client = openaiClient()
  if (!client) {{
    return {{
      text: toTarget ? `(demo ${{lang.toUpperCase()}}) ${{text}}` : `(demo) ${{text}}`,
      definition: toTarget ? fallbackDefinition : '',
      alternatives: [],
      engine: 'demo',
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta(['demo', `${{lang}}-scaffold`]),
    }}
  }}

  const engine = env.openaiBaseUrl ? 'openai-compatible' : 'openai'
  let primary = text
  let alternatives: string[] = []
  let definition = fallbackDefinition

  if (wantAlts && toTarget) {{
    const system = [
      `You are a ${{meta.label}} interpreter for face-to-face conversation.`,
      `Translate English into COLLOQUIAL spoken ${{meta.label}} (${{meta.scriptNote}}).`,
      'Never Chinese characters. Never invent Cantonese-style ASCII tone digits.',
      'Return ONLY valid JSON:',
      '{{"primary":"<best colloquial>","alternatives":["<other natural variant>", "..."],"definition":"<short English gloss>"}}',
      'Prefer 2–3 natural spoken variants. No markdown.',
    ].join('\\n')
    const completion = await client.chat.completions.create({{
      model: env.openaiModel,
      temperature: 0.4,
      max_tokens: 400,
      messages: [
        {{ role: 'system', content: system }},
        {{ role: 'user', content: text }},
      ],
      response_format: {{ type: 'json_object' }},
      ...llmChatExtras(),
    }})
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsed = parseYuePayload(raw, text, false)
    primary = parsed.text
    alternatives = parsed.alternatives
    if (parsed.definition) definition = parsed.definition
  }} else if (wantAlts && !toTarget) {{
    const system = [
      `You are a ${{meta.label}} interpreter helping speakers learn English.`,
      `Translate colloquial ${{meta.label}} into natural conversational English.`,
      'Return ONLY valid JSON:',
      '{{"primary":"<best English>","alternatives":["<other natural English phrasing>", "..."],"definition":"<short gloss>"}}',
      'Prefer 2–3 natural English variants. No markdown.',
    ].join('\\n')
    const completion = await client.chat.completions.create({{
      model: env.openaiModel,
      temperature: 0.35,
      max_tokens: 400,
      messages: [
        {{ role: 'system', content: system }},
        {{ role: 'user', content: text }},
      ],
      response_format: {{ type: 'json_object' }},
      ...llmChatExtras(),
    }})
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const parsedEn = parseYuePayload(raw, '', false)
    primary = parsedEn.text
    alternatives = parsedEn.alternatives.filter((a) => a && !hasHan(a))
    if (parsedEn.definition) definition = parsedEn.definition
  }} else {{
    const system = toTarget
      ? [
          `You are a ${{meta.label}} interpreter for face-to-face conversation.`,
          `Translate into COLLOQUIAL spoken ${{meta.label}} (${{meta.scriptNote}}).`,
          'Never Chinese characters. Never invent Cantonese-style ASCII tone digits.',
          'Return ONLY valid JSON:',
          '{{"translation":"<colloquial>","definition":"<short English gloss>"}}',
        ].join('\\n')
      : [
          `You are a ${{meta.label}} interpreter.`,
          `Translate colloquial ${{meta.label}} into natural English for conversation.`,
          'Return ONLY valid JSON:',
          '{{"translation":"<English>","definition":"<optional short sense note, or empty string>"}}',
        ].join('\\n')
    const completion = await client.chat.completions.create({{
      model: env.openaiModel,
      temperature: 0.25,
      max_tokens: 400,
      messages: [
        {{ role: 'system', content: system }},
        {{ role: 'user', content: text }},
      ],
      ...llmChatExtras(),
    }})
    const raw = completion.choices[0]?.message?.content?.trim() || ''
    const payload = parsePayload(raw, toTarget ? text : '', fallbackDefinition, false)
    primary = payload.text
    definition = toTarget ? payload.definition || fallbackDefinition : payload.definition
  }}

  if (toTarget) {{
    const outText = primary && !hasHan(primary) ? primary.trim() : ''
    return {{
      text: outText,
      definition,
      alternatives: wantAlts
        ? alternatives.filter((a) => a && !hasHan(a) && a !== outText)
        : [],
      engine,
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta(outText ? [`${{lang}}-scaffold`] : [`${{lang}}-scaffold`, `no-${{lang}}-output`]),
    }}
  }}

  if (looksLikeGlossDump(primary) || hasHan(primary)) {{
    return {{
      text: '',
      definition: '',
      alternatives: [],
      engine,
      from: from as never,
      to: to as never,
      stage,
      meta: emptyMeta([`${{lang}}-echo-blocked`]),
    }}
  }}

  return {{
    text: primary,
    definition,
    alternatives: wantAlts ? alternatives.filter((a) => a && !hasHan(a) && a !== primary) : [],
    engine,
    from: from as never,
    to: to as never,
    stage,
    meta: emptyMeta([`${{lang}}-scaffold`]),
  }}
}}

export function isScaffoldLang(lang: string | null | undefined): lang is ScaffoldLang {{
  return typeof lang === 'string' && (ScaffoldLangZ.options as string[]).includes(lang)
}}
'''
    )


def ensure_translate_shared() -> None:
    """Extract helpers if missing — prefer importing from translate.ts via duplicate minimal helpers."""
    # We'll keep helpers inline in translateScaffold by importing from a thin shared file.
    # Check if translateShared exists; if not, create by re-exporting patterns used in translate.ts.
    path = ROOT / "apps/api/src/translateShared.ts"
    if path.exists():
        return
    # Grep-style: create minimal shared types used by scaffold only.
    path.write_text(
        '''/** Shared translate helpers for scaffold + future extract. */
export type TranslateStage = 'final' | 'interim'

export type TranslateResult = {
  text: string
  definition: string
  alternatives: string[]
  engine: string
  from: string
  to: string
  stage: TranslateStage
  meta: {
    dictionaryHit: boolean
    scrubbed: boolean
    colloquialScore: number
    rewritten: boolean
    notes: string[]
  }
  romanization?: string
  sandhiHint?: string
  ipa?: string
  alternativeRomanizations?: string[]
}

export function emptyMeta(notes: string[] = []) {
  return {
    dictionaryHit: false,
    scrubbed: false,
    colloquialScore: 0,
    rewritten: false,
    notes,
  }
}

export function parsePayload(
  raw: string,
  fallbackText: string,
  fallbackDefinition: string,
  _preferHan: boolean,
): { text: string; definition: string } {
  try {
    const j = JSON.parse(raw) as { translation?: string; definition?: string; primary?: string }
    const text = (j.translation || j.primary || '').trim() || fallbackText
    const definition = (j.definition || '').trim() || fallbackDefinition
    return { text, definition }
  } catch {
    return { text: fallbackText, definition: fallbackDefinition }
  }
}

export function parseYuePayload(
  raw: string,
  fallbackText: string,
  _preferHan: boolean,
): { text: string; alternatives: string[]; definition: string } {
  try {
    const j = JSON.parse(raw) as {
      primary?: string
      translation?: string
      alternatives?: string[]
      definition?: string
    }
    const text = (j.primary || j.translation || '').trim() || fallbackText
    const alternatives = Array.isArray(j.alternatives)
      ? j.alternatives.map((a) => String(a || '').trim()).filter(Boolean)
      : []
    return { text, alternatives, definition: (j.definition || '').trim() }
  } catch {
    return { text: fallbackText, alternatives: [], definition: '' }
  }
}
'''
    )


def patch_tts_voices() -> None:
    path = ROOT / "packages/yue-shared/src/ttsVoices.ts"
    text = path.read_text()
    if "DEFAULT_JA_VOICE" in text:
        return

    defaults = "\n".join(
        f"export const DEFAULT_{c.upper()}_VOICE = '{L[7]}'" for c, L in zip(CODES, LANGS)
    )
    insert_before(path, "\nexport type YueVoiceId =", defaults + "\n")

    type_blocks = []
    for c, L in zip(CODES, LANGS):
        P = c.upper()
        type_blocks.append(
            f"export type {pascal(c)}VoiceId = '{L[7]}' | '{L[8]}'\n"
        )
    insert_before(path, "\nexport type TtsVoiceId =", "".join(type_blocks))

    text = path.read_text()
    text = text.replace(
        OLD_VOICE.replace("export type VoiceLang = ", ""),  # not used
        OLD_VOICE.replace("export type VoiceLang = ", ""),
    )
    # Extend TtsVoiceId union
    text = text.replace(
        "| KoVoiceId\n",
        "| KoVoiceId\n" + "".join(f"  | {pascal(c)}VoiceId\n" for c in CODES),
    )
    # Extend TtsVoiceOption.lang
    text = text.replace(
        "lang: 'yue' | 'en' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko'",
        "lang: 'yue' | 'en' | 'cmn' | 'wuu' | 'sichuan' | 'tl' | 'es' | 'eses' | 'vi' | 'th' | 'lo' | 'ko'"
        + "".join(f" | '{c}'" for c in CODES),
    )
    path.write_text(text)

    voice_arrays = []
    for c, L in zip(CODES, LANGS):
        P = c.upper()
        voice_arrays.append(
            f"""
export const {P}_VOICES: TtsVoiceOption[] = [
  {{
    id: '{L[7]}',
    lang: '{c}',
    xmlLang: '{L[5]}',
    labelEn: '{L[9]} · Female',
    labelZh: '{L[9]} · 女聲',
    gender: 'female',
  }},
  {{
    id: '{L[8]}',
    lang: '{c}',
    xmlLang: '{L[5]}',
    labelEn: '{L[10]} · Male',
    labelZh: '{L[10]} · 男聲',
    gender: 'male',
  }},
]
"""
        )
    insert_before(path, "\nexport const CMN_VOICES:", "".join(voice_arrays))

    text = path.read_text()
    sets = "".join(f"const {c.upper()}_SET = new Set({c.upper()}_VOICES.map((v) => v.id))\n" for c in CODES)
    text = text.replace(
        "const KO_SET = new Set(KO_VOICES.map((v) => v.id))\n",
        "const KO_SET = new Set(KO_VOICES.map((v) => v.id))\n" + sets,
    )
    spreads = "".join(f"    ...{c.upper()}_VOICES,\n" for c in CODES)
    text = text.replace("    ...KO_VOICES,\n", "    ...KO_VOICES,\n" + spreads)

    helpers = []
    for c in CODES:
        P = pascal(c)
        U = c.upper()
        helpers.append(
            f"""
export function is{P}Voice(id: string): id is {P}VoiceId {{
  return {U}_SET.has(id as {P}VoiceId)
}}

export function resolve{P}Voice(id: string | null | undefined): {P}VoiceId {{
  return id && is{P}Voice(id) ? id : DEFAULT_{U}_VOICE
}}
"""
        )
    text = text.replace(
        "export function resolveKoVoice(id: string | null | undefined): KoVoiceId {\n  return id && isKoVoice(id) ? id : DEFAULT_KO_VOICE\n}\n",
        "export function resolveKoVoice(id: string | null | undefined): KoVoiceId {\n  return id && isKoVoice(id) ? id : DEFAULT_KO_VOICE\n}\n"
        + "".join(helpers),
    )

    # Extend resolveSpeakVoice — append preferred params + branches before Yue fallback
    pref_args = "".join(f",\n  preferred{pascal(c)}?: string | null" for c in CODES)
    text = text.replace(
        "  preferredKo?: string | null,\n): { voice: string; xmlLang: string }",
        "  preferredKo?: string | null"
        + pref_args
        + ",\n): { voice: string; xmlLang: string }",
    )

    is_checks = "".join(
        f"  const is{pascal(c)} = lang === '{c}' || lang === '{L[5]}' || lang === '{L[5].lower()}'\n"
        for c, L in zip(CODES, LANGS)
    )
    text = text.replace(
        "  const isKo = lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'\n",
        "  const isKo = lang === 'ko' || lang === 'ko-KR' || lang === 'ko-kr'\n" + is_checks,
    )

    # override meta checks
    override_lines = "".join(
        f"      if (is{pascal(c)} && meta.lang === '{c}') return {{ voice: meta.id, xmlLang: meta.xmlLang }}\n"
        for c in CODES
    )
    text = text.replace(
        "      if (isKo && meta.lang === 'ko') return { voice: meta.id, xmlLang: meta.xmlLang }\n",
        "      if (isKo && meta.lang === 'ko') return { voice: meta.id, xmlLang: meta.xmlLang }\n"
        + override_lines,
    )

    not_flags = "".join(f"\n        !is{pascal(c)} &&" for c in CODES)
    text = text.replace(
        "!isKo &&\n        meta.lang === 'yue'",
        "!isKo &&"
        + not_flags.rstrip(" &&")
        + "\n        meta.lang === 'yue'",
    )

    resolve_branches = "".join(
        f"""  if (is{pascal(c)}) {{
    const id = resolve{pascal(c)}Voice(preferred{pascal(c)})
    return {{ voice: id, xmlLang: voiceMeta(id)!.xmlLang }}
  }}
"""
        for c in CODES
    )
    text = text.replace(
        """  if (isKo) {
    const id = resolveKoVoice(preferredKo)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
  const id = resolveYueVoice(preferredYue)
""",
        """  if (isKo) {
    const id = resolveKoVoice(preferredKo)
    return { voice: id, xmlLang: voiceMeta(id)!.xmlLang }
  }
"""
        + resolve_branches
        + "  const id = resolveYueVoice(preferredYue)\n",
    )

    previews = "\n".join(f"export const PREVIEW_{c.upper()} = {L[11]!r}" for c, L in zip(CODES, LANGS))
    text = text.replace(
        "export const PREVIEW_KO = '안녕하세요 — 한국어 음성입니다.'\n",
        "export const PREVIEW_KO = '안녕하세요 — 한국어 음성입니다.'\n" + previews + "\n",
    )
    path.write_text(text)


def main() -> None:
    # 1) types
    types = ROOT / "apps/web/src/lib/types.ts"
    replace_once(types, f"export type VoiceLang = {OLD_VOICE}", f"export type VoiceLang = {NEW_VOICE}")

    # prefs ttsVoice* on Entitlement — find ttsVoiceKo and append
    t = types.read_text()
    if "ttsVoiceJa" not in t:
        t = t.replace(
            "ttsVoiceKo?: string",
            "ttsVoiceKo?: string\n"
            + "\n".join(f"    ttsVoice{pascal(c)}?: string" for c in CODES),
        )
        types.write_text(t)

    # 2) langCapabilities
    cap = ROOT / "apps/web/src/lib/langCapabilities.ts"
    t = cap.read_text()
    if "lang === 'ja'" not in t:
        t = t.replace(
            "    lang === 'ko'\n  )",
            "    lang === 'ko'\n"
            + "".join(f"    || lang === '{c}'\n" for c in CODES)
            + "  )",
        )
        # fix formatting - use cleaner
        cap.write_text(t)
        # Re-read and normalize if broken
        t = cap.read_text()
        if "|| lang === 'ja'" in t and "lang === 'ko'\n    ||" in t:
            t = t.replace(
                "    lang === 'ko'\n" + "".join(f"    || lang === '{c}'\n" for c in CODES) + "  )",
                "    lang === 'ko' ||\n"
                + "".join(f"    lang === '{c}'" + (" ||\n" if i < len(CODES)-1 else "\n") for i, c in enumerate(CODES))
                + "  )",
            )
            cap.write_text(t)

    # 3) conversation UI
    cui = ROOT / "apps/web/src/lib/conversationUi.ts"
    t = cui.read_text()
    if "  ja:" not in t:
        block = []
        for c, L in zip(CODES, LANGS):
            m = MIC[c]
            block.append(
                f"""  {c}: {{
    htmlLang: '{L[6]}',
    mic: {{
      holdOrTapToSpeak: {m['holdOrTapToSpeak']!r},
      releaseWhenDone: {m['releaseWhenDone']!r},
      tapListening: {m['tapListening']!r},
      speaking: {m['speaking']!r},
      translating: {m['translating']!r},
    }},
    friendLooksHere: {m['friendLooksHere']!r},
    holdFacingYou: {m['holdFacingYou']!r},
  }},
"""
            )
        t = t.replace(
            "  ko: {\n    htmlLang: 'ko-KR',",
            "".join(block) + "  ko: {\n    htmlLang: 'ko-KR',",
        )
        # Wait - that puts new langs BEFORE ko. Better after ko.
        t = cui.read_text()
        # insert before closing of CONVERSATION_PANE_UI
        marker = "  ko: {\n    htmlLang: 'ko-KR',\n    mic: {\n      holdOrTapToSpeak: '누르거나 길게 눌러 말하기',\n      releaseWhenDone: '듣는 중 — 끝나면 손을 떼세요',\n      tapListening: '듣는 중 — 멈추거나 다시 누르세요',\n      speaking: '말하는 중…',\n      translating: '번역 중',\n    },\n    friendLooksHere: '친구는 이쪽을 보세요',\n    holdFacingYou: '화면이 자신을 향하게 드세요',\n  },\n}"
        after_ko = []
        for c, L in zip(CODES, LANGS):
            m = MIC[c]
            after_ko.append(
                f"""  {c}: {{
    htmlLang: '{L[6]}',
    mic: {{
      holdOrTapToSpeak: {m['holdOrTapToSpeak']!r},
      releaseWhenDone: {m['releaseWhenDone']!r},
      tapListening: {m['tapListening']!r},
      speaking: {m['speaking']!r},
      translating: {m['translating']!r},
    }},
    friendLooksHere: {m['friendLooksHere']!r},
    holdFacingYou: {m['holdFacingYou']!r},
  }},"""
            )
        replacement = marker[:-2] + "\n" + "\n".join(after_ko) + "\n}"
        if marker not in t:
            raise SystemExit("conversationUi ko block not found")
        cui.write_text(t.replace(marker, replacement, 1))

    # 4) detail pedagogy — insert before ceb
    ped = ROOT / "apps/web/src/lib/detailPedagogy.ts"
    t = ped.read_text()
    if "  ja:" not in t:
        rows = []
        for c, L in zip(CODES, LANGS):
            rows.append(
                f"""  {c}: {{
    htmlLang: '{L[6].split('-')[0] if L[6] not in ('pt-BR',) else 'pt'}',
    pronField: 'accented',
    defaultGlossLang: '{c}',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  }},
"""
            )
        # fix htmlLang properly
        rows = []
        for c, L in zip(CODES, LANGS):
            hl = L[6]
            rows.append(
                f"""  {c}: {{
    htmlLang: '{hl}',
    pronField: 'accented',
    defaultGlossLang: '{c}',
    rubyTitle: false,
    localOffline: true,
    extraPanels: [],
  }},
"""
            )
        t = t.replace(
            "  ceb: {",
            "".join(rows) + "  ceb: {",
        )
        ped.write_text(t)

    # 5) supportedLangs
    sup = ROOT / "apps/web/src/landing/supportedLangs.ts"
    t = sup.read_text()
    if "id: 'ja'" not in t:
        cards = []
        for c, L in zip(CODES, LANGS):
            cards.append(
                f"  {{ id: '{c}', mark: '{L[3]}', en: '{L[1]}', native: '{L[2]}', voice: true, flag: '{L[4]}' }},\n"
            )
        t = t.replace(
            "  { id: 'ko', mark: 'Ko', en: 'Korean', native: '한국어', voice: true, flag: '🇰🇷' },\n",
            "  { id: 'ko', mark: 'Ko', en: 'Korean', native: '한국어', voice: true, flag: '🇰🇷' },\n"
            + "".join(cards),
        )
        sup.write_text(t)

    # 6) TTS shared package
    patch_tts_voices()

    # 7) migration
    mig = ROOT / "supabase/migrations/038_tts_voice_scaffold_12.sql"
    if not mig.exists():
        parts = []
        for c, L in zip(CODES, LANGS):
            parts.append(
                f"""alter table public.profiles
  add column if not exists tts_voice_{c} text
  check (
    tts_voice_{c} is null
    or tts_voice_{c} in (
      '{L[7]}',
      '{L[8]}'
    )
  );
"""
            )
        mig.write_text(
            "-- Scaffold TTS voice prefs for 12 new VoiceLang codes.\n" + "\n".join(parts)
        )

    # 8) translate scaffold module
    ensure_translate_shared()
    write_translate_scaffold()

    # 9) text components + docs
    for c, L in zip(CODES, LANGS):
        write_text_component(c, L[6], L[1])
        write_doc(c, L[5], L[7], L[8])

    # 10) mechanical union replacements in many files
    paths = [
        ROOT / "apps/web/src/lib/docsApi.ts",
        ROOT / "apps/web/src/lib/detailTypes.ts",
        ROOT / "apps/web/src/lib/camera/types.ts",
        ROOT / "apps/web/src/lib/historySync.ts",
        ROOT / "apps/web/src/lib/api.ts",
        ROOT / "apps/api/src/translate.ts",
        ROOT / "apps/api/src/translateCamera.ts",
        ROOT / "apps/api/src/breakdown.ts",
        ROOT / "apps/api/src/detailsEnrich.ts",
        ROOT / "apps/api/src/docs/shared.ts",
        ROOT / "apps/api/src/docs/handler.ts",
        ROOT / "apps/api/src/cameraScan.ts",
        ROOT / "apps/api/src/canto/types.ts",
        ROOT / "apps/web/src/lib/webSpeech.smoke.ts",
    ]
    for p in paths:
        if not p.exists():
            print("skip missing", p)
            continue
        t = p.read_text()
        orig = t
        if OLD_FULL in t:
            t = t.replace(OLD_FULL, NEW_FULL)
        if OLD_ENUM in t and NEW_ENUM not in t:
            # careful: only replace voice-only enums (not already expanded)
            t = t.replace(OLD_ENUM, NEW_ENUM)
        if OLD_VOICE in t:
            t = t.replace(OLD_VOICE, NEW_VOICE)
        # type alias forms without quotes pattern already handled
        if t != orig:
            p.write_text(t)
            print("patched unions", p.relative_to(ROOT))
        else:
            print("no union change", p.relative_to(ROOT))

    print("scaffold core done — follow-up patches needed for UI/store/TTS re-exports")


if __name__ == "__main__":
    main()
