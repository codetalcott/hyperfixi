import { describe, it, expect } from 'vitest';
import { createExpressionRegistry } from './expression-registry';
import type { ExpressionImplementation } from '../types/core';

function makeImpl(name: string): ExpressionImplementation {
  return {
    name,
    category: 'Comparison' as ExpressionImplementation['category'],
    evaluatesTo: 'Boolean' as ExpressionImplementation['evaluatesTo'],
    evaluate: async () => null,
  };
}

describe('createExpressionRegistry', () => {
  it('returns an empty registry when called with no categories', () => {
    const registry = createExpressionRegistry();
    expect(registry.size).toBe(0);
  });

  it('flattens a single category into name → impl entries', () => {
    const cat = { foo: makeImpl('foo'), bar: makeImpl('bar') };
    const registry = createExpressionRegistry(cat);

    expect(registry.size).toBe(2);
    expect(registry.get('foo')?.name).toBe('foo');
    expect(registry.get('bar')?.name).toBe('bar');
  });

  it('merges multiple categories', () => {
    const a = { foo: makeImpl('foo') };
    const b = { bar: makeImpl('bar') };
    const c = { baz: makeImpl('baz') };
    const registry = createExpressionRegistry(a, b, c);

    expect(registry.size).toBe(3);
    expect(registry.get('foo')).toBeDefined();
    expect(registry.get('bar')).toBeDefined();
    expect(registry.get('baz')).toBeDefined();
  });

  it('applies last-write-wins on name collisions', () => {
    const earlier = { conflict: makeImpl('earlier-version') };
    const later = { conflict: makeImpl('later-version') };
    const registry = createExpressionRegistry(earlier, later);

    expect(registry.get('conflict')?.name).toBe('later-version');
  });

  it('returns a Map that reports undefined for unregistered names', () => {
    const registry = createExpressionRegistry({ foo: makeImpl('foo') });
    expect(registry.get('not-registered')).toBeUndefined();
  });
});
