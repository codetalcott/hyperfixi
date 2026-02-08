/**
 * Usage Analyzer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UsageAnalyzer } from './analyzer';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(''),
    stat: vi.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
    readJson: vi.fn().mockResolvedValue({}),
  };
});

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

describe('UsageAnalyzer', () => {
  let analyzer: UsageAnalyzer;

  beforeEach(() => {
    analyzer = new UsageAnalyzer();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(analyzer).toBeDefined();
      expect(analyzer).toBeInstanceOf(UsageAnalyzer);
    });
  });

  describe('analyzeProject', () => {
    it('should return usage analysis for empty project', async () => {
      const result = await analyzer.analyzeProject('/test/project');

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should accept include/exclude options', async () => {
      const result = await analyzer.analyzeProject('/test/project', {
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      });

      expect(result).toBeDefined();
    });

    it('should handle followDependencies option', async () => {
      const result = await analyzer.analyzeProject('/test/project', {
        followDependencies: false,
      });

      expect(result).toBeDefined();
      expect(result.dependencies).toEqual([]);
    });
  });

  describe('analyzeFile', () => {
    it('should analyze a JavaScript file', async () => {
      const mockFs = await import('fs-extra');
      (mockFs.readFile as any).mockResolvedValue(`
        import { Component } from '@lokascript/core';
        const x = 1;
        export default x;
      `);

      const result = await (analyzer as any).analyzeFile('/test/file.js', false);

      expect(result).toBeDefined();
      expect(result.path).toBe('/test/file.js');
    });

    it('should analyze an HTML file with hyperscript', async () => {
      const mockFs = await import('fs-extra');
      (mockFs.readFile as any).mockResolvedValue(`
        <!DOCTYPE html>
        <html>
        <body>
          <button _="on click toggle .active">Click</button>
        </body>
        </html>
      `);

      const result = await (analyzer as any).analyzeFile('/test/file.html', false);

      expect(result).toBeDefined();
      expect(result.path).toBe('/test/file.html');
    });
  });

  describe('caching', () => {
    it('should cache results when enabled', async () => {
      const mockFs = await import('fs-extra');
      (mockFs.readFile as any).mockResolvedValue('const x = 1;');

      // First call
      await (analyzer as any).analyzeFile('/test/file.js', true);
      // Second call - should use cache
      await (analyzer as any).analyzeFile('/test/file.js', true);

      // readFile should be called only once due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });
  });
});
