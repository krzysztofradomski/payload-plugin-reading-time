import type { CollectionBeforeChangeHook } from 'payload'

import type { ResolvedReadingTimeConfig } from '../types.js'

import { walkLexical } from '../lib/lexicalWalker.js'
import {
  computeReadingTime,
  countWords,
  DEFAULT_LOCALE_KEY,
  resolveWordsPerMinute,
} from '../lib/readingTime.js'

type HookOptions = {
  readingTimeField: false | string
  richTextField: string
  wordCountField: false | string
} & Pick<
  ResolvedReadingTimeConfig,
  'characterBasedLocales' | 'defaultWordsPerMinute' | 'wordsPerMinute'
>

/** Factory for the `beforeChange` hook that recomputes `readingTime` and `wordCount`. */
export function createComputeReadingTimeHook(options: HookOptions): CollectionBeforeChangeHook {
  return ({ data, originalDoc, req }) => {
    const richTextValue =
      readPath(data, options.richTextField) ?? readPath(originalDoc, options.richTextField)

    const { plainText } = walkLexical(richTextValue)

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
