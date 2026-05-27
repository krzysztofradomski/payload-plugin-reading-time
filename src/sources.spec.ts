import type { CollectionConfig, Config, PayloadRequest } from 'payload'

import { describe, expect, it } from 'vitest'

import { payloadReadingTime } from './index.js'

function makeBaseConfig(): Config {
  const posts: CollectionConfig = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'excerpt', type: 'textarea' },
      { name: 'content', type: 'richText' },
      { name: 'meta', type: 'json' },
    ],
  }

  return { collections: [posts], secret: 'test' } as unknown as Config
}

const lexical = (text: string) => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', children: [{ type: 'text', text }] }],
  },
})

async function runHook(
  out: Config,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const posts = out.collections?.find((c) => c.slug === 'posts')
  const hook = posts?.hooks!.beforeChange![0]
  if (!hook) {
    throw new Error('Hook not found')
  }
  const result = await hook({
    collection: undefined as never,
    context: {},
    data,
    operation: 'create' as const,
    originalDoc: undefined,
    req: { locale: undefined } as unknown as PayloadRequest,
  })
  return result as Record<string, unknown>
}

describe('source configuration', () => {
  it('defaults to a single richText source at "content"', async () => {
    const out = payloadReadingTime({ collections: { posts: true } })(makeBaseConfig())
    const result = await runHook(out, { content: lexical('one two three four five') })

    expect(result.wordCount).toBe(5)
  })

  it('honors the deprecated richTextField alias', async () => {
    const out = payloadReadingTime({
      collections: { posts: { richTextField: 'body' } },
    })(makeBaseConfig())
    const result = await runHook(out, { body: lexical('alpha beta gamma') })

    expect(result.wordCount).toBe(3)
  })

  it('treats a string source as a richText path', async () => {
    const out = payloadReadingTime({
      collections: { posts: { sources: 'content' } },
    })(makeBaseConfig())
    const result = await runHook(out, { content: lexical('uno dos tres') })

    expect(result.wordCount).toBe(3)
  })

  it('accepts an object source with explicit type', async () => {
    const out = payloadReadingTime({
      collections: { posts: { sources: { type: 'textarea', path: 'excerpt' } } },
    })(makeBaseConfig())
    const result = await runHook(out, { excerpt: 'just five plain text words here' })

    expect(result.wordCount).toBe(6)
  })

  it('aggregates across an array of mixed sources', async () => {
    const out = payloadReadingTime({
      collections: {
        posts: {
          sources: [
            { type: 'text', path: 'title' },
            { type: 'textarea', path: 'excerpt' },
            'content',
            { type: 'json', path: 'meta' },
          ],
        },
      },
    })(makeBaseConfig())

    const result = await runHook(out, {
      content: lexical('three rich words'),
      excerpt: 'two words',
      meta: { tag: 'json-string' },
      title: 'Hello world',
    })

    // 2 + 2 + 3 + 1 = 8
    expect(result.wordCount).toBe(8)
  })

  it('sources overrides the deprecated richTextField when both are provided', async () => {
    const out = payloadReadingTime({
      collections: {
        posts: {
          richTextField: 'content',
          sources: [{ type: 'textarea', path: 'excerpt' }],
        },
      },
    })(makeBaseConfig())

    const result = await runHook(out, {
      content: lexical('this rich text should be ignored entirely'),
      excerpt: 'only these four',
    })

    expect(result.wordCount).toBe(3)
  })
})
