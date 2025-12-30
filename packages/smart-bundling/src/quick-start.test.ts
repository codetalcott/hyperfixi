/**
 * Quick Start Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  quickStartSmartBundling,
  createOptimizedConfig,
  analyzeProjectUsage,
} from './quick-start';

// Mock the dependencies
vi.mock('./analyzer', () => ({
  UsageAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeProject: vi.fn().mockResolvedValue({
      files: [],
      dependencies: [],
      components: [],
      patterns: [],
      metrics: { totalFiles: 0, totalLines: 0 },
      recommendations: [],
    }),
  })),
}));

vi.mock('./bundler', () => ({
  SmartBundler: vi.fn().mockImplementation(() => ({
    bundle: vi.fn().mockResolvedValue({ success: true }),
    watch: vi.fn().mockResolvedValue({ close: vi.fn() }),
  })),
  quickBundle: vi.fn().mockResolvedValue({ success: true }),
  productionBundle: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./optimizer', () => ({
  BundleOptimizer: vi.fn().mockImplementation(() => ({
    optimize: vi.fn().mockResolvedValue({ code: '', metrics: {} }),
  })),
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
    it('should initialize smart bundling with defaults', async () => {
      const result = await quickStartSmartBundling('/test/project');

      expect(result).toBeDefined();
    });

    it('should accept custom options', async () => {
      const result = await quickStartSmartBundling('/test/project', {
        entry: 'src/main.ts',
        output: 'dist',
        minify: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('createOptimizedConfig', () => {
    it('should create an optimized config based on analysis', async () => {
      const config = await createOptimizedConfig('/test/project');

      expect(config).toBeDefined();
    });

    it('should include bundler configuration', async () => {
      const config = await createOptimizedConfig('/test/project');

      expect(config).toBeDefined();
    });
  });

  describe('analyzeProjectUsage', () => {
    it('should analyze project and return usage data', async () => {
      const analysis = await analyzeProjectUsage('/test/project');

      expect(analysis).toBeDefined();
      expect(analysis.files).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should accept analysis options', async () => {
      const analysis = await analyzeProjectUsage('/test/project', {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      });

      expect(analysis).toBeDefined();
    });
  });
});
