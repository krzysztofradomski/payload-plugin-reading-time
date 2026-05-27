import type { CollectionConfig, Config, Field } from 'payload'

import { createComputeReadingTimeHook } from './hooks/computeReadingTime.js'
import {
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_READING_TIME_CONFIG,
  DEFAULT_READING_TIME_FIELD_TYPE,
  type PayloadReadingTimeConfig,
  type ReadingTimeCollectionConfig,
  type ReadingTimeSource,
  type ResolvedCollectionConfig,
  type ResolvedReadingTimeConfig,
  type ResolvedReadingTimeSource,
} from './types.js'

export { createComputeReadingTimeHook } from './hooks/computeReadingTime.js'

export { extractFieldText } from './lib/extractFieldText.js'
export { walkLexical } from './lib/lexicalWalker.js'
export {
  computeReadingTime,
  countWords,
  isCharacterBased,
  resolveWordsPerMinute,
} from './lib/readingTime.js'
export type {
  LexicalWalkResult,
  PayloadReadingTimeConfig,
  ReadingTimeAdminConfig,
  ReadingTimeCollectionConfig,
  ReadingTimeFieldType,
  ReadingTimeSource,
  ResolvedCollectionConfig,
  ResolvedReadingTimeConfig,
  ResolvedReadingTimeSource,
} from './types.js'

/**
 * Adds two computed fields — `readingTime` and `wordCount` — to every
 * configured collection, and registers a `beforeChange` hook that recomputes
 * them from the configured rich-text field on every save.
 *
 * @example
 * ```ts
 * import { payloadReadingTime } from 'payload-plugin-reading-time'
 *
 * export default buildConfig({
 *   plugins: [
 *     payloadReadingTime({
 *       collections: {
 *         posts: true,
 *         docs: {
 *           richTextField: 'body',
 *           // Render the two fields side-by-side at the top of the main form.
 *           admin: { position: 'main', layout: 'row' },
 *         },
 *       },
 *       wordsPerMinute: { 'en-US': 280, zh: 500 },
 *     }),
 *   ],
 * })
 * ```
 */
export const payloadReadingTime =
  (pluginOptions: PayloadReadingTimeConfig) =>
  (incomingConfig: Config): Config => {
    const resolved = resolveConfig(pluginOptions)

    const config: Config = {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || [])],
    }

    if (!config.collections || resolved.collections.size === 0) {
      return config
    }

    config.collections = config.collections.map((collection) => {
      const collectionConfig = resolved.collections.get(collection.slug)
      if (!collectionConfig) {
        return collection
      }

      return enhanceCollection(collection, collectionConfig, resolved, pluginOptions.disabled)
    })

    return config
  }

function resolveConfig(options: PayloadReadingTimeConfig): ResolvedReadingTimeConfig {
  const collections = new Map<string, ResolvedCollectionConfig>()

  for (const [slug, raw] of Object.entries(options.collections ?? {})) {
    if (raw == null) {
      continue
    }

    const collectionOptions: ReadingTimeCollectionConfig = raw === true ? {} : raw

    collections.set(slug, {
      admin: {
        layout: collectionOptions.admin?.layout ?? DEFAULT_ADMIN_CONFIG.layout,
        position: collectionOptions.admin?.position ?? DEFAULT_ADMIN_CONFIG.position,
      },
      readingTimeField:
        collectionOptions.readingTimeField === undefined
          ? DEFAULT_READING_TIME_CONFIG.readingTimeField
          : collectionOptions.readingTimeField,
      sources: resolveSources(collectionOptions),
      wordCountField:
        collectionOptions.wordCountField === undefined
          ? DEFAULT_READING_TIME_CONFIG.wordCountField
          : collectionOptions.wordCountField,
    })
  }

  return {
    characterBasedLocales: options.characterBasedLocales ?? [
      ...DEFAULT_READING_TIME_CONFIG.characterBasedLocales,
    ],
    collections,
    defaultWordsPerMinute:
      options.defaultWordsPerMinute ?? DEFAULT_READING_TIME_CONFIG.defaultWordsPerMinute,
    wordsPerMinute: options.wordsPerMinute ?? {},
  }
}

function resolveSources(options: ReadingTimeCollectionConfig): ResolvedReadingTimeSource[] {
  if (options.sources !== undefined) {
    const raw = Array.isArray(options.sources) ? options.sources : [options.sources]
    return raw
      .map(normalizeSource)
      .filter((source): source is ResolvedReadingTimeSource => Boolean(source.path))
  }

  return [
    {
      type: DEFAULT_READING_TIME_FIELD_TYPE,
      path: options.richTextField ?? DEFAULT_READING_TIME_CONFIG.richTextField,
    },
  ]
}

function normalizeSource(source: ReadingTimeSource): ResolvedReadingTimeSource {
  if (typeof source === 'string') {
    return { type: DEFAULT_READING_TIME_FIELD_TYPE, path: source }
  }
  return { type: source.type ?? DEFAULT_READING_TIME_FIELD_TYPE, path: source.path }
}

function enhanceCollection(
  collection: CollectionConfig,
  collectionConfig: ResolvedCollectionConfig,
  resolved: ResolvedReadingTimeConfig,
  disabled: boolean | undefined,
): CollectionConfig {
  const fields = ensureReadingTimeFields(collection.fields ?? [], collectionConfig)

  if (disabled) {
    return { ...collection, fields }
  }

  const beforeChange = [
    ...(collection.hooks?.beforeChange ?? []),
    createComputeReadingTimeHook({
      characterBasedLocales: resolved.characterBasedLocales,
      defaultWordsPerMinute: resolved.defaultWordsPerMinute,
      readingTimeField: collectionConfig.readingTimeField,
      sources: collectionConfig.sources,
      wordCountField: collectionConfig.wordCountField,
      wordsPerMinute: resolved.wordsPerMinute,
    }),
  ]

  return {
    ...collection,
    fields,
    hooks: {
      ...(collection.hooks ?? {}),
      beforeChange,
    },
  }
}

function ensureReadingTimeFields(
  fields: Field[],
  collectionConfig: ResolvedCollectionConfig,
): Field[] {
  const next = [...fields]
  const { layout, position } = collectionConfig.admin

  const rtName = collectionConfig.readingTimeField
  const wcName = collectionConfig.wordCountField

  const rtMissing = Boolean(rtName) && !hasField(next, rtName as string)
  const wcMissing = Boolean(wcName) && !hasField(next, wcName as string)

  if (layout === 'row' && rtMissing && wcMissing) {
    next.push(readingTimeRow(rtName as string, wcName as string, position))
    return next
  }

  if (rtMissing) {
    next.push(readingTimeField(rtName as string, position))
  }
  if (wcMissing) {
    next.push(wordCountField(wcName as string, position))
  }

  return next
}

function hasField(fields: Field[], name: string): boolean {
  return fields.some((field) => 'name' in field && field.name === name)
}

const READING_TIME_DESCRIPTION = 'Estimated reading time in minutes. Recomputed on every save.'
const READING_TIME_LABEL = 'Reading time (min)'
const WORD_COUNT_DESCRIPTION = 'Word count, recomputed on every save.'
const WORD_COUNT_LABEL = 'Word count'

function readingTimeField(name: string, position: 'main' | 'sidebar'): Field {
  return {
    name,
    type: 'number',
    admin: {
      description: READING_TIME_DESCRIPTION,
      readOnly: true,
      ...(position === 'sidebar' ? { position: 'sidebar' as const } : {}),
    },
    defaultValue: 0,
    label: READING_TIME_LABEL,
  }
}

function wordCountField(name: string, position: 'main' | 'sidebar'): Field {
  return {
    name,
    type: 'number',
    admin: {
      description: WORD_COUNT_DESCRIPTION,
      readOnly: true,
      ...(position === 'sidebar' ? { position: 'sidebar' as const } : {}),
    },
    defaultValue: 0,
    label: WORD_COUNT_LABEL,
  }
}

function readingTimeRow(
  readingTimeName: string,
  wordCountName: string,
  position: 'main' | 'sidebar',
): Field {
  // Row is presentational; sidebar placement goes on the row itself, not on
  // its children, otherwise Payload renders them outside the row.
  return {
    type: 'row',
    fields: [
      {
        name: readingTimeName,
        type: 'number',
        admin: {
          description: READING_TIME_DESCRIPTION,
          readOnly: true,
          width: '50%',
        },
        defaultValue: 0,
        label: READING_TIME_LABEL,
      },
      {
        name: wordCountName,
        type: 'number',
        admin: {
          description: WORD_COUNT_DESCRIPTION,
          readOnly: true,
          width: '50%',
        },
        defaultValue: 0,
        label: WORD_COUNT_LABEL,
      },
    ],
    ...(position === 'sidebar' ? { admin: { position: 'sidebar' as const } } : {}),
  }
}
