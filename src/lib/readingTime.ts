import type { ResolvedReadingTimeConfig } from '../types.js'

/** Default locale key used when `req.locale` is absent. */
export const DEFAULT_LOCALE_KEY = 'default'

const CJK_CHARACTER_REGEX = /[\u3400-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g

/** Counts CJK characters when the locale is character-based, otherwise words. */
export function countWords(
  text: string,
  locale: string,
  characterBasedLocales: string[],
): number {
  if (!text) {
    return 0
  }

  if (isCharacterBased(locale, characterBasedLocales)) {
    const matches = text.match(CJK_CHARACTER_REGEX)
    return matches ? matches.length : 0
  }

  const words = text.trim().match(/\S+/g)
  return words ? words.length : 0
}

/** Returns reading time in whole minutes, clamped to >= 1 when text exists. */
export function computeReadingTime(words: number, wordsPerMinute: number): number {
  if (!words || wordsPerMinute <= 0) {
    return 0
  }

  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

/** Pick the WPM for a locale, falling back to the resolved default. */
export function resolveWordsPerMinute(
  locale: string,
  config: Pick<ResolvedReadingTimeConfig, 'defaultWordsPerMinute' | 'wordsPerMinute'>,
): number {
  if (locale && config.wordsPerMinute[locale] !== undefined) {
    return config.wordsPerMinute[locale]
  }

  const prefix = localePrefix(locale)
  if (prefix && config.wordsPerMinute[prefix] !== undefined) {
    return config.wordsPerMinute[prefix]
  }

  return config.defaultWordsPerMinute
}

/** Returns the language portion of a locale tag, e.g. `en-US` → `en`. */
export function localePrefix(locale: string): string {
  if (!locale) {
    return ''
  }
  const dashIndex = locale.indexOf('-')
  if (dashIndex === -1) {
    return locale
  }
  return locale.slice(0, dashIndex)
}

/** True when the locale (or its language prefix) is configured as CJK-style. */
export function isCharacterBased(locale: string, characterBasedLocales: string[]): boolean {
  if (!locale) {
    return false
  }

  if (characterBasedLocales.includes(locale)) {
    return true
  }

  const prefix = localePrefix(locale)
  return prefix.length > 0 && characterBasedLocales.includes(prefix)
}
