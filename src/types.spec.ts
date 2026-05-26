import { describe, expect, it } from 'vitest'

import { DEFAULT_READING_TIME_CONFIG, isPlainObject } from './types.js'

describe('DEFAULT_READING_TIME_CONFIG', () => {
  it('uses sensible defaults', () => {
    expect(DEFAULT_READING_TIME_CONFIG.readingTimeField).toBe('readingTime')
    expect(DEFAULT_READING_TIME_CONFIG.wordCountField).toBe('wordCount')
    expect(DEFAULT_READING_TIME_CONFIG.richTextField).toBe('content')
    expect(DEFAULT_READING_TIME_CONFIG.defaultWordsPerMinute).toBe(250)
    expect(DEFAULT_READING_TIME_CONFIG.characterBasedLocales).toContain('zh')
  })
})

describe('isPlainObject', () => {
  it('accepts plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject({ a: 1 })).toBe(true)
  })

  it('rejects arrays, null, and primitives', () => {
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject('x')).toBe(false)
    expect(isPlainObject(0)).toBe(false)
  })
})
