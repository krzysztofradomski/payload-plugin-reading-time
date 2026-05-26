# payload-plugin-reading-time

Computed **reading time** and **word count** for [Payload CMS](https://payloadcms.com) Lexical content.

- Walks Lexical state JSON correctly, including **block-node** children (the place where the naive `getTextContent()` shortcut quietly loses text).
- Computes on `beforeChange`, so reading time and word count are persisted fields — fast to query, no per-render cost.
- Per-locale words-per-minute with CJK character counting.

## Features

- Adds two computed fields to configured collections (each can be renamed or disabled):
  - `readingTime` — `number` (minutes), sidebar
  - `wordCount` — `number`, sidebar
- Block-node-aware Lexical walker (recurses into block `fields`, picks up nested rich-text states)
- Per-locale WPM, with CJK fallback to character counting

## Requirements

- Payload `^3.84.0`
- A Lexical-based rich-text field on the collection you want to enrich

## Installation

```bash
pnpm add payload-plugin-reading-time
```

## Setup

```ts
import { payloadReadingTime } from 'payload-plugin-reading-time'

export default buildConfig({
  plugins: [
    payloadReadingTime({
      collections: {
        // Use defaults: rich-text field is `content`, adds `readingTime`
        // and `wordCount` fields.
        posts: true,

        // Override per-collection:
        docs: {
          richTextField: 'body',
          wordCountField: false, // skip word count for this collection
        },
      },

      // Optional — defaults below.
      defaultWordsPerMinute: 250,
      wordsPerMinute: { 'en-US': 280, zh: 500 },
      characterBasedLocales: ['zh', 'ja', 'ko'],
    }),
  ],
})
```

The plugin appends fields to your collection (it never replaces existing fields with the same name, so you can pre-declare them if you want to customize labels).

## Configuration

### Plugin options

| Option                  | Type                            | Default            | Description                                          |
| ----------------------- | ------------------------------- | ------------------ | ---------------------------------------------------- |
| `collections`           | `Record<string, true \| {…}>`   | —                  | Map of slug → per-collection config.                 |
| `defaultWordsPerMinute` | `number`                        | `250`              | Used when no per-locale value matches.               |
| `wordsPerMinute`        | `Record<string, number>`        | `{}`               | Words-per-minute per locale or language prefix.      |
| `characterBasedLocales` | `string[]`                      | `['zh','ja','ko']` | Locales that count characters instead of words.      |
| `disabled`              | `boolean`                       | `false`            | Skip hook wiring but keep schema additions.          |

### Per-collection options

Pass `true` to use defaults, or an object with any of:

| Option              | Type              | Default         | Description                                                                                            |
| ------------------- | ----------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `richTextField`     | `string`          | `'content'`     | Dot-path to the Lexical rich-text field used as input.                                                 |
| `readingTimeField`  | `string \| false` | `'readingTime'` | Name of the field to store reading time. Pass `false` to skip.                                         |
| `wordCountField`    | `string \| false` | `'wordCount'`   | Name of the field to store word count. Pass `false` to skip.                                           |
| `admin`             | `object`          | see below       | Admin-UI placement for `readingTime` and `wordCount`. See **Admin placement**.                          |

If a field with the chosen name already exists on the collection, the plugin reuses it — handy when you want a custom label, description, or admin position.

### Admin placement

`admin` controls where the two computed fields render in the document view.

| Option     | Type                       | Default      | Description                                                                                                 |
| ---------- | -------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `position` | `'main' \| 'sidebar'`      | `'sidebar'`  | Render the fields in the sidebar (compact, default) or inline at the bottom of the main form.               |
| `layout`   | `'stacked' \| 'row'`       | `'stacked'`  | `stacked` keeps each field on its own line; `row` puts both side-by-side at 50% width inside a Row Field.   |

```ts
payloadReadingTime({
  collections: {
    // Default: each on its own line in the sidebar.
    posts: true,

    // Both fields in one row, in the main form.
    docs: {
      richTextField: 'body',
      admin: { position: 'main', layout: 'row' },
    },

    // Sidebar, side-by-side.
    notes: {
      admin: { position: 'sidebar', layout: 'row' },
    },
  },
})
```

Notes:

- `layout: 'row'` is only applied when **both** `readingTimeField` and `wordCountField` are enabled and **neither** already exists on the collection. Otherwise the layout silently falls back to `stacked`.
- If you pre-declare either field on your collection, the plugin reuses your declaration as-is (so you keep full control over its `admin` config) and never wraps it in a row.

## Exports

| Import                                | Description                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `payload-plugin-reading-time`         | `payloadReadingTime` plugin, types, and pure helpers (`walkLexical`, `computeReadingTime`, `countWords`, `resolveWordsPerMinute`, `isCharacterBased`, `createComputeReadingTimeHook`). |
| `payload-plugin-reading-time/rsc`     | Server-component-safe re-exports of the walker and computation helpers.                      |

## How it works

1. On every save, the plugin's `beforeChange` hook reads the configured rich-text field from `data` (falling back to `originalDoc`).
2. The walker traverses the Lexical state, accumulating plain text. Block nodes are entered through their `fields` property — nested Lexical states inside blocks contribute text to the parent document.
3. Words (or CJK characters, per locale) are counted from the plain text and divided by the configured WPM.

## Out of scope

- AI summarization or auto-tagging (separate plugin category).
- Reading time per section (only total is computed; possible future addition).
- Lexical 1.x (Payload 3 / current Lexical only).

## Local development

The plugin's source lives in `src/` and is consumed by the local app in `dev/` under its **published name** (`payload-plugin-reading-time`, `payload-plugin-reading-time/rsc`) via `dev/tsconfig.json` paths and the `next.config.mjs` alias map — no `link:.` self-dependency required.

Run `pnpm dev` for the local Payload admin (defaults to `http://localhost:3000`), `pnpm test:unit` for the Vitest unit suite, `pnpm test:int` for the integration suite (in-memory MongoDB), and `pnpm test:e2e` for the Playwright suite.

## License

MIT
