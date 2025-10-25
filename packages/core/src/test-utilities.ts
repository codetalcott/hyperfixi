/**
 * Shared Test Utilities
 * Common utilities for testing enhanced implementations
 */

import type { TypedExecutionContext } from './types/enhanced-core';

// Define TypedExpressionContext for expression testing
export interface TypedExpressionContext {
  // Core context data
  [key: string]: unknown;
  
  // Standard hyperscript context
  me: HTMLElement;
  you: HTMLElement | null;
  it: unknown;
  
  // Variable storage
  locals: Map<string, unknown>;
  globals: Map<string, unknown>;
  variables: Map<string, unknown>;
  
  // Meta context for template variables
  meta: Map<string, unknown>;
  
  // Performance tracking
  evaluationHistory: unknown[];
  performanceMetrics: {
    totalEvaluations: number;
    averageExecutionTime: number;
    lastEvaluationTime: number;
  };
}

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
      ...Object.fromEntries(Object.keys(properties).filter(k => k.startsWith('style.')).map(k => [k.slice(6), properties[k]]))
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
      }
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
      y: 0
    }),
    
    // Apply custom properties
    ...properties
  } as any;
  
  // Sync className with classList
  Object.defineProperty(element, 'className', {
    get() {
      return element.classList.toString();
    },
    set(value: string) {
      element.classList.classes.clear();
      if (value) {
        value.split(' ').filter(Boolean).forEach((cls: string) => {
          element.classList.add(cls);
        });
      }
    }
  });
  
  return element as HTMLElement;
}

/**
 * Create a mock typed execution context for command testing
 */
export function createTypedExecutionContext(options: {
  me?: HTMLElement | null;
  you?: HTMLElement | null;
  it?: any;
  locals?: Map<string, any>;
  globals?: Map<string, any>;
  variables?: Map<string, any>;
} = {}): TypedExecutionContext {
  return {
    me: options.me || null,
    you: options.you || null,
    it: options.it || null,
    locals: options.locals || new Map(),
    globals: options.globals || new Map(),
    variables: options.variables || new Map(),

    // Result handling
    result: null,

    // TypedExecutionContext properties
    expressionStack: [],
    evaluationDepth: 0,
    validationMode: 'strict',
    evaluationHistory: [],

    // Execution metadata
    meta: {
      startTime: Date.now(),
      commandStack: [],
      debugMode: false
    }
  };
}

/**
 * Create a mock typed expression context for expression testing
 */
export function createTypedExpressionContext(data: Record<string, any> = {}): TypedExpressionContext {
  const context = {
    // Core context data
    ...data,
    
    // Standard hyperscript context
    me: data.me || createMockElement(),
    you: data.you || null,
    it: data.it || null,
    
    // Variable storage
    locals: new Map(Object.entries(data.locals || {})),
    globals: new Map(Object.entries(data.globals || {})),
    variables: new Map(Object.entries(data.variables || {})),
    
    // Meta context for template variables
    meta: new Map(),
    
    // Performance tracking
    evaluationHistory: [],
    performanceMetrics: {
      totalEvaluations: 0,
      averageExecutionTime: 0,
      lastEvaluationTime: 0
    }
  };
  
  // Add data properties directly to context for property access
  Object.assign(context, data);
  
  return context as TypedExpressionContext;
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
        reload: () => {}
      }
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
        replaceState: () => {}
      },
      scrollTo: () => {}
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
    
    measure: async <T>(name: string, operation: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
      const opStart = Date.now();
      const result = await operation();
      const duration = Date.now() - opStart;
      console.debug(`⏱️ ${name}: ${duration}ms`);
      return { result, duration };
    }
  };
}

// Initialize mock DOM for tests
setupMockDOM();