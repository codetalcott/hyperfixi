/**
 * Two role-binding repairs from the canonical kept-row queue. Both are the same
 * shape as earlier entries in this arc: a language missing from a schema's
 * `markerOverride` falls to its profile default, and a hand-crafted pattern that
 * outlived the generated one it was written to work around.
 *
 * 1. tl was the ONE language with a `swap` patient with-word (`nang`) and no
 *    DESTINATION entry, so it fell to its profile destination marker and
 *    rendered `palitan_pwesto sa #a nang #b`. `sa` there is read as the role
 *    marker it is, both selectors bind to the wrong slots, and the parse came
 *    back `swap with destination` — both roles gone. Every other SVO/VSO
 *    language in that map renders the destination unmarked, and so does the
 *    i18n row.
 *
 * 2. `go-qu-url-dest` was a hand-crafted pattern (priority 105) for qu's fronted
 *    `url <dest> man riy` phrase. Its extraction re-typed the capture through
 *    `transform`, and on the fused handler path that transform does not run: the
 *    pattern still won and bound `back` as a string LITERAL where English — and
 *    every other language, via the generated `go-{lang}-generated-url` shape —
 *    produces an EXPRESSION. `on click go back` came back as `go url "back"`.
 *    Measured with the pattern removed: the quoted-URL row it was written for
 *    still parses identically through the generated pattern, `go-back` is
 *    repaired, and no other corpus row moves.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

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

function bodyRoles(code: string, language: string): Map<string, unknown> | undefined {
  const node = parseSemantic(code, language)?.node as
    { roles?: Map<string, unknown>; body?: Array<{ roles?: Map<string, unknown> }> } | undefined;
  return node?.body?.[0]?.roles ?? node?.roles;
}

function roundTrip(english: string, language: string): string {
  const reference = parseSemantic(english, 'en')?.node;
  const rendered = render(reference!, language);
  const reparsed = parseSemantic(rendered, language)?.node;
  expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
  return render(reparsed!, 'en');
}

describe('swap binds both of its elements', () => {
  const SOURCE = 'on click swap #a with #b';

  it.each(LANGUAGES)('%s', language => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    expect(roundTrip(SOURCE, language)).toBe(render(reference, 'en'));
    const roles = bodyRoles(render(reference, language), language);
    expect(roles?.get('destination')).toMatchObject({ value: '#a' });
    expect(roles?.get('patient')).toMatchObject({ value: '#b' });
  });

  it('tl renders the destination unmarked, like every other SVO/VSO language', () => {
    const rendered = render(parseSemantic(SOURCE, 'en')!.node!, 'tl');
    expect(rendered).toBe('kapag click palitan_pwesto #a nang #b');
  });
});

describe('`go back` keeps its destination an EXPRESSION', () => {
  // A bare word destination is an expression; a quoted URL is a literal. qu used
  // to type both as literals, which is the whole of this row.
  it.each(LANGUAGES)('%s', language => {
    const reference = parseSemantic('on click go back', 'en')!.node!;
    expect(roundTrip('on click go back', language)).toBe(render(reference, 'en'));
    expect(bodyRoles(render(reference, language), language)?.get('destination')).toMatchObject({
      type: 'expression',
      raw: 'back',
    });
  });

  it.each(LANGUAGES)('%s still binds a quoted URL as a literal', language => {
    const reference = parseSemantic('on click go to url "/page"', 'en')!.node!;
    expect(roundTrip('on click go to url "/page"', language)).toBe(render(reference, 'en'));
    expect(bodyRoles(render(reference, language), language)?.get('destination')).toMatchObject({
      type: 'literal',
      value: '/page',
    });
  });
});
