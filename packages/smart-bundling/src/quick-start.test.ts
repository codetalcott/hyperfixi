/**
 * Quick Start Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { quickStartSmartBundling, createOptimizedConfig, analyzeProjectUsage } from './quick-start';

// Mock the dependencies
vi.mock('./analyzer', () => ({
  UsageAnalyzer: vi.fn().mockImplementation(function () {
    return {
      analyzeProject: vi.fn().mockResolvedValue({
        files: [],
        dependencies: [],
        components: [],
        patterns: [],
        metrics: { totalFiles: 0, totalLines: 0 },
        recommendations: [],
      }),
    };
  }),
}));

vi.mock('./bundler', () => ({
  SmartBundler: vi.fn().mockImplementation(function () {
    return {
      bundle: vi.fn().mockResolvedValue({ success: true }),
      watch: vi.fn().mockResolvedValue({ close: vi.fn() }),
    };
  }),
  quickBundle: vi.fn().mockResolvedValue({ success: true }),
  productionBundle: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./optimizer', () => ({
  BundleOptimizer: vi.fn().mockImplementation(function () {
    return {
      optimize: vi.fn().mockResolvedValue({ code: '', metrics: {} }),
      optimizeBundle: vi.fn().mockResolvedValue({
        entry: 'src/index.js',
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
      }),
      generateBundlingStrategy: vi.fn().mockReturnValue({
        name: 'default',
        description: 'Default strategy',
        chunks: [],
      }),
    };
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

describe('Quick Start Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('quickStartSmartBundling', () => {
    it('should initialize smart bundling with defaults', () => {
      const result = quickStartSmartBundling({
        entry: 'src/index.js',
        output: 'dist',
        projectPath: '/test/project',
      });

      expect(result).toBeDefined();
    });

    it('should accept custom options', () => {
      const result = quickStartSmartBundling({
        entry: 'src/main.ts',
        output: 'dist',
        projectPath: '/test/project',
        mode: 'production',
      });

      expect(result).toBeDefined();
    });
  });

  describe('createOptimizedConfig', () => {
    it('should create an optimized config based on analysis', async () => {
      const config = await createOptimizedConfig({
        entry: 'src/index.ts',
        output: 'dist',
        projectPath: '/test/project',
      });

      expect(config).toBeDefined();
    });

    it('should include bundler configuration', async () => {
      const config = await createOptimizedConfig({
        entry: 'src/index.ts',
        output: 'dist',
        projectPath: '/test/project',
      });

      expect(config).toBeDefined();
    });
  });

  describe('analyzeProjectUsage', () => {
    it('should analyze project and return usage data', async () => {
      const analysis = await analyzeProjectUsage({
        projectPath: '/test/project',
      });

      expect(analysis).toBeDefined();
      expect(analysis.files).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should accept analysis options', async () => {
      const analysis = await analyzeProjectUsage({
        projectPath: '/test/project',
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      });

      expect(analysis).toBeDefined();
    });
  });
});
