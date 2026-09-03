/**
 * Derive the possessive adjective from the profile's own parse vocabulary.
 *
 * Six languages rendered a reference-owned possessive by GLUING the pronoun to
 * the possessive marker — bn `আমি` + `র` = `আমির`, hi `मैं` + `का` = `मैंका`,
 * ja `自分` + `の` = `自分の` — and none of those forms parses back, even
 * respaced. Meanwhile every one of those profiles already declared the correct
 * word, in the PARSE direction:
 *
 *   japanese.ts  possessive.keywords = { 私の: 'me', あなたの: 'you', その: 'it' }
 *   hindi.ts                          { मेरा: 'me', मेरी: 'me', … }
 *   bengali.ts                        { আমার: 'me', তার: 'it', এর: 'it', … }
 *
 * and those words are exactly what the i18n corpus emits (`আমার মান`,
 * `मेरा मान`, `私の 値`). Only 3 of 23 profiles carry the render-direction
 * `specialForms`; the rest fell through to the marker construction.
 *
 * So this is a DERIVATION, not new data: invert `possessive.keywords` when
 * `specialForms` is absent. Keeping one authoring site matters more than the
 * three lines it saves — a parallel `specialForms` table would be free to drift
 * from the `keywords` the parser actually accepts, and the drift would be
 * invisible until a round-trip failed.
 *
 * Measured: +83 pairs, zero regressions. It cleared six languages, not the three
 * that were diagnosed — th/tl/qu had the same gap and were never separately
 * investigated.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate, tryGetProfile } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

/** Had `possessive.keywords` but no `specialForms`. */
const DERIVED = ['bn', 'hi', 'ja', 'qu', 'th', 'tl'] as const;

/** Declare `specialForms` explicitly; must be unaffected. */
const EXPLICIT = ['es', 'ko', 'vi'] as const;

const SOURCE = 'put my value into #preview';

function patient(code: string, language: string) {
  // `parse` THROWS on an unparseable surface rather than returning null.
  try {
    const node = parse(code, language) as CommandSemanticNode | null;
    return node?.roles.get('patient' as never) as { type: string } | undefined;
  } catch {
    return undefined;
  }
}

describe('a derived possessive adjective round-trips', () => {
  it.each(DERIVED)('%s keeps the property-path', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = patient(rendered, language);
    expect(role, `${language}: patient lost re-parsing ${rendered}`).toBeDefined();
    expect(role!.type, `${language}: ${rendered}`).toBe('property-path');
  });

  it.each(['bn', 'hi', 'ja'] as const)('%s emits the word its own profile declares', language => {
    // The specific words, because "it round-trips" would also pass if the
    // renderer happened on some other parseable form. These are the corpus's.
    const expected: Record<string, string> = { bn: 'আমার', hi: 'मेरा', ja: '私の' };
    expect(translate(SOURCE, 'en', language)).toContain(expected[language]);
  });

  it.each(['bn', 'hi', 'ja'] as const)('%s no longer glues pronoun + marker', language => {
    // The exact broken forms, so a regression names itself.
    const glued: Record<string, string> = { bn: 'আমির', hi: 'मैंका', ja: '自分の' };
    expect(translate(SOURCE, 'en', language)).not.toContain(glued[language]);
  });
});

describe('an explicit specialForms entry still wins', () => {
  // The derivation is a FALLBACK. If it ever took precedence, ko would render
  // its `keywords` form rather than its declared `내`.
  it.each(EXPLICIT)('%s uses its declared form', language => {
    const profile = tryGetProfile(language);
    const declared = profile?.possessive?.specialForms?.me;
    expect(declared, `${language} no longer declares specialForms.me`).toBeDefined();
    expect(translate(SOURCE, 'en', language)).toContain(declared!);
  });
});

describe('the derivation matches the parse vocabulary', () => {
  // The property this fix is really asserting: whatever the renderer emits for
  // an owner, the profile must already accept it as that owner. Checked
  // structurally rather than by a word list, so it holds for languages added
  // later.
  it.each(DERIVED)('%s renders an owner its own keywords map', language => {
    const profile = tryGetProfile(language);
    const keywords = profile?.possessive?.keywords ?? {};
    const rendered = translate(SOURCE, 'en', language);
    const emitted = Object.entries(keywords).filter(
      ([native, mapped]) => mapped === 'me' && rendered.includes(native)
    );
    expect(
      emitted.length,
      `${language} emitted an owner form absent from possessive.keywords: ${rendered}`
    ).toBeGreaterThan(0);
  });
});

describe('English is unchanged', () => {
  it('renders `my value`', () => {
    expect(translate(SOURCE, 'en', 'en')).toContain('my value');
  });
});
