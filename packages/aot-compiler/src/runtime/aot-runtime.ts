/**
 * AOT Runtime
 *
 * Minimal runtime for AOT-compiled LokaScript/hyperscript.
 * Provides only the utilities that cannot be inlined at compile time.
 *
 * Target size: ~3KB minified
 */

import type { ExecutionContext } from '../types/aot-types.js';

// =============================================================================
// CONTROL FLOW SIGNALS
// =============================================================================

/** Signal to halt execution and prevent default */
export const HALT = Symbol('halt');

/** Signal to exit current handler */
export const EXIT = Symbol('exit');

// =============================================================================
// GLOBAL STATE
// =============================================================================

/** Global variable store (for ::varName syntax) */
export const globals = new Map<string, unknown>();

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

/**
 * Create a new execution context for a handler.
 */
export function createContext(event: Event | null, me: Element): ExecutionContext {
  return {
    me,
    you: null,
    it: null,
    result: null,
    event,
    locals: new Map(),
    halted: false,
    returned: false,
  };
}

/**
 * Resolve a property from an element or context.
 */
export function resolve(target: unknown, property: string): unknown {
  if (target === null || target === undefined) {
    return undefined;
  }

  // Element property access
  if (target instanceof Element) {
    // Check as property first
    if (property in target) {
      return (target as unknown as Record<string, unknown>)[property];
    }
    // Check as attribute
    return target.getAttribute(property);
  }

  // Object property access
  if (typeof target === 'object') {
    return (target as Record<string, unknown>)[property];
  }

  return undefined;
}

// =============================================================================
// DOM MANIPULATION HELPERS
// =============================================================================

/**
 * Toggle a class or attribute on an element.
 */
export function toggle(target: unknown, element: Element): void {
  if (typeof target === 'string') {
    if (target.startsWith('.')) {
      element.classList.toggle(target.slice(1));
    } else if (target.startsWith('@')) {
      toggleAttr(element, target.slice(1));
    } else {
      // Assume class name without dot
      element.classList.toggle(target);
    }
  }
}

/**
 * Toggle a boolean attribute.
 */
export function toggleAttr(element: Element, attr: string): void {
  if (element.hasAttribute(attr)) {
    element.removeAttribute(attr);
  } else {
    element.setAttribute(attr, '');
  }
}

/**
 * Add a class to an element.
 */
export function addClass(element: Element, className: string): void {
  element.classList.add(className.startsWith('.') ? className.slice(1) : className);
}

/**
 * Remove a class from an element.
 */
export function removeClass(element: Element, className: string): void {
  element.classList.remove(className.startsWith('.') ? className.slice(1) : className);
}

/**
 * Get a property from an element (property first, then attribute).
 */
export function getProp(element: Element, property: string): unknown {
  // Try as property first
  if (property in element) {
    return (element as unknown as Record<string, unknown>)[property];
  }
  // Fall back to attribute
  return element.getAttribute(property);
}

/**
 * Collect form values from an element as FormData.
 */
export function getValues(element: Element): FormData {
  if (element instanceof HTMLFormElement) return new FormData(element);
  const fd = new FormData();
  element.querySelectorAll('input, select, textarea').forEach((input: Element) => {
    const name = input.getAttribute('name');
    if (name && 'value' in input) fd.append(name, (input as HTMLInputElement).value);
  });
  return fd;
}

/**
 * Set a property on an element (property first, then attribute).
 */
export function setProp(element: Element, property: string, value: unknown): void {
  if (property in element) {
    (element as unknown as Record<string, unknown>)[property] = value;
  } else {
    element.setAttribute(property, String(value));
  }
}

/**
 * Put content into an element.
 */
export function put(
  content: unknown,
  target: Element,
  position: 'into' | 'before' | 'after' | 'start' | 'end' = 'into'
): void {
  const html = String(content);

  switch (position) {
    case 'into':
      target.innerHTML = html;
      break;
    case 'before':
      target.insertAdjacentHTML('beforebegin', html);
      break;
    case 'after':
      target.insertAdjacentHTML('afterend', html);
      break;
    case 'start':
      target.insertAdjacentHTML('afterbegin', html);
      break;
    case 'end':
      target.insertAdjacentHTML('beforeend', html);
      break;
  }
}

/**
 * Show an element.
 */
export function show(element: Element): void {
  (element as HTMLElement).style.display = '';
}

/**
 * Hide an element.
 */
export function hide(element: Element): void {
  (element as HTMLElement).style.display = 'none';
}

// =============================================================================
// COLLECTION HELPERS
// =============================================================================

/**
 * Check if a container contains an item.
 */
export function contains(container: unknown, item: unknown): boolean {
  if (typeof container === 'string') {
    return container.includes(String(item));
  }
  if (Array.isArray(container)) {
    return container.includes(item);
  }
  if (container instanceof Element) {
    return container.contains(item as Node);
  }
  if (container instanceof NodeList || container instanceof HTMLCollection) {
    return Array.from(container).includes(item as Node);
  }
  return false;
}

/**
 * Check if an element matches a selector.
 */
export function matches(element: Element, selector: string): boolean {
  return element.matches(selector);
}

/**
 * Convert a value to an array.
 */
export function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value instanceof NodeList || value instanceof HTMLCollection) {
    return Array.from(value);
  }
  if (value === null || value === undefined) {
    return [];
  }
  return [value];
}

/**
 * Get the first item from a collection.
 */
export function first(collection: unknown): unknown {
  const arr = toArray(collection);
  return arr[0];
}

/**
 * Get the last item from a collection.
 */
export function last(collection: unknown): unknown {
  const arr = toArray(collection);
  return arr[arr.length - 1];
}

/**
 * Get a random item from a collection.
 */
export function random(collection: unknown): unknown {
  const arr = toArray(collection);
  return arr[Math.floor(Math.random() * arr.length)];
}

// =============================================================================
// TIMING HELPERS
// =============================================================================

/**
 * Create a debounced function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Create a throttled function.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let last = 0;
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Wait for a duration.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for the next animation frame.
 */
export function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

// =============================================================================
// EVENT HELPERS
// =============================================================================

/**
 * Set up event delegation.
 */
export function delegate(
  container: Element,
  event: string,
  selector: string,
  handler: (e: Event) => void,
  options?: AddEventListenerOptions
): () => void {
  const delegatedHandler = (e: Event) => {
    const target = e.target as Element;
    if (target?.matches?.(selector)) {
      handler.call(target, e);
    } else {
      // Check ancestors
      const matched = target?.closest?.(selector);
      if (matched && container.contains(matched)) {
        handler.call(matched, e);
      }
    }
  };
  container.addEventListener(event, delegatedHandler, options);
  return () => container.removeEventListener(event, delegatedHandler, options);
}

/**
 * Dispatch a custom event.
 */
export function send(
  element: Element,
  eventName: string,
  detail?: unknown,
  options?: { bubbles?: boolean; cancelable?: boolean }
): boolean {
  const event = new CustomEvent(eventName, {
    detail,
    bubbles: options?.bubbles ?? true,
    cancelable: options?.cancelable ?? true,
  });
  return element.dispatchEvent(event);
}

// =============================================================================
// FETCH HELPERS
// =============================================================================

/**
 * Fetch JSON from a URL.
 */
export async function fetchJSON(url: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch text from a URL.
 */
export async function fetchText(url: string, options?: RequestInit): Promise<string> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Fetch HTML and parse it.
 */
export async function fetchHTML(url: string, options?: RequestInit): Promise<Document> {
  const text = await fetchText(url, options);
  const parser = new DOMParser();
  return parser.parseFromString(text, 'text/html');
}

// =============================================================================
// SWAP / MORPH HELPERS
// =============================================================================

/**
 * Minimal DOM morph: updates target's innerHTML while attempting to preserve
 * matching child elements (by id or tag+index) to reduce layout thrash.
 */
export function morph(target: Element, newContent: string | Element): void {
  const html = typeof newContent === 'string' ? newContent : newContent.outerHTML;
  // Simple morph: replace innerHTML. A full morphing algorithm (like idiomorph)
  // is too large for the AOT runtime. Users needing full morph can import it separately.
  target.innerHTML = html;
}

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Animate a CSS property using transitions.
 * Returns a promise that resolves when the transition completes.
 */
export async function transition(
  element: Element,
  property: string,
  value: string,
  duration: number = 300,
  timing: string = 'ease'
): Promise<void> {
  const el = element as HTMLElement;
  const originalTransition = el.style.transition;
  el.style.transition = `${property} ${duration}ms ${timing}`;
  el.style.setProperty(property, value);

  return new Promise<void>(resolve => {
    const cleanup = () => {
      el.style.transition = originalTransition;
      resolve();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === property) {
        el.removeEventListener('transitionend', onEnd);
        cleanup();
      }
    };
    el.addEventListener('transitionend', onEnd);
    // Safety timeout in case transitionend doesn't fire
    setTimeout(cleanup, duration + 50);
  });
}

/**
 * Measure a property on an element.
 */
export function measure(element: Element, property: string): number {
  const el = element as HTMLElement;
  const rect = el.getBoundingClientRect();
  const p = property.toLowerCase();

  const measurements: Record<string, () => number> = {
    width: () => rect.width,
    height: () => rect.height,
    top: () => rect.top,
    left: () => rect.left,
    right: () => rect.right,
    bottom: () => rect.bottom,
    x: () => el.offsetLeft,
    y: () => el.offsetTop,
  };

  if (measurements[p]) return measurements[p]();

  // Try computed style
  const cssVal = getComputedStyle(el).getPropertyValue(property);
  const num = parseFloat(cssVal);
  return isNaN(num) ? 0 : num;
}

/**
 * Wait for CSS transitions/animations to settle on an element.
 */
export async function settle(element: Element, timeout: number = 5000): Promise<void> {
  return new Promise<void>(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      element.removeEventListener('transitionend', done);
      element.removeEventListener('animationend', done);
      resolve();
    };

    element.addEventListener('transitionend', done, { once: true });
    element.addEventListener('animationend', done, { once: true });

    // Also settle after double rAF if no animations detected
    requestAnimationFrame(() => requestAnimationFrame(done));

    // Safety timeout
    setTimeout(done, timeout);
  });
}

// =============================================================================
// BEHAVIOR HELPERS
// =============================================================================

/** Registry for AOT-compiled behaviors */
const behaviorRegistry = new Map<string, (el: Element, params?: Record<string, unknown>) => void>();

/**
 * Register a behavior for AOT-compiled code.
 */
export function registerBehavior(
  name: string,
  init: (el: Element, params?: Record<string, unknown>) => void
): void {
  behaviorRegistry.set(name, init);
}

/**
 * Install a behavior on an element.
 */
export function installBehavior(
  element: Element,
  name: string,
  params?: Record<string, unknown>
): void {
  const init = behaviorRegistry.get(name);
  if (init) {
    init(element, params);
  } else {
    console.warn(`[AOT] Behavior '${name}' not registered. Use registerBehavior() first.`);
  }
}

// =============================================================================
// TEMPLATE HELPERS
// =============================================================================

/**
 * Simple template renderer with ${variable} interpolation.
 */
export function render(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, key: string) => {
    const trimmed = key.trim();
    return trimmed in variables ? String(variables[trimmed]) : '';
  });
}

// =============================================================================
// TYPE CONVERSION HELPERS
// =============================================================================

/**
 * Convert a value to a specific type.
 */
export function convert(value: unknown, type: string): unknown {
  switch (type.toLowerCase()) {
    case 'string':
    case 'text':
      return String(value);
    case 'number':
    case 'int':
    case 'integer':
      return Number(value);
    case 'float':
      return parseFloat(String(value));
    case 'boolean':
    case 'bool':
      return Boolean(value);
    case 'json':
      return typeof value === 'string' ? JSON.parse(value) : value;
    case 'array':
      return toArray(value);
    case 'date':
      return new Date(value as string | number);
    default:
      return value;
  }
}

// =============================================================================
// DOM QUERY HELPERS
// =============================================================================

/**
 * Query a single element.
 */
export function $(selector: string, context: Element | Document = document): Element | null {
  return context.querySelector(selector);
}

/**
 * Query multiple elements.
 */
export function $$(selector: string, context: Element | Document = document): Element[] {
  return Array.from(context.querySelectorAll(selector));
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Bind all AOT-compiled handlers to the DOM.
 * This is called automatically when the compiled bundle loads.
 */
export function bindAll(
  handlers: Array<{
    selector: string;
    event: string;
    handler: (e: Event) => void;
    options?: AddEventListenerOptions;
  }>
): () => void {
  const cleanups: Array<() => void> = [];

  for (const { selector, event, handler, options } of handlers) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      el.addEventListener(event, handler, options);
      cleanups.push(() => el.removeEventListener(event, handler, options));
    }
  }

  return () => cleanups.forEach(cleanup => cleanup());
}

/**
 * Initialize when DOM is ready.
 */
export function ready(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Control flow
  HALT,
  EXIT,

  // Context
  createContext,
  resolve,
  globals,

  // DOM manipulation
  toggle,
  toggleAttr,
  addClass,
  removeClass,
  getProp,
  setProp,
  put,
  show,
  hide,
  morph,

  // Animation
  transition,
  measure,
  settle,

  // Collections
  contains,
  matches,
  toArray,
  first,
  last,
  random,

  // Timing
  debounce,
  throttle,
  wait,
  nextFrame,

  // Events
  delegate,
  send,

  // Fetch
  fetchJSON,
  fetchText,
  fetchHTML,

  // Behaviors
  registerBehavior,
  installBehavior,

  // Templates
  render,

  // Type conversion
  convert,

  // DOM queries
  $,
  $$,

  // Initialization
  bindAll,
  ready,
};
