/**
 * `fetch … with {options}` must keep its options object in every language.
 *
 * `fetch.style` was the single largest role loss in the whole en→foreign
 * residual — 92 (pattern, language) pairs, with `responseType` (40) riding
 * along — and the cause was pattern SELECTION, not a missing translation.
 *
 * Every language already had a style-carrying pattern: the auto-generated
 * `fetch-{L}-generated` at priority 100. But each language also has a
 * hand-written recovery pattern at priority **105** — they exist because the i18n
 * transformer emits marker-less surfaces (`buscar /api/data`) the generated
 * pattern cannot anchor — and none of those carried a `style` slot. Priority is
 * what `findBestPattern` reads first, so the 105 pattern won and had nowhere to
 * put the options object. It was dropped in silence.
 *
 * (`findBestPattern` also scores only TOP-LEVEL tokens, so even at equal
 * priority it could not see a `{style}` slot nested in an optional group — which
 * is where every one of them lives. Adding the slot to the 105 patterns sidesteps
 * that: they now win on priority AND carry the role.)
 *
 * The marker comes from `profile.roleMarkers.style`, which all 23 profiles
 * define, and its `position` decides the order — SVO marks before the value
 * (es `con {…}`), SOV after it (ja `{…} で`). That keeps this one source of
 * truth instead of a 23-entry table that would drift.
 *
 * Measured: +67 pairs, zero regressions (81.41% → 83.28%).
 *
 * KNOWN RESIDUAL, pinned at the bottom rather than hidden: five languages render
 * the style correctly but cannot read it back *inside an event handler* — a
 * handler-body composition defect, not a fetch one.
 *
 * (A second residual lived here — six languages losing `responseType` — and this
 * file's failing-when-fixed test is what reported it cleared when `sovFetch`
 * gained a trailing slot. `sov-fetch-responsetype.test.ts` now covers that
 * ground positively.)
 */

import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import type { CommandSemanticNode, EventHandlerSemanticNode } from '../src/types';

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

const WITH_OPTIONS = 'fetch /api/users with {method:"POST", body:"name=Joe"}';

describe('the options object reaches the rendered surface', () => {
  it.each(LANGUAGES)('%s renders the options object', language => {
    const rendered = translate(WITH_OPTIONS, 'en', language);
    expect(rendered, `${language} dropped the options object`).toContain('method:"POST"');
  });

  it.each(LANGUAGES)('%s marks it with the profile style marker', language => {
    // Not just present — introduced by the language's own marker, so the parser
    // has something to anchor on. A bare `{…}` appended to the URL would satisfy
    // the assertion above and still be unparseable.
    const rendered = translate(WITH_OPTIONS, 'en', language);
    const withoutOptions = translate('fetch /api/users', 'en', language);
    expect(rendered.length, `${language} added nothing but the object`).toBeGreaterThan(
      withoutOptions.length + '{method:"POST", body:"name=Joe"}'.length
    );
  });
});

describe('the options object survives the round trip', () => {
  it.each(LANGUAGES)('%s parses its own rendered fetch back with style', language => {
    const rendered = translate(WITH_OPTIONS, 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: rendered fetch did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('fetch');
    const style = node!.roles.get('style' as never) as { type: string } | undefined;
    expect(style, `${language}: style role lost on re-parse of ${rendered}`).toBeDefined();
    expect(style!.type).toBe('expression');
  });

  it.each(LANGUAGES)('%s keeps the source alongside the style', language => {
    // The style group sits next to the source slot in both builders, so a
    // mis-placed group would steal the URL rather than merely be ignored.
    const node = parse(translate(WITH_OPTIONS, 'en', language), language) as CommandSemanticNode;
    expect(node.roles.has('source' as never), `${language} lost the URL`).toBe(true);
  });
});

describe('a fetch with NO options is unchanged', () => {
  // The group is optional; if it ever became required, every bare fetch would
  // stop matching. This is the guard for that.
  it.each(LANGUAGES)('%s still renders and re-parses a bare fetch', language => {
    const rendered = translate('fetch /api/data', 'en', language);
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: bare fetch did not re-parse`).not.toBeNull();
    expect(node!.action).toBe('fetch');
    expect(node!.roles.has('source' as never)).toBe(true);
    expect(node!.roles.has('style' as never), `${language} invented a style role`).toBe(false);
  });
});

describe('KNOWN RESIDUALS — failing-when-fixed, delete as they clear', () => {
  // Pinned rather than skipped so they stay visible and so the test asks to be
  // updated the moment the underlying defect is fixed.

  it('five languages lose the style INSIDE an event handler', () => {
    // Not a fetch defect: the bare command parses correctly in all five (asserted
    // above). Inside a handler, pl/ru/uk bind the object literal to `patient` and
    // he/id drop it — a handler-body composition problem in the parser.
    const stillBroken: string[] = [];
    for (const language of ['pl', 'ru', 'uk', 'he', 'id']) {
      const rendered = translate(`on click ${WITH_OPTIONS}`, 'en', language);
      const node = parse(rendered, language) as EventHandlerSemanticNode | null;
      const fetchNode = node?.body?.find(b => (b as CommandSemanticNode).action === 'fetch') as
        | CommandSemanticNode
        | undefined;
      if (fetchNode?.roles.has('style' as never)) stillBroken.push(language);
    }
    expect(
      stillBroken,
      `these now keep style inside a handler — remove them from this list: ${stillBroken.join(', ')}`
    ).toEqual([]);
  });

});
