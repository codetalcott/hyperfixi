/**
 * Testing Framework for HyperFixi Applications
 *
 * Provides comprehensive cross-platform behavior testing including:
 * - Multi-environment test execution (JSDOM, Browser, Node.js)
 * - Rich assertion library with DOM and HyperScript matchers
 * - E2E testing with Playwright and Puppeteer
 * - Visual regression testing
 * - Performance testing
 * - Accessibility testing
 */

// Import types first for local use
import type {
  TestSuite,
  TestCase,
  TestFunction,
  TestContext,
  TestConfig,
  TestResult,
  TestEnvironment,
  BrowserType,
} from './types';

// Import functions for internal use
import { createTestRunner as createTestRunnerInternal } from './runner';

// Core exports
export { CoreTestRunner, ParallelTestRunner, createTestRunner, measurePerformance } from './runner';
export { createExpectAPI, createAssertAPI, AssertionError } from './assertions';

// Type exports
export type {
  // Test definition types
  TestSuite,
  TestCase,
  TestFunction,
  TestContext,
  TestConfig,
  
  // Result types
  TestResult,
  TestStatus,
  TestError,
  TestLog,
  CoverageData,
  
  // Environment types
  TestEnvironment,
  BrowserType,
  BrowserTestOptions,
  
  // Assertion types
  ExpectAPI,
  ExpectMatcher,
  AssertAPI,
  
  // Reporter types
  TestReporter,
  
  // Utility types
  PageObject,
  TestDataProvider,
  TestFixture,
  TestRunner,
  TestDiscoveryOptions,
  MockFunction,
  SpyFunction,
  
  // E2E types
  E2EStep,
  E2EAction,
  
  // Testing types
  VisualTestConfig,
  PerformanceMetrics,
  AccessibilityResult,
  AccessibilityViolation,
  AccessibilityPass,
  AccessibilityIncomplete,
  AccessibilityNode,
  AccessibilityCheckResult,
} from './types';

/**
 * Global test suite registry
 */
const testSuites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

/**
 * Default test configuration
 */
const DEFAULT_CONFIG: TestConfig = {
  environment: 'jsdom',
  browser: 'chromium',
  timeout: 5000,
  retries: 0,
  parallel: false,
  maxWorkers: 1,
  headless: true,
  viewport: {
    width: 1280,
    height: 720,
  },
  setupFiles: [],
  teardownFiles: [],
  reporters: [],
  coverage: {
    enabled: false,
    threshold: 80,
    include: ['src/**/*'],
    exclude: ['**/*.test.*', '**/*.spec.*'],
  },
  fixtures: {},
};

/**
 * Create a test suite
 */
export function describe(name: string, fn: () => void): void;
export function describe(name: string, options: Partial<TestSuite>, fn: () => void): void;
export function describe(name: string, optionsOrFn: Partial<TestSuite> | (() => void), fn?: () => void): void {
  const actualOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const actualFn = typeof optionsOrFn === 'function' ? optionsOrFn : fn!;

  const suite: TestSuite = {
    name,
    ...(actualOptions.description !== undefined ? { description: actualOptions.description } : {}),
    ...(actualOptions.setup !== undefined ? { setup: actualOptions.setup } : {}),
    ...(actualOptions.teardown !== undefined ? { teardown: actualOptions.teardown } : {}),
    ...(actualOptions.beforeEach !== undefined ? { beforeEach: actualOptions.beforeEach } : {}),
    ...(actualOptions.afterEach !== undefined ? { afterEach: actualOptions.afterEach } : {}),
    tests: [],
    suites: [],
    ...(actualOptions.timeout !== undefined ? { timeout: actualOptions.timeout } : {}),
    ...(actualOptions.retries !== undefined ? { retries: actualOptions.retries } : {}),
    ...(actualOptions.skip !== undefined ? { skip: actualOptions.skip } : {}),
    ...(actualOptions.only !== undefined ? { only: actualOptions.only } : {}),
  };

  const parentSuite = currentSuite;
  if (parentSuite) {
    parentSuite.suites.push(suite);
  } else {
    testSuites.push(suite);
  }

  currentSuite = suite;
  actualFn();
  currentSuite = parentSuite;
}

/**
 * Create a test case
 */
export function it(name: string, fn: TestFunction): void;
export function it(name: string, options: Partial<TestCase>, fn: TestFunction): void;
export function it(name: string, optionsOrFn: Partial<TestCase> | TestFunction, fn?: TestFunction): void {
  const actualOptions = typeof optionsOrFn === 'function' ? {} : optionsOrFn;
  const actualFn = typeof optionsOrFn === 'function' ? optionsOrFn : fn!;

  if (!currentSuite) {
    throw new Error('Test case must be defined within a test suite (describe block)');
  }

  const test: TestCase = {
    name,
    ...(actualOptions.description !== undefined ? { description: actualOptions.description } : {}),
    fn: actualFn,
    ...(actualOptions.timeout !== undefined ? { timeout: actualOptions.timeout } : {}),
    ...(actualOptions.retries !== undefined ? { retries: actualOptions.retries } : {}),
    ...(actualOptions.skip !== undefined ? { skip: actualOptions.skip } : {}),
    ...(actualOptions.only !== undefined ? { only: actualOptions.only } : {}),
    tags: actualOptions.tags || [],
    fixtures: actualOptions.fixtures || {},
  };

  currentSuite.tests.push(test);
}

/**
 * Alias for it()
 */
export const test = it;

/**
 * Skip a test suite
 */
export function describe_skip(name: string, fn: () => void): void {
  describe(name, { skip: true }, fn);
}

/**
 * Skip a test case
 */
export function it_skip(name: string, fn: TestFunction): void {
  it(name, { skip: true }, fn);
}

/**
 * Focus on a test suite (only run this suite)
 */
export function describe_only(name: string, fn: () => void): void {
  describe(name, { only: true }, fn);
}

/**
 * Focus on a test case (only run this test)
 */
export function it_only(name: string, fn: TestFunction): void {
  it(name, { only: true }, fn);
}

/**
 * Setup function to run before all tests in a suite
 */
export function beforeAll(fn: () => Promise<void> | void): void {
  if (!currentSuite) {
    throw new Error('beforeAll must be called within a test suite');
  }
  currentSuite.setup = fn;
}

/**
 * Teardown function to run after all tests in a suite
 */
export function afterAll(fn: () => Promise<void> | void): void {
  if (!currentSuite) {
    throw new Error('afterAll must be called within a test suite');
  }
  currentSuite.teardown = fn;
}

/**
 * Setup function to run before each test in a suite
 */
export function beforeEach(fn: () => Promise<void> | void): void {
  if (!currentSuite) {
    throw new Error('beforeEach must be called within a test suite');
  }
  currentSuite.beforeEach = fn;
}

/**
 * Teardown function to run after each test in a suite
 */
export function afterEach(fn: () => Promise<void> | void): void {
  if (!currentSuite) {
    throw new Error('afterEach must be called within a test suite');
  }
  currentSuite.afterEach = fn;
}

/**
 * Run all registered test suites
 */
export async function runTests(config: Partial<TestConfig> = {}): Promise<TestResult[]> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const runner = createTestRunnerInternal(finalConfig);
  
  // Filter suites based on 'only' flag
  let suitesToRun = testSuites;
  const onlySuites = testSuites.filter(suite => suite.only);
  if (onlySuites.length > 0) {
    suitesToRun = onlySuites;
  }
  
  return runner.run(suitesToRun, finalConfig);
}

/**
 * Clear all registered test suites
 */
export function clearTests(): void {
  testSuites.length = 0;
  currentSuite = null;
}

/**
 * Create a test fixture
 */
export function fixture<T>(name: string, setup: () => T | Promise<T>, teardown?: (fixture: T) => void | Promise<void>) {
  return {
    name,
    async create(): Promise<T> {
      const instance = await setup();
      
      // Store teardown function for later cleanup
      if (teardown) {
        (instance as any).__teardown = () => teardown(instance);
      }
      
      return instance;
    },
    async destroy(instance: T): Promise<void> {
      if ((instance as any).__teardown) {
        await (instance as any).__teardown();
      }
    },
  };
}

/**
 * Create a mock function
 */
export function createMock<T extends (...args: any[]) => any>(implementation?: T): import('./types').MockFunction {
  const calls: any[][] = [];
  const results: Array<{ type: 'return' | 'throw'; value: any }> = [];
  let mockImplementation: ((...args: any[]) => any) | undefined = implementation;

  const mockFn = function(...args: any[]) {
    calls.push(args);
    
    try {
      if (mockImplementation) {
        const result = mockImplementation(...args);
        results.push({ type: 'return', value: result });
        return result;
      }
      
      const result = undefined;
      results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      results.push({ type: 'throw', value: error });
      throw error;
    }
  } as import('./types').MockFunction;

  mockFn.mockReturnValue = (value: any) => {
    mockImplementation = () => value;
    return mockFn;
  };

  mockFn.mockReturnValueOnce = (value: any) => {
    const originalImpl = mockImplementation;
    let called = false;
    mockImplementation = (...args: any[]) => {
      if (!called) {
        called = true;
        return value;
      }
      return originalImpl ? originalImpl(...args) : undefined;
    };
    return mockFn;
  };

  mockFn.mockResolvedValue = (value: any) => {
    mockImplementation = () => Promise.resolve(value);
    return mockFn;
  };

  mockFn.mockRejectedValue = (error: any) => {
    mockImplementation = () => Promise.reject(error);
    return mockFn;
  };

  mockFn.mockImplementation = (fn: (...args: any[]) => any) => {
    mockImplementation = fn;
    return mockFn;
  };

  mockFn.mockClear = () => {
    calls.length = 0;
    results.length = 0;
    return mockFn;
  };

  mockFn.mockReset = () => {
    calls.length = 0;
    results.length = 0;
    mockImplementation = undefined;
    return mockFn;
  };

  mockFn.mockRestore = () => {
    calls.length = 0;
    results.length = 0;
    mockImplementation = implementation;
    return mockFn;
  };

  Object.defineProperty(mockFn, 'calls', {
    get: () => calls,
  });

  Object.defineProperty(mockFn, 'results', {
    get: () => results,
  });

  return mockFn;
}

/**
 * Create a spy function
 */
export function createSpy<T extends (...args: any[]) => any>(target: any, method: string): import('./types').SpyFunction {
  const original = target[method];
  const spy = createMock(original) as import('./types').SpyFunction;
  
  spy.original = original;
  target[method] = spy;
  
  const originalRestore = spy.mockRestore;
  spy.mockRestore = () => {
    target[method] = original;
    return originalRestore();
  };
  
  return spy;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a page object for E2E testing
 */
export function createPageObject(definition: import('./types').PageObject) {
  return {
    ...definition,
    
    async goto(page: any) {
      if (definition.url) {
        await page.goto(definition.url);
      }
    },
    
    element(name: string) {
      const selector = definition.selectors[name];
      if (!selector) {
        throw new Error(`Selector "${name}" not found in page object "${definition.name}"`);
      }
      return selector;
    },
    
    async action(page: any, name: string, ...args: any[]) {
      const action = definition.actions[name];
      if (!action) {
        throw new Error(`Action "${name}" not found in page object "${definition.name}"`);
      }
      return action.call(this, page, ...args);
    },
    
    async assert(page: any, name: string, ...args: any[]) {
      const assertion = definition.assertions[name];
      if (!assertion) {
        throw new Error(`Assertion "${name}" not found in page object "${definition.name}"`);
      }
      return assertion.call(this, page, ...args);
    },
  };
}

/**
 * Integration with HyperFixi core for behavior testing
 */
export function createHyperFixiTestContext(hyperfixi: any) {
  return {
    // Compile and test hyperscript
    async compileAndTest(script: string, element: Element, event?: string) {
      const compiled = await hyperfixi.compile(script);
      
      if (element && compiled) {
        // Apply compiled script to element
        element.setAttribute('data-compiled-script', compiled);
        
        // Trigger event if specified
        if (event) {
          element.dispatchEvent(new Event(event));
        }
      }
      
      return compiled;
    },
    
    // Test script compilation
    async testCompilation(script: string) {
      try {
        const result = await hyperfixi.compile(script);
        return { success: true, result };
      } catch (error) {
        return { success: false, error };
      }
    },
    
    // Test script execution
    async testExecution(script: string, element: Element, eventType: string = 'click') {
      const compiled = await hyperfixi.compile(script);
      
      if (compiled) {
        // Setup execution tracking
        let executed = false;
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          if (args.includes('HYPERSCRIPT_EXECUTED')) {
            executed = true;
          }
          originalConsoleLog(...args);
        };
        
        try {
          // Apply script and trigger event
          element.setAttribute('data-hyperscript', script);
          element.dispatchEvent(new Event(eventType));
          
          // Wait for execution
          await new Promise(resolve => setTimeout(resolve, 100));
          
          return { executed, compiled };
        } finally {
          console.log = originalConsoleLog;
        }
      }
      
      return { executed: false, compiled: null };
    },
  };
}

/**
 * Quick start function for basic testing setup
 */
export async function quickStartTesting(options: {
  environment?: TestEnvironment;
  browser?: BrowserType;
  headless?: boolean;
  baseURL?: string;
  testFiles?: string[];
} = {}) {
  const config: Partial<TestConfig> = {
    environment: options.environment || 'jsdom',
    browser: options.browser || 'chromium',
    headless: options.headless !== false,
    ...(options.baseURL !== undefined ? { baseURL: options.baseURL } : {}),
  };

  // Load test files if specified
  if (options.testFiles) {
    for (const file of options.testFiles) {
      try {
        await import(file);
      } catch (error) {
        console.error(`Failed to load test file ${file}:`, error);
      }
    }
  }

  return {
    config,
    run: () => runTests(config),
    clear: clearTests,
  };
}

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Default test configuration
 */
export { DEFAULT_CONFIG };