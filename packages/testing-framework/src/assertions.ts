/**
 * Assertion Library
 * Comprehensive assertion and expectation framework for HyperFixi testing
 */

import { diffLines } from 'diff';
import type { ExpectAPI, ExpectMatcher, AssertAPI } from './types';

/**
 * Assertion error class
 */
export class AssertionError extends Error {
  constructor(
    message: string,
    public expected?: any,
    public actual?: any,
    public operator?: string
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Deep equality comparison
 */
function deepEqual(actual: any, expected: any): boolean {
  if (actual === expected) return true;

  if (actual == null || expected == null) return actual === expected;

  if (typeof actual !== typeof expected) return false;

  if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();
  }

  if (actual instanceof RegExp && expected instanceof RegExp) {
    return actual.toString() === expected.toString();
  }

  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    for (let i = 0; i < actual.length; i++) {
      if (!deepEqual(actual[i], expected[i])) return false;
    }
    return true;
  }

  if (typeof actual === 'object' && typeof expected === 'object') {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    if (actualKeys.length !== expectedKeys.length) return false;

    for (const key of actualKeys) {
      if (!expectedKeys.includes(key)) return false;
      if (!deepEqual(actual[key], expected[key])) return false;
    }

    return true;
  }

  return false;
}

/**
 * Generate diff between actual and expected values
 */
function generateDiff(actual: any, expected: any): string {
  const actualStr = typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2);
  const expectedStr = typeof expected === 'string' ? expected : JSON.stringify(expected, null, 2);

  const diff = diffLines(expectedStr, actualStr);

  return diff
    .map(part => {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      return part.value
        .split('\n')
        .map(line => `${prefix} ${line}`)
        .join('\n');
    })
    .join('\n');
}

/**
 * Check if element is in the document
 */
function isInDocument(element: Element): boolean {
  if (typeof document === 'undefined') return false;
  return document.contains(element);
}

/**
 * Check if element is visible
 */
function isVisible(element: Element): boolean {
  if (!isInDocument(element)) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * ExpectMatcher implementation
 */
class ExpectMatcherImpl implements ExpectMatcher {
  constructor(
    private actual: any,
    private isNot: boolean = false
  ) {}

  get not(): ExpectMatcher {
    return new ExpectMatcherImpl(this.actual, !this.isNot);
  }

  get resolves(): ExpectMatcher {
    if (!this.isPromise(this.actual)) {
      throw new AssertionError('Expected value to be a Promise');
    }

    // Return a new matcher that operates on the resolved value
    return new ExpectMatcherImpl(
      this.actual.then((value: any) => value),
      this.isNot
    );
  }

  get rejects(): ExpectMatcher {
    if (!this.isPromise(this.actual)) {
      throw new AssertionError('Expected value to be a Promise');
    }

    // Return a new matcher that expects the promise to reject
    return new ExpectMatcherImpl(
      this.actual.then(
        (value: any) => {
          throw new Error('Promise did not reject');
        },
        (error: any) => error
      ),
      this.isNot
    );
  }

  toBe(expected: any): void {
    const passed = this.actual === expected;
    this.assert(
      passed,
      'toBe',
      expected,
      `Expected ${this.format(this.actual)} to be ${this.format(expected)}`
    );
  }

  toEqual(expected: any): void {
    const passed = deepEqual(this.actual, expected);
    this.assert(
      passed,
      'toEqual',
      expected,
      `Expected ${this.format(this.actual)} to equal ${this.format(expected)}`
    );
  }

  toStrictEqual(expected: any): void {
    const passed = this.actual === expected && deepEqual(this.actual, expected);
    this.assert(
      passed,
      'toStrictEqual',
      expected,
      `Expected ${this.format(this.actual)} to strictly equal ${this.format(expected)}`
    );
  }

  toBeTruthy(): void {
    const passed = Boolean(this.actual);
    this.assert(passed, 'toBeTruthy', true, `Expected ${this.format(this.actual)} to be truthy`);
  }

  toBeFalsy(): void {
    const passed = !Boolean(this.actual);
    this.assert(passed, 'toBeFalsy', false, `Expected ${this.format(this.actual)} to be falsy`);
  }

  toBeNull(): void {
    const passed = this.actual === null;
    this.assert(passed, 'toBeNull', null, `Expected ${this.format(this.actual)} to be null`);
  }

  toBeUndefined(): void {
    const passed = this.actual === undefined;
    this.assert(
      passed,
      'toBeUndefined',
      undefined,
      `Expected ${this.format(this.actual)} to be undefined`
    );
  }

  toBeDefined(): void {
    const passed = this.actual !== undefined;
    this.assert(
      passed,
      'toBeDefined',
      'defined',
      `Expected ${this.format(this.actual)} to be defined`
    );
  }

  toBeNaN(): void {
    const passed = Number.isNaN(this.actual);
    this.assert(passed, 'toBeNaN', NaN, `Expected ${this.format(this.actual)} to be NaN`);
  }

  toBeInstanceOf(constructor: any): void {
    const passed = this.actual instanceof constructor;
    this.assert(
      passed,
      'toBeInstanceOf',
      constructor,
      `Expected ${this.format(this.actual)} to be instance of ${constructor.name}`
    );
  }

  toBeCloseTo(expected: number, precision: number = 2): void {
    if (typeof this.actual !== 'number' || typeof expected !== 'number') {
      throw new AssertionError('Expected both values to be numbers');
    }

    const diff = Math.abs(this.actual - expected);
    const passed = diff < Math.pow(10, -precision) / 2;
    this.assert(
      passed,
      'toBeCloseTo',
      expected,
      `Expected ${this.actual} to be close to ${expected} (precision: ${precision})`
    );
  }

  toMatch(expected: string | RegExp): void {
    if (typeof this.actual !== 'string') {
      throw new AssertionError('Expected value to be a string');
    }

    const regex = typeof expected === 'string' ? new RegExp(expected) : expected;
    const passed = regex.test(this.actual);
    this.assert(passed, 'toMatch', expected, `Expected "${this.actual}" to match ${expected}`);
  }

  toContain(expected: any): void {
    let passed = false;

    if (typeof this.actual === 'string' && typeof expected === 'string') {
      passed = this.actual.includes(expected);
    } else if (Array.isArray(this.actual)) {
      passed = this.actual.includes(expected);
    } else if (this.actual && typeof this.actual.has === 'function') {
      passed = this.actual.has(expected);
    }

    this.assert(
      passed,
      'toContain',
      expected,
      `Expected ${this.format(this.actual)} to contain ${this.format(expected)}`
    );
  }

  toHaveLength(expected: number): void {
    if (this.actual == null || typeof this.actual.length !== 'number') {
      throw new AssertionError('Expected value to have a length property');
    }

    const passed = this.actual.length === expected;
    this.assert(
      passed,
      'toHaveLength',
      expected,
      `Expected length ${this.actual.length} to be ${expected}`
    );
  }

  toContainEqual(expected: any): void {
    if (!Array.isArray(this.actual)) {
      throw new AssertionError('Expected value to be an array');
    }

    const passed = this.actual.some(item => deepEqual(item, expected));
    this.assert(
      passed,
      'toContainEqual',
      expected,
      `Expected array to contain equal to ${this.format(expected)}`
    );
  }

  toHaveProperty(path: string, value?: any): void {
    const keys = path.split('.');
    let current = this.actual;

    for (const key of keys) {
      if (current == null || !Object.prototype.hasOwnProperty.call(current, key)) {
        this.assert(false, 'toHaveProperty', path, `Expected object to have property "${path}"`);
        return;
      }
      current = current[key];
    }

    if (value !== undefined) {
      const passed = deepEqual(current, value);
      this.assert(
        passed,
        'toHaveProperty',
        value,
        `Expected property "${path}" to have value ${this.format(value)}, got ${this.format(current)}`
      );
    } else {
      this.assert(true, 'toHaveProperty', path, '');
    }
  }

  toMatchObject(expected: object): void {
    if (typeof this.actual !== 'object' || this.actual === null) {
      throw new AssertionError('Expected value to be an object');
    }

    const passed = Object.keys(expected).every(key =>
      deepEqual(this.actual[key], (expected as any)[key])
    );

    this.assert(
      passed,
      'toMatchObject',
      expected,
      `Expected object to match ${this.format(expected)}`
    );
  }

  // DOM-specific matchers
  toBeInTheDocument(): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = isInDocument(this.actual);
    this.assert(
      passed,
      'toBeInTheDocument',
      'in document',
      'Expected element to be in the document'
    );
  }

  toBeVisible(): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = isVisible(this.actual);
    this.assert(passed, 'toBeVisible', 'visible', 'Expected element to be visible');
  }

  toBeDisabled(): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = (this.actual as any).disabled === true || this.actual.hasAttribute('disabled');
    this.assert(passed, 'toBeDisabled', 'disabled', 'Expected element to be disabled');
  }

  toBeEnabled(): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = (this.actual as any).disabled !== true && !this.actual.hasAttribute('disabled');
    this.assert(passed, 'toBeEnabled', 'enabled', 'Expected element to be enabled');
  }

  toBeChecked(): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = (this.actual as any).checked === true;
    this.assert(passed, 'toBeChecked', 'checked', 'Expected element to be checked');
  }

  toHaveClass(className: string): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const passed = this.actual.classList.contains(className);
    this.assert(passed, 'toHaveClass', className, `Expected element to have class "${className}"`);
  }

  toHaveAttribute(name: string, value?: string): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    if (value === undefined) {
      const passed = this.actual.hasAttribute(name);
      this.assert(
        passed,
        'toHaveAttribute',
        `attribute "${name}"`,
        `Expected element to have attribute "${name}"`
      );
    } else {
      const passed = this.actual.getAttribute(name) === value;
      this.assert(
        passed,
        'toHaveAttribute',
        `${name}="${value}"`,
        `Expected element to have attribute "${name}" with value "${value}"`
      );
    }
  }

  toHaveTextContent(text: string | RegExp): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const textContent = this.actual.textContent || '';
    const passed = typeof text === 'string' ? textContent === text : text.test(textContent);

    this.assert(
      passed,
      'toHaveTextContent',
      text,
      `Expected element to have text content "${text}"`
    );
  }

  toHaveValue(value: any): void {
    if (!(this.actual instanceof Element)) {
      throw new AssertionError('Expected value to be a DOM element');
    }

    const actualValue = (this.actual as any).value;
    const passed = actualValue === value;
    this.assert(
      passed,
      'toHaveValue',
      value,
      `Expected element to have value "${value}", got "${actualValue}"`
    );
  }

  // HyperScript-specific matchers
  toHaveCompiledScript(): void {
    // Implementation would depend on HyperFixi API
    const passed = this.actual && typeof this.actual._hyperscript !== 'undefined';
    this.assert(
      passed,
      'toHaveCompiledScript',
      'compiled script',
      'Expected element to have compiled hyperscript'
    );
  }

  toHaveExecutedScript(): void {
    // Implementation would depend on HyperFixi API
    const passed = this.actual && this.actual._hyperscriptExecuted === true;
    this.assert(
      passed,
      'toHaveExecutedScript',
      'executed script',
      'Expected hyperscript to have executed'
    );
  }

  toHaveTriggeredEvent(eventType: string): void {
    // Implementation would depend on event tracking
    const passed =
      this.actual &&
      this.actual._triggeredEvents &&
      this.actual._triggeredEvents.includes(eventType);
    this.assert(
      passed,
      'toHaveTriggeredEvent',
      eventType,
      `Expected event "${eventType}" to have been triggered`
    );
  }

  toHaveUpdatedElement(): void {
    // Implementation would depend on DOM change tracking
    const passed = this.actual && this.actual._wasUpdated === true;
    this.assert(
      passed,
      'toHaveUpdatedElement',
      'updated element',
      'Expected element to have been updated'
    );
  }

  private assert(passed: boolean, operator: string, expected: any, message: string): void {
    if (this.isNot) {
      passed = !passed;
      message = message.replace('Expected', 'Expected NOT');
    }

    if (!passed) {
      const error = new AssertionError(message, expected, this.actual, operator);

      if (typeof this.actual === 'object' && typeof expected === 'object') {
        error.message += '\n\nDiff:\n' + generateDiff(this.actual, expected);
      }

      throw error;
    }
  }

  private format(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return value.name || 'function';
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (Array.isArray(value)) return `[${value.map(v => this.format(v)).join(', ')}]`;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private isPromise(value: any): boolean {
    return value && typeof value.then === 'function';
  }
}

/**
 * Create expect API
 */
export function createExpectAPI(): ExpectAPI {
  return function expect(actual: any): ExpectMatcher {
    return new ExpectMatcherImpl(actual);
  };
}

/**
 * Assert API implementation
 */
class AssertAPIImpl implements AssertAPI {
  ok(value: any, message?: string): void {
    if (!value) {
      throw new AssertionError(message || `Expected ${value} to be truthy`);
    }
  }

  equal(actual: any, expected: any, message?: string): void {
    if (actual != expected) {
      throw new AssertionError(
        message || `Expected ${actual} to equal ${expected}`,
        expected,
        actual,
        'equal'
      );
    }
  }

  strictEqual(actual: any, expected: any, message?: string): void {
    if (actual !== expected) {
      throw new AssertionError(
        message || `Expected ${actual} to strictly equal ${expected}`,
        expected,
        actual,
        'strictEqual'
      );
    }
  }

  notEqual(actual: any, expected: any, message?: string): void {
    if (actual == expected) {
      throw new AssertionError(
        message || `Expected ${actual} to not equal ${expected}`,
        expected,
        actual,
        'notEqual'
      );
    }
  }

  notStrictEqual(actual: any, expected: any, message?: string): void {
    if (actual === expected) {
      throw new AssertionError(
        message || `Expected ${actual} to not strictly equal ${expected}`,
        expected,
        actual,
        'notStrictEqual'
      );
    }
  }

  throws(fn: () => void, error?: any, message?: string): void {
    let thrown = false;
    let actualError: any;

    try {
      fn();
    } catch (e) {
      thrown = true;
      actualError = e;
    }

    if (!thrown) {
      throw new AssertionError(message || 'Expected function to throw');
    }

    if (error && !this.matchesError(actualError, error)) {
      throw new AssertionError(
        message || `Expected function to throw ${error}, but got ${actualError}`,
        error,
        actualError,
        'throws'
      );
    }
  }

  doesNotThrow(fn: () => void, message?: string): void {
    try {
      fn();
    } catch (e) {
      throw new AssertionError(
        message || `Expected function to not throw, but got: ${e}`,
        'no error',
        e,
        'doesNotThrow'
      );
    }
  }

  ifError(value: any): void {
    if (value) {
      throw value;
    }
  }

  async rejects(promise: Promise<any>, error?: any, message?: string): Promise<void> {
    let rejected = false;
    let actualError: any;

    try {
      await promise;
    } catch (e) {
      rejected = true;
      actualError = e;
    }

    if (!rejected) {
      throw new AssertionError(message || 'Expected promise to reject');
    }

    if (error && !this.matchesError(actualError, error)) {
      throw new AssertionError(
        message || `Expected promise to reject with ${error}, but got ${actualError}`,
        error,
        actualError,
        'rejects'
      );
    }
  }

  async doesNotReject(promise: Promise<any>, message?: string): Promise<void> {
    try {
      await promise;
    } catch (e) {
      throw new AssertionError(
        message || `Expected promise to not reject, but got: ${e}`,
        'no error',
        e,
        'doesNotReject'
      );
    }
  }

  elementExists(selector: string, message?: string): void {
    if (typeof document === 'undefined') {
      throw new AssertionError('DOM not available');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new AssertionError(message || `Expected element with selector "${selector}" to exist`);
    }
  }

  elementVisible(selector: string, message?: string): void {
    if (typeof document === 'undefined') {
      throw new AssertionError('DOM not available');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new AssertionError(`Element with selector "${selector}" does not exist`);
    }

    if (!isVisible(element)) {
      throw new AssertionError(
        message || `Expected element with selector "${selector}" to be visible`
      );
    }
  }

  elementHasClass(selector: string, className: string, message?: string): void {
    if (typeof document === 'undefined') {
      throw new AssertionError('DOM not available');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new AssertionError(`Element with selector "${selector}" does not exist`);
    }

    if (!element.classList.contains(className)) {
      throw new AssertionError(
        message || `Expected element with selector "${selector}" to have class "${className}"`
      );
    }
  }

  elementHasText(selector: string, text: string, message?: string): void {
    if (typeof document === 'undefined') {
      throw new AssertionError('DOM not available');
    }

    const element = document.querySelector(selector);
    if (!element) {
      throw new AssertionError(`Element with selector "${selector}" does not exist`);
    }

    if (element.textContent !== text) {
      throw new AssertionError(
        message || `Expected element with selector "${selector}" to have text "${text}"`
      );
    }
  }

  scriptCompiled(script: string, message?: string): void {
    // Implementation would depend on HyperFixi API
    throw new AssertionError(message || 'Script compilation assertion not implemented');
  }

  scriptExecuted(script: string, message?: string): void {
    // Implementation would depend on HyperFixi API
    throw new AssertionError(message || 'Script execution assertion not implemented');
  }

  eventTriggered(eventType: string, message?: string): void {
    // Implementation would depend on event tracking
    throw new AssertionError(message || 'Event trigger assertion not implemented');
  }

  private matchesError(actual: any, expected: any): boolean {
    if (typeof expected === 'string') {
      return actual.message === expected;
    }
    if (expected instanceof RegExp) {
      return expected.test(actual.message);
    }
    if (typeof expected === 'function') {
      return actual instanceof expected;
    }
    return actual === expected;
  }
}

/**
 * Create assert API
 */
export function createAssertAPI(): AssertAPI {
  return new AssertAPIImpl();
}
