import { describe, expect, it } from 'vitest'

import {
  computeReadingTime,
  countWords,
  isCharacterBased,
  localePrefix,
  resolveWordsPerMinute,
} from './readingTime.js'

describe('countWords', () => {
  it('counts whitespace-separated words for word-based locales', () => {
    expect(countWords('Hello world from Payload', 'en', [])).toBe(4)
  })

  it('returns 0 for empty input', () => {
    expect(countWords('', 'en', [])).toBe(0)
    expect(countWords('   ', 'en', [])).toBe(0)
  })

  it('counts CJK characters for character-based locales', () => {
    expect(countWords('我喜欢看书', 'zh', ['zh'])).toBe(5)
  })

  it('matches locale prefix for character-based locales', () => {
    expect(countWords('日本語のテキスト', 'ja-JP', ['ja'])).toBeGreaterThan(0)
  })
})

describe('computeReadingTime', () => {
  it('returns 0 when no words', () => {
    expect(computeReadingTime(0, 250)).toBe(0)
  })

  it('rounds up to the nearest minute', () => {
    expect(computeReadingTime(251, 250)).toBe(2)
  })

  it('returns at least 1 minute for any non-empty content', () => {
    expect(computeReadingTime(1, 250)).toBe(1)
  })

  it('handles non-positive WPM gracefully', () => {
    expect(computeReadingTime(500, 0)).toBe(0)
    expect(computeReadingTime(500, -5)).toBe(0)
  })
})

describe('resolveWordsPerMinute', () => {
  const config = {
    defaultWordsPerMinute: 250,
    wordsPerMinute: { 'en-US': 280, zh: 500 } as Record<string, number>,
  }

  it('returns the exact locale match first', () => {
    expect(resolveWordsPerMinute('en-US', config)).toBe(280)
  })

  it('falls back to the language prefix', () => {
    expect(resolveWordsPerMinute('zh-Hant', config)).toBe(500)
  })

  it('falls back to the default when no match', () => {
    expect(resolveWordsPerMinute('fr', config)).toBe(250)
  })
})

describe('localePrefix', () => {
  it('returns everything before the first dash', () => {
    expect(localePrefix('en-US')).toBe('en')
  })

  it('returns the locale itself when there is no dash', () => {
    expect(localePrefix('zh')).toBe('zh')
  })

  it('returns empty for empty input', () => {
    expect(localePrefix('')).toBe('')
  })
})

describe('isCharacterBased', () => {
  it('matches the full locale', () => {
    expect(isCharacterBased('ja', ['ja'])).toBe(true)
  })

  it('matches the language prefix', () => {
    expect(isCharacterBased('zh-Hans', ['zh'])).toBe(true)
  })

  it('returns false for non-listed locales', () => {
    expect(isCharacterBased('en-US', ['zh', 'ja', 'ko'])).toBe(false)
  })
})
