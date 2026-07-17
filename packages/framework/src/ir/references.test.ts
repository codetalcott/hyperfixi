import { describe, it, expect } from 'vitest';
import { isValidReference, DEFAULT_REFERENCES } from './references';

describe('isValidReference', () => {
  it('recognizes default references', () => {
    expect(isValidReference('me')).toBe(true);
    expect(isValidReference('you')).toBe(true);
    expect(isValidReference('it')).toBe(true);
    expect(isValidReference('result')).toBe(true);
    expect(isValidReference('event')).toBe(true);
    expect(isValidReference('target')).toBe(true);
    expect(isValidReference('body')).toBe(true);
    expect(isValidReference('document')).toBe(true);
    expect(isValidReference('window')).toBe(true);
    expect(isValidReference('detail')).toBe(true);
  });

  it('rejects non-references', () => {
    expect(isValidReference('foo')).toBe(false);
    expect(isValidReference('hello')).toBe(false);
    expect(isValidReference('')).toBe(false);
  });

  it('is case-sensitive', () => {
    expect(isValidReference('Me')).toBe(false);
    expect(isValidReference('IT')).toBe(false);
    expect(isValidReference('Result')).toBe(false);
  });

  it('accepts custom reference set', () => {
    const custom = new Set(['self', 'other', 'context']);
    expect(isValidReference('self', custom)).toBe(true);
    expect(isValidReference('other', custom)).toBe(true);
    expect(isValidReference('me', custom)).toBe(false);
    expect(isValidReference('it', custom)).toBe(false);
  });

  it('DEFAULT_REFERENCES contains exactly 10 entries', () => {
    expect(DEFAULT_REFERENCES.size).toBe(10);
  });
});
