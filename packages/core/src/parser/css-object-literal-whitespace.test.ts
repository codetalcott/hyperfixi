import { describe, it, expect } from 'vitest';
import { parse } from './parser';

/**
 * Regression guard for `parseCSSObjectLiteral` value reconstruction.
 *
 * The CSS object-literal value used to be rebuilt with `valueTokens.join('')`,
 * which discards the whitespace the tokenizer skipped. That corrupted two things:
 *   1. `${a - b}` interpolation expressions → `${a-b}`, which then mis-tokenizes as
 *      a single hyphenated identifier and evaluates to `undefined` (this is what
 *      silently broke the Draggable/Sortable/Resizable behavior sources — their
 *      `add { left: ${clientX - xoff}px }` produced `NaNpx` and never moved).
 *   2. multi-word CSS values (`1px solid red`, `calc(100% - 2px)`) → mangled.
 *
 * The fix reconstructs the value verbatim from source offsets, preserving spacing.
 */

/** Walk to the first object-literal property value node. */
function firstStyleValue(src: string): any {
  const ast: any = parse(src);
  const find = (o: any): any => {
    if (!o || typeof o !== 'object') return null;
    if (o.type === 'objectLiteral') return o.properties?.[0]?.value;
    for (const k of Object.keys(o)) {
      const hit = find(o[k]);
      if (hit) return hit;
    }
    return null;
  };
  return find(ast);
}

describe('parseCSSObjectLiteral — value whitespace preservation', () => {
  it('preserves spaces inside ${ } interpolation expressions', () => {
    const v = firstStyleValue('add { left: ${clientX - xoff}px } to me');
    expect(v?.type).toBe('templateLiteral');
    expect(v.value).toBe('${clientX - xoff}px');
  });

  it('preserves spaces in a two-property style with interpolation', () => {
    const v = firstStyleValue('add { left: ${a - b}px; top: ${c - d}px } to me');
    expect(v.value).toBe('${a - b}px');
  });

  it('preserves spaces in multi-word CSS values', () => {
    const v = firstStyleValue('add { border: 1px solid red } to me');
    // join('') would have produced "1pxsolidred"
    expect(String(v.value)).toBe('1px solid red');
  });

  it('preserves spaces inside calc()', () => {
    const v = firstStyleValue('add { width: calc(100% - 20px) } to me');
    expect(String(v.value)).toBe('calc(100% - 20px)');
  });

  it('still handles a simple single-token value', () => {
    const v = firstStyleValue('add { opacity: 0.5 } to me');
    expect(String(v.value)).toBe('0.5');
  });
});
