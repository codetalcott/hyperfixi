/**
 * Types for Testing Framework
 */

/**
 * Test environment types
 */
export type TestEnvironment = 'jsdom' | 'browser' | 'node' | 'playwright' | 'puppeteer';

/**
 * Test status
 */
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

/**
 * Browser type for testing
 */
export type BrowserType = 'chromium' | 'firefox' | 'webkit' | 'chrome' | 'edge';

/**
 * Test configuration
 */
export interface TestConfig {
  environment: TestEnvironment;
  browser?: BrowserType;
  timeout: number;
  retries: number;
  parallel: boolean;
  maxWorkers: number;
  headless: boolean;
  viewport: {
    width: number;
    height: number;
  };
  baseURL?: string;
  setupFiles: string[];
  teardownFiles: string[];
  reporters: TestReporter[];
  coverage: {
    enabled: boolean;
    threshold: number;
    include: string[];
    exclude: string[];
  };
  fixtures: Record<string, any>;
}

/**
 * Test suite definition
 */
export interface TestSuite {
  name: string;
  description?: string;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
  tests: TestCase[];
  suites: TestSuite[];
  timeout?: number;
  retries?: number;
  skip?: boolean;
  only?: boolean;
}

/**
 * Test case definition
 */
export interface TestCase {
  name: string;
  description?: string;
  fn: TestFunction;
  timeout?: number;
  retries?: number;
  skip?: boolean;
  only?: boolean;
  tags: string[];
  fixtures: Record<string, any>;
}

/**
 * Test function signature
 */
export type TestFunction = (context: TestContext) => Promise<void> | void;

/**
 * Test context
 */
export interface TestContext {
  // Test metadata
  suite: string;
  test: string;
  environment: TestEnvironment;

  // Browser context (if applicable)
  page?: any; // Browser page instance
  browser?: any; // Browser instance

  // DOM context
  document?: Document;
  window?: Window;

  // HyperFixi context
  hyperfixi?: any;

  // Utilities
  fixtures: Record<string, any>;
  expect: ExpectAPI;
  assert: AssertAPI;

  // Lifecycle methods
  skip: () => void;
  fail: (message: string) => never;
  timeout: (ms: number) => void;
}

/**
 * Test result
 */
export interface TestResult {
  suite: string;
  test: string;
  status: TestStatus;
  duration: number;
  error?: TestError | undefined;
  logs: TestLog[];
  screenshots: string[];
  coverage?: CoverageData | undefined;
}

/**
 * Test error
 */
export interface TestError {
  name: string;
  message: string;
  stack?: string | undefined;
  code?: string | undefined;
  expected?: any | undefined;
  actual?: any | undefined;
  diff?: string | undefined;
}

/**
 * Test log entry
 */
export interface TestLog {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  source?: string;
}

/**
 * Coverage data
 */
export interface CoverageData {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
}

/**
 * Test reporter interface
 */
export interface TestReporter {
  name: string;
  onStart: (suites: TestSuite[]) => void;
  onSuiteStart: (suite: TestSuite) => void;
  onSuiteEnd: (suite: TestSuite, results: TestResult[]) => void;
  onTestStart: (test: TestCase) => void;
  onTestEnd: (test: TestCase, result: TestResult) => void;
  onEnd: (results: TestResult[]) => void;
}

/**
 * Expect API for assertions
 */
export interface ExpectAPI {
  (actual: any): ExpectMatcher;
}

/**
 * Expect matcher interface
 */
export interface ExpectMatcher {
  // Basic matchers
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toStrictEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeInstanceOf(constructor: any): void;
  toBeCloseTo(expected: number, precision?: number): void;

  // String matchers
  toMatch(expected: string | RegExp): void;
  toContain(expected: any): void;
  toHaveLength(expected: number): void;

  // Array/Object matchers
  toContainEqual(expected: any): void;
  toHaveProperty(path: string, value?: any): void;
  toMatchObject(expected: object): void;

  // Promise matchers
  resolves: ExpectMatcher;
  rejects: ExpectMatcher;

  // DOM matchers
  toBeInTheDocument(): void;
  toBeVisible(): void;
  toBeDisabled(): void;
  toBeEnabled(): void;
  toBeChecked(): void;
  toHaveClass(className: string): void;
  toHaveAttribute(name: string, value?: string): void;
  toHaveTextContent(text: string | RegExp): void;
  toHaveValue(value: any): void;

  // HyperScript specific matchers
  toHaveCompiledScript(): void;
  toHaveExecutedScript(): void;
  toHaveTriggeredEvent(eventType: string): void;
  toHaveUpdatedElement(): void;

  // Negation
  not: ExpectMatcher;
}

/**
 * Assert API
 */
export interface AssertAPI {
  // Basic assertions
  ok(value: any, message?: string): void;
  equal(actual: any, expected: any, message?: string): void;
  strictEqual(actual: any, expected: any, message?: string): void;
  notEqual(actual: any, expected: any, message?: string): void;
  notStrictEqual(actual: any, expected: any, message?: string): void;

  // Type assertions
  throws(fn: () => void, error?: any, message?: string): void;
  doesNotThrow(fn: () => void, message?: string): void;
  ifError(value: any): void;

  // Async assertions
  rejects(promise: Promise<any>, error?: any, message?: string): Promise<void>;
  doesNotReject(promise: Promise<any>, message?: string): Promise<void>;

  // DOM assertions
  elementExists(selector: string, message?: string): void;
  elementVisible(selector: string, message?: string): void;
  elementHasClass(selector: string, className: string, message?: string): void;
  elementHasText(selector: string, text: string, message?: string): void;

  // HyperScript assertions
  scriptCompiled(script: string, message?: string): void;
  scriptExecuted(script: string, message?: string): void;
  eventTriggered(eventType: string, message?: string): void;
}

/**
 * Page object model interface
 */
export interface PageObject {
  name: string;
  url?: string;
  selectors: Record<string, string>;
  actions: Record<string, (...args: any[]) => Promise<any>>;
  assertions: Record<string, (...args: any[]) => Promise<void>>;
}

/**
 * Test data provider interface
 */
export interface TestDataProvider {
  name: string;
  provide: () => Promise<any[]> | any[];
}

/**
 * Test fixture interface
 */
export interface TestFixture {
  name: string;
  setup: (context: TestContext) => Promise<any> | any;
  teardown?: (fixture: any, context: TestContext) => Promise<void> | void;
}

/**
 * Browser testing options
 */
export interface BrowserTestOptions {
  browser: BrowserType;
  headless: boolean;
  viewport: { width: number; height: number };
  deviceScaleFactor?: number;
  userAgent?: string;
  locale?: string;
  timezone?: string;
  permissions?: string[];
  geolocation?: { latitude: number; longitude: number };
  screenshot?: {
    mode: 'off' | 'on' | 'only-on-failure';
    fullPage: boolean;
  };
  video?: {
    enabled: boolean;
    dir: string;
  };
}

/**
 * E2E test step
 */
export interface E2EStep {
  name: string;
  action: E2EAction;
  selector?: string;
  value?: any;
  options?: Record<string, any>;
  screenshot?: boolean;
  wait?: number | string;
}

/**
 * E2E action types
 */
export type E2EAction =
  | 'goto'
  | 'click'
  | 'type'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'scroll'
  | 'wait'
  | 'screenshot'
  | 'evaluate'
  | 'assert';

/**
 * Visual regression test configuration
 */
export interface VisualTestConfig {
  threshold: number;
  includeAA: boolean;
  animations: 'disabled' | 'allow';
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fullPage: boolean;
  mask?: string[];
}

/**
 * Performance test metrics
 */
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * Accessibility test result
 */
export interface AccessibilityResult {
  violations: AccessibilityViolation[];
  passes: AccessibilityPass[];
  incomplete: AccessibilityIncomplete[];
}

/**
 * Accessibility violation
 */
export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AccessibilityNode[];
}

/**
 * Accessibility pass
 */
export interface AccessibilityPass {
  id: string;
  description: string;
  nodes: AccessibilityNode[];
}

/**
 * Accessibility incomplete
 */
export interface AccessibilityIncomplete {
  id: string;
  description: string;
  nodes: AccessibilityNode[];
}

/**
 * Accessibility node
 */
export interface AccessibilityNode {
  target: string[];
  html: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  any: AccessibilityCheckResult[];
  all: AccessibilityCheckResult[];
  none: AccessibilityCheckResult[];
}

/**
 * Accessibility check result
 */
export interface AccessibilityCheckResult {
  id: string;
  data: any;
  relatedNodes: any[];
  impact: string;
  message: string;
}

/**
 * Test runner interface
 */
export interface TestRunner {
  run: (suites: TestSuite[], config: TestConfig) => Promise<TestResult[]>;
  runSuite: (suite: TestSuite, config: TestConfig) => Promise<TestResult[]>;
  runTest: (test: TestCase, context: TestContext) => Promise<TestResult>;
}

/**
 * Test discovery options
 */
export interface TestDiscoveryOptions {
  patterns: string[];
  ignore: string[];
  recursive: boolean;
  extensions: string[];
}

/**
 * Mock function interface
 */
export interface MockFunction {
  (...args: any[]): any;
  mockReturnValue: (value: any) => MockFunction;
  mockReturnValueOnce: (value: any) => MockFunction;
  mockResolvedValue: (value: any) => MockFunction;
  mockRejectedValue: (error: any) => MockFunction;
  mockImplementation: (fn: (...args: any[]) => any) => MockFunction;
  mockClear: () => MockFunction;
  mockReset: () => MockFunction;
  mockRestore: () => MockFunction;
  calls: any[][];
  results: Array<{ type: 'return' | 'throw'; value: any }>;
}

/**
 * Spy function interface
 */
export interface SpyFunction extends MockFunction {
  original: Function;
}
