import type { PayloadRequest } from 'payload'

import { describe, expect, it } from 'vitest'

import { createComputeReadingTimeHook } from './computeReadingTime.js'

const lexical = (...children: unknown[]) => ({
  root: { type: 'root', children },
})

const heading = (tag: string, text: string) => ({
  type: 'heading',
  children: [{ type: 'text', text }],
  tag,
})

const paragraph = (text: string) => ({
  type: 'paragraph',
  children: [{ type: 'text', text }],
})

function makeHook() {
  return createComputeReadingTimeHook({
    characterBasedLocales: ['zh', 'ja', 'ko'],
    defaultWordsPerMinute: 250,
    readingTimeField: 'readingTime',
    sources: [{ type: 'richText', path: 'content' }],
    wordCountField: 'wordCount',
    wordsPerMinute: { zh: 500 },
  })
}

const baseHookArgs = {
  collection: undefined as never,
  context: {},
  operation: 'create' as const,
  originalDoc: undefined,
  req: { locale: undefined } as unknown as PayloadRequest,
}

describe('createComputeReadingTimeHook', () => {
  it('populates readingTime and wordCount from data', async () => {
    const hook = makeHook()
    const data = {
      content: lexical(
        heading('h2', 'Section A'),
        paragraph('one two three four five six seven eight nine ten'),
        heading('h3', 'Detail'),
      ),
      title: 'Post',
    }

    const result = (await hook({ ...baseHookArgs, data })) as Record<string, unknown>

    expect(result.title).toBe('Post')
    expect(result.wordCount).toBe(13)
    expect(result.readingTime).toBe(1)
  })

  it('falls back to originalDoc when data has no rich text', async () => {
    const hook = makeHook()
    const result = (await hook({
      ...baseHookArgs,
      data: { title: 'updated' } as Record<string, unknown>,
      originalDoc: {
        content: lexical(paragraph('a b c d e')),
        title: 'old',
      } as Record<string, unknown>,
    })) as Record<string, unknown>

    expect(result.wordCount).toBe(5)
    expect(result.readingTime).toBe(1)
  })

  it('skips fields configured as false', async () => {
    const hook = createComputeReadingTimeHook({
      characterBasedLocales: [],
      defaultWordsPerMinute: 250,
      readingTimeField: 'readingTime',
      sources: [{ type: 'richText', path: 'content' }],
      wordCountField: false,
      wordsPerMinute: {},
    })

    const result = (await hook({
      ...baseHookArgs,
      data: { content: lexical(paragraph('hello world')) } as Record<string, unknown>,
    })) as Record<string, unknown>

    expect(result.readingTime).toBe(1)
    expect(result).not.toHaveProperty('wordCount')
  })

  it('uses the request locale to pick WPM', async () => {
    const hook = makeHook()
    const longChineseText = '我喜欢看书'.repeat(120)
    const result = (await hook({
      ...baseHookArgs,
      data: { content: lexical(paragraph(longChineseText)) } as Record<string, unknown>,
      req: { locale: 'zh' } as unknown as PayloadRequest,
    })) as Record<string, unknown>

    expect(result.wordCount).toBe(600)
    expect(result.readingTime).toBe(2)
  })

  it('produces zero values when there is no rich text input', async () => {
    const hook = makeHook()
    const result = (await hook({
      ...baseHookArgs,
      data: { title: 'no body' } as Record<string, unknown>,
    })) as Record<string, unknown>

    expect(result.wordCount).toBe(0)
    expect(result.readingTime).toBe(0)
  })

  it('aggregates plain text across multiple sources of mixed types', async () => {
    const hook = createComputeReadingTimeHook({
      characterBasedLocales: [],
      defaultWordsPerMinute: 250,
      readingTimeField: 'readingTime',
      sources: [
        { type: 'text', path: 'title' },
        { type: 'textarea', path: 'excerpt' },
        { type: 'richText', path: 'content' },
        { type: 'json', path: 'meta' },
        { type: 'code', path: 'snippet' },
      ],
      wordCountField: 'wordCount',
      wordsPerMinute: {},
    })

    const result = (await hook({
      ...baseHookArgs,
      data: {
        content: lexical(paragraph('rich body words')),
        excerpt: 'one two three',
        meta: { author: 'gamma', tags: ['alpha', 'beta'] },
        snippet: 'const x = 1',
        title: 'Hello world',
      } as Record<string, unknown>,
    })) as Record<string, unknown>

    // 2 (title) + 3 (excerpt) + 3 (richText) + 3 (json) + 4 (code) = 15
    expect(result.wordCount).toBe(15)
    expect(result.readingTime).toBe(1)
  })

  it('counts a standalone text-type source even without rich text', async () => {
    const hook = createComputeReadingTimeHook({
      characterBasedLocales: [],
      defaultWordsPerMinute: 250,
      readingTimeField: 'readingTime',
      sources: [{ type: 'textarea', path: 'summary' }],
      wordCountField: 'wordCount',
      wordsPerMinute: {},
    })

    const result = (await hook({
      ...baseHookArgs,
      data: { summary: 'a b c d e f g h i j' } as Record<string, unknown>,
    })) as Record<string, unknown>

    expect(result.wordCount).toBe(10)
    expect(result.readingTime).toBe(1)
  })
})
