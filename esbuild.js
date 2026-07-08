const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    bundle: true,
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
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
