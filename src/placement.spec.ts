import type { CollectionConfig, Config, Field, RowField } from 'payload'

import { describe, expect, it } from 'vitest'

import { payloadReadingTime } from './index.js'

function makeBaseConfig(): Config {
  const posts: CollectionConfig = {
    slug: 'posts',
    fields: [
      { name: 'title', type: 'text' },
      { name: 'content', type: 'richText' },
    ],
  }

  return {
    collections: [posts],
    secret: 'test',
  } as unknown as Config
}

function fieldsForPosts(config: Config): Field[] {
  const posts = config.collections?.find((c) => c.slug === 'posts')
  return posts?.fields ?? []
}

function isSidebar(field: Field): boolean {
  return 'admin' in field && field.admin?.position === 'sidebar'
}

describe('admin placement', () => {
  it('defaults to sidebar position and stacked layout (backward compatible)', () => {
    const out = payloadReadingTime({ collections: { posts: true } })(makeBaseConfig())
    const fields = fieldsForPosts(out)

    const rt = fields.find((f) => 'name' in f && f.name === 'readingTime')
    const wc = fields.find((f) => 'name' in f && f.name === 'wordCount')

    expect(rt).toBeDefined()
    expect(wc).toBeDefined()
    expect(isSidebar(rt as Field)).toBe(true)
    expect(isSidebar(wc as Field)).toBe(true)
    expect(fields.some((f) => f.type === 'row')).toBe(false)
  })

  it('position: "main" omits the sidebar marker on each field', () => {
    const out = payloadReadingTime({
      collections: { posts: { admin: { position: 'main' } } },
    })(makeBaseConfig())
    const fields = fieldsForPosts(out)

    const rt = fields.find((f) => 'name' in f && f.name === 'readingTime') as Field
    const wc = fields.find((f) => 'name' in f && f.name === 'wordCount') as Field

    expect(rt).toBeDefined()
    expect(wc).toBeDefined()
    expect(isSidebar(rt)).toBe(false)
    expect(isSidebar(wc)).toBe(false)
  })

  it('layout: "row" + position: "main" wraps both fields in a single row with 50% widths', () => {
    const out = payloadReadingTime({
      collections: { posts: { admin: { layout: 'row', position: 'main' } } },
    })(makeBaseConfig())
    const fields = fieldsForPosts(out)

    const row = fields.find((f): f is RowField => f.type === 'row')
    expect(row).toBeDefined()
    expect(row?.fields).toHaveLength(2)
    expect(row?.fields.map((f) => ('name' in f ? f.name : null))).toEqual([
      'readingTime',
      'wordCount',
    ])
    expect(row?.fields.every((f) => 'admin' in f && f.admin?.width === '50%')).toBe(true)
    // No sidebar marker on row.
    expect('admin' in row! && row.admin?.position).toBeFalsy()
    // Children should NOT carry their own position; the row owns it.
    expect(row?.fields.every((f) => !isSidebar(f))).toBe(true)
  })

  it('layout: "row" + position: "sidebar" sets sidebar on the row itself, not on children', () => {
    const out = payloadReadingTime({
      collections: { posts: { admin: { layout: 'row', position: 'sidebar' } } },
    })(makeBaseConfig())
    const fields = fieldsForPosts(out)

    const row = fields.find((f): f is RowField => f.type === 'row')
    expect(row).toBeDefined()
    expect(isSidebar(row as Field)).toBe(true)
    expect(row?.fields.every((f) => !isSidebar(f))).toBe(true)
  })

  it('falls back to stacked when one field is disabled (row layout has nothing to pair)', () => {
    const out = payloadReadingTime({
      collections: { posts: { admin: { layout: 'row' }, wordCountField: false } },
    })(makeBaseConfig())
    const fields = fieldsForPosts(out)

    expect(fields.some((f) => f.type === 'row')).toBe(false)
    expect(fields.some((f) => 'name' in f && f.name === 'readingTime')).toBe(true)
    expect(fields.some((f) => 'name' in f && f.name === 'wordCount')).toBe(false)
  })

  it('skips row wrapping when one of the field names already exists on the collection', () => {
    const base = makeBaseConfig()
    const posts = base.collections?.[0] as CollectionConfig
    posts.fields = [
      ...posts.fields,
      // Pre-declared by the user — plugin must reuse, not duplicate.
      { name: 'readingTime', type: 'number', label: 'Custom RT' },
    ]

    const out = payloadReadingTime({
      collections: { posts: { admin: { layout: 'row' } } },
    })(base)
    const fields = fieldsForPosts(out)

    expect(fields.some((f) => f.type === 'row')).toBe(false)
    // wordCount still added on its own.
    const wc = fields.find((f) => 'name' in f && f.name === 'wordCount') as Field
    expect(wc).toBeDefined()
    expect(isSidebar(wc)).toBe(true)
    // Pre-existing field preserved.
    const rt = fields.find((f) => 'name' in f && f.name === 'readingTime') as Field
    expect((rt as { label?: string }).label).toBe('Custom RT')
  })
})
