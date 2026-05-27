import type { CollectionConfig, Field } from 'payload'

/** Result of walking a Lexical state JSON. */
export type LexicalWalkResult = {
  /** All text content (block-node aware) joined with single spaces. */
  plainText: string
}

/** Admin-UI placement options for the computed fields. */
export type ReadingTimeAdminConfig = {
  /**
   * Whether `readingTime` and `wordCount` share a single horizontal row.
   * `row` is only honored when both fields are enabled and neither already
   * exists on the collection — if one is missing the layout silently falls
   * back to `stacked`.
   * @default 'stacked'
   */
  layout?: 'row' | 'stacked'
  /**
   * Where the fields render in the admin document view.
   * @default 'sidebar'
   */
  position?: 'main' | 'sidebar'
}

/**
 * Payload field types this plugin knows how to read text from.
 *
 * `richText` is the Lexical state walker. The others extract a plain string
 * (with `json` recursing into nested string values, ignoring keys).
 */
export type ReadingTimeFieldType = 'code' | 'json' | 'richText' | 'text' | 'textarea'

/**
 * One input source for reading-time calculation. Pass a string for the
 * common case (a Lexical rich-text field at `path`) or an object to also
 * declare the field type.
 *
 * Omitting `type` defaults to `'richText'`.
 */
export type ReadingTimeSource = { path: string; type?: ReadingTimeFieldType } | string

/** Per-source config after defaults are applied. */
export type ResolvedReadingTimeSource = { path: string; type: ReadingTimeFieldType }

/**
 * Per-collection configuration for the reading-time plugin.
 *
 * Defaults compute `readingTime` and `wordCount` from a top-level `content`
 * rich-text field. Pass `false` for any of the field-name options to skip
 * adding that field.
 */
export type ReadingTimeCollectionConfig = {
  /** Admin UI placement for `readingTime` and `wordCount`. */
  admin?: ReadingTimeAdminConfig
  /**
   * Field name to store reading time (in minutes). `false` skips the field.
   * @default 'readingTime'
   */
  readingTimeField?: false | string
  /**
   * @deprecated Use `sources` instead. Kept as a fallback when `sources`
   * is not provided so the plugin remains backward-compatible.
   * @default 'content'
   */
  richTextField?: string
  /**
   * One or more input fields to read text from. A bare string is treated as
   * a dot-path to a rich-text field; pass `{ path, type }` to read from
   * `text`, `textarea`, `code`, or `json` fields. When multiple sources are
   * given, their extracted text is concatenated before counting.
   *
   * When omitted, falls back to `richTextField` (or its default `'content'`)
   * as a single rich-text source.
   */
  sources?: ReadingTimeSource | ReadingTimeSource[]
  /**
   * Field name to store the word count. `false` skips the field.
   * @default 'wordCount'
   */
  wordCountField?: false | string
}

export type PayloadReadingTimeConfig = {
  /** Locales (or locale prefixes) that count characters instead of words. */
  characterBasedLocales?: string[]
  /**
   * Collections to enable. Map of collection slug → `true` (use defaults) or
   * a config object overriding field names / input path.
   */
  collections: Record<string, ReadingTimeCollectionConfig | true>
  /** Default WPM when no locale-specific value is configured. */
  defaultWordsPerMinute?: number
  /** Skip runtime feature wiring (schema additions still apply). */
  disabled?: boolean
  /** Per-locale words- (or characters- for CJK) per minute overrides. */
  wordsPerMinute?: Record<string, number>
}

/** Per-collection config after defaults are applied. */
export type ResolvedCollectionConfig = {
  admin: Required<ReadingTimeAdminConfig>
  readingTimeField: false | string
  sources: ResolvedReadingTimeSource[]
  wordCountField: false | string
}

/** Resolved configuration after defaults are applied. */
export type ResolvedReadingTimeConfig = {
  characterBasedLocales: string[]
  collections: Map<string, ResolvedCollectionConfig>
  defaultWordsPerMinute: number
  wordsPerMinute: Record<string, number>
}

export const DEFAULT_ADMIN_CONFIG = {
  layout: 'stacked' as const,
  position: 'sidebar' as const,
}

export const DEFAULT_READING_TIME_FIELD_TYPE: ReadingTimeFieldType = 'richText'

export const DEFAULT_READING_TIME_CONFIG = {
  admin: DEFAULT_ADMIN_CONFIG,
  characterBasedLocales: ['zh', 'ja', 'ko'],
  defaultWordsPerMinute: 250,
  readingTimeField: 'readingTime',
  richTextField: 'content',
  wordCountField: 'wordCount',
} as const

/** Internal helper — narrows `unknown` to a plain object. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Internal helper — every Payload field type that can hold sub-fields. */
export type FieldContainer = Extract<
  Field,
  { type: 'array' | 'blocks' | 'collapsible' | 'group' | 'row' | 'tabs' }
>

/** Allow collections to be augmented programmatically. */
export type AnyCollection = CollectionConfig
