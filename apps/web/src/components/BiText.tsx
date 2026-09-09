import { useEffect, useState, type ElementType } from 'react'
import {
  isPrimaryGlossLang,
  primaryGlossHtmlLang,
  primaryReplacesChinese,
  resolvePrimaryUiGloss,
} from '../lib/primaryUiGloss'
import { ensurePinyinSegs, toPinyinCached } from '../lib/pinyin'
import { useYueStore } from '../lib/store'
import { normalizeEnglishApostrophes } from '../lib/typography'
import type { Bi } from '../lib/uiCopy'
import { useJpPopup } from '../lib/useJpPopup'
import { JpPop } from './JpPop'

type BiTextProps = {
  copy: Bi
  size?: 'sm' | 'md' | 'lg'
  className?: string
  as?: ElementType
  /** Skip Jyutping popup entirely */
  hideJp?: boolean
  /** Language-pure: English only, or secondary line (Chinese / primary) only. */
  only?: 'en' | 'zh'
  /**
   * `stack` (default): English above secondary.
   * `inline`: English and secondary on one line (panel chrome / compact labels).
   */
  layout?: 'stack' | 'inline'
  /**
   * Visual order when both lines show. Default English first.
   * `zh-first`: Chinese (or primary-replaced secondary) leads; English is the quieter hint.
   */
  order?: 'en-first' | 'zh-first'
}

/** Bilingual UI copy; secondary line follows Account Hub primary language. */
export function BiText({
  copy,
  size = 'md',
  className = '',
  as: Tag = 'span',
  hideJp = false,
  only,
  layout = 'stack',
  order = 'en-first',
}: BiTextProps) {
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const wantPrimaryGloss = isPrimaryGlossLang(primaryLanguage) && only !== 'en'
  const catalogGloss = wantPrimaryGloss
    ? resolvePrimaryUiGloss(copy, primaryLanguage)
    : undefined

  const [cmnPinyin, setCmnPinyin] = useState(() =>
    primaryLanguage === 'cmn' ? toPinyinCached(copy.zh) : '',
  )

  useEffect(() => {
    if (primaryLanguage !== 'cmn' || only === 'en' || !copy.zh.trim()) {
      setCmnPinyin('')
      return
    }
    const cached = toPinyinCached(copy.zh)
    if (cached) {
      setCmnPinyin(cached)
      return
    }
    let cancelled = false
    void ensurePinyinSegs(copy.zh).then(() => {
      if (cancelled) return
      setCmnPinyin(toPinyinCached(copy.zh))
    })
    return () => {
      cancelled = true
    }
  }, [copy.zh, only, primaryLanguage])

  const gloss =
    catalogGloss ||
    (primaryLanguage === 'cmn' && wantPrimaryGloss ? cmnPinyin.trim() || undefined : undefined)

  const replaceZh =
    wantPrimaryGloss && Boolean(gloss) && primaryReplacesChinese(primaryLanguage)

  const canJp =
    !replaceZh &&
    (primaryLanguage === 'yue' || primaryLanguage === 'en') &&
    !hideJp &&
    only !== 'en' &&
    Boolean(copy.jp)
  const { tipId, show, bind, wrapRef } = useJpPopup(canJp)
  const inline = layout === 'inline' && !only
  const zhFirst = order === 'zh-first' && !only

  const zhLine = (
    <span
      {...bind}
      className={`bi-zh-wrap${canJp ? ' bi-zh-wrap--hint' : ''}`}
      lang="zh-HK"
    >
      <span className="bi-zh">{copy.zh}</span>
      {canJp ? (
        <JpPop show={show} id={tipId} han={copy.zh} anchorRef={wrapRef} />
      ) : null}
    </span>
  )

  const primaryAsSecondary =
    replaceZh && gloss ? (
      <span className="bi-zh-wrap" lang={primaryGlossHtmlLang(primaryLanguage)}>
        <span className="bi-zh bi-zh--primary-lang">{gloss}</span>
      </span>
    ) : null

  const secondary = primaryAsSecondary || zhLine

  // Mandarin: keep Chinese characters; pinyin stays a quieter tertiary line.
  const tertiary =
    !replaceZh && gloss && wantPrimaryGloss ? (
      <span className="bi-primary" lang={primaryGlossHtmlLang(primaryLanguage)}>
        {gloss}
      </span>
    ) : null

  const enLine = <span className="bi-en">{normalizeEnglishApostrophes(copy.en)}</span>

  return (
    <Tag
      className={`bi bi--${size}${only ? ` bi--${only}` : ''}${inline ? ' bi--inline' : ''}${zhFirst ? ' bi--zh-first' : ''} ${className}`.trim()}
    >
      {only === 'zh' ? (
        secondary
      ) : only === 'en' ? (
        enLine
      ) : zhFirst ? (
        <>
          {secondary}
          {enLine}
          {tertiary}
        </>
      ) : (
        <>
          {enLine}
          {secondary}
          {tertiary}
        </>
      )}
    </Tag>
  )
}
