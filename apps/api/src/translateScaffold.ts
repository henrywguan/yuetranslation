/**
 * Generic EN↔lang translate stubs for newly scaffolded VoiceLang codes.
 * All twelve scaffold languages are now polished — dedicated translate* modules
 * own routing. This file remains so existing imports compile; isScaffoldLang is always false.
 */
import type { TranslateResult, TranslateStage } from './translateShared.js'

/** No languages remain on the scaffold path. */
export type ScaffoldLang = never

export async function translateScaffoldLang(_opts: {
  from: ScaffoldLang | 'en'
  to: ScaffoldLang | 'en'
  text: string
  stage: TranslateStage
  wantAlts: boolean
  fallbackDefinition: string
}): Promise<TranslateResult> {
  throw new Error('translateScaffoldLang: no scaffold languages remain')
}

export function isScaffoldLang(_lang: string | null | undefined): _lang is ScaffoldLang {
  return false
}
