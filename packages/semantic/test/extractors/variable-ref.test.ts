/**
 * VariableRefExtractor Tests
 *
 * Covers tokenization of variable references: `:local` and `$global`.
 * The `$` support keeps `$name` a single token (rather than splitting into
 * `$` + `name`) so it can fill a reference role, while deliberately NOT
 * matching `${` template-literal interpolation.
 */
import { describe, it, expect } from 'vitest';
import { VariableRefExtractor } from '../../src/tokenizers/extractors/variable-ref';

describe('VariableRefExtractor', () => {
  const ex = new VariableRefExtractor();

  it('extracts a :local variable whole', () => {
    expect(ex.extract(':count', 0)?.value).toBe(':count');
  });

  it('extracts a $global variable whole', () => {
    expect(ex.extract('$greeting', 0)?.value).toBe('$greeting');
    expect(ex.extract('$x_1', 0)?.value).toBe('$x_1');
  });

  it('stops at non-identifier characters', () => {
    // "$name to" → only "$name" is the variable token
    const r = ex.extract('$name to #x', 0);
    expect(r?.value).toBe('$name');
    expect(r?.length).toBe(5);
  });

  it('does NOT match `${` template-literal interpolation', () => {
    expect(ex.canExtract('${count}', 0)).toBe(false);
  });

  it('does NOT match a bare `$` or `:`', () => {
    expect(ex.canExtract('$ 5', 0)).toBe(false);
    expect(ex.canExtract(': x', 0)).toBe(false);
  });
});
