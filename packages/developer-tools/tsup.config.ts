import { defineConfig } from 'tsup';

const EXTERNAL_DEPS = [
  '@hyperfixi/core',
  'prismjs',
  'commander',
  'inquirer',
  'chalk',
  'ora',
  'boxen',
  'semver',
  'fs-extra',
  'glob',
  'chokidar',
  'express',
  'ws',
  'open',
  'http-proxy-middleware',
  'compression',
  'esbuild',
  'vite',
  'zlib',
];

export default defineConfig([
  // Main builds (Node.js) - keep @lokascript/i18n external
  {
    entry: {
      index: 'src/index.ts',
      analyzer: 'src/analyzer.ts',
      builder: 'src/builder.ts',
      generator: 'src/generator.ts',
      'dev-server': 'src/dev-server.ts',
      cli: 'src/cli.ts',
      'prism-hyperscript-i18n/index': 'src/prism-hyperscript-i18n/index.ts',
    },
    format: ['cjs', 'esm'],
    // Types for each entry a consumer imports. Not the CLI: it runs on import, and the exports map
    // has no `./cli`. The browser bundle's types are emitted here, not by its own config below,
    // whose output this config's `clean` would race.
    dts: {
      entry: {
        index: 'src/index.ts',
        analyzer: 'src/analyzer.ts',
        builder: 'src/builder.ts',
        generator: 'src/generator.ts',
        'dev-server': 'src/dev-server.ts',
        'prism-hyperscript-i18n/index': 'src/prism-hyperscript-i18n/index.ts',
        'prism-hyperscript-i18n/browser': 'src/prism-hyperscript-i18n/browser.ts',
      },
    },
    clean: true,
    sourcemap: true,
    target: 'es2020',
    minify: false,
    splitting: false,
    treeshake: true,
    external: [...EXTERNAL_DEPS, '@lokascript/i18n'],
    esbuildOptions(options, context) {
      // Add shebang only for CLI files
      if (context.format === 'cjs' || context.format === 'esm') {
        options.banner = {
          js: '/* HyperFixi Developer Tools */',
        };
      }
    },
    async onSuccess() {
      const fs = await import('fs');

      // Add shebang to CLI files
      const cliFiles = ['dist/cli.js', 'dist/cli.mjs'];
      for (const file of cliFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          // Only add shebang if not already present
          if (!content.startsWith('#!/usr/bin/env node')) {
            fs.writeFileSync(file, `#!/usr/bin/env node\n${content}`);
          }
          fs.chmodSync(file, 0o755);
        }
      }
    },
  },
  // Browser build - bundle @lokascript/i18n inline
  {
    entry: {
      'prism-hyperscript-i18n/browser': 'src/prism-hyperscript-i18n/browser.ts',
    },
    format: ['cjs', 'esm'],
    dts: false, // emitted by the config above
    sourcemap: true,
    target: 'es2020',
    minify: false,
    splitting: false,
    treeshake: true,
    // Bundle everything except prismjs
    noExternal: [/.*/],
    external: ['prismjs'],
    esbuildOptions(options) {
      options.banner = {
        js: '/* HyperFixi Developer Tools - Browser Bundle */',
      };
    },
  },
]);
