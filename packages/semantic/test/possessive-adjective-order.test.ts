/**
 * A possessive ADJECTIVE precedes its property.
 *
 * `put my value into #preview` rendered into six languages with the adjective
 * AFTER the property — ar `قيمة لي`, id `nilai saya`, sw `thamani yangu`,
 * pl `wartość mój` — and that order does not parse back. Measured, on the same
 * command in each language:
 *
 *   sw  weka yangu thamani kwa #out   -> put, patient:property-path
 *   sw  weka thamani yangu kwa #out   -> NULL
 *   pl  umieść mój wartość do #out    -> put, patient:property-path
 *   pl  umieść wartość mój do #out    -> put, patient:EXPRESSION  (mis-typed)
 *
 * ar and id behave like sw: the rendered order returns null outright.
 *
 * THE MISTAKE WAS READING ONE FIELD FOR TWO QUESTIONS. The branch keyed on
 * `possessive.markerPosition === 'after-object'`, but that field says where a
 * MARKER sits relative to the OWNER (qu `noqa-pa`, bn `র`). It says nothing
 * about where an ADJECTIVE sits relative to the PROPERTY, and the two are not
 * the same question — every language that has a possessive adjective puts it
 * first. Marker-based owners still consult `markerPosition`, in the switch
 * further down, which is why this change does not disturb them.
 *
 * This is the other half of the possessive family. #935 fixed SELECTOR owners
 * (`#picker's value` -> `valor de #picker`) and deliberately left reference
 * owners alone, because rewriting them property-first — the wrong fix for this
 * half — cost ms four rows and qu four more. The right fix turns out to be the
 * opposite direction, which is why the two had to be separated.
 *
 * Measured: +70 pairs, zero regressions.
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

/** `usePossessiveAdjectives` + `after-object` — the six that were emitting it last. */
const ADJECTIVE_AFTER_OBJECT = ['ar', 'id', 'pl', 'ru', 'sw', 'uk'] as const;

/** Already adjective-first before this change; must stay that way. */
const ADJECTIVE_FIRST = ['de', 'es', 'fr', 'it', 'ko', 'pt'] as const;

const SOURCE = 'put my value into #preview';

/**
 * `parse` THROWS on an unparseable surface rather than returning null (bn/ja hit
 * this), so the catch is load-bearing, not defensive noise — without it a throw
 * surfaces as an opaque test failure that reads like a failed assertion.
 */
function patient(code: string, language: string) {
  let node: CommandSemanticNode | null = null;
  try {
    node = parse(code, language) as CommandSemanticNode | null;
  } catch {
    return undefined;
  }
  return node?.roles.get('patient' as never) as { type: string } | undefined;
}

describe('a reference-owned possessive round-trips', () => {
  it.each(ADJECTIVE_AFTER_OBJECT)('%s keeps the property-path', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = patient(rendered, language);
    expect(role, `${language}: patient lost re-parsing ${rendered}`).toBeDefined();
    expect(role!.type, `${language}: ${rendered}`).toBe('property-path');
  });

  it.each(ADJECTIVE_FIRST)('%s still keeps it', language => {
    const rendered = translate(SOURCE, 'en', language);
    const role = patient(rendered, language);
    expect(role, `${language}: patient lost re-parsing ${rendered}`).toBeDefined();
    expect(role!.type).toBe('property-path');
  });
});

describe('the emitted order is adjective-first', () => {
  // Asserting the ORDER, not only the round trip: a future parser change could
  // make both orders parse and silently un-pin what this fix is about.
  it.each([
    ['sw', 'yangu', 'thamani'],
    ['id', 'saya', 'nilai'],
    ['ar', 'لي', 'قيمة'],
  ])('%s renders `%s` before `%s`', (language, adjective, property) => {
    const rendered = translate(SOURCE, 'en', language);
    const a = rendered.indexOf(adjective);
    const p = rendered.indexOf(property);
    expect(a, `${language}: no adjective in ${rendered}`).toBeGreaterThan(-1);
    expect(p, `${language}: no property in ${rendered}`).toBeGreaterThan(-1);
    expect(a, `${language} put the adjective last: ${rendered}`).toBeLessThan(p);
  });
});

describe('marker-based owners are untouched', () => {
  // `markerPosition` still governs these. qu is the proof: it is `after-object`
  // WITHOUT possessive adjectives, so it takes the marker switch, and four
  // `set.destination` rows depend on that marker surviving.
  it('qu renders a reference owner with its own possessive word', () => {
    // Was `noqa-pa *opacity` (pronoun + after-object marker). Now `ñuqapa
    // *opacity`, the form qu's OWN `possessive.keywords` declares — which is why
    // the derivation cleared 12 qu rows. The point of the assertion is unchanged:
    // a reference owner must not be rewritten property-first.
    const rendered = translate('set my *opacity to 0.5', 'en', 'qu');
    expect(rendered).toContain('ñuqapa');
    expect(rendered.indexOf('ñuqapa')).toBeLessThan(rendered.indexOf('*opacity'));
  });

  // bn/hi/ja joined this list when the possessive adjective became derivable
  // from `possessive.keywords` — they used to glue pronoun+marker (`আমির`,
  // `मैंका`, `自分の`) and now emit the declared `আমার` / `मेरा` / `私の`.
  it.each(['bn', 'hi', 'ja', 'ko', 'zh'] as const)('%s keeps its between-marker', language => {
    // `between` languages glue the marker: ko `내값`, zh `我的值`. They take the
    // marker switch, not the adjective branch, so this fix does not touch them.
    const rendered = translate(SOURCE, 'en', language);
    const role = patient(rendered, language);
    expect(role, `${language}: ${rendered}`).toBeDefined();
  });

});

describe('selector owners keep #935 behaviour', () => {
  // The two halves must not collide: a SELECTOR owner is property-first with an
  // of-marker, a REFERENCE owner is adjective-first. Both directions pinned so a
  // future edit cannot collapse them into one rule.
  it.each(['es', 'de', 'sw', 'id'] as const)('%s renders a selector owner property-first', language => {
    const rendered = translate("bind $color to #picker's value", 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    const role = node?.roles.get('source' as never) as { type: string } | undefined;
    expect(role?.type, `${language}: ${rendered}`).toBe('property-path');
  });
});

describe('English is unchanged', () => {
  it('renders `my value`', () => {
    expect(translate(SOURCE, 'en', 'en')).toContain('my value');
  });
});
