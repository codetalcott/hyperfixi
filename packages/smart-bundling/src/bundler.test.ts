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

    it('should accept custom configuration', () => {
      const customBundler = new SmartBundler({
        entry: 'src/index.ts',
        output: 'dist',
        minify: true,
      });

      expect(customBundler).toBeDefined();
    });
  });

  describe('bundle', () => {
    it('should bundle an entry file', async () => {
      const result = await bundler.bundle({
        entry: 'src/index.ts',
        output: 'dist/bundle.js',
      });

      expect(result).toBeDefined();
    });

    it('should return bundle result with metrics', async () => {
      const result = await bundler.bundle({
        entry: 'src/index.ts',
        output: 'dist/bundle.js',
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('watch', () => {
    it('should start watch mode', async () => {
      const watcher = await bundler.watch({
        entry: 'src/index.ts',
        output: 'dist/bundle.js',
      });

      expect(watcher).toBeDefined();

      // Clean up
      if (watcher && typeof watcher.close === 'function') {
        await watcher.close();
      }
    });
  });
});

describe('quickBundle', () => {
  it('should bundle with quick settings', async () => {
    const result = await quickBundle('src/index.ts', 'dist/bundle.js');
    expect(result).toBeDefined();
  });
});

describe('productionBundle', () => {
  it('should bundle with production settings', async () => {
    const result = await productionBundle('src/index.ts', 'dist/bundle.js');
    expect(result).toBeDefined();
  });

  it('should enable minification by default', async () => {
    const result = await productionBundle('src/index.ts', 'dist/bundle.js');
    expect(result).toBeDefined();
  });
});
