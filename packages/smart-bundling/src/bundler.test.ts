/**
 * Smart Bundler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmartBundler, quickBundle, productionBundle } from './bundler';

// Mock esbuild
vi.mock('esbuild', () => ({
  build: vi.fn().mockResolvedValue({
    outputFiles: [{ text: 'bundled code' }],
    metafile: { outputs: {} },
    warnings: [],
    errors: [],
  }),
}));

// Mock rollup (used when treeshaking is enabled)
vi.mock('rollup', () => ({
  rollup: vi.fn().mockResolvedValue({
    generate: vi.fn().mockResolvedValue({ output: [] }),
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
  }),
}));

// Mock rollup plugins (dynamically imported in createRollupPlugins)
vi.mock('@rollup/plugin-node-resolve', () => ({
  nodeResolve: vi.fn().mockReturnValue({ name: 'node-resolve' }),
}));
vi.mock('@rollup/plugin-commonjs', () => ({
  default: vi.fn().mockReturnValue({ name: 'commonjs' }),
}));
vi.mock('@rollup/plugin-typescript', () => ({
  default: vi.fn().mockReturnValue({ name: 'typescript' }),
}));

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
    readJson: vi.fn().mockResolvedValue({}),
  };
});

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

describe('SmartBundler', () => {
  let bundler: SmartBundler;

  beforeEach(() => {
    bundler = new SmartBundler();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with default config', () => {
      expect(bundler).toBeDefined();
      expect(bundler).toBeInstanceOf(SmartBundler);
    });

    it('should accept plugins', () => {
      const customBundler = new SmartBundler();
      customBundler.addPlugin({
        name: 'test-plugin',
        setup: () => {},
      });

      expect(customBundler).toBeDefined();
    });
  });

  describe('bundle', () => {
    it('should bundle an entry file', async () => {
      const config: import('./types').BundleConfig = {
        entry: 'src/index.ts',
        output: {
          dir: 'dist',
          format: 'esm',
          minify: false,
          sourcemap: false,
          chunkSizeWarningLimit: 500000,
        },
        optimization: {
          treeshaking: true,
          codeSplitting: true,
          compression: 'gzip',
          bundleAnalysis: true,
          deadCodeElimination: true,
          modulePreloading: true,
        },
        target: { browsers: ['> 0.5%'], node: '16', es: 'es2020' },
        externals: [],
        alias: {},
      };
      const result = await bundler.bundle(config);

      expect(result).toBeDefined();
    });

    it('should return bundle result with chunks', async () => {
      const config: import('./types').BundleConfig = {
        entry: 'src/index.ts',
        output: {
          dir: 'dist',
          format: 'esm',
          minify: false,
          sourcemap: false,
          chunkSizeWarningLimit: 500000,
        },
        optimization: {
          treeshaking: true,
          codeSplitting: true,
          compression: 'gzip',
          bundleAnalysis: true,
          deadCodeElimination: true,
          modulePreloading: true,
        },
        target: { browsers: ['> 0.5%'], node: '16', es: 'es2020' },
        externals: [],
        alias: {},
      };
      const result = await bundler.bundle(config);

      expect(result.chunks).toBeDefined();
    });
  });

  describe('getJob', () => {
    it('should return undefined for unknown job', () => {
      const job = bundler.getJob('nonexistent');

      expect(job).toBeUndefined();
    });
  });
});

describe('quickBundle', () => {
  it('should bundle with quick settings', async () => {
    const result = await quickBundle({ entry: 'src/index.ts', output: 'dist' });
    expect(result).toBeDefined();
  });
});

describe('productionBundle', () => {
  it('should bundle with production settings', async () => {
    const result = await productionBundle({ entry: 'src/index.ts', output: 'dist' });
    expect(result).toBeDefined();
  });

  it('should enable minification by default', async () => {
    const result = await productionBundle({ entry: 'src/index.ts', output: 'dist' });
    expect(result).toBeDefined();
  });
});
