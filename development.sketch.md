# Developing Payload CMS Plugins

A practical guide for building, testing, and shipping Payload 3.x plugins. This repo (`payload-plugin-reading-time`) follows the [official plugin template](https://github.com/payloadcms/payload/tree/3.x/templates/plugin) and includes worked examples from real development.

For API-level patterns (hooks, fields, access control), see `.agents/skills/payload/reference/PLUGIN-DEVELOPMENT.md`.

---

## Quick start

```bash
pnpm install
pnpm build          # compile src/ → dist/ (required before consuming the package)
pnpm dev            # Next.js dev app in dev/ on http://localhost:3000
pnpm test           # unit + integration + e2e
```

**Admin login (dev seed):** `test@test.com` / `test1234`

Copy `dev/.env.example` → `dev/.env` and set `PAYLOAD_SECRET`. `DATABASE_URL` is optional — when unset, dev and tests use an in-memory MongoDB replica set.

---

## Repository layout

```
payload-plugin-reading-time/
├── src/                    # Plugin source (published as dist/)
│   ├── index.ts            # Plugin entry: payloadReadingTime()
│   ├── types.ts
│   ├── components/         # Frontend React components (e.g. <Toc />)
│   ├── hooks/              # Payload hooks (beforeChange computation)
│   ├── lib/                # Pure modules: walker, slugify, reading time, TOC
│   └── exports/
│       ├── client.ts       # 'use client' exports → payload-plugin-reading-time/client
│       └── rsc.ts          # Server component exports → payload-plugin-reading-time/rsc
├── dev/                    # Full Payload + Next.js app for local development
│   ├── payload.config.ts
│   ├── app/                # Next.js App Router (admin + frontend + API)
│   ├── collections/
│   ├── int.spec.ts         # Integration tests (Vitest)
│   └── e2e/                # Browser tests (Playwright)
├── package.json            # build scripts, exports map, peer deps
├── vitest.config.js
└── playwright.config.js
```

### Key conventions

| Concern             | Pattern                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Plugin shape        | `(options) => (config) => Config` — curried function                                                                         |
| Published output    | SWC compiles `src/` → `dist/`; only `dist/` is published                                                                     |
| Payload dependency  | `peerDependencies.payload` — never bundle Payload                                                                            |
| Admin components    | Register as `'package-name/client#ExportName'` in config                                                                     |
| Local consumption   | `tsconfig` paths + Next `turbopack.resolveAlias` / `webpack.resolve.alias` map the package name to `src/` — no self-link dep |
| CLI against dev app | `pnpm dev:payload <command>` sets `PAYLOAD_CONFIG_PATH=./dev/payload.config.ts`                                              |

---

## Plugin architecture

```typescript
import type { Config, Plugin } from 'payload'

export const myPlugin =
  (pluginOptions: MyPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    const config: Config = {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || [])],
      endpoints: [...(incomingConfig.endpoints || [])],
    }

    // mutate or extend config.collections, config.endpoints, config.admin, etc.

    if (pluginOptions.disabled) {
      return config // keep schema changes, skip runtime features
    }

    return config
  }
```

**Rules of thumb:**

- Always spread existing arrays (`collections`, `endpoints`, hooks) — never replace them.
- Preserve existing hooks by prepending or appending, not overwriting.
- Call any existing `onInit` before your own initialization.
- Put `payload` in `peerDependencies`; put `@payloadcms/ui`, adapters, and Next.js in `devDependencies` for the test app.

---

## Local development workflow

### 1. Run the dev app

`pnpm dev` starts `next dev dev --turbo` — the second `dev` is the Next.js app directory (`dev/`).

To keep the published `package.json` clean (no `link:.` self-dependency, which the npm registry explicitly warns against), the dev app resolves the plugin under its **published name** through three small pieces of glue instead of a real `node_modules` install:

1. **`dev/tsconfig.json` paths** — map `payload-plugin-reading-time`, `…/client`, and `…/rsc` to source files in `../src/` for TypeScript and editors.
2. **`dev/next.config.mjs` aliases** — `turbopack.resolveAlias` + `webpack.resolve.alias` map the `/client` and `/rsc` subpaths to the same source files at runtime. This is what makes the auto-generated `dev/app/(payload)/admin/importMap.js`, `dev/app/(frontend)/layout.tsx`, and `dev/components/PostPreview.tsx` resolve cleanly.
3. **Relative import in `dev/payload.config.ts`** — Payload's CLI (`pnpm dev:payload`) loads this file under plain Node, where Next aliases don't apply. So it imports the plugin entry directly:

```typescript
import { payloadReadingTime } from '../src/index.js'

export default buildConfig({
  plugins: [payloadReadingTime({ collections: { posts: true } })],
  // ...
})
```

Because aliases point straight at `src/`, you do **not** need to `pnpm build` between plugin source edits — Next picks up `.ts` files via its normal compilation. Run `pnpm build` only when you want to validate the published artifact (`dist/`) or test the tarball.

If you add a new public entry point under `src/exports/`, update **both** the tsconfig `paths` and the alias map in `dev/next.config.mjs` to keep the dev app resolving it.

### 2. Generate types and import map

Admin components and custom fields require Payload's import map.

```bash
pnpm generate:types      # writes dev/payload-types.ts
pnpm generate:importmap  # writes dev/app/(payload)/admin/importMap.js
```

Regenerate the import map whenever you:

- Add, rename, or remove admin/client/RSC component exports
- Change the package name used in component path strings (e.g. `my-plugin/client#MyComponent`)

Component paths in config must match exports:

```typescript
// src/index.ts
config.admin.components.beforeDashboard.push('my-plugin/client#BeforeDashboard')

// src/exports/client.ts
export { BeforeDashboard } from '../components/BeforeDashboard.js'
```

### 3. Next.js config for plugins

The dev app uses `@payloadcms/next/withPayload`. Because it resolves the plugin via source aliases instead of a real install, it does **not** need `transpilePackages` for itself — Next compiles the aliased `.ts` files as if they were local project code:

```javascript
// dev/next.config.mjs
const pluginSrc = path.resolve(dirname, '../src')

const pluginSubpathAliases = {
  'payload-plugin-reading-time/client': path.resolve(pluginSrc, 'exports/client.ts'),
  'payload-plugin-reading-time/rsc': path.resolve(pluginSrc, 'exports/rsc.ts'),
}

export default withPayload(
  {
    turbopack: { resolveAlias: pluginSubpathAliases },
    webpack: (cfg) => {
      cfg.resolve.alias = { ...cfg.resolve.alias, ...pluginSubpathAliases }
      cfg.resolve.extensionAlias = {
        '.cjs': ['.cts', '.cjs'],
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.mjs': ['.mts', '.mjs'],
      }
      return cfg
    },
    serverExternalPackages: ['mongodb-memory-server'],
  },
  { devBundleServerPackages: false },
)
```

**Consumers** install the plugin normally and import from `dist/` — they don't need these aliases. The plugin ships compiled ESM via SWC, so `transpilePackages` is typically unnecessary; recommend it in your README only if you observe parse errors in a downstream Next project.

### 4. Package exports

Expose separate entry points for server config vs client components:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./client": "./dist/exports/client.js",
    "./rsc": "./dist/exports/rsc.js"
  }
}
```

- **Main export** — plugin function, types, server-safe code.
- **`/client`** — `'use client'` components and hooks.
- **`/rsc`** — server components for admin panel slots that support RSC.

---

## In-memory MongoDB and Next.js HMR

When running Payload inside `next dev`, `payload.config.ts` is re-evaluated on every Hot Module Replacement (HMR) cycle. Turbopack can also reset module caches.

**Problem:** If you create a new `MongoMemoryReplSet` on each config load, every HMR spawns a fresh empty database. Seeded data disappears and the frontend reads stale or empty state.

**Solution:** Cache the memory-server URI on `globalThis` so all reloads in the same Node process share one database:

```typescript
const globalStore = globalThis as unknown as { _mongoMemoryDBUri?: string }

if (!globalStore._mongoMemoryDBUri) {
  const memoryDB = await MongoMemoryReplSet.create({
    replSet: { count: 3, dbName: 'payloadmemory' },
  })
  globalStore._mongoMemoryDBUri = `${memoryDB.getUri()}&retryWrites=true`
}

process.env.DATABASE_URL = globalStore._mongoMemoryDBUri
```

Use a persistent `DATABASE_URL` in `dev/.env` when you want data to survive full process restarts.

MongoDB transactions require a replica set — use `MongoMemoryReplSet`, not a standalone `MongoMemoryServer`, when testing transactional behavior.

---

## Import map gotchas

Payload resolves admin React components through `dev/app/(payload)/admin/importMap.js`.

| Symptom                                                            | Fix                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `Export doesn't exist in target module` after renaming a component | Run `pnpm generate:importmap`                                                          |
| Admin component never renders                                      | Check path string matches package name + export (`pkg/client#Name`)                    |
| Plugin works in dev but not when installed                         | Ensure `files: ["dist"]` and exports in `package.json` are correct; consumer ran build |

The alias keys in `dev/next.config.mjs` (and the entries in `dev/tsconfig.json` `paths`) must match the string used in component paths — otherwise the auto-generated `importMap.js` will fail to resolve:

```javascript
// dev/next.config.mjs — alias keys
'payload-plugin-reading-time/client': '…/src/exports/client.ts'
```

If you add an admin component, the path string baked into the registered component must match — `payload-plugin-reading-time/client#YourComponent`. When you rename the package, update the alias keys, the tsconfig `paths`, and any path strings in one go.

---

## Testing

### Unit tests (`pnpm test:unit`)

Pure logic in `src/**/*.spec.ts`. Vitest runs in Node; DOM-specific tests use the `*.dom.spec.ts` suffix and `happy-dom` (see `vitest.config.js`).

Keep unit tests fast and free of Payload bootstrapping when possible.

### Integration tests (`pnpm test:int`)

`dev/int.spec.ts` boots a real Payload instance via `getPayload({ config })`.

```typescript
beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  await payload.db.destroy()
})
```

Use integration tests for:

- Endpoints registered by the plugin
- Schema transformations (fields added, hooks attached)
- Local API behavior

**Cleanup:** Always call `payload.db.destroy()` in `afterAll`. With in-memory MongoDB and parallel Vitest workers, abrupt teardown can throw `InterruptedDueToReplStateChange`.

### E2E tests (`pnpm test:e2e`)

Playwright config (`playwright.config.js`):

- `testDir: './dev'`, matches `dev/e2e/**/*.spec.ts`
- Starts `pnpm dev` as `webServer` (reuses an existing server locally)
- `workers: 1` — serial runs avoid races on the shared in-memory database

Use E2E when behavior depends on real browser APIs: selection, `contenteditable`, iframe live preview, drag-and-drop.

Split specs by concern (`admin.spec.ts`, `reading-time.spec.ts`) and extract helpers (`dev/e2e/helpers/`).

---

## Building for publish

```bash
pnpm clean && pnpm build
```

Build pipeline:

1. `copyfiles` — static assets (CSS, images) into `dist/`
2. `tsc --emitDeclarationOnly` — `.d.ts` files
3. `swc ./src -d ./dist` — compiled JS

Before publishing:

- Verify `peerDependencies` match your target Payload version
- Confirm `files: ["dist"]` — never publish `src/` or `dev/`
- Run `pnpm test` and `pnpm check` (typecheck + lint + unit)

---

## Admin UI components

This plugin does not register any admin components — the fields it adds are read-only and shown by Payload's default field renderers. If you fork this template for a plugin that needs admin UI, register the component by path string (never a direct import):

```typescript
collection.admin.components.edit.beforeDocumentControls = [
  ...(collection.admin.components.edit.beforeDocumentControls || []),
  'payload-plugin-reading-time/client#YourComponent',
]
```

Implement the component under `src/components/`, re-export from `src/exports/client.ts`, and run `pnpm generate:importmap`.

---

## Lexical walking and computed fields

The reading-time plugin's defining lesson: **trust the children-only walker only for trivial Lexical states**. Block-typed nodes attach their content to `fields` (Payload's block config object), not `children`, so:

```typescript
function walk(node) {
  if (node.type === 'text') return node.text
  if (node.type === 'block') {
    return collectFromBlockFields(node.fields) // recurse here
  }
  return node.children?.map(walk).join(' ') ?? ''
}
```

`collectFromBlockFields` walks every value in `fields`, recursing into nested objects/arrays and recognizing `{ root: ... }` shapes as nested Lexical states. Any nested state contributes both plain text and headings to the parent document.

Other invariants worth keeping in mind:

- Compute on `beforeChange`, never on read. Reading-time, word-count, and TOC are cheap to recompute on save, expensive to recompute on every page render.
- Compute anchor slugs **once** at save time and persist them. The frontend renderer must reproduce the same slug — expose the slugifier (`slugifyHeading`) from the public API.
- Heading dedupe is a counter on a `Map<string, number>`; deterministic and order-stable.

---

## Checklist before opening a PR

- [ ] `pnpm build` succeeds; `dist/` matches what consumers import
- [ ] `pnpm generate:types` — no drift in `dev/payload-types.ts` if schema changed
- [ ] `pnpm generate:importmap` — if admin/client components changed
- [ ] `pnpm test` — unit, integration, e2e
- [ ] `pnpm check` — typecheck + lint + unit
- [ ] README documents install, config, exports, and consumer Next.js setup
- [ ] Breaking changes noted; peer dependency range updated if needed

---

## Further reading

- [Payload plugin template](https://github.com/payloadcms/payload/tree/3.x/templates/plugin)
- [Official plugins (`packages/plugin-*`)](https://github.com/payloadcms/payload/tree/3.x/packages)
- `.agents/skills/payload/reference/PLUGIN-DEVELOPMENT.md` — exhaustive patterns in this repo
- [Payload docs](https://payloadcms.com/docs)
