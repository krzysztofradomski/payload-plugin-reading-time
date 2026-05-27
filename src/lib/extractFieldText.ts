import type { ReadingTimeFieldType } from '../types.js'

import { walkLexical } from './lexicalWalker.js'

/**
 * Extract plain text from a Payload field value based on its declared
 * `ReadingTimeFieldType`. Returns an empty string for incompatible values
 * (e.g. a number passed as a `text` field) — callers concatenate the
 * results across multiple sources before counting.
 */
export function extractFieldText(value: unknown, type: ReadingTimeFieldType): string {
  if (value == null) {
    return ''
  }

  switch (type) {
    case 'code':
    case 'text':
    case 'textarea':
      return typeof value === 'string' ? value : ''

    case 'json':
      return collectJsonStrings(value).join(' ')

    case 'richText':
      return walkLexical(value).plainText
  }
}

/**
 * Recursively collect every string value inside a JSON-compatible value.
 * Object keys are intentionally skipped — they are structural, not content.
 */
function collectJsonStrings(value: unknown, acc: string[] = []): string[] {
  if (typeof value === 'string') {
    if (value) {
      acc.push(value)
    }
    return acc
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonStrings(item, acc)
    }
    return acc
  }

  if (value && typeof value === 'object') {
    for (const child of Object.values(value as Record<string, unknown>)) {
      collectJsonStrings(child, acc)
    }
  }

  return acc
}
