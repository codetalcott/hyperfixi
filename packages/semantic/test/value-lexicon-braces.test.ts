/**
 * A brace group is DATA, not vocabulary.
 *
 * Companion to `value-lexicon-keys.test.ts` (an object KEY is a contract). This
 * one is about the whole interior of a brace group.
 *
 * The value-interior localizer rewrites any word the profile vouches for. Inside
 * `{name: 'Demo', admin: true}` that rewrote the BOOLEAN — es
 * `{name: 'Demo', admin: verdadero}`, ja `{… admin: 真}` — and the parse side
 * never reverses it, because an object literal is captured as ONE opaque
 * literal value. Two consequences, both measured 2026-08-27:
 *
 *   1. the round trip loses the value in all 23 languages (render → parse →
 *      render-to-English gives back `verdadero`, not `true`);
 *   2. worse, a localized source would evaluate `verdadero` as an undefined
 *      identifier at runtime — the object literal is evaluated as data.
 *
 * A BARE `true` is deliberately still localized: `set $flag to true` renders
 * `establecer $flag a verdadero` and round-trips exactly, because the parse side
 * DOES de-localize a standalone literal. The asymmetry is the bug, not the
 * localization itself.
 *
 * WHY THIS FILE IS THE GATE. Same argument as its companion: the render-fidelity
 * ratchet scores which actions and role TYPES survive, and a corrupted interior
 * leaves both intact — `patient:literal` either way. The corpus rows that would
 * show it (`component-with-conditional`) are HTML markup, which every corpus
 * gate skips. These assertions are the only automated signal.
 */
import { describe, it, expect } from 'vitest';
import { localizeValueInterior } from '../src/explicit/value-lexicon';
import { parseSemantic, render } from '../src/index';

const LANGUAGES = ['de', 'es', 'fr', 'ja', 'ru', 'zh'] as const;

describe('a brace group survives value localization verbatim', () => {
  it.each(LANGUAGES)('%s leaves an object literal untouched', language => {
    const raw = "{name: 'Demo', admin: true}";
    expect(localizeValueInterior(raw, language)).toBe(raw);
  });

  it.each(LANGUAGES)('%s leaves a dynamic class-selector brace untouched', language => {
    expect(localizeValueInterior('.{cls}', language)).toBe('.{cls}');
  });

  it.each(LANGUAGES)('%s keeps a string INSIDE a brace group intact', language => {
    const raw = 'headers:{Authorization:`Bearer ${$token}`}';
    expect(localizeValueInterior(raw, language)).toBe(raw);
  });

  it.each(LANGUAGES)('%s still localizes a BARE literal outside any brace', language => {
    // The asymmetry that made the brace case a bug: this one round-trips.
    expect(localizeValueInterior('true', language)).not.toBe('true');
  });

  it('an UNBALANCED brace masks nothing — the rest localizes as before', () => {
    // Malformed input is not a case to optimise for; what matters is that the
    // scanner does not swallow the remainder of the string hunting for a `}`.
    expect(localizeValueInterior('{unclosed: true', 'es')).toBe('{unclosed: verdadero');
  });

  it('protects a NESTED brace group', () => {
    const raw = '{outer: {inner: true}, flag: false}';
    expect(localizeValueInterior(raw, 'es')).toBe(raw);
  });
});

describe('the object literal round-trips through render → parse → English', () => {
  it.each(LANGUAGES)('%s', language => {
    const source = "set ^user to {name: 'Demo', admin: true}";
    const reference = parseSemantic(source, 'en')?.node;
    expect(reference, 'the English reference parses').toBeTruthy();
    const referenceEn = render(reference!, 'en');

    const foreign = render(reference!, language);
    const back = parseSemantic(foreign, language)?.node;
    expect(back, `${language} parses back`).toBeTruthy();

    // The boolean must come home as `true`, not as this language's word for it.
    expect(render(back!, 'en')).toBe(referenceEn);
    // The renderer re-spaces a literal's punctuation; the WORD is the assertion.
    expect(foreign.replace(/\s+/g, ' ')).toContain('admin : true');
  });
});
