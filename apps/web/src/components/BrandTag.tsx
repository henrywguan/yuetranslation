import { useEffect, useState } from 'react'
import { ensurePinyinSegs, toPinyinCached } from '../lib/pinyin'
import {
  isPrimaryGlossLang,
  primaryGlossHtmlLang,
  primaryReplacesChinese,
} from '../lib/primaryUiGloss'
import { primaryLangLabel } from '../lib/primaryLanguagePref'
import { useYueStore } from '../lib/store'
import { useJpPopup } from '../lib/useJpPopup'
import { JpPop } from './JpPop'

/** App chrome tag under the logo — follows Account hub primary language. */
export function BrandTag() {
  const primaryLanguage = useYueStore((s) => s.primaryLanguage)
  const tag = primaryLangLabel(primaryLanguage)
  const canJp =
    (primaryLanguage === 'yue' || primaryLanguage === 'en') && Boolean(tag.jp)
  const { tipId, show, bind, wrapRef } = useJpPopup(canJp)

  const [cmnPinyin, setCmnPinyin] = useState(() =>
    primaryLanguage === 'cmn' ? toPinyinCached(tag.zh) : '',
  )

  useEffect(() => {
    if (primaryLanguage !== 'cmn' || !tag.zh.trim()) {
      setCmnPinyin('')
      return
    }
    const cached = toPinyinCached(tag.zh)
    if (cached) {
      setCmnPinyin(cached)
      return
    }
    let cancelled = false
    void ensurePinyinSegs(tag.zh).then(() => {
      if (cancelled) return
      setCmnPinyin(toPinyinCached(tag.zh))
    })
    return () => {
      cancelled = true
    }
  }, [primaryLanguage, tag.zh])

  const gloss = !isPrimaryGlossLang(primaryLanguage)
    ? undefined
    : primaryLanguage === 'cmn'
      ? cmnPinyin.trim() || undefined
      : tag.gloss

  const replaceZh = Boolean(gloss) && primaryReplacesChinese(primaryLanguage)

  return (
    <p className="brand-tag">
      <span className="brand-tag-inner" {...(replaceZh ? {} : bind)}>
        <span className="brand-tag-stack">
          <span className="brand-tag-en">{tag.en}</span>
          {replaceZh && gloss ? (
            <span
              className="brand-tag-zh brand-tag-zh--primary-lang"
              lang={primaryGlossHtmlLang(primaryLanguage)}
            >
              {gloss}
            </span>
          ) : (
            <span className="brand-tag-zh">{tag.zh}</span>
          )}
          {!replaceZh && gloss ? (
            <span className="brand-tag-primary" lang={primaryGlossHtmlLang(primaryLanguage)}>
              {gloss}
            </span>
          ) : null}
        </span>
        {!replaceZh && canJp ? (
          <JpPop show={show} id={tipId} han={tag.zh} anchorRef={wrapRef} />
        ) : null}
      </span>
    </p>
  )
}
