import { defineConfig } from 'tsup';

const EXTERNAL_DEPS = [
  '@hyperfixi/core',
  '@hyperfixi/ast-toolkit',
  '@hyperfixi/template-integration',
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

export default defineConfig({
  // Build all entry points together
  entry: {
    index: 'src/index.ts',
    analyzer: 'src/analyzer.ts',
    builder: 'src/builder.ts',
    generator: 'src/generator.ts',
    'dev-server': 'src/dev-server.ts',
    cli: 'src/cli.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  minify: false,
  splitting: false,
  treeshake: true,
  external: EXTERNAL_DEPS,
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
    const path = await import('path');

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
});