import { withPayload } from '@payloadcms/next/withPayload'
import { fileURLToPath } from 'url'
import path from 'path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(dirname, '..')
const pluginSrc = path.resolve(dirname, '../src')

// Local dev only: alias the plugin's published subpath imports to source files
// in this repo, so the dev app (and Payload's auto-generated importMap.js) can
// resolve `payload-plugin-reading-time/rsc` without the plugin being installed
// as a real node_modules entry. See README "Local development".
const pluginSubpathAliasesAbs = {
  'payload-plugin-reading-time/rsc': path.resolve(pluginSrc, 'exports/rsc.ts'),
}

// Turbopack's `resolveAlias` mangles absolute path values into `./Users/...`
// when `turbopack.root` is set explicitly, producing
// "server relative imports are not implemented yet" errors. Use paths relative
// to the Turbopack root instead (`./src/exports/client.ts`).
const pluginSubpathAliasesTurbopack = Object.fromEntries(
  Object.entries(pluginSubpathAliasesAbs).map(([k, v]) => [
    k,
    './' + path.relative(workspaceRoot, v),
  ]),
)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // The Next "project directory" is `dev/`, but the workspace root (one level
    // up) is where `pnpm-lock.yaml` and `node_modules` live, and where the
    // PostCSS/SASS loader pipeline emits resource paths relative to.
    // Without this, Next 16's Turbopack panics on `dev/app/(payload)/custom.scss`
    // with "Resource path needs to be on project filesystem 'dev'". Pinning the
    // root explicitly aligns Turbopack with the loader pipeline.
    // See https://github.com/vercel/next.js/discussions/89298
    root: workspaceRoot,
    resolveAlias: pluginSubpathAliasesTurbopack,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      ...pluginSubpathAliasesAbs,
    }

    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  serverExternalPackages: ['mongodb-memory-server'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
