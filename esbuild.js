const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * `jiti` (used to load Tailwind configs) lazily loads its Babel transformer
 * via `createRequire(import.meta.url)("../dist/babel.cjs")` at runtime.
 *
 * Because we bundle `jiti`, that file isn't otherwise shipped;
 * combined with the `import.meta.url` banner shim, the path resolves to `dist/babel.cjs`,
 * so we copy the transformer there to keep the extension self-contained.
 */
function copyJitiTransformer() {
  const jitiDir = path.dirname(require.resolve('jiti/package.json'));
  const src = path.join(jitiDir, 'dist', 'babel.cjs');
  const destDir = path.join(__dirname, 'dist');
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, 'babel.cjs'));
}

async function main() {
  const ctx = await esbuild.context({
    banner: {
      // `jiti` (used to load Tailwind configs) internally calls `createRequire(import.meta.url)`.
      // In a bundled CJS extension host, `import.meta.url` is `undefined`, which makes `createRequire` throw.
      // Shim it to this bundle's own file URL so `createRequire` gets a valid path.
      js: "var import_meta_url = require('url').pathToFileURL(__filename).href;",
    },
    bundle: true,
    define: { 'import.meta.url': 'import_meta_url' },
    entryPoints: ['src/extension.ts'],
    external: ['vscode'],
    format: 'cjs',
    logLevel: 'info',
    minify: production,
    outfile: 'dist/extension.js',
    platform: 'node',
    sourcemap: !production,
    sourcesContent: false,
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes…');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }

  copyJitiTransformer();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
