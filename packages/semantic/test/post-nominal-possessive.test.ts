/**
 * Regression lock — post-nominal (property-first) possessive parsing.
 *
 * `tryMatchPossessiveExpression` only handled possessor-first order (`my value`).
 * Languages whose possessive `markerPosition` is `after-object` put the possessor
 * AFTER the property (ar `textContent لي`, id `textContent saya`, sw
 * `textContent yangu`), so `set my textContent to "x"` either failed to parse
 * (ar/id/sw/tr) or parsed lossily with the possessor dropped — destination became
 * a bare `textContent` instead of `me.textContent` (ru/pl/uk). The post-nominal
 * branch in `tryMatchPossessiveExpression`'s caller recovers the property-path.
 * See MULTILINGUAL_BEHAVIORS_PLAN.md Phase 2 tail.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src';

type Node = { roles?: unknown };
function destinationOf(node: Node): { type?: string; object?: { value?: string }; property?: string } {
  const roles =
    node.roles instanceof Map
      ? Object.fromEntries(node.roles as Map<string, unknown>)
      : (node.roles as Record<string, unknown>);
  return (roles?.destination ?? {}) as never;
}

const SRC = 'set my textContent to "x"';

describe('post-nominal possessive (after-object languages)', () => {
  // ar/id/sw failed to parse; tr also failed; ru/pl/uk parsed lossily (possessor
  // dropped). All must now recover destination = me.textContent.
  const postNominal = ['ar', 'id', 'sw', 'ru', 'pl', 'uk', 'tr'] as const;

  for (const lang of postNominal) {
    it(`${lang}: "${SRC}" → destination property-path me.textContent`, () => {
      const translated = translate(SRC, 'en', lang);
      const dest = destinationOf(parse(translated, lang) as Node);
      expect(dest.type).toBe('property-path');
      expect(dest.object?.value).toBe('me');
      expect(dest.property).toBe('textContent');
    });
  }

  // Possessor-first (pre-nominal) languages must be unaffected by the new branch.
  const preNominal = ['en', 'es', 'ms', 'he'] as const;
  for (const lang of preNominal) {
    it(`${lang}: pre-nominal possessive still resolves to me.textContent`, () => {
      const translated = translate(SRC, 'en', lang);
      const dest = destinationOf(parse(translated, lang) as Node);
      expect(dest.type).toBe('property-path');
      expect(dest.object?.value).toBe('me');
      expect(dest.property).toBe('textContent');
    });
  }

  it('does not misread a non-possessive set target (ar `set #x to "v"`)', () => {
    const translated = translate('set #x to "v"', 'en', 'ar');
    const dest = destinationOf(parse(translated, 'ar') as Node);
    // #x is a selector, not a possessive property-path.
    expect(dest.type).toBe('selector');
  });
});
