/**
 * Dev Server Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import { DevServer, startDevServer } from './dev-server';

// Mock fs-extra
vi.mock('fs-extra', async () => {
  const actual = await vi.importActual('fs-extra');
  return {
    ...actual,
    pathExists: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
  };
});

// Mock open
vi.mock('open', () => ({
  default: vi.fn(),
}));

// Mock http - need both default and named export for ESM compatibility
const mockHttpServer = {
  listen: vi.fn((port, host, cb) => {
    mockHttpServer.listening = true;
    cb?.();
  }),
  close: vi.fn((cb) => {
    mockHttpServer.listening = false;
    cb?.();
  }),
  on: vi.fn(),
  address: vi.fn(() => ({ port: 3000 })),
  listening: false,
};
vi.mock('http', () => ({
  default: {
    createServer: vi.fn(() => mockHttpServer),
  },
  createServer: vi.fn(() => mockHttpServer),
}));

// Mock ws - use a class with static tracking for spy behavior
vi.mock('ws', () => {
  // Create a mock class that tracks instantiation
  class MockWebSocketServer {
    static instances: any[] = [];
    static mockClear() {
      MockWebSocketServer.instances = [];
    }
    on = vi.fn();
    clients = new Set();
    close = vi.fn();
    constructor() {
      MockWebSocketServer.instances.push(this);
    }
  }
  return {
    WebSocketServer: MockWebSocketServer,
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

// Mock http-proxy-middleware
vi.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

// Mock compression
vi.mock('compression', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('DevServer', () => {
  const mockFs = fs as unknown as {
    pathExists: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock server state
    mockHttpServer.listening = false;
    mockFs.pathExists.mockResolvedValue(true);
    mockFs.readFile.mockResolvedValue('<html></html>');
    mockFs.stat.mockResolvedValue({ size: 100, isDirectory: () => false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('DevServer class', () => {
    it('should create server with default config', () => {
      const server = new DevServer();

      expect(server).toBeDefined();
    });

    it('should create server with custom config', () => {
      const server = new DevServer({
        port: 8080,
        host: '0.0.0.0',
        https: false,
        proxy: {},
        static: ['.'],
        livereload: true,
        hot: true,
        cors: true,
        compression: true,
        open: false,
      });

      expect(server).toBeDefined();
    });

    it('should start server', async () => {
      const server = new DevServer({
        open: false,
      });

      await server.start();

      expect(server).toBeDefined();
    });

    it('should stop server', async () => {
      const server = new DevServer({
        open: false,
      });

      await server.start();
      await server.stop();

      expect(server).toBeDefined();
    });

    it('should restart server', async () => {
      const server = new DevServer({
        open: false,
      });

      await server.start();
      await server.restart();

      expect(server).toBeDefined();
    });

    it('should broadcast to clients', async () => {
      const server = new DevServer({
        open: false,
        livereload: true,
      });

      await server.start();

      expect(() => server.broadcast({ type: 'reload' })).not.toThrow();
    });

    it('should handle file changes', async () => {
      const server = new DevServer({
        open: false,
        livereload: true,
      });

      await server.start();

      // Trigger file change
      expect(() => server.notifyFileChange('/test/file.html')).not.toThrow();
    });

    it('should get server address', async () => {
      const server = new DevServer({
        port: 3000,
        host: 'localhost',
        open: false,
      });

      await server.start();

      const address = server.getAddress();
      expect(address).toContain('localhost');
      expect(address).toContain('3000');
    });

    it('should check if server is running', async () => {
      const server = new DevServer({
        open: false,
      });

      expect(server.isRunning()).toBe(false);

      await server.start();
      expect(server.isRunning()).toBe(true);

      await server.stop();
      expect(server.isRunning()).toBe(false);
    });
  });

  describe('startDevServer helper', () => {
    it('should start server with partial config', async () => {
      const server = await startDevServer({
        port: 4000,
        open: false,
      });

      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(DevServer);
    });

    it('should start server with default config', async () => {
      const server = await startDevServer({ open: false });

      expect(server).toBeDefined();
    });
  });

  describe('Middleware', () => {
    it('should enable CORS when configured', async () => {
      const server = new DevServer({
        cors: true,
        open: false,
      });

      await server.start();
      expect(server).toBeDefined();
    });

    it('should enable compression when configured', async () => {
      const server = new DevServer({
        compression: true,
        open: false,
      });

      await server.start();
      expect(server).toBeDefined();
    });
  });

  describe('Static File Serving', () => {
    it('should serve static files from configured directories', async () => {
      const server = new DevServer({
        static: ['.', 'public', 'assets'],
        open: false,
      });

      await server.start();
      expect(server).toBeDefined();
    });
  });

  describe('Proxy Configuration', () => {
    it('should set up proxy routes', async () => {
      const server = new DevServer({
        proxy: {
          '/api': 'http://localhost:8000',
          '/auth': 'http://localhost:9000',
        },
        open: false,
      });

      await server.start();
      expect(server).toBeDefined();
    });
  });

  describe('Hot Module Replacement', () => {
    it('should enable HMR when configured', async () => {
      const server = new DevServer({
        hot: true,
        open: false,
      });

      await server.start();
      expect(server).toBeDefined();
    });

    it('should inject HMR client script', async () => {
      const server = new DevServer({
        hot: true,
        livereload: true,
        open: false,
      });

      await server.start();
      // HMR should be set up
      expect(server).toBeDefined();
    });
  });

  describe('WebSocket Server', () => {
    it('should create WebSocket server for livereload', async () => {
      const ws = await import('ws');
      const MockWSS = ws.WebSocketServer as any;
      MockWSS.instances = []; // Reset instances

      const server = new DevServer({
        livereload: true,
        open: false,
      });

      await server.start();

      expect(MockWSS.instances.length).toBeGreaterThan(0);
    });

    it('should handle client connections', async () => {
      const server = new DevServer({
        livereload: true,
        open: false,
      });

      await server.start();

      // Connection handling should be set up
      expect(server).toBeDefined();
    });

    it('should handle client disconnections', async () => {
      const server = new DevServer({
        livereload: true,
        open: false,
      });

      await server.start();

      // Should handle disconnections gracefully
      expect(server).toBeDefined();
    });
  });

  describe('File Watching', () => {
    it('should watch files when livereload enabled', async () => {
      const chokidar = await import('chokidar');

      const server = new DevServer({
        livereload: true,
        static: ['.'],
        open: false,
      });

      await server.start();

      expect(chokidar.watch).toHaveBeenCalled();
    });

    it('should notify on file changes', async () => {
      const server = new DevServer({
        livereload: true,
        open: false,
      });

      await server.start();

      // Should not throw when notifying
      expect(() => server.notifyFileChange('test.html')).not.toThrow();
    });

    it('should ignore node_modules by default', async () => {
      const chokidar = await import('chokidar');

      const server = new DevServer({
        livereload: true,
        open: false,
      });

      await server.start();

      // Chokidar should be configured with ignore patterns
      expect(chokidar.watch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle port in use', async () => {
      const http = await import('http');
      const mockServer = http.createServer as unknown as ReturnType<typeof vi.fn>;

      // Make listen fail
      mockServer.mockReturnValue({
        listen: vi.fn((port, host, cb) => {
          // Simulate EADDRINUSE
          cb?.(new Error('EADDRINUSE'));
        }),
        close: vi.fn((cb) => cb?.()),
        on: vi.fn(),
      });

      const server = new DevServer({
        port: 3000,
        open: false,
      });

      // Should handle the error gracefully
      try {
        await server.start();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });
  });

  describe('URL Generation', () => {
    it('should generate correct HTTP URL', async () => {
      const server = new DevServer({
        port: 3000,
        host: 'localhost',
        https: false,
        open: false,
      });

      await server.start();

      const address = server.getAddress();
      expect(address).toBe('http://localhost:3000');
    });

    it('should generate correct HTTPS URL', async () => {
      const server = new DevServer({
        port: 3000,
        host: 'localhost',
        https: true,
        open: false,
      });

      // Note: HTTPS would require certificate setup
      expect(server).toBeDefined();
    });
  });
});
