/**
 * Runner Tests
 * Tests for CoreTestRunner, ParallelTestRunner, createTestRunner, and measurePerformance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CoreTestRunner, ParallelTestRunner, createTestRunner, measurePerformance } from './runner';
import type { TestSuite, TestCase, TestConfig, TestContext } from './types';

// Mock jsdom
vi.mock('jsdom', () => ({
  JSDOM: class {
    window = {
      document: {
        createElement: vi.fn(),
        body: {},
      },
      navigator: {},
      location: { href: 'http://localhost' },
      HTMLElement: class {},
      Event: class {},
      CustomEvent: class {},
    };
  },
}));

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          on: vi.fn(),
          screenshot: vi.fn().mockResolvedValue(undefined),
          goto: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
  firefox: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          on: vi.fn(),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
  webkit: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          on: vi.fn(),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setViewport: vi.fn().mockResolvedValue(undefined),
        goto: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('CoreTestRunner', () => {
  let runner: CoreTestRunner;

  beforeEach(() => {
    runner = new CoreTestRunner();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a CoreTestRunner instance', () => {
      expect(runner).toBeInstanceOf(CoreTestRunner);
    });
  });

  describe('run', () => {
    it('should run all test suites and return results', async () => {
      const suite: TestSuite = {
        name: 'Test Suite',
        tests: [
          { name: 'test 1', fn: async () => {}, tags: [], fixtures: {} },
          { name: 'test 2', fn: async () => {}, tags: [], fixtures: {} },
        ],
        suites: [],
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.run([suite], config);

      expect(results).toHaveLength(2);
      expect(results[0].suite).toBe('Test Suite');
      expect(results[0].test).toBe('test 1');
      expect(results[1].test).toBe('test 2');
    });

    it('should handle empty suite list', async () => {
      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.run([], config);
      expect(results).toHaveLength(0);
    });
  });

  describe('runSuite', () => {
    it('should skip suite when marked as skip', async () => {
      const suite: TestSuite = {
        name: 'Skipped Suite',
        tests: [
          { name: 'test 1', fn: async () => {}, tags: [], fixtures: {} },
        ],
        suites: [],
        skip: true,
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.runSuite(suite, config);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('skipped');
    });

    it('should run nested suites', async () => {
      const nestedSuite: TestSuite = {
        name: 'Nested Suite',
        tests: [{ name: 'nested test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
      };

      const parentSuite: TestSuite = {
        name: 'Parent Suite',
        tests: [{ name: 'parent test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [nestedSuite],
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.runSuite(parentSuite, config);

      expect(results).toHaveLength(2);
      expect(results[0].suite).toBe('Parent Suite');
      expect(results[1].suite).toBe('Nested Suite');
    });

    it('should run setup and teardown functions', async () => {
      const setupCalled = { value: false };
      const teardownCalled = { value: false };

      const suite: TestSuite = {
        name: 'Suite with hooks',
        tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
        setup: async () => { setupCalled.value = true; },
        teardown: async () => { teardownCalled.value = true; },
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      await runner.runSuite(suite, config);

      expect(setupCalled.value).toBe(true);
      expect(teardownCalled.value).toBe(true);
    });

    it('should handle setup errors', async () => {
      const suite: TestSuite = {
        name: 'Suite with failing setup',
        tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
        setup: async () => { throw new Error('Setup failed'); },
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.runSuite(suite, config);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('failed');
      expect(results[0].error?.message).toBe('Setup failed');
    });
  });

  describe('runTest', () => {
    it('should skip test when marked as skip', async () => {
      const test: TestCase = {
        name: 'skipped test',
        fn: async () => {},
        skip: true,
        tags: [],
        fixtures: {},
      };

      const context: TestContext = {
        suite: 'Test Suite',
        test: 'skipped test',
        environment: 'node',
        fixtures: {},
        expect: {} as any,
        assert: {} as any,
        skip: () => { throw new Error('SKIP_TEST'); },
        fail: (msg: string) => { throw new Error(msg); },
        timeout: () => {},
      };

      const result = await runner.runTest(test, context);

      expect(result.status).toBe('skipped');
    });

    it('should mark test as passed on success', async () => {
      const test: TestCase = {
        name: 'passing test',
        fn: async () => {},
        tags: [],
        fixtures: {},
      };

      const context: TestContext = {
        suite: 'Test Suite',
        test: 'passing test',
        environment: 'node',
        fixtures: {},
        expect: {} as any,
        assert: {} as any,
        skip: () => { throw new Error('SKIP_TEST'); },
        fail: (msg: string) => { throw new Error(msg); },
        timeout: () => {},
      };

      const result = await runner.runTest(test, context);

      expect(result.status).toBe('passed');
      expect(result.error).toBeUndefined();
    });

    it('should mark test as failed on error', async () => {
      const test: TestCase = {
        name: 'failing test',
        fn: async () => { throw new Error('Test failed'); },
        tags: [],
        fixtures: {},
      };

      const context: TestContext = {
        suite: 'Test Suite',
        test: 'failing test',
        environment: 'node',
        fixtures: {},
        expect: {} as any,
        assert: {} as any,
        skip: () => { throw new Error('SKIP_TEST'); },
        fail: (msg: string) => { throw new Error(msg); },
        timeout: () => {},
      };

      const result = await runner.runTest(test, context);

      expect(result.status).toBe('failed');
      expect(result.error?.message).toBe('Test failed');
    });

    it('should handle test timeout', async () => {
      const test: TestCase = {
        name: 'slow test',
        fn: async () => { await new Promise(r => setTimeout(r, 200)); },
        timeout: 50,
        tags: [],
        fixtures: {},
      };

      const context: TestContext = {
        suite: 'Test Suite',
        test: 'slow test',
        environment: 'node',
        fixtures: {},
        expect: {} as any,
        assert: {} as any,
        skip: () => { throw new Error('SKIP_TEST'); },
        fail: (msg: string) => { throw new Error(msg); },
        timeout: () => {},
      };

      const result = await runner.runTest(test, context);

      expect(result.status).toBe('failed');
      expect(result.error?.message).toContain('timeout');
    });

    it('should record test duration', async () => {
      const test: TestCase = {
        name: 'timed test',
        fn: async () => { await new Promise(r => setTimeout(r, 50)); },
        tags: [],
        fixtures: {},
      };

      const context: TestContext = {
        suite: 'Test Suite',
        test: 'timed test',
        environment: 'node',
        fixtures: {},
        expect: {} as any,
        assert: {} as any,
        skip: () => { throw new Error('SKIP_TEST'); },
        fail: (msg: string) => { throw new Error(msg); },
        timeout: () => {},
      };

      const result = await runner.runTest(test, context);

      expect(result.duration).toBeGreaterThanOrEqual(50);
    });
  });
});

describe('ParallelTestRunner', () => {
  let runner: ParallelTestRunner;

  beforeEach(() => {
    runner = new ParallelTestRunner();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a ParallelTestRunner instance', () => {
      expect(runner).toBeInstanceOf(ParallelTestRunner);
      expect(runner).toBeInstanceOf(CoreTestRunner);
    });
  });

  describe('run', () => {
    it('should fall back to sequential when parallel is false', async () => {
      const suite: TestSuite = {
        name: 'Suite',
        tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: false,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.run([suite], config);

      expect(results).toHaveLength(1);
    });

    it('should fall back to sequential when maxWorkers is 1', async () => {
      const suite: TestSuite = {
        name: 'Suite',
        tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: true,
        maxWorkers: 1,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.run([suite], config);

      expect(results).toHaveLength(1);
    });

    it('should run suites in parallel when enabled', async () => {
      const suite1: TestSuite = {
        name: 'Suite 1',
        tests: [{ name: 'test 1', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
      };

      const suite2: TestSuite = {
        name: 'Suite 2',
        tests: [{ name: 'test 2', fn: async () => {}, tags: [], fixtures: {} }],
        suites: [],
      };

      const config: TestConfig = {
        environment: 'node',
        browser: 'chromium',
        timeout: 5000,
        retries: 0,
        parallel: true,
        maxWorkers: 4,
        headless: true,
        viewport: { width: 1280, height: 720 },
        setupFiles: [],
        teardownFiles: [],
        reporters: [],
        coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
        fixtures: {},
      };

      const results = await runner.run([suite1, suite2], config);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.suite)).toContain('Suite 1');
      expect(results.map(r => r.suite)).toContain('Suite 2');
    });
  });
});

describe('createTestRunner', () => {
  it('should return CoreTestRunner when parallel is disabled', () => {
    const config: TestConfig = {
      environment: 'node',
      browser: 'chromium',
      timeout: 5000,
      retries: 0,
      parallel: false,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const runner = createTestRunner(config);

    expect(runner).toBeInstanceOf(CoreTestRunner);
    expect(runner).not.toBeInstanceOf(ParallelTestRunner);
  });

  it('should return CoreTestRunner when maxWorkers is 1', () => {
    const config: TestConfig = {
      environment: 'node',
      browser: 'chromium',
      timeout: 5000,
      retries: 0,
      parallel: true,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const runner = createTestRunner(config);

    expect(runner).toBeInstanceOf(CoreTestRunner);
  });

  it('should return ParallelTestRunner when parallel and maxWorkers > 1', () => {
    const config: TestConfig = {
      environment: 'node',
      browser: 'chromium',
      timeout: 5000,
      retries: 0,
      parallel: true,
      maxWorkers: 4,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const runner = createTestRunner(config);

    expect(runner).toBeInstanceOf(ParallelTestRunner);
  });
});

describe('measurePerformance', () => {
  it('should execute test function and return metrics', async () => {
    let executed = false;
    const mockPage = {
      evaluate: vi.fn()
        .mockResolvedValueOnce(undefined) // First call to clear marks
        .mockResolvedValueOnce({
          loadTime: 100,
          domContentLoaded: 50,
          firstPaint: 25,
          firstContentfulPaint: 30,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
          memoryUsage: {
            usedJSHeapSize: 1000000,
            totalJSHeapSize: 2000000,
            jsHeapSizeLimit: 4000000,
          },
        }),
    };

    const testFn = async () => {
      executed = true;
    };

    const metrics = await measurePerformance(mockPage, testFn);

    expect(executed).toBe(true);
    expect(metrics.loadTime).toBeDefined();
    expect(metrics.domContentLoaded).toBeDefined();
    expect(metrics.firstPaint).toBeDefined();
    expect(metrics.firstContentfulPaint).toBeDefined();
    expect(metrics.memoryUsage).toBeDefined();
  });

  it('should use elapsed time when loadTime is 0', async () => {
    const mockPage = {
      evaluate: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          loadTime: 0,
          domContentLoaded: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
          memoryUsage: {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
          },
        }),
    };

    const testFn = async () => {
      await new Promise(r => setTimeout(r, 50));
    };

    const metrics = await measurePerformance(mockPage, testFn);

    expect(metrics.loadTime).toBeGreaterThanOrEqual(50);
  });
});

describe('Environment Setup', () => {
  let runner: CoreTestRunner;

  beforeEach(() => {
    runner = new CoreTestRunner();
    vi.clearAllMocks();
  });

  it('should setup jsdom environment', async () => {
    const suite: TestSuite = {
      name: 'JSDOM Suite',
      tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
      suites: [],
    };

    const config: TestConfig = {
      environment: 'jsdom',
      browser: 'chromium',
      timeout: 5000,
      retries: 0,
      parallel: false,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const results = await runner.run([suite], config);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('passed');
  });

  it('should setup browser environment with playwright', async () => {
    const suite: TestSuite = {
      name: 'Browser Suite',
      tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
      suites: [],
    };

    const config: TestConfig = {
      environment: 'browser',
      browser: 'chromium',
      timeout: 5000,
      retries: 0,
      parallel: false,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const results = await runner.run([suite], config);

    expect(results).toHaveLength(1);
  });

  it('should support firefox browser', async () => {
    const suite: TestSuite = {
      name: 'Firefox Suite',
      tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
      suites: [],
    };

    const config: TestConfig = {
      environment: 'browser',
      browser: 'firefox',
      timeout: 5000,
      retries: 0,
      parallel: false,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const results = await runner.run([suite], config);

    expect(results).toHaveLength(1);
  });

  it('should support webkit browser', async () => {
    const suite: TestSuite = {
      name: 'Webkit Suite',
      tests: [{ name: 'test', fn: async () => {}, tags: [], fixtures: {} }],
      suites: [],
    };

    const config: TestConfig = {
      environment: 'browser',
      browser: 'webkit',
      timeout: 5000,
      retries: 0,
      parallel: false,
      maxWorkers: 1,
      headless: true,
      viewport: { width: 1280, height: 720 },
      setupFiles: [],
      teardownFiles: [],
      reporters: [],
      coverage: { enabled: false, threshold: 80, include: [], exclude: [] },
      fixtures: {},
    };

    const results = await runner.run([suite], config);

    expect(results).toHaveLength(1);
  });
});
