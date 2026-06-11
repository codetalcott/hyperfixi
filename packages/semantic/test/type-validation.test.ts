import { describe, it, expect } from 'vitest';
import { isTypeCompatible } from '../src/parser/utils/type-validation';

describe('isTypeCompatible', () => {
  it('direct match and empty expected types', () => {
    expect(isTypeCompatible('selector', ['selector'])).toBe(true);
    expect(isTypeCompatible('literal', [])).toBe(true);
    expect(isTypeCompatible('literal', ['selector'])).toBe(false);
  });

  it("'expression' as an expected type is a wildcard", () => {
    expect(isTypeCompatible('literal', ['expression'])).toBe(true);
    expect(isTypeCompatible('selector', ['expression'])).toBe(true);
  });

  it("'property-path' actual is compatible with selector/reference/expression", () => {
    expect(isTypeCompatible('property-path', ['selector'])).toBe(true);
    expect(isTypeCompatible('property-path', ['reference'])).toBe(true);
    expect(isTypeCompatible('property-path', ['literal'])).toBe(false);
  });

  // Positional queries (`next <.x/> in <form/>`), method calls, possessives are
  // captured as `expression` actual values. They must satisfy selector/reference
  // destination roles so `put X into next .y` doesn't drop the command (B1).
  it("'expression' actual is compatible with selector/reference/expression (not literal)", () => {
    expect(isTypeCompatible('expression', ['selector'])).toBe(true);
    expect(isTypeCompatible('expression', ['reference'])).toBe(true);
    expect(isTypeCompatible('expression', ['selector', 'reference'])).toBe(true);
    expect(isTypeCompatible('expression', ['expression'])).toBe(true);
    // Not a blanket wildcard: literal/quantity/duration roles stay unaffected.
    expect(isTypeCompatible('expression', ['literal'])).toBe(false);
    expect(isTypeCompatible('expression', ['quantity'])).toBe(false);
  });
});
