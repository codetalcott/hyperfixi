import { describe, it, expect } from 'vitest';
import { resolveUrl, reconcileFields, classifyError } from '../src/util';

describe('resolveUrl', () => {
  it('resolves relative URL against base', () => {
    expect(resolveUrl('/orders/2', 'https://api.test/orders/1')).toBe(
      'https://api.test/orders/2'
    );
  });

  it('returns absolute URL unchanged', () => {
    expect(resolveUrl('https://other.test/api', 'https://api.test/')).toBe(
      'https://other.test/api'
    );
  });

  it('resolves relative path segments', () => {
    expect(resolveUrl('../items', 'https://api.test/orders/1')).toBe(
      'https://api.test/items'
    );
  });
});

describe('reconcileFields', () => {
  it('returns field defaults when no user data', () => {
    const result = reconcileFields(undefined, [
      { name: 'carrier', value: 'standard' },
      { name: 'priority', value: 'normal' },
    ]);
    expect(result).toEqual({ carrier: 'standard', priority: 'normal' });
  });

  it('user data overrides field defaults', () => {
    const result = reconcileFields(
      { carrier: 'express', trackingId: 'TRK-1' },
      [
        { name: 'carrier', value: 'standard' },
        { name: 'priority', value: 'normal' },
      ]
    );
    expect(result).toEqual({
      carrier: 'express',
      priority: 'normal',
      trackingId: 'TRK-1',
    });
  });

  it('returns user data when no fields', () => {
    const result = reconcileFields({ key: 'val' }, undefined);
    expect(result).toEqual({ key: 'val' });
  });

  it('returns empty object when both are undefined', () => {
    expect(reconcileFields(undefined, undefined)).toEqual({});
  });

  it('skips fields without default values', () => {
    const result = reconcileFields(undefined, [
      { name: 'required_field' },
      { name: 'with_default', value: 'yes' },
    ]);
    expect(result).toEqual({ with_default: 'yes' });
  });
});

describe('classifyError', () => {
  it('classifies 429 as transient', () => {
    expect(classifyError(429).transient).toBe(true);
  });

  it('classifies 500 as transient', () => {
    expect(classifyError(500).transient).toBe(true);
  });

  it('classifies 503 as transient', () => {
    expect(classifyError(503).transient).toBe(true);
  });

  it('classifies 400 as permanent', () => {
    expect(classifyError(400).transient).toBe(false);
  });

  it('classifies 404 as permanent', () => {
    expect(classifyError(404).transient).toBe(false);
  });

  it('classifies 403 as permanent', () => {
    expect(classifyError(403).transient).toBe(false);
  });
});
