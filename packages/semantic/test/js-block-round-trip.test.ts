/**
 * A `js … end` block survives a render/re-parse — verbatim, and in every language.
 *
 * Three separate faults made the js body lossy, and all three are invisible to
 * the fidelity metrics (the body is one `expression` role; its TEXT is never
 * compared). Only the English round-trip sees them, which is why they surfaced
 * as kept rows once the `best` corpus writer's round-trip veto arrived.
 *
 * 1. SPACING. `consumeJsBlock` rebuilt the body as
 *    `bodyTokens.map(t => t.value).join(' ')`, so `console.log("from js")` came
 *    back as `console .log ( "from js" )`. It is not cosmetic: the body is code
 *    in another language, and a `//` comment or an ASI-sensitive line break
 *    means something different once re-spaced.
 * 2. THE MISSING `end`. The renderer emitted `end` only when a sibling command
 *    FOLLOWED the `js`. A trailing `js` was left open — fine for execution,
 *    fatal for round-tripping: with no closing `end` there is no block for
 *    `consumeJsBlock` to claim, so the per-language `js` PATTERN took over
 *    instead. In zh that pattern splits the `JS执行` compound verb and returns
 *    `js 执行`, losing the entire body.
 * 3. A PRE-POSED PATIENT MARKER. he renders `js את console.log(…)` and zh
 *    `JS执行 把 console.log(…)`; the particle was fed straight into the opaque
 *    body (`js את console.log ( … )`). ja/ko/bn/tr/qu are unaffected — their
 *    markers follow the body.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

const SOURCE = 'on click js console.log("from js") end';

/** Every language with a js keyword and a tokenizer, across the script families. */
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

function referenceEnglish(source: string): string {
  const node = parseSemantic(source, 'en')?.node;
  expect(node, `en did not parse: ${source}`).toBeTruthy();
  return render(node!, 'en');
}

describe('the English reference is a fixed point', () => {
  it.each([
    SOURCE,
    'js console.log("a") end',
    'on click js console.log("a") end then toggle .x',
    'on click toggle .x then js console.log("a") end',
  ])('%s renders to itself', source => {
    expect(referenceEnglish(source)).toBe(source);
  });

  it('emits exactly one `end`, whether or not a sibling follows', () => {
    // The `end` moved out of the two statement-joining paths and into `render`
    // itself; a chained js must not pick up a second one on the way.
    expect(referenceEnglish('on click js console.log("a") end then toggle .x')).toBe(
      'on click js console.log("a") end then toggle .x'
    );
    expect([...referenceEnglish(SOURCE).matchAll(/\bend\b/g)]).toHaveLength(1);
  });
});

describe('every language round-trips the block', () => {
  it.each(LANGUAGES)('%s', language => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    const rendered = render(reference, language);
    const reparsed = parseSemantic(rendered, language)?.node;
    expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
    expect(render(reparsed!, 'en')).toBe(SOURCE);
  });

  it.each(LANGUAGES)('%s keeps the JavaScript byte-for-byte', language => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    const rendered = render(reference, language);
    // The body is code: it must survive the localization untouched, with its
    // own spacing. `console .log ( "from js" )` is the shape that used to come
    // back and is what this asserts against.
    expect(rendered, `${language} re-spaced the js body`).toContain('console.log("from js")');
  });
});

describe('a pre-posed patient marker does not leak into the JavaScript', () => {
  // he `את` and zh `把` sit BEFORE the body, where the opaque-span walk would
  // otherwise swallow them as code. Both keep their marker on the surface — the
  // fix is that the marker is not part of the JavaScript.
  it.each([
    ['he', 'ב click js את console.log("from js") סוף'],
    ['zh', '一 点击 就 JS执行 把 console.log("from js") 结束'],
  ])('%s', (language, expected) => {
    const reference = parseSemantic(SOURCE, 'en')!.node!;
    const rendered = render(reference, language);
    expect(rendered).toBe(expected);
    const parsed = parseSemantic(rendered, language)?.node as
      { body?: Array<{ roles?: Map<string, unknown> }> } | undefined;
    expect(
      parsed?.body?.[0]?.roles?.get('patient'),
      `nothing captured from ${rendered}`
    ).toMatchObject({ raw: 'console.log("from js")' });
  });
});

describe('a BARE block is as opaque as one inside a handler', () => {
  // `consumeJsBlock` used to be reachable only from the clause walk, so the same
  // block on its own fell to the per-language `js` PATTERN — which re-spaces the
  // body and, in zh, splits the `JS执行` compound verb and returns `js 执行`.
  it.each(['zh', 'he', 'ja', 'ko', 'bn', 'tr', 'qu'])('%s', language => {
    const bare = parseSemantic('js console.log("from js") end', 'en')!.node!;
    const rendered = render(bare, language);
    const reparsed = parseSemantic(rendered, language)?.node as
      { roles?: Map<string, unknown> } | undefined;
    expect(reparsed?.roles?.get('patient'), `lost in ${rendered}`).toMatchObject({
      raw: 'console.log("from js")',
    });
    expect(render(reparsed as never, 'en')).toBe('js console.log("from js") end');
  });
});

/**
 * Languages whose `js(args) … end` round-trips today. The other twelve (es, id,
 * it, ms, pl, pt, ru, sw, th, tl, uk, vi) stop the opaque walk at the `(` of the
 * argument list and come back as `js (` — a separate, pre-existing defect in the
 * head-form body walk, not one this change introduces. Pinned as a list rather
 * than omitted, so clearing it shows up here as a failing exclusion.
 */
const ARGS_FORM_OK = ['ar', 'bn', 'de', 'fr', 'he', 'hi', 'ja', 'ko', 'qu', 'tr', 'zh'] as const;

describe('the `js(args) … end` form', () => {
  const WITH_ARGS = 'on click js(me) if (!window.confirm("x")) return "cancel"; end';

  it('the English reference keeps the whole body, argument list included', () => {
    // `js(me) …` used to leave FIFTEEN tokens unconsumed and capture `(` as the
    // body; the raw JavaScript then reached the command patterns and produced
    // phantom `if`/`return` commands.
    expect(referenceEnglish(WITH_ARGS)).toBe(
      'on click js (me) if (!window.confirm("x")) return "cancel"; end'
    );
  });

  it.each(ARGS_FORM_OK)('%s round-trips it', language => {
    const reference = parseSemantic(WITH_ARGS, 'en')!.node!;
    const rendered = render(reference, language);
    const reparsed = parseSemantic(rendered, language)?.node;
    expect(reparsed, `${language} did not re-parse: ${rendered}`).toBeTruthy();
    expect(render(reparsed!, 'en')).toBe(referenceEnglish(WITH_ARGS));
  });
});

describe('a VERB-FINAL block is claimed whole', () => {
  // SOV and agglutinative renders put the command word last (`<body> <marker>
  // <js> <end>`), so the head of the clause is the JavaScript and the head-form
  // walk never fired. The body then reached the command patterns — which is how
  // bn/ja/ko/tr/qu/hi lost it. Asserted on the ARGS body, where nothing else
  // rescues these six.
  const WITH_ARGS = 'on click js(me) if (!window.confirm("x")) return "cancel"; end';

  it.each(['bn', 'hi', 'ja', 'ko', 'qu', 'tr'])('%s', language => {
    const reference = parseSemantic(WITH_ARGS, 'en')!.node!;
    const rendered = render(reference, language);
    const parsed = parseSemantic(rendered, language)?.node as
      | { body?: Array<{ metadata?: { patternId?: string }; roles?: Map<string, unknown> }> }
      | undefined;
    expect(parsed?.body?.[0]?.metadata?.patternId).toBe(`js-opaque-final-${language}`);
    expect(parsed?.body?.[0]?.roles?.get('patient')).toMatchObject({
      raw: '(me) if (!window.confirm("x")) return "cancel";',
    });
  });

  it("bn's `শেষ` closes a js block, though it is not a curated `end`", () => {
    // bn's curated end set omits `শেষ` on purpose — it doubles as the positional
    // word `last`. But `শেষ` is what the renderer emits for bn's `end`, so
    // without the js-block-specific terminator the block had no recognizable
    // close at all. The homonym cannot bite inside a js body: raw JavaScript is
    // ASCII.
    const parsed = parseSemantic('console.log("x") কে জেএস শেষ', 'bn')?.node as
      { roles?: Map<string, unknown> } | undefined;
    expect(parsed?.roles?.get('patient')).toMatchObject({ raw: 'console.log("x")' });
  });
});
