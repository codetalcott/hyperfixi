/**
 * Shared Test Utilities
 * Common utilities for testing enhanced implementations
 *
 * Uses the unified type hierarchy:
 *   CoreExecutionContext → ExecutionContext → TypedExecutionContext
 */

import type {
  CoreExecutionContext,
  ExecutionContext,
  TypedExecutionContext,
} from './types/base-types';

// Re-export types for test file convenience
export type { CoreExecutionContext, ExecutionContext, TypedExecutionContext };

/**
 * Mutable version of context properties for testing.
 * Removes readonly modifiers so tests can mutate context.me, context.you, etc.
 */
export type MutableContext<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Extended context for expression testing with additional test-specific properties.
 * All properties are MUTABLE to allow test setup/modification.
 */
export type TestExpressionContext = MutableContext<TypedExecutionContext> & {
  // Performance tracking (test-specific)
  performanceMetrics?: {
    totalEvaluations: number;
    averageExecutionTime: number;
    lastEvaluationTime: number;
  };

  // Allow arbitrary properties for test data
  [key: string]: unknown;
};

// Alias for backward compatibility
export type TypedExpressionContext = TestExpressionContext;

/**
 * Create a mock HTMLElement for testing
 */
export function createMockElement(
  tag: string = 'div',
  properties: Record<string, any> = {},
  attributes: Record<string, string> = {}
): HTMLElement {
  // Create basic mock element structure
  const element = {
    tagName: tag.toUpperCase(),
    nodeName: tag.toUpperCase(),
    nodeType: 1, // Element node
    ownerDocument: global.document || {},

    // Style object
    style: {
      display: '',
      visibility: '',
      opacity: '',
      ...Object.fromEntries(
        Object.keys(properties)
          .filter(k => k.startsWith('style.'))
          .map(k => [k.slice(6), properties[k]])
      ),
    },

    // ClassList mock
    classList: {
      classes: new Set<string>(),
      add(...tokens: string[]) {
        tokens.forEach(token => this.classes.add(token));
      },
      remove(...tokens: string[]) {
        tokens.forEach(token => this.classes.delete(token));
      },
      contains(token: string) {
        return this.classes.has(token);
      },
      toggle(token: string) {
        if (this.classes.has(token)) {
          this.classes.delete(token);
          return false;
        } else {
          this.classes.add(token);
          return true;
        }
      },
      toString() {
        return Array.from(this.classes).join(' ');
      },
    },

    // Common properties
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    outerHTML: `<${tag}></${tag}>`,

    // Attributes
    attributes: new Map(Object.entries(attributes)),
    getAttribute(name: string) {
      return this.attributes.get(name) || null;
    },
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    },
    removeAttribute(name: string) {
      this.attributes.delete(name);
    },
    hasAttribute(name: string) {
      return this.attributes.has(name);
    },

    // DOM navigation
    parentNode: null,
    parentElement: null,
    children: [],
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,

    // DOM manipulation methods
    appendChild(child: any) {
      this.children.push(child);
      child.parentNode = this;
      child.parentElement = this;
      return child;
    },
    removeChild(child: any) {
      const index = this.children.indexOf(child);
      if (index > -1) {
        this.children.splice(index, 1);
        child.parentNode = null;
        child.parentElement = null;
      }
      return child;
    },
    insertBefore(newNode: any, referenceNode: any) {
      const index = referenceNode ? this.children.indexOf(referenceNode) : this.children.length;
      this.children.splice(index, 0, newNode);
      newNode.parentNode = this;
      newNode.parentElement = this;
      return newNode;
    },

    // Event handling
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,

    // Query methods
    querySelector: () => null,
    querySelectorAll: () => [],

    // Scroll methods for navigation commands
    scrollIntoView: () => {},
    getBoundingClientRect: () => ({
      top: 0,
      left: 0,
      right: 100,
      bottom: 50,
      width: 100,
      height: 50,
      x: 0,
      y: 0,
    }),

    // Apply custom properties
    ...properties,
  } as any;

  // Sync className with classList
  Object.defineProperty(element, 'className', {
    get() {
      return element.classList.toString();
    },
    set(value: string) {
      element.classList.classes.clear();
      if (value) {
        value
          .split(' ')
          .filter(Boolean)
          .forEach((cls: string) => {
            element.classList.add(cls);
          });
      }
    },
  });

  return element as HTMLElement;
}

/**
 * Options for creating a test execution context
 */
export interface TestContextOptions {
  me?: Element | null;
  you?: Element | null;
  it?: unknown;
  event?: Event | null;
  locals?: Map<string, unknown>;
  globals?: Map<string, unknown>;
  variables?: Map<string, unknown>;
  result?: unknown;
  // Optional enhanced properties
  expressionStack?: string[];
  evaluationDepth?: number;
  validationMode?: 'strict' | 'permissive';
  evaluationHistory?: Array<{
    expressionName: string;
    category: string;
    input: unknown;
    output: unknown;
    timestamp: number;
    duration: number;
    success: boolean;
  }>;
  // Legacy/meta properties
  meta?: Record<string, unknown>;
}

/**
 * Create a minimal CoreExecutionContext for testing
 * Use this for tree-shaking tests or minimal context needs
 */
export function createCoreTestContext(
  options: Partial<CoreExecutionContext> = {}
): CoreExecutionContext {
  return {
    me: options.me ?? null,
    you: options.you ?? null,
    it: options.it ?? null,
    event: options.event ?? null,
    locals: options.locals ?? new Map(),
    globals: options.globals ?? new Map(),
  };
}

/**
 * Create a full ExecutionContext for testing
 * Includes result and legacy compatibility properties
 */
export function createTestContext(options: TestContextOptions = {}): ExecutionContext {
  return {
    // Core properties
    me: options.me ?? null,
    you: options.you ?? null,
    it: options.it ?? null,
    event: options.event ?? null,
    locals: options.locals ?? new Map(),
    globals: options.globals ?? new Map(),
    // ExecutionContext additions
    result: options.result ?? null,
    variables: options.variables,
    meta: options.meta,
  };
}

/**
 * Create a mock typed execution context for command testing
 * Includes all optional enhanced properties
 */
export function createTypedExecutionContext(
  options: TestContextOptions = {}
): TypedExecutionContext {
  return {
    // Core properties
    me: options.me ?? null,
    you: options.you ?? null,
    it: options.it ?? null,
    event: options.event ?? null,
    locals: options.locals ?? new Map(),
    globals: options.globals ?? new Map(),
    // ExecutionContext additions
    result: options.result ?? null,
    variables: options.variables,
    meta: options.meta,
    // TypedExecutionContext optional properties
    expressionStack: options.expressionStack,
    evaluationDepth: options.evaluationDepth,
    validationMode: options.validationMode,
    evaluationHistory: options.evaluationHistory,
  };
}

/**
 * Create a mock typed expression context for expression testing
 * Extends TypedExecutionContext with test-specific properties
 */
export function createTypedExpressionContext(
  data: Record<string, unknown> = {}
): TestExpressionContext {
  // Extract known properties
  const { me, you, it, event, locals, globals, variables, result, meta, ...rest } = data;

  const context: TestExpressionContext = {
    // Core properties
    me: (me as Element) ?? createMockElement(),
    you: (you as Element) ?? null,
    it: it ?? null,
    event: (event as Event) ?? null,
    locals: locals instanceof Map ? locals : new Map(Object.entries(locals || {})),
    globals: globals instanceof Map ? globals : new Map(Object.entries(globals || {})),
    // ExecutionContext additions
    result: result ?? null,
    variables: variables instanceof Map ? variables : new Map(Object.entries(variables || {})),
    meta: meta instanceof Map ? Object.fromEntries(meta) : (meta as Record<string, unknown>) || {},
    // Performance tracking (test-specific)
    performanceMetrics: {
      totalEvaluations: 0,
      averageExecutionTime: 0,
      lastEvaluationTime: 0,
    },
    // Evaluation history for tracking (test-specific)
    evaluationHistory: [] as Array<{
      expressionName: string;
      category: string;
      input: unknown;
      output: unknown;
      timestamp: number;
      duration: number;
      success: boolean;
    }>,
    // Spread remaining properties for flexible test data
    ...rest,
  };

  return context;
}

/**
 * Create a simple mock DOM environment
 */
export function setupMockDOM() {
  if (typeof global !== 'undefined' && !global.document) {
    (global as any).document = {
      createElement: (tag: string) => createMockElement(tag),
      querySelector: () => null,
      querySelectorAll: () => [],
      body: createMockElement('body'),
      head: createMockElement('head'),
      documentElement: createMockElement('html'),

      // Mock location for navigation tests
      location: {
        href: 'http://localhost:3000',
        protocol: 'http:',
        host: 'localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
        assign: () => {},
        replace: () => {},
        reload: () => {},
      },
    };

    (global as any).window = {
      location: (global as any).document.location,
      document: (global as any).document,
      innerWidth: 1024,
      innerHeight: 768,
      pageXOffset: 0,
      pageYOffset: 0,
      open: () => ({ focus: () => {} }),
      history: {
        back: () => {},
        forward: () => {},
        go: () => {},
        pushState: () => {},
        replaceState: () => {},
      },
      scrollTo: () => {},
    };
  }
}

/**
 * Wait for async operations in tests
 */
export function waitForTick(): Promise<void> {
  return new Promise(resolve => {
    if (typeof setImmediate !== 'undefined') {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Create a performance testing context
 */
export function createPerformanceContext() {
  const start = Date.now();

  return {
    mark: (name: string) => {
      const time = Date.now() - start;
      console.debug(`⏱️ Mark ${name}: ${time}ms`);
      return time;
    },

    measure: async <T>(
      name: string,
      operation: () => Promise<T> | T
    ): Promise<{ result: T; duration: number }> => {
      const opStart = Date.now();
      const result = await operation();
      const duration = Date.now() - opStart;
      console.debug(`⏱️ ${name}: ${duration}ms`);
      return { result, duration };
    },
  };
}

// Initialize mock DOM for tests
setupMockDOM();
