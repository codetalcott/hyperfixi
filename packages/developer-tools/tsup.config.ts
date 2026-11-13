import { defineConfig } from 'tsup';

export default defineConfig([
  // Node builds: dependencies stay external
  {
    entry: {
      index: 'src/index.ts',
      'prism-hyperscript-i18n/index': 'src/prism-hyperscript-i18n/index.ts',
    },
    format: ['cjs', 'esm'],
    // The browser bundle's types are emitted here, not by its own config below, whose output
    // this config's `clean` would race.
    dts: {
      entry: {
        index: 'src/index.ts',
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
    external: ['prismjs', 'glob', 'chokidar', 'express', 'ws', 'open', '@lokascript/i18n'],
  },
  // Browser build of the highlighter (the example pages load it): @lokascript/i18n inlined
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
    noExternal: [/.*/],
    external: ['prismjs'],
  },
]);
