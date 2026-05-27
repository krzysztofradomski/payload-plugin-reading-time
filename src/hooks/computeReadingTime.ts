import type { CollectionBeforeChangeHook } from 'payload'

import type { ResolvedReadingTimeConfig, ResolvedReadingTimeSource } from '../types.js'

import { extractFieldText } from '../lib/extractFieldText.js'
import {
  computeReadingTime,
  countWords,
  DEFAULT_LOCALE_KEY,
  resolveWordsPerMinute,
} from '../lib/readingTime.js'

type HookOptions = {
  readingTimeField: false | string
  sources: ResolvedReadingTimeSource[]
  wordCountField: false | string
} & Pick<
  ResolvedReadingTimeConfig,
  'characterBasedLocales' | 'defaultWordsPerMinute' | 'wordsPerMinute'
>

/** Factory for the `beforeChange` hook that recomputes `readingTime` and `wordCount`. */
export function createComputeReadingTimeHook(options: HookOptions): CollectionBeforeChangeHook {
  return ({ data, originalDoc, req }) => {
    const parts: string[] = []

    for (const source of options.sources) {
      const value = readPath(data, source.path) ?? readPath(originalDoc, source.path)
      const text = extractFieldText(value, source.type)
      if (text) {
        parts.push(text)
      }
    }

    const plainText = parts.join(' ').replace(/\s+/g, ' ').trim()

    const locale = typeof req?.locale === 'string' ? req.locale : DEFAULT_LOCALE_KEY
    const wpm = resolveWordsPerMinute(locale, options)
    const wordCount = countWords(plainText, locale, options.characterBasedLocales)
    const readingTime = computeReadingTime(wordCount, wpm)

    const next: Record<string, unknown> = { ...(data ?? {}) }

    if (options.readingTimeField) {
      next[options.readingTimeField] = readingTime
    }

    if (options.wordCountField) {
      next[options.wordCountField] = wordCount
    }

    return next
  }
}

function readPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object' || !path) {
    return undefined
  }

  let current: unknown = source
  for (const part of path.split('.')) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}
