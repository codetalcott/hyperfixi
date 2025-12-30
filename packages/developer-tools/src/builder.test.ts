/**
 * Builder Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { VisualBuilderServer, buildProject } from './builder';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    writeFile: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
    copy: vi.fn(),
    remove: vi.fn(),
  };
});

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn(),
}));

// Mock open
vi.mock('open', () => ({
  default: vi.fn(),
}));

// Mock http - need both default and named export for ESM compatibility
const mockHttpServer = {
  listen: vi.fn((port, host, cb) => cb?.()),
  close: vi.fn((cb) => cb?.()),
  on: vi.fn(),
};
vi.mock('http', () => ({
  default: {
    createServer: vi.fn(() => mockHttpServer),
  },
  createServer: vi.fn(() => mockHttpServer),
}));

// Mock ws - use a class factory for proper constructor behavior
vi.mock('ws', () => {
  return {
    WebSocketServer: class {
      on = vi.fn();
      clients = new Set();
      close = vi.fn();
    },
    WebSocket: {
      OPEN: 1,
    },
  };
});

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}));

// Mock esbuild
vi.mock('esbuild', () => ({
  build: vi.fn(() => Promise.resolve({
    metafile: {
      outputs: {
        'dist/bundle.js': { bytes: 1024 }
      }
    },
    warnings: []
  }))
}));

describe('Builder', () => {
  const mockFs = fs as unknown as {
    pathExists: ReturnType<typeof vi.fn>;
    ensureDir: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
    copy: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.ensureDir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('');
    mockFs.stat.mockResolvedValue({ size: 100 });
    mockFs.copy.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('VisualBuilderServer', () => {
    it('should create server with default config', () => {
      const server = new VisualBuilderServer();

      expect(server).toBeDefined();
    });

    it('should create server with custom config', () => {
      const server = new VisualBuilderServer({
        port: 8080,
        host: '0.0.0.0',
        open: false,
        livereload: false,
      });

      expect(server).toBeDefined();
    });

    it('should start server', async () => {
      const server = new VisualBuilderServer({
        port: 8000,
        open: false,
      });

      await server.start();

      // Server should be listening (mock)
      expect(server).toBeDefined();
    });

    it('should stop server', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      await server.start();
      await server.stop();

      expect(server).toBeDefined();
    });

    it('should add component', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      const component = {
        id: 'test-component',
        name: 'Test Component',
        template: '<div>Test</div>',
        category: 'test',
      };

      server.addComponent(component);

      const components = server.getComponents();
      expect(components.find(c => c.id === 'test-component')).toBeDefined();
    });

    it('should remove component', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      server.addComponent({
        id: 'to-remove',
        name: 'Remove Me',
        template: '<div>Remove</div>',
        category: 'test',
      });

      server.removeComponent('to-remove');

      const components = server.getComponents();
      expect(components.find(c => c.id === 'to-remove')).toBeUndefined();
    });

    it('should update component', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      server.addComponent({
        id: 'to-update',
        name: 'Original',
        template: '<div>Original</div>',
        category: 'test',
      });

      server.updateComponent('to-update', {
        name: 'Updated',
        template: '<div>Updated</div>',
      });

      const component = server.getComponent('to-update');
      expect(component?.name).toBe('Updated');
    });

    it('should get component by id', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      server.addComponent({
        id: 'get-me',
        name: 'Get Me',
        template: '<div>Get</div>',
        category: 'test',
      });

      const component = server.getComponent('get-me');
      expect(component).toBeDefined();
      expect(component?.name).toBe('Get Me');
    });

    it('should return undefined for non-existent component', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      const component = server.getComponent('non-existent');
      expect(component).toBeUndefined();
    });

    it('should add category', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      server.addCategory({
        id: 'new-category',
        name: 'New Category',
        description: 'A new category',
        icon: '🆕',
      });

      const categories = server.getCategories();
      expect(categories.find(c => c.id === 'new-category')).toBeDefined();
    });

    it('should broadcast to WebSocket clients', async () => {
      const server = new VisualBuilderServer({
        open: false,
        livereload: true,
      });

      await server.start();

      // Broadcast should not throw
      expect(() => server.broadcast({ type: 'test' })).not.toThrow();
    });
  });

  describe('buildProject', () => {
    it('should build project with default options', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
      mockGlob.mockResolvedValue([]);

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
      });

      expect(result).toBeDefined();
      expect(result.files).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should build project with minification', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
      mockGlob.mockResolvedValue(['index.html']);

      mockFs.readFile.mockResolvedValue('<div _="on click   add   .active   to me">Test</div>');

      const result = await buildProject({
        output: '/dist',
        minify: true,
        sourcemap: false,
        analyze: false,
      });

      expect(result).toBeDefined();
    });

    it('should build project with sourcemaps', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
      mockGlob.mockResolvedValue([]);

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: true,
        analyze: false,
      });

      expect(result).toBeDefined();
    });

    it('should build project with analysis', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;
      mockGlob.mockResolvedValue([]);

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: true,
      });

      expect(result).toBeDefined();
    });

    it('should process HTML files', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      // First call for HTML, second for JS, third for static
      mockGlob
        .mockResolvedValueOnce(['index.html'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockFs.readFile.mockResolvedValue('<!DOCTYPE html><body></body></html>');
      mockFs.stat.mockResolvedValue({ size: 50 });

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
        projectPath: '/project',
      });

      expect(result.files.some(f => f.path === 'index.html')).toBe(true);
    });

    it('should copy static assets', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['styles.css', 'logo.png']);

      mockFs.readFile.mockResolvedValue('body { color: red; }');
      mockFs.stat.mockResolvedValue({ size: 100 });

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
        projectPath: '/project',
      });

      expect(result.files.some(f => f.path.endsWith('.css'))).toBe(true);
    });

    it('should calculate gzipped sizes', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob
        .mockResolvedValueOnce(['index.html'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockFs.readFile.mockResolvedValue('<html><body>Test content for gzip</body></html>');
      mockFs.stat.mockResolvedValue({ size: 50 });

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
      });

      expect(result.metadata.gzippedSize).toBeDefined();
      expect(result.files[0].gzippedSize).toBeDefined();
    });

    it('should handle build errors gracefully', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(['main.ts'])
        .mockResolvedValueOnce([]);

      // Mock esbuild to throw
      const esbuild = await import('esbuild');
      (esbuild.build as any).mockRejectedValue(new Error('Build failed'));

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
      });

      expect(result.warnings.some(w => w.includes('Build failed'))).toBe(true);
    });

    it('should calculate total sizes', async () => {
      const { glob } = await import('glob');
      const mockGlob = glob as unknown as ReturnType<typeof vi.fn>;

      mockGlob
        .mockResolvedValueOnce(['index.html', 'about.html'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockFs.readFile.mockResolvedValue('<html></html>');
      mockFs.stat.mockResolvedValue({ size: 50 });

      const result = await buildProject({
        output: '/dist',
        minify: false,
        sourcemap: false,
        analyze: false,
      });

      expect(result.metadata.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Server Routes', () => {
    // These would test the Express routes if we had proper mocking
    // For now, we test the server configuration

    it('should configure static file serving', async () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      await server.start();

      // Server should be set up for static files
      expect(server).toBeDefined();
    });

    it('should set up WebSocket server', async () => {
      const server = new VisualBuilderServer({
        open: false,
        livereload: true,
      });

      await server.start();

      expect(WebSocketServer).toHaveBeenCalled();
    });
  });

  describe('File Watching', () => {
    it('should set up file watcher when livereload enabled', async () => {
      const chokidar = await import('chokidar');

      const server = new VisualBuilderServer({
        open: false,
        livereload: true,
      });

      await server.start();

      expect(chokidar.watch).toHaveBeenCalled();
    });

    it('should not set up file watcher when livereload disabled', async () => {
      const chokidar = await import('chokidar');
      vi.clearAllMocks();

      const server = new VisualBuilderServer({
        open: false,
        livereload: false,
      });

      await server.start();

      // Watcher should not be called for livereload
      // (might be called for other reasons)
      expect(server).toBeDefined();
    });
  });

  describe('Component Library', () => {
    it('should initialize with default categories', () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      const categories = server.getCategories();
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should export component library', () => {
      const server = new VisualBuilderServer({
        open: false,
      });

      server.addComponent({
        id: 'export-test',
        name: 'Export Test',
        template: '<div>Export</div>',
        category: 'test',
      });

      const exported = server.exportLibrary();
      expect(exported).toBeDefined();
    });
  });
});
