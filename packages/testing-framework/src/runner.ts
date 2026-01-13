/**
 * Test Runner
 * Core test execution engine with multi-environment support
 */

import { JSDOM } from 'jsdom';
import type {
  TestRunner,
  TestSuite,
  TestCase,
  TestConfig,
  TestContext,
  TestResult,
  TestStatus,
  TestError,
  TestLog,
  BrowserTestOptions,
  PerformanceMetrics,
} from './types';
import { createExpectAPI } from './assertions';
import { createAssertAPI } from './assertions';

/**
 * Test execution context
 */
interface ExecutionContext {
  config: TestConfig;
  browser?: any;
  page?: any;
  logs: TestLog[];
  screenshots: string[];
}

/**
 * Core test runner implementation
 */
export class CoreTestRunner implements TestRunner {
  private executionContext: ExecutionContext | null = null;

  /**
   * Run all test suites
   */
  async run(suites: TestSuite[], config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Setup execution context
    this.executionContext = await this.setupExecutionContext(config);

    try {
      // Run setup files
      await this.runSetupFiles(config.setupFiles);

      // Run suites
      for (const suite of suites) {
        const suiteResults = await this.runSuite(suite, config);
        results.push(...suiteResults);
      }

      // Run teardown files
      await this.runTeardownFiles(config.teardownFiles);
    } finally {
      // Cleanup execution context
      await this.cleanupExecutionContext();
    }

    return results;
  }

  /**
   * Run a single test suite
   */
  async runSuite(suite: TestSuite, config: TestConfig): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Skip suite if marked
    if (suite.skip) {
      for (const test of suite.tests) {
        results.push(this.createSkippedResult(suite.name, test.name));
      }
      return results;
    }

    try {
      // Run suite setup
      if (suite.setup) {
        await suite.setup();
      }

      // Run tests
      for (const test of suite.tests) {
        const result = await this.runTest(test, this.createTestContext(suite, test, config));
        results.push(result);
      }

      // Run nested suites
      for (const nestedSuite of suite.suites) {
        const nestedResults = await this.runSuite(nestedSuite, config);
        results.push(...nestedResults);
      }
    } catch (error) {
      // Suite setup/teardown failed
      const testError = this.formatError(error);
      for (const test of suite.tests) {
        results.push({
          suite: suite.name,
          test: test.name,
          status: 'failed',
          duration: 0,
          error: testError,
          logs: [],
          screenshots: [],
        });
      }
    } finally {
      try {
        // Run suite teardown
        if (suite.teardown) {
          await suite.teardown();
        }
      } catch (error) {
        console.error('Suite teardown failed:', error);
      }
    }

    return results;
  }

  /**
   * Run a single test
   */
  async runTest(test: TestCase, context: TestContext): Promise<TestResult> {
    const startTime = Date.now();

    // Skip test if marked
    if (test.skip) {
      return this.createSkippedResult(context.suite, context.test);
    }

    let status: TestStatus = 'running';
    let error: TestError | undefined;
    const logs: TestLog[] = [];
    const screenshots: string[] = [];

    try {
      // Setup test fixtures
      await this.setupTestFixtures(test, context);

      // Run beforeEach hooks
      await this.runBeforeEachHooks(context);

      // Set test timeout
      const timeout = test.timeout || this.executionContext?.config.timeout || 5000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
      });

      // Run test function
      await Promise.race([test.fn(context), timeoutPromise]);

      status = 'passed';
    } catch (err) {
      status = 'failed';
      error = this.formatError(err);

      // Take screenshot on failure for browser tests
      if (this.executionContext?.page && this.executionContext.config.environment === 'browser') {
        try {
          const screenshotPath = await this.takeScreenshot(context.suite, context.test);
          if (screenshotPath) {
            screenshots.push(screenshotPath);
          }
        } catch (screenshotError) {
          console.warn('Failed to take screenshot:', screenshotError);
        }
      }
    } finally {
      try {
        // Run afterEach hooks
        await this.runAfterEachHooks(context);

        // Cleanup test fixtures
        await this.cleanupTestFixtures(test, context);
      } catch (cleanupError) {
        console.error('Test cleanup failed:', cleanupError);
      }
    }

    const duration = Date.now() - startTime;

    return {
      suite: context.suite,
      test: context.test,
      status,
      duration,
      error,
      logs: [...logs, ...(this.executionContext?.logs || [])],
      screenshots,
    };
  }

  /**
   * Setup execution context
   */
  private async setupExecutionContext(config: TestConfig): Promise<ExecutionContext> {
    const context: ExecutionContext = {
      config,
      logs: [],
      screenshots: [],
    };

    switch (config.environment) {
      case 'jsdom':
        await this.setupJSDOMContext(context);
        break;
      case 'browser':
      case 'playwright':
        await this.setupBrowserContext(context);
        break;
      case 'puppeteer':
        await this.setupPuppeteerContext(context);
        break;
      case 'node':
        // No additional setup needed for Node.js
        break;
    }

    return context;
  }

  /**
   * Setup JSDOM context
   */
  private async setupJSDOMContext(context: ExecutionContext): Promise<void> {
    const { config } = context;

    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: config.baseURL || 'http://localhost',
      contentType: 'text/html',
      pretendToBeVisual: true,
      resources: 'usable',
    });

    // Setup global DOM variables
    global.window = dom.window as any;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.location = dom.window.location;
    global.HTMLElement = dom.window.HTMLElement;
    global.Event = dom.window.Event;
    global.CustomEvent = dom.window.CustomEvent;
  }

  /**
   * Setup browser context (Playwright)
   */
  private async setupBrowserContext(context: ExecutionContext): Promise<void> {
    try {
      const { chromium, firefox, webkit } = await import('playwright');
      const { config } = context;

      let browserEngine;
      switch (config.browser) {
        case 'firefox':
          browserEngine = firefox;
          break;
        case 'webkit':
          browserEngine = webkit;
          break;
        default:
          browserEngine = chromium;
      }

      const browser = await browserEngine.launch({
        headless: config.headless,
      });

      context.browser = browser;

      const browserContext = await browser.newContext({
        ...(config.viewport && { viewport: config.viewport }),
        ...(config.baseURL && { baseURL: config.baseURL }),
      });

      context.page = await browserContext.newPage();

      // Setup console logging
      context.page.on('console', (msg: any) => {
        context.logs.push({
          level: msg.type() as any,
          message: msg.text(),
          timestamp: Date.now(),
          source: 'browser',
        });
      });

      // Setup error logging
      context.page.on('pageerror', (error: Error) => {
        context.logs.push({
          level: 'error',
          message: error.message,
          timestamp: Date.now(),
          source: 'browser',
        });
      });
    } catch (error) {
      throw new Error(`Failed to setup browser context: ${error}`);
    }
  }

  /**
   * Setup Puppeteer context
   */
  private async setupPuppeteerContext(context: ExecutionContext): Promise<void> {
    try {
      const puppeteer = await import('puppeteer');
      const { config } = context;

      const browser = await puppeteer.default.launch({
        headless: config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      context.browser = browser;
      context.page = await browser.newPage();

      await context.page.setViewport(config.viewport);

      if (config.baseURL) {
        await context.page.goto(config.baseURL);
      }

      // Setup console logging
      context.page.on('console', (msg: any) => {
        context.logs.push({
          level: msg.type() as any,
          message: msg.text(),
          timestamp: Date.now(),
          source: 'browser',
        });
      });

      // Setup error logging
      context.page.on('pageerror', (error: Error) => {
        context.logs.push({
          level: 'error',
          message: error.message,
          timestamp: Date.now(),
          source: 'browser',
        });
      });
    } catch (error) {
      throw new Error(`Failed to setup Puppeteer context: ${error}`);
    }
  }

  /**
   * Create test context
   */
  private createTestContext(suite: TestSuite, test: TestCase, config: TestConfig): TestContext {
    const context: TestContext = {
      suite: suite.name,
      test: test.name,
      environment: config.environment,
      fixtures: { ...config.fixtures, ...test.fixtures },
      expect: createExpectAPI(),
      assert: createAssertAPI(),
      skip: () => {
        throw new Error('SKIP_TEST');
      },
      fail: (message: string) => {
        throw new Error(message);
      },
      timeout: (ms: number) => {
        // Timeout functionality would be implemented here
      },
    };

    // Add environment-specific context
    if (this.executionContext?.page) {
      context.page = this.executionContext.page;
      context.browser = this.executionContext.browser;
    }

    if (config.environment === 'jsdom') {
      context.document = global.document;
      context.window = global.window;
    }

    return context;
  }

  /**
   * Setup test fixtures
   */
  private async setupTestFixtures(test: TestCase, context: TestContext): Promise<void> {
    // Fixture setup would be implemented here
    // This would load and initialize test fixtures
  }

  /**
   * Cleanup test fixtures
   */
  private async cleanupTestFixtures(test: TestCase, context: TestContext): Promise<void> {
    // Fixture cleanup would be implemented here
  }

  /**
   * Run beforeEach hooks
   */
  private async runBeforeEachHooks(context: TestContext): Promise<void> {
    // Hook execution would be implemented here
  }

  /**
   * Run afterEach hooks
   */
  private async runAfterEachHooks(context: TestContext): Promise<void> {
    // Hook execution would be implemented here
  }

  /**
   * Run setup files
   */
  private async runSetupFiles(setupFiles: string[]): Promise<void> {
    for (const file of setupFiles) {
      try {
        await import(file);
      } catch (error) {
        console.error(`Failed to run setup file ${file}:`, error);
        throw error;
      }
    }
  }

  /**
   * Run teardown files
   */
  private async runTeardownFiles(teardownFiles: string[]): Promise<void> {
    for (const file of teardownFiles) {
      try {
        await import(file);
      } catch (error) {
        console.error(`Failed to run teardown file ${file}:`, error);
      }
    }
  }

  /**
   * Take screenshot
   */
  private async takeScreenshot(suite: string, test: string): Promise<string | null> {
    if (!this.executionContext?.page) return null;

    try {
      const filename = `${suite}-${test}-${Date.now()}.png`;
      const path = `./screenshots/${filename}`;

      await this.executionContext.page.screenshot({
        path,
        fullPage: true,
      });

      return path;
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  }

  /**
   * Format error for test result
   */
  private formatError(error: any): TestError {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return {
      name: 'Error',
      message: String(error),
    };
  }

  /**
   * Create skipped test result
   */
  private createSkippedResult(suite: string, test: string): TestResult {
    return {
      suite,
      test,
      status: 'skipped',
      duration: 0,
      logs: [],
      screenshots: [],
    };
  }

  /**
   * Cleanup execution context
   */
  private async cleanupExecutionContext(): Promise<void> {
    if (!this.executionContext) return;

    try {
      // Close browser if opened
      if (this.executionContext.browser) {
        await this.executionContext.browser.close();
      }

      // Clean up JSDOM globals
      if (this.executionContext.config.environment === 'jsdom') {
        delete (global as any).window;
        delete (global as any).document;
        delete (global as any).navigator;
        delete (global as any).location;
        delete (global as any).HTMLElement;
        delete (global as any).Event;
        delete (global as any).CustomEvent;
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      this.executionContext = null;
    }
  }
}

/**
 * Parallel test runner
 */
export class ParallelTestRunner extends CoreTestRunner {
  /**
   * Run test suites in parallel
   */
  async run(suites: TestSuite[], config: TestConfig): Promise<TestResult[]> {
    if (!config.parallel || config.maxWorkers <= 1) {
      return super.run(suites, config);
    }

    const workers = Math.min(config.maxWorkers, suites.length);
    const chunks = this.chunkSuites(suites, workers);

    const workerPromises = chunks.map(chunk => this.runWorker(chunk, config));

    const workerResults = await Promise.all(workerPromises);
    return workerResults.flat();
  }

  /**
   * Split suites into chunks for parallel execution
   */
  private chunkSuites(suites: TestSuite[], chunkCount: number): TestSuite[][] {
    const chunks: TestSuite[][] = [];
    const chunkSize = Math.ceil(suites.length / chunkCount);

    for (let i = 0; i < suites.length; i += chunkSize) {
      chunks.push(suites.slice(i, i + chunkSize));
    }

    return chunks;
  }

  /**
   * Run a worker with assigned test suites
   */
  private async runWorker(suites: TestSuite[], config: TestConfig): Promise<TestResult[]> {
    const worker = new CoreTestRunner();
    return worker.run(suites, config);
  }
}

/**
 * Create test runner based on configuration
 */
export function createTestRunner(config: TestConfig): TestRunner {
  if (config.parallel && config.maxWorkers > 1) {
    return new ParallelTestRunner();
  }
  return new CoreTestRunner();
}

/**
 * Run performance measurements
 */
export async function measurePerformance(
  page: any,
  testFn: () => Promise<void>
): Promise<PerformanceMetrics> {
  // Clear existing performance entries
  await page.evaluate(() => {
    performance.clearMarks();
    performance.clearMeasures();
  });

  const startTime = Date.now();

  // Run the test function
  await testFn();

  // Collect performance metrics
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const firstPaint = paint.find(entry => entry.name === 'first-paint')?.startTime || 0;
    const firstContentfulPaint =
      paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.startTime : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.startTime : 0,
      firstPaint,
      firstContentfulPaint,
      largestContentfulPaint: 0, // Would need additional measurement
      cumulativeLayoutShift: 0, // Would need additional measurement
      firstInputDelay: 0, // Would need additional measurement
      memoryUsage: (performance as any).memory
        ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          }
        : {
            usedJSHeapSize: 0,
            totalJSHeapSize: 0,
            jsHeapSizeLimit: 0,
          },
    };
  });

  return {
    ...metrics,
    loadTime: metrics.loadTime || Date.now() - startTime,
  };
}
