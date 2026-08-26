/**
 * An object KEY is a contract, not vocabulary.
 *
 * The value-interior localizer rewrites any word the profile vouches for, which
 * is right for `my value` -> `mi valor` and wrong for `body:` in
 * `fetch … with {method:"POST", body:form}`. `body` is in the lexicon because it
 * is also a DOM reference (`document.body`), so the key was being translated —
 * es `cuerpo:`, ja `ボディ:`, de `körper:`, zh `主体:` — and the runtime contract
 * key silently became a different key.
 *
 * WHY THIS FILE IS THE GATE. The render-fidelity ratchet cannot see this: it
 * scores which ACTIONS and ROLE TYPES survive a round trip, and a corrupted key
 * inside an expression leaves both intact. The corpus signal that WOULD see it
 * (R3, value recall) scores the i18n-written rows, not this renderer. So the
 * whole-corpus measurement of this change is 0 fixed / 0 regressions while two
 * live corpus patterns are being corrupted in 21+ languages each:
 *
 *   on click send update(value: 42) to #target       (init-db.ts:495)
 *   on click fetch /api/users with method:"POST", body:"name=Joe"   (:1372)
 *
 * There is no automated signal but these assertions. Do not delete them on the
 * grounds that the corpus gate is green — the corpus gate is structurally
 * incapable of failing here.
 *
 * The fix is one character: `:` added to the WORD regex's negative lookahead, so
 * a word immediately followed by a colon is left alone. Measured blast radius
 * over every value the renderer localizes across the corpus: 6 of 42, all of
 * them keys, none of them values.
 */

import { describe, it, expect } from 'vitest';
import { localizeValueInterior } from '../src/explicit/value-lexicon';
import { tryGetProfile, translate } from '../src/index';

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
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
] as const;

const localize = (raw: string, language: string) =>
  localizeValueInterior(raw, language, tryGetProfile(language));

describe('object-literal keys survive localization', () => {
  it.each(LANGUAGES)('%s keeps `body:` in a fetch options object', language => {
    const out = localize('{method:"POST", body:form}', language);
    expect(out, `${language} translated the contract key`).toContain('body:');
  });

  it.each(LANGUAGES)('%s keeps `body:` when the key is spaced', language => {
    const out = localize('{credentials: "include", body: $payload}', language);
    expect(out).toContain('body:');
  });

  it.each(LANGUAGES)('%s keeps a named-argument key', language => {
    // `send update(value: 42)` — `value` is in every lexicon, and as a named
    // argument it is a contract key exactly like an object key.
    const out = localize('update(value: 42)', language);
    expect(out, `${language} translated the named-argument key`).toContain('value:');
  });
});

describe('the VALUE side still localizes — this is not a blanket opt-out', () => {
  // The point is a key/value distinction, not "stop translating". If these
  // start passing through unchanged, the lookahead has been widened too far.
  it('es localizes the value while keeping the key', () => {
    expect(localize('{body: my value}', 'es')).toBe('{body: mi valor}');
  });

  it('ja localizes the value while keeping the key', () => {
    expect(localize('{body: my value}', 'ja')).toBe('{body: 私の 値}');
  });

  it('de localizes an interior expression while keeping the key', () => {
    expect(localize('{method:"POST", body:(closest <form/> as FormData)}', 'de')).toBe(
      '{method:"POST", body:(nächstgelegene <form/> as FormData)}'
    );
  });
});

describe('colon-qualified event names are unaffected (negative control)', () => {
  // These reach the renderer through `renderEventName`, and `lexicon.events` is
  // deliberately excluded from this localizer's categories — so they were
  // already untouched, and must stay that way. Pinned because the fix keys on
  // the colon, which is exactly the character these contain.
  it.each(['draggable:start', 'htmx:load', 'sortable:end'])('%s passes through', name => {
    for (const language of LANGUAGES) {
      expect(localize(name, language), `${language} rewrote ${name}`).toBe(name);
    }
  });
});

describe('end to end, on the two corpus patterns that were being corrupted', () => {
  it.each(LANGUAGES)('%s renders `send update(value: 42)` with the key intact', language => {
    const rendered = translate('on click send update(value: 42) to #target', 'en', language);
    expect(rendered, `${language}: ${rendered}`).toContain('value:');
  });

  it.each(LANGUAGES)('%s keeps `body:` in the fetch-with-body pattern', language => {
    const rendered = translate(
      'on click fetch /api/users with method:"POST", body:"name=Joe"',
      'en',
      language
    );
    // The style role is dropped by pattern selection in some languages today
    // (the fetch arc's A1). Assert only that IF the options object is rendered,
    // its key is English — so this test does not silently depend on A1.
    if (rendered.includes('name=Joe')) {
      expect(rendered, `${language}: ${rendered}`).toContain('body:');
    }
  });
});
