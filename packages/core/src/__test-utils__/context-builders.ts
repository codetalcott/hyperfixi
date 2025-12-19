/**
 * Type-safe context builders for testing
 * Provides fluent builders to create typed execution contexts
 */

import type { TypedExecutionContext } from '../types/base-types'
import type { TestExpressionContext } from '../test-utilities'

/**
 * Options for creating test execution context
 */
export interface TestContextOptions {
  element?: Element
  me?: Element
  you?: Element
  it?: unknown
  result?: unknown
  target?: EventTarget
  event?: Event
  globals?: Record<string, unknown>
  locals?: Map<string, unknown>
  meta?: Map<string, unknown> | Record<string, unknown>
  [key: string]: unknown
}

/**
 * Fluent builder for creating test execution contexts
 */
export class TestContextBuilder {
  private options: TestContextOptions = {}

  /**
   * Set the primary element
   */
  withElement(element: Element): this {
    this.options.element = element
    this.options.me = element
    return this
  }

  /**
   * Set the 'me' reference
   */
  withMe(me: Element): this {
    this.options.me = me
    return this
  }

  /**
   * Set the 'you' reference (event target)
   */
  withYou(you: Element): this {
    this.options.you = you
    return this
  }

  /**
   * Set the 'it' reference (last result)
   */
  withIt(it: unknown): this {
    this.options.it = it
    return this
  }

  /**
   * Set the result value
   */
  withResult(result: unknown): this {
    this.options.result = result
    return this
  }

  /**
   * Set the event target
   */
  withTarget(target: EventTarget): this {
    this.options.target = target
    return this
  }

  /**
   * Set the event
   */
  withEvent(event: Event): this {
    this.options.event = event
    this.options.target = event.target || undefined
    return this
  }

  /**
   * Add a global variable
   */
  withGlobal<T>(key: string, value: T): this {
    if (!this.options.globals) {
      this.options.globals = {}
    }
    this.options.globals[key] = value
    return this
  }

  /**
   * Add multiple global variables
   */
  withGlobals(globals: Record<string, unknown>): this {
    this.options.globals = {
      ...this.options.globals,
      ...globals,
    }
    return this
  }

  /**
   * Add a local variable
   */
  withLocal<T>(key: string, value: T): this {
    if (!this.options.locals) {
      this.options.locals = new Map()
    }
    this.options.locals.set(key, value)
    return this
  }

  /**
   * Add multiple local variables
   */
  withLocals(locals: Record<string, unknown>): this {
    if (!this.options.locals) {
      this.options.locals = new Map()
    }
    for (const [key, value] of Object.entries(locals)) {
      this.options.locals.set(key, value)
    }
    return this
  }

  /**
   * Add meta variable
   */
  withMeta(key: string, value: unknown): this {
    if (!this.options.meta) {
      this.options.meta = new Map()
    }
    if (this.options.meta instanceof Map) {
      this.options.meta.set(key, value)
    } else {
      this.options.meta[key] = value
    }
    return this
  }

  /**
   * Add arbitrary property
   */
  withProperty<T>(key: string, value: T): this {
    this.options[key] = value
    return this
  }

  /**
   * Build the context
   */
  build(): TestExpressionContext {
    return {
      me: this.options.me,
      you: this.options.you,
      it: this.options.it,
      result: this.options.result,
      target: this.options.target,
      event: this.options.event,
      meta: this.options.meta,
      ...this.options.globals,
      ...this.options,
    } as TestExpressionContext
  }
}

/**
 * Create a basic test execution context
 */
export function createTestContext(
  options: TestContextOptions = {}
): TestExpressionContext {
  return new TestContextBuilder()
    .withGlobals(options.globals || {})
    .withProperty('element', options.element)
    .withProperty('me', options.me || options.element)
    .withProperty('you', options.you)
    .withProperty('it', options.it)
    .withProperty('result', options.result)
    .withProperty('target', options.target)
    .withProperty('event', options.event)
    .withProperty('locals', options.locals)
    .withProperty('meta', options.meta)
    .build()
}

/**
 * Create a minimal test context with just an element
 */
export function createMinimalContext(element?: Element): TestExpressionContext {
  return new TestContextBuilder()
    .withElement(element || createMockElement())
    .build()
}

/**
 * Create a mock element for testing
 */
export function createMockElement(
  tagName = 'div',
  attributes: Record<string, string> = {}
): Element {
  const element = {
    tagName: tagName.toUpperCase(),
    nodeName: tagName.toUpperCase(),
    nodeType: 1,
    attributes: new Map(Object.entries(attributes)),
    classList: {
      classes: new Set<string>(),
      add(...tokens: string[]) {
        tokens.forEach(t => this.classes.add(t))
      },
      remove(...tokens: string[]) {
        tokens.forEach(t => this.classes.delete(t))
      },
      toggle(token: string) {
        if (this.classes.has(token)) {
          this.classes.delete(token)
          return false
        } else {
          this.classes.add(token)
          return true
        }
      },
      contains(token: string) {
        return this.classes.has(token)
      },
    },
    getAttribute(name: string) {
      return this.attributes.get(name) || null
    },
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value)
    },
    removeAttribute(name: string) {
      this.attributes.delete(name)
    },
    hasAttribute(name: string) {
      return this.attributes.has(name)
    },
  } as unknown as Element

  return element
}

/**
 * Create a mock event
 */
export function createMockEvent(
  type: string,
  options: {
    target?: EventTarget
    currentTarget?: EventTarget
    bubbles?: boolean
    cancelable?: boolean
    [key: string]: unknown
  } = {}
): Event {
  return {
    type,
    target: options.target || null,
    currentTarget: options.currentTarget || null,
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? true,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {},
    stopImmediatePropagation() {},
    ...options,
  } as unknown as Event
}
