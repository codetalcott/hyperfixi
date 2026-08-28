/**
 * `as <Type>` is part of the VALUE, not a dropped tail.
 *
 * `set ^user to attrs.data as JSON` parsed, scored 1.0 on every fidelity signal
 * against its own re-render, and had silently lost `as JSON`: the conversion
 * landed in no role, so every recall metric compared two equally truncated
 * things. Eleven ratchet signals and ~9,600 unit tests were blind to it. What
 * finally saw it was the corpus writer's `reRenderPreservesContent` guard, whose
 * response was to refuse to translate the body — which is why
 * `component-with-attrs` was a kept i18n row in all 23 languages.
 *
 * The fix folds a trailing `as <ConversionType>` into the captured value's raw,
 * the same lever the operator-run fold uses for `"Hello, " + my value`.
 *
 * The two halves that have to stay true together:
 *   - a conversion is CARRIED (this is the bug), and
 *   - `fetch … as json` still binds its real `responseType` role (this is the
 *     regression the fold could cause — measured: without the
 *     `patternTokenWouldMatch` guard, `fetch /api as json` folds the conversion
 *     into `source` and loses the role entirely).
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';
import { parseSemantic, render } from '../src/index';
import type { CommandSemanticNode } from '../src/types';

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

function renderEn(code: string): string | null {
  const node = parseSemantic(code, 'en')?.node;
  return node ? render(node, 'en') : null;
}

describe('a trailing `as <Type>` survives the parse', () => {
  it.each([
    'set ^user to attrs.data as JSON',
    'set x to y as Int',
    "set :count to '5' as Number",
    'put it as JSON into #out',
  ])('%s re-renders with its conversion intact', code => {
    expect(renderEn(code)).toBe(code);
  });

  it('binds the conversion to the value, not to a role of its own', () => {
    const node = parse('set ^user to attrs.data as JSON', 'en') as CommandSemanticNode;
    const patient = node.roles.get('patient' as never) as { raw?: string };
    expect(patient?.raw).toBe('attrs.data as JSON');
  });

  it('leaves a value with no conversion alone', () => {
    const node = parse('set ^user to attrs.data', 'en') as CommandSemanticNode;
    const patient = node.roles.get('patient' as never) as { raw?: string };
    expect(patient?.raw).toBe('attrs.data');
  });

  it('does not fold a bare `as` with no conversion type after it', () => {
    // `as` before a non-type word is not a conversion — the fold must decline
    // rather than swallow whatever follows.
    const node = parse('set x to y as somethingElse', 'en') as CommandSemanticNode | null;
    const patient = node?.roles.get('patient' as never) as { raw?: string } | undefined;
    expect(patient?.raw).toBe('y');
  });
});

describe("fetch's response-type role is not stolen by the fold", () => {
  // The regression the fold could cause. Without the `patternTokenWouldMatch`
  // guard this parses as `fetch-en-simple` with source `/api as json` — one
  // role instead of two, and the URL corrupted.
  it('keeps `as json` as the responseType role', () => {
    const node = parse('fetch /api as json', 'en') as CommandSemanticNode;
    expect(node.metadata?.patternId).toBe('fetch-en-with-response-type');
    const responseType = node.roles.get('responseType' as never) as { raw?: string };
    expect(responseType?.raw).toBe('json');
    const source = node.roles.get('source' as never) as { value?: string };
    expect(source?.value).toBe('/api');
  });

  it.each(LANGUAGES)('%s still round-trips the fetch response type', language => {
    const rendered = translate('fetch /api as json', 'en', language);
    expect(renderEn(translate(rendered, language, 'en'))).toBe('fetch "/api" as json');
  });
});

describe('the conversion round-trips in every language', () => {
  // The corpus row this fix exists for. The conversion word itself stays
  // English — no profile has an `as` lexicon entry — so what has to work is
  // that a foreign surface carrying the English `as JSON` re-parses as one
  // value rather than stranding two tokens.
  const SOURCE = 'set ^user to attrs.data as JSON';

  it.each(LANGUAGES)('%s', language => {
    const rendered = translate(SOURCE, 'en', language);
    expect(rendered, `${language} dropped the conversion`).toContain('as JSON');
    const node = parse(rendered, language) as CommandSemanticNode | null;
    expect(node, `${language}: ${rendered} did not re-parse`).not.toBeNull();
    expect(render(node!, 'en'), `${language}: ${rendered}`).toBe(SOURCE);
  });
});
