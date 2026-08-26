/**
 * A prepositional possessive names the PROPERTY first.
 *
 * `bind $color to #picker's value` rendered as es `#picker de valor`, de
 * `#picker wert`, ar `#picker قيمة` — object first — and none of them parses
 * back. The parser's of-possessive matcher wants the property first, and so does
 * the i18n corpus:
 *
 *   es  vincular $color a valor de #picker      -> parses, source:property-path
 *   es  vincular $color a #picker de valor      -> parses, source:SELECTOR (lost)
 *
 * Two separate faults produced the old output, which is why the fix touches both
 * the order and the marker:
 *
 * 1. ORDER. `renderPropertyPath`'s marker switch emitted `${objectStr} ${marker}
 *    ${property}` for `before-property` — the reverse of its own comment, which
 *    read "value de yo".
 * 2. MARKER. It read `profile.possessive.marker`, which is the EMPTY STRING for
 *    de/ar/id/pl/ru/sw/uk/ms. An empty marker failed the `if (marker)` guard, so
 *    those eight languages skipped the switch entirely and fell through to the
 *    ENGLISH `'s` default. That is why corpus rows read `#picker's wartość` and
 *    `#picker's ค่า` — not a translation gap, a renderer fallthrough.
 *
 * The marker now comes from the shared of-marker table in `expression-lexicon`,
 * whose stated contract is that "the possessive matchers and the raw-expression
 * join cannot disagree about what an of-marker is". The renderer was a third
 * party to that agreement and is now inside it.
 *
 * SCOPE IS DELIBERATE — selector owners only, and not `between` languages:
 *   - `between` (ja/ko/bn/hi/zh) is object-first BY the corpus and the matcher
 *     (`#pickerの 値`), so it is untouched.
 *   - en keeps its own `'s`; without that guard it emitted `value from #picker`,
 *     which would have moved R4 (foreign->English) for no reason.
 *   - a REFERENCE owner (`my value`, qu `noqa-pa *opacity`) keeps its existing
 *     construction. Rewriting those property-first was measured and cost ms four
 *     rows and qu four more: the of-possessive matcher is gated on a SELECTOR
 *     after the marker, so a pronoun there is not the construction it matches.
 *
 * Measured: +35 pairs, zero regressions.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

/** Languages whose possessive is object-first by construction — untouched here. */
const BETWEEN = ['bn', 'hi', 'ja', 'ko', 'zh'] as const;

/**
 * Glue their of-marker directly onto the owner — tl `#pickerng halaga`,
 * vi `#pickercủa giá trị`, th `#pickerของค่า` — and do not round-trip. Failing
 * BEFORE this change too (the corpus measured zero regressions), so they are
 * pre-existing residuals, not fallout. Pinned below rather than omitted.
 */
const GLUED_RESIDUAL = ['th', 'tl', 'vi'] as const;

/** Selector-owner possessive languages the fix targets. */
const PREPOSITIONAL = [
  'ar',
  'de',
  'es',
  'fr',
  'he',
  'id',
  'it',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'tr',
  'uk',
] as const;

const SOURCE = "bind $color to #picker's value";

function sourceRole(code: string, language: string) {
  const node = parse(code, language) as CommandSemanticNode | null;
  return node?.roles.get('source' as never) as { type: string } | undefined;
}

describe('a selector-owned possessive round-trips', () => {
  it.each(PREPOSITIONAL)('%s keeps the property as a property-path', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = sourceRole(rendered, language);
    expect(role, `${language}: source lost re-parsing ${rendered}`).toBeDefined();
    expect(role!.type, `${language}: ${rendered}`).toBe('property-path');
  });

  it.each(BETWEEN)('%s keeps it too, on the object-first construction', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = sourceRole(rendered, language);
    expect(role, `${language}: source lost re-parsing ${rendered}`).toBeDefined();
    expect(role!.type).toBe('property-path');
  });
});

describe('the emitted order is property-first, not object-first', () => {
  // The specific inversion that was wrong. Asserting the ORDER rather than only
  // the round trip, because a parser change could make both orders parse and
  // silently un-pin the thing this fix is about.
  it.each([
    ['es', 'de'],
    ['fr', 'de'],
    ['pt', 'de'],
    ['it', 'di'],
  ])('%s renders `<property> %s #picker`', (language, marker) => {
    const rendered = translate(SOURCE, 'en', language);
    const propertyIndex = rendered.search(/valor|valeur|valore/);
    const objectIndex = rendered.indexOf('#picker');
    expect(propertyIndex, `${language}: no localized property in ${rendered}`).toBeGreaterThan(-1);
    expect(objectIndex, `${language}: no #picker in ${rendered}`).toBeGreaterThan(-1);
    expect(propertyIndex, `${language} put the object first: ${rendered}`).toBeLessThan(objectIndex);
    expect(rendered).toContain(` ${marker} `);
  });

  it('ja stays object-first — `between` is not part of this change', () => {
    const rendered = translate(SOURCE, 'en', 'ja');
    expect(rendered.indexOf('#picker')).toBeLessThan(rendered.search(/値/));
  });
});

describe('the eight empty-marker languages no longer fall through to English', () => {
  // `profile.possessive.marker` is '' for these, so the old `if (marker)` guard
  // skipped the switch and emitted the English `'s`. This is the assertion that
  // would catch that regressing.
  it.each(['ar', 'de', 'id', 'ms', 'pl', 'ru', 'sw', 'uk'] as const)(
    '%s emits no English possessive',
    language => {
      const rendered = translate(SOURCE, 'en', language);
      expect(rendered, `${language} fell through to the English possessive`).not.toContain("'s ");
    }
  );
});

describe('reference owners are untouched', () => {
  // Rewriting these property-first was measured to break ms (`nilai daripada
  // saya`) and qu (four `set.destination` rows). They keep the construction they
  // had, so this pins the scope boundary rather than the behaviour of the fix.
  // ja and qu are excluded: `put my value into #out` does not round-trip in
  // either, and did not before this change — the guard below is on
  // `object.type === 'selector'`, so reference owners never reach the new path.
  it.each(['es', 'ms', 'de'] as const)('%s still renders `my value` as before', language => {
    const rendered = translate('put my value into #out', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: my-value render did not re-parse`).not.toBeNull();
    expect(node!.roles.has('patient' as never), `${language}: ${rendered}`).toBe(true);
  });

  it('qu keeps its after-object marker on a reference owner', () => {
    // `noqa-pa *opacity`: dropping this cost four qu rows their set.destination.
    const rendered = translate('set my *opacity to 0.5', 'en', 'qu');
    expect(rendered).toContain('-pa');
  });
});

describe('English is unchanged', () => {
  // Without the `language !== 'en'` guard this rendered `value from #picker`.
  // en matters more than the others here: R4 renders foreign->English, so an en
  // change moves a gate unrelated to this fix.
  it('renders the possessive it was given', () => {
    expect(translate(SOURCE, 'en', 'en')).toContain("#picker's value");
  });
});

describe('KNOWN RESIDUAL — glued of-markers, failing-when-fixed', () => {
  it.each(GLUED_RESIDUAL)('%s still loses the property', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = sourceRole(rendered, language);
    expect(
      role?.type,
      `${language} now round-trips (${rendered}) — move it into PREPOSITIONAL and delete this`
    ).not.toBe('property-path');
  });
});
