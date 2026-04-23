/**
 * `attrs` proxy unit tests.
 */

import { describe, it, expect } from 'vitest';
import { createAttrsProxy } from './attrs';

describe('createAttrsProxy', () => {
  it('reads a string attribute as-is', () => {
    const el = document.createElement('my-comp');
    el.setAttribute('label', 'Hello');
    const attrs = createAttrsProxy(el);
    expect(attrs.label).toBe('Hello');
  });

  it('coerces numeric-looking attributes to numbers', () => {
    const el = document.createElement('my-comp');
    el.setAttribute('count', '42');
    el.setAttribute('rate', '1.5');
    el.setAttribute('neg', '-7');
    const attrs = createAttrsProxy(el);
    expect(attrs.count).toBe(42);
    expect(attrs.rate).toBe(1.5);
    expect(attrs.neg).toBe(-7);
  });

  it('coerces "true" / "false" to booleans', () => {
    const el = document.createElement('my-comp');
    el.setAttribute('open', 'true');
    el.setAttribute('closed', 'false');
    const attrs = createAttrsProxy(el);
    expect(attrs.open).toBe(true);
    expect(attrs.closed).toBe(false);
  });

  it('maps camelCase prop reads to kebab-case attributes', () => {
    const el = document.createElement('my-comp');
    el.setAttribute('initial-count', '5');
    const attrs = createAttrsProxy(el);
    expect(attrs.initialCount).toBe(5);
  });

  it('returns undefined for missing attributes', () => {
    const el = document.createElement('my-comp');
    const attrs = createAttrsProxy(el);
    expect(attrs.missing).toBeUndefined();
  });

  it('writes back as kebab-case when prop is camelCase', () => {
    const el = document.createElement('my-comp');
    const attrs = createAttrsProxy(el);
    attrs.initialCount = 10;
    expect(el.getAttribute('initial-count')).toBe('10');
  });

  it('does not coerce non-numeric strings that happen to start with digits', () => {
    const el = document.createElement('my-comp');
    el.setAttribute('id', '42px'); // common CSS-like value
    const attrs = createAttrsProxy(el);
    expect(attrs.id).toBe('42px'); // unchanged
  });
});
