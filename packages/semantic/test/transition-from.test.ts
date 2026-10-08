/**
 * `transition <property> from <value> to <value>` in every language (M2, N9).
 *
 * Upstream reads `transition <property> [from <value>] to <value> … [over <time>
 * | using <css transition>]`; the element is the property's owner (`#foo's
 * *width`, `my opacity`), `me` when it has none. Semantic's schema had no
 * `from`, so M1 kept `from 0px to 100px` as an English clause in every
 * translation (es `transición *width from 0px to 100px`), refused it in the SOV
 * languages, and refused the bare command even in English. Four pieces, each
 * pinned here:
 *
 * 1. A `source` role, `from` in English and each language's own source marker
 *    elsewhere (es `de 0px a 100px`, ja `0px から 100px に`, zh `从 0px 到 100px`).
 * 2. The patient takes a property path: every language but English writes
 *    `#foo's *width` as `*width de #foo` (tr `*width nin #foo`), and only a role
 *    that opts into `property-path` reads that form back.
 * 3. No `destination`: upstream has no `transition … on <element>`. The role only
 *    ever held the implicit `me`, and where a language's destination markers
 *    include the genitive (ja `の`, ko `의`, tr `nin`, qu `pa`) it read the owner
 *    of `*width nin #foo` as an element: tr and qu swapped the property and its
 *    owner, silently.
 * 4. A `*` touching a name is a style reference, one operand (the value-extent
 *    rule): `100px *height` is two values, so the second property of
 *    `transition *width to 100px *height to 5px` is not read as `100px * height`.
 *
 * And English writes upstream's `using "<css>"` for the easing, not `with`.
 */
import { describe, it, expect } from 'vitest';
import { getSupportedLanguages, parse, translate } from '../src/index';
import { getSchema } from '../src/generators/command-schemas';
import { readsAsOneExpression } from '../src/parser/utils/value-extent';
import type { CommandSemanticNode } from '../src/types';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

/** en → L → en, or the error's first line. */
function roundTrip(source: string, language: string): string {
  try {
    return translate(translate(source, 'en', language), language, 'en');
  } catch (e) {
    return `REFUSED ${(e as Error).message.split('\n')[0]}`;
  }
}

function transitionNode(source: string, language = 'en'): CommandSemanticNode {
  const node = parse(source, language) as CommandSemanticNode & { body?: CommandSemanticNode[] };
  const command = node?.action === 'transition' ? node : node?.body?.[0];
  expect(command?.action, `'${source}' (${language}) has no transition`).toBe('transition');
  return command as CommandSemanticNode;
}

const roleRaw = (node: CommandSemanticNode, role: string): string | undefined => {
  const v = node.roles.get(role as never) as { value?: unknown; raw?: string } | undefined;
  return v === undefined ? undefined : String(v.raw ?? v.value);
};

describe('transition: the schema', () => {
  it('has a from-value, takes a property path, and has no destination', () => {
    const schema = getSchema('transition')!;
    const roles = new Map(schema.roles.map(r => [r.role, r]));
    expect(roles.get('source')?.required).toBe(false);
    expect(roles.get('patient')?.expectedTypes).toContain('property-path');
    expect(roles.has('destination')).toBe(false);
    expect(roles.get('style')?.markerOverride?.en).toBe('using');
  });
});

describe('transition … from … to … reads in English', () => {
  it('binds the property, the from-value and the to-value', () => {
    const node = transitionNode('transition *width from 0px to 100px over 2s');
    expect(roleRaw(node, 'patient')).toBe('*width');
    expect(roleRaw(node, 'source')).toBe('0px');
    expect(roleRaw(node, 'goal')).toBe('100px');
    expect(node.verbatimClause).toBeUndefined();
  });

  it('writes the easing as upstream spells it', () => {
    expect(translate('transition opacity to 0 using "opacity 1s"', 'en', 'en')).toBe(
      'transition opacity to 0 using "opacity 1s"'
    );
  });

  it('ends a value at a style reference: the second property is not a product', () => {
    expect(readsAsOneExpression('100px *height')).toBe(false);
    expect(readsAsOneExpression('2 *y')).toBe(false);
    expect(readsAsOneExpression('2 * y')).toBe(true);
    expect(readsAsOneExpression("#a's *opacity + 1")).toBe(true);
    const node = transitionNode('on click transition *width to 100px *height to 5px');
    expect(roleRaw(node, 'goal')).toBe('100px');
  });
});

describe.each([
  'transition *width from 0px to 100px',
  'transition opacity from 1 to 0 over 500ms',
  'transition my opacity from 0 to 1',
  "transition #foo's *width from 0px to 100px over 2s",
  "transition #foo's *width to 100px",
  "transition #foo's opacity to 0",
  'transition opacity to 0 over 300ms',
])('%s', source => {
  it.each(FOREIGN)('round-trips through %s', language => {
    expect(roundTrip(source, language)).toBe(translate(source, 'en', 'en'));
  });
});

describe('an owned property is read as one value in every language', () => {
  // tr and qu read `*width nin #foo` (`*width pa #foo`) as an element and a
  // property, the other way round, with every role present: no check refused it.
  it.each(['tr', 'qu', 'ja', 'ko', 'es', 'de', 'ar'])('%s', language => {
    const rendered = translate("transition #foo's *width to 100px", 'en', language);
    const node = transitionNode(rendered, language);
    expect(node.roles.get('patient' as never)).toMatchObject({ type: 'property-path' });
    expect(node.roles.has('destination' as never)).toBe(false);
  });
});
