// @vitest-environment happy-dom

/**
 * AOT Runtime Tests
 *
 * Tests for the minimal runtime helpers that compiled code depends on.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HALT,
  EXIT,
  globals,
  createContext,
  resolve,
  toggle,
  toggleAttr,
  addClass,
  removeClass,
  getProp,
  setProp,
  put,
  show,
  hide,
  contains,
  toArray,
  first,
  last,
  debounce,
  throttle,
  wait,
  convert,
  send,
  delegate,
  fetchJSON,
  fetchText,
  fetchHTML,
  ready,
  bindAll,
} from './aot-runtime.js';

// =============================================================================
// CONTROL FLOW & GLOBALS
// =============================================================================

describe('control flow signals', () => {
  it('HALT and EXIT are distinct Symbols', () => {
    expect(typeof HALT).toBe('symbol');
    expect(typeof EXIT).toBe('symbol');
    expect(HALT).not.toBe(EXIT);
  });

  it('globals is a Map that supports get/set', () => {
    globals.clear();
    expect(globals.size).toBe(0);

    globals.set('x', 42);
    expect(globals.get('x')).toBe(42);

    globals.clear();
  });
});

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

describe('createContext', () => {
  it('returns object with me, event, and empty locals', () => {
    const el = document.createElement('div');
    const event = new Event('click');
    const ctx = createContext(event, el);

    expect(ctx.me).toBe(el);
    expect(ctx.event).toBe(event);
    expect(ctx.locals).toBeInstanceOf(Map);
    expect(ctx.locals.size).toBe(0);
  });

  it('initializes it, result, you as null', () => {
    const ctx = createContext(null, document.createElement('div'));

    expect(ctx.it).toBeNull();
    expect(ctx.result).toBeNull();
    expect(ctx.you).toBeNull();
  });

  it('initializes halted and returned as false', () => {
    const ctx = createContext(null, document.createElement('div'));

    expect(ctx.halted).toBe(false);
    expect(ctx.returned).toBe(false);
  });
});

describe('resolve', () => {
  it('returns undefined for null/undefined target', () => {
    expect(resolve(null, 'foo')).toBeUndefined();
    expect(resolve(undefined, 'bar')).toBeUndefined();
  });

  it('reads element property first', () => {
    const el = document.createElement('input');
    (el as HTMLInputElement).value = 'hello';
    expect(resolve(el, 'value')).toBe('hello');
  });

  it('falls back to attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-custom', '42');
    expect(resolve(el, 'data-custom')).toBe('42');
  });

  it('reads plain object property', () => {
    expect(resolve({ x: 10 }, 'x')).toBe(10);
  });
});

// =============================================================================
// DOM MANIPULATION
// =============================================================================

describe('toggle', () => {
  it('toggles class with dot prefix', () => {
    const el = document.createElement('div');
    toggle('.active', el);
    expect(el.classList.contains('active')).toBe(true);
    toggle('.active', el);
    expect(el.classList.contains('active')).toBe(false);
  });

  it('toggles class without dot prefix', () => {
    const el = document.createElement('div');
    toggle('active', el);
    expect(el.classList.contains('active')).toBe(true);
  });

  it('toggles attribute with @ prefix', () => {
    const el = document.createElement('div');
    toggle('@disabled', el);
    expect(el.hasAttribute('disabled')).toBe(true);
    toggle('@disabled', el);
    expect(el.hasAttribute('disabled')).toBe(false);
  });
});

describe('toggleAttr', () => {
  it('adds attribute when absent', () => {
    const el = document.createElement('div');
    toggleAttr(el, 'hidden');
    expect(el.hasAttribute('hidden')).toBe(true);
  });

  it('removes attribute when present', () => {
    const el = document.createElement('div');
    el.setAttribute('hidden', '');
    toggleAttr(el, 'hidden');
    expect(el.hasAttribute('hidden')).toBe(false);
  });
});

describe('addClass / removeClass', () => {
  it('adds class stripping dot prefix', () => {
    const el = document.createElement('div');
    addClass(el, '.highlight');
    expect(el.classList.contains('highlight')).toBe(true);
  });

  it('adds class without dot prefix', () => {
    const el = document.createElement('div');
    addClass(el, 'highlight');
    expect(el.classList.contains('highlight')).toBe(true);
  });

  it('removes class stripping dot prefix', () => {
    const el = document.createElement('div');
    el.classList.add('highlight');
    removeClass(el, '.highlight');
    expect(el.classList.contains('highlight')).toBe(false);
  });
});

describe('getProp / setProp', () => {
  it('reads property first, attribute second', () => {
    const el = document.createElement('input') as HTMLInputElement;
    el.value = 'test';
    expect(getProp(el, 'value')).toBe('test');
  });

  it('falls back to attribute for unknown properties', () => {
    const el = document.createElement('div');
    el.setAttribute('data-x', 'hello');
    expect(getProp(el, 'data-x')).toBe('hello');
  });

  it('sets property first, attribute fallback', () => {
    const el = document.createElement('input') as HTMLInputElement;
    setProp(el, 'value', 'updated');
    expect(el.value).toBe('updated');
  });

  it('sets attribute for unknown properties', () => {
    const el = document.createElement('div');
    setProp(el, 'data-x', 'world');
    expect(el.getAttribute('data-x')).toBe('world');
  });
});

describe('put', () => {
  it('puts content into element (innerHTML)', () => {
    const el = document.createElement('div');
    put('<b>hi</b>', el, 'into');
    expect(el.innerHTML).toBe('<b>hi</b>');
  });

  it('defaults to "into" position', () => {
    const el = document.createElement('div');
    put('hello', el);
    expect(el.innerHTML).toBe('hello');
  });

  it('inserts before element', () => {
    const container = document.createElement('div');
    const child = document.createElement('span');
    container.appendChild(child);
    put('<b>before</b>', child, 'before');
    expect(container.innerHTML).toContain('<b>before</b>');
  });

  it('inserts after element', () => {
    const container = document.createElement('div');
    const child = document.createElement('span');
    container.appendChild(child);
    put('<b>after</b>', child, 'after');
    expect(container.innerHTML).toContain('<b>after</b>');
  });
});

describe('show / hide', () => {
  it('show sets display to empty string', () => {
    const el = document.createElement('div') as HTMLElement;
    el.style.display = 'none';
    show(el);
    expect(el.style.display).toBe('');
  });

  it('hide sets display to none', () => {
    const el = document.createElement('div') as HTMLElement;
    hide(el);
    expect(el.style.display).toBe('none');
  });
});

// =============================================================================
// COLLECTIONS
// =============================================================================

describe('toArray', () => {
  it('passes arrays through', () => {
    const arr = [1, 2, 3];
    expect(toArray(arr)).toBe(arr);
  });

  it('wraps single value', () => {
    expect(toArray(42)).toEqual([42]);
  });

  it('returns empty array for null/undefined', () => {
    expect(toArray(null)).toEqual([]);
    expect(toArray(undefined)).toEqual([]);
  });
});

describe('first / last', () => {
  it('first returns first element', () => {
    expect(first([10, 20, 30])).toBe(10);
  });

  it('last returns last element', () => {
    expect(last([10, 20, 30])).toBe(30);
  });

  it('first returns undefined for empty', () => {
    expect(first([])).toBeUndefined();
  });
});

describe('contains', () => {
  it('string includes', () => {
    expect(contains('hello world', 'world')).toBe(true);
    expect(contains('hello', 'xyz')).toBe(false);
  });

  it('array includes', () => {
    expect(contains([1, 2, 3], 2)).toBe(true);
    expect(contains([1, 2, 3], 4)).toBe(false);
  });
});

// =============================================================================
// TIMING
// =============================================================================

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('delays execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets timer on subsequent calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    vi.advanceTimersByTime(50);
    debounced(); // reset
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('calls immediately on first invocation', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('suppresses calls within throttle window', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('wait', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves after specified ms', async () => {
    const p = wait(500);
    vi.advanceTimersByTime(500);
    await p; // should resolve
  });
});

// =============================================================================
// TYPE CONVERSION
// =============================================================================

describe('convert', () => {
  it('converts to string', () => {
    expect(convert(42, 'string')).toBe('42');
    expect(convert(true, 'text')).toBe('true');
  });

  it('converts to number', () => {
    expect(convert('42', 'number')).toBe(42);
    expect(convert('3', 'int')).toBe(3);
  });

  it('converts to boolean', () => {
    expect(convert(1, 'boolean')).toBe(true);
    expect(convert(0, 'bool')).toBe(false);
  });

  it('parses JSON string', () => {
    expect(convert('{"a":1}', 'json')).toEqual({ a: 1 });
  });

  it('returns value unchanged for unknown type', () => {
    const obj = { x: 1 };
    expect(convert(obj, 'unknown_type')).toBe(obj);
  });
});

// =============================================================================
// EVENTS
// =============================================================================

describe('send', () => {
  it('dispatches CustomEvent with detail', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('myEvent', e => {
      received = e as CustomEvent;
    });

    send(el, 'myEvent', { foo: 'bar' });

    expect(received).not.toBeNull();
    expect(received!.detail).toEqual({ foo: 'bar' });
  });

  it('defaults bubbles and cancelable to true', () => {
    const el = document.createElement('div');
    let received: CustomEvent | null = null;
    el.addEventListener('test', e => {
      received = e as CustomEvent;
    });

    send(el, 'test');

    expect(received!.bubbles).toBe(true);
    expect(received!.cancelable).toBe(true);
  });
});

describe('delegate', () => {
  it('calls handler when target matches selector', () => {
    const container = document.createElement('div');
    const btn = document.createElement('button');
    btn.classList.add('item');
    container.appendChild(btn);

    const handler = vi.fn();
    delegate(container, 'click', '.item', handler);

    btn.dispatchEvent(new Event('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('returns cleanup function', () => {
    const container = document.createElement('div');
    const handler = vi.fn();
    const cleanup = delegate(container, 'click', '.x', handler);

    expect(typeof cleanup).toBe('function');
    cleanup();
    // After cleanup, handler should not be called
    container.dispatchEvent(new Event('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });
});

// =============================================================================
// FETCH HELPERS
// =============================================================================

describe('fetchJSON', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls fetch and returns parsed JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: 42 }), { status: 200 })
    );

    const result = await fetchJSON('/api/data');
    expect(result).toEqual({ data: 42 });
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/data', undefined);
  });

  it('throws on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' })
    );

    await expect(fetchJSON('/missing')).rejects.toThrow('HTTP 404');
  });
});

describe('fetchText', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns response text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('hello', { status: 200 }));

    const result = await fetchText('/text');
    expect(result).toBe('hello');
  });
});

describe('fetchHTML', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns parsed HTML Document', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body><p>test</p></body></html>', { status: 200 })
    );

    const doc = await fetchHTML('/page');
    // happy-dom returns HTMLDocument; check structurally
    expect(doc).toBeDefined();
    expect(typeof doc.querySelector).toBe('function');
  });
});

// =============================================================================
// INITIALIZATION
// =============================================================================

describe('ready', () => {
  it('calls callback immediately when DOM is loaded', () => {
    const fn = vi.fn();
    ready(fn);
    // happy-dom readyState is typically 'complete'
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('bindAll', () => {
  it('binds handlers and returns cleanup function', () => {
    const el = document.createElement('button');
    el.id = 'test-bind';
    document.body.appendChild(el);

    const handler = vi.fn();
    const cleanup = bindAll([{ selector: '#test-bind', event: 'click', handler }]);

    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);

    cleanup();
    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1); // not called again

    el.remove();
  });
});
