# PRD: payload-reading-time-toc

**Plugin**: `payload-reading-time-toc`
**Status**: Active plan — W10
**Tier**: Free OSS (MIT)
**Build effort**: ~7h

---

## Problem Statement

Every Payload-powered content site (blogs, documentation, knowledge bases) eventually needs:
- A "reading time: 8 min" estimate displayed on articles
- A word count for SEO and editorial workflow purposes
- An auto-generated table of contents from headings, with anchor links

Developers currently rebuild this from scratch every project: write Lexical traversal logic, compute reading time, extract headings into a TOC, build a React TOC component. The Lexical traversal in particular is non-trivial because rich-text content lives in nodes with nested children, and the naive `getTextContent()` approach misses block-node text (a documented Payload pain point).

No active Payload plugin solves this for v3. `payload-plugin-lexical` (Payload 1.x only, unmaintained) had a `TableOfContentsFeature` but it was an in-editor sidebar, not a frontend TOC component.

## Solution

A Payload plugin that adds three computed fields to configured collections:
- `readingTime` (number, minutes)
- `wordCount` (number)
- `toc` (structured array of heading + anchor + level)

Plus a ready-to-drop frontend React component `<Toc items={doc.toc} />` for rendering the table of contents with scroll-spy behavior.

Hooks into `beforeChange` to recompute on document save. Block-node aware (correctly walks Lexical's nested node structure).

## User Stories

1. As a blog author in the Payload admin, I want to see "reading time: 8 min" auto-computed on my post as I write, so that I can adjust article length without doing manual math.
2. As a content operator, I want word count exposed as a real field, so that I can query "show me all posts under 500 words" for content audits.
3. As a frontend developer, I want a pre-built `<Toc>` React component with scroll-spy active-state, so that I do not write TOC rendering from scratch.
4. As a content team, I want anchor links auto-generated from headings (slugified, deduplicated), so that linking to specific sections works without manual editing.
5. As a Payload developer, I want the plugin to correctly handle Lexical's block nodes (not just inline text), so that my reading-time count is accurate when articles contain blocks with embedded text.
6. As a developer, I want to configure which heading levels to include in the TOC (e.g., h2 and h3 only, skip h4+), so that the TOC stays at a useful depth.
7. As a developer running a multilingual site, I want reading-time computation to account for locale (English ~250wpm, Chinese ~500cpm), so that estimates are accurate per locale.
8. As a developer, I want fields recomputed on every save, so that I never have stale values.
9. As an editor, I want the TOC field to be a read-only sidebar display in the admin, so that I can preview the generated TOC before publishing.
10. As a developer, I want all three fields to be optional per collection (some sites only need reading time, not TOC), so that the plugin does not add fields I do not use.

## Implementation Decisions

### Modules

- **Lexical Walker (deep module)** — Pure function: given a Lexical editor state JSON, returns `{ plainText: string, headings: Heading[] }` where headings have level, text, and pre-slugified anchor. Block-node aware. Stateless, testable with seeded Lexical states.
- **Reading-Time Computer** — Pure function: given word count and locale, returns reading time in minutes using a locale-tunable wpm constant.
- **TOC Builder** — Pure function: given headings array and config (which levels to include), returns nested TOC structure with anchor deduplication.
- **Document Hook** — Payload `beforeChange` hook that runs Walker + Computer + Builder, populates the three fields, returns mutated document.
- **Anchor Slug Resolver** — Frontend helper for normalizing heading text → slug consistently between server-computed TOC and rendered headings.
- **Toc React Component** — Frontend component with optional scroll-spy active-state highlighting, configurable className/styling.

### Configuration shape

Plugin config accepts: collections to enable (array), per-collection field overrides (`readingTimeField`, `wordCountField`, `tocField`), TOC heading levels to include, word-per-minute constants per locale, whether to enable scroll-spy in default `<Toc>` component.

### Schema additions

- Augments configured collections with `readingTime`, `wordCount`, `toc` fields (configurable names).

### Architectural decisions

- **Computed on save, not on read**: avoid recomputation on every page render. Cost is bounded by save frequency.
- **Block-node aware from day one**: correctness over speed. The naive `getTextContent()` shortcut is rejected.
- **Anchor slugs computed once, persisted**: avoids drift between TOC anchors and frontend rendering.
- **Frontend component is optional**: server fields work without it; component is for convenience.

## Testing Decisions

### Modules to test

- **Lexical Walker**: unit tests across known Lexical states (simple text, nested blocks, mixed content, edge cases like empty headings or non-text inline nodes). Use real Lexical state JSON as fixtures.
- **Reading-Time Computer**: trivial unit tests, primarily verifying locale handling.
- **TOC Builder**: unit tests for nesting, anchor deduplication, level filtering.
- **Toc Component**: React Testing Library tests for rendering and scroll-spy state.

### Prior art

The Payload `richtext-lexical` package's own traversal utilities serve as the reference for correct block-node walking. The author's `payload-related-content` plugin already uses similar Lexical traversal patterns.

## Out of Scope

- AI summarization or auto-tagging — out of scope, separate plugin category
- TOC with image thumbnails — keep TOC text-only
- Reading-time per section (not just total) — possible future addition
- Cross-document TOC ("show me TOC of the whole docs site") — out of scope
- Lexical 1.x support — v3 / current Lexical only

## Further Notes

- Pairs naturally with `payload-related-content` as the "engagement pack" — both are content-site quality-of-life plugins. Launch can be positioned thematically.
- Word count field unblocks the future `payload-collection-health` plugin (which can use word-count to compute content-quality stats per collection).
- Lexical schema changes are the main maintenance trigger — but Lexical schema has been stable for the last 18+ months.
