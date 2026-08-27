/**
 * A `*`/`@` sigil is a PROPERTY, never an owner — which is what tells the two
 * possessive surfaces apart.
 *
 * `OF_POSSESSIVE_MARKERS` lists the head-final genitive clitics (ja の, ko 의,
 * zh 的, bn র, hi का, tl ng, vi của) alongside the genuine prepositional "of"
 * linkers, because the i18n transformer emitted property-FIRST in every
 * language and `tryMatchOfPossessiveExpression` was built to read that. In a
 * clitic language the same marker means the opposite: `A の B` is "A's B". So
 * on the semantic renderer's (correct) owner-first surface the of-matcher folded
 * the pair INVERTED:
 *
 *   en   set the *background-color of #theme to "#ff6600"
 *   ja   #themeの*background-color を "#ff6600" に 設定      ← a correct render…
 *   ja → set *background-color's #theme to "#ff6600"       ← read back backwards
 *
 * Every fidelity score is 1.0 on that — same action, same role, same value
 * types — so only the English round-trip sees it, which is why it survived
 * until the `best` corpus writer's round-trip veto surfaced it as seven kept
 * rows (set-color-variable in bn/hi/ja/ko/tl/vi/zh).
 *
 * Two guards, both keyed on the sigil rather than on a per-language direction
 * table:
 *   - `tryMatchPossessiveSelectorExpression` accepts a `*`-sigil token as the
 *     PROPERTY on a profile marker. It previously demanded an `identifier`, to
 *     keep `#button の .active` ("toggle .active on #button") from folding — and
 *     a class selector still cannot fold; a style property is not that shape.
 *   - `tryMatchOfPossessiveExpression` refuses a `*`/`@` sigil as the OWNER, so
 *     the property-first i18n surface (`*background-color ของ #theme`) still
 *     folds there while the owner-first surface falls through to the matcher
 *     that reads it correctly.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, parseSemantic, render, translate } from '../src/index';
import type { CommandSemanticNode, PropertyPathValue } from '../src/types';

const SOURCE = 'set the *background-color of #theme to "#ff6600"';
const REFERENCE_EN = 'set #theme\'s *background-color to "#ff6600"';

/** Every language the render-fidelity gate covers that has a possessive marker. */
const LANGUAGES = [
  'ar',
  'bn',
  'de',
  'es',
  'fr',
  'he',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

function destinationOf(code: string, language: string): PropertyPathValue | undefined {
  const node = parse(code, language) as CommandSemanticNode | null;
  return node?.roles.get('destination' as never) as PropertyPathValue | undefined;
}

describe('a sigil property round-trips in the direction it was written', () => {
  it.each(LANGUAGES)('%s keeps #theme as the OWNER, not the property', language => {
    const rendered = translate(SOURCE, 'en', language);
    const destination = destinationOf(rendered, language);
    expect(destination, `${language}: destination lost re-parsing ${rendered}`).toBeDefined();
    expect(destination!.type, `${language}: ${rendered}`).toBe('property-path');
    // The assertion the old `type === 'property-path'` check could not make: an
    // inverted fold is still a property-path, and scores 1.0 on every metric.
    expect(destination!.object, `${language} folded it inverted: ${rendered}`).toMatchObject({
      value: '#theme',
    });
    expect(destination!.property).toBe('*background-color');
  });

  it.each(LANGUAGES)('%s renders back to the reference English', language => {
    const rendered = translate(SOURCE, 'en', language);
    const node = parseSemantic(rendered, language)?.node;
    expect(node, `${language}: ${rendered} did not re-parse`).toBeTruthy();
    expect(render(node!, 'en')).toBe(REFERENCE_EN);
  });
});

describe('the property-first "of" surface still folds', () => {
  // The i18n transformer's own output, and the natural order in the genuinely
  // head-initial languages. Refusing a sigil OWNER must not cost this.
  it.each([
    ['th', 'ตั้ง *background-color ของ #theme ใน "#ff6600"'],
    ['es', 'establecer *background-color de #theme a "#ff6600"'],
    ['de', 'setze *background-color von #theme auf "#ff6600"'],
  ])("%s reads `%s` as #theme's property", (language, surface) => {
    const destination = destinationOf(surface, language);
    expect(destination?.type, `${language}: ${surface}`).toBe('property-path');
    expect(destination!.object).toMatchObject({ value: '#theme' });
    expect(destination!.property).toBe('*background-color');
  });
});

describe('a class selector after a profile marker is still not a property', () => {
  // The danger the identifier-only gate was protecting against, and the reason
  // the new acceptance is keyed on the SIGIL rather than on `kind === selector`:
  // `#button の .active` is "toggle .active on #button", a target+patient
  // construct, and must keep its two selector roles.
  it.each([
    ['ja', '#button の .active を 切り替え'],
    ['ko', '#button 의 .active 을 토글'],
  ])('%s reads `%s` as target + patient', (language, surface) => {
    const node = parse(surface, language) as CommandSemanticNode | null;
    expect(node, `${language}: ${surface} did not parse`).not.toBeNull();
    expect(node!.roles.get('destination' as never)).toMatchObject({
      type: 'selector',
      value: '#button',
    });
    expect(node!.roles.get('patient' as never)).toMatchObject({
      type: 'selector',
      value: '.active',
    });
  });
});
