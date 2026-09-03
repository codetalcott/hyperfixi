/**
 * A handler's event is typed the way ENGLISH types it — by the token kind of
 * its name.
 *
 * English gives `on.event` a `literal` when its tokenizer knows the word
 * (`click`, `mousemove`, `keydown`, `pointerdown` are keywords) and an
 * `expression` when it does not (`message`, `hello`, `transitionend`, `success`
 * are identifiers). Two other construction sites — `buildEventHandler`'s
 * canonicalization and `trySOVEventExtraction` — bound the event as a literal
 * UNCONDITIONALLY, so every non-keyword event name came back one type off the
 * reference it is scored against:
 *
 *   en  eventsource ChatStream from /events / on message / put it into #messages
 *   ko  eventsource ChatStream / message 을 에 그것 을 #messages 에 넣다
 *   ko → eventsource ChatStream / on message put it into #messages   ← identical…
 *       ref roles : on.event:expression
 *       got roles : on.event:literal                                 ← one type off
 *
 * Every other signal is 1.0 on that: same actions, same values, and the English
 * round-trip matches byte for byte. Only R1 (which compares `action.role:type`)
 * sees it, which is where the kept-row ratchet found ko's eventsource-basic and
 * socket-basic.
 *
 * The rule is keyed on the EN TOKENIZER, not on the curated `KNOWN_EVENTS` set,
 * because the two disagree: `mousemove` and `pointerdown` are English keywords
 * and are not in that set, so keying on it re-typed events English itself calls
 * literals — measured, 12 failures including an en-side pin and four analysis
 * rows.
 */

import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parseSemantic, render } from '../src/index';

function eventRole(
  code: string,
  language: string
): { type?: string; value?: unknown; raw?: unknown } | undefined {
  const node = parseSemantic(code, language)?.node as
    { roles?: Map<string, unknown>; body?: Array<{ roles?: Map<string, unknown> }> } | undefined;
  const own = node?.roles?.get('event') as Record<string, unknown> | undefined;
  if (own) return own;
  return node?.body?.[0]?.roles?.get('event') as Record<string, unknown> | undefined;
}

describe('English types the event by its token kind', () => {
  it.each(['click', 'mousemove', 'mouseover', 'keydown', 'pointerdown', 'open'])(
    '%s is a keyword → literal',
    event => {
      expect(eventRole(`on ${event} log 1`, 'en')).toMatchObject({ type: 'literal', value: event });
    }
  );

  it.each(['message', 'hello', 'transitionend', 'success', 'error', 'hover'])(
    '%s is an identifier → expression',
    event => {
      expect(eventRole(`on ${event} log 1`, 'en')).toMatchObject({
        type: 'expression',
        raw: event,
      });
    }
  );
});

describe('every language agrees with English on the type', () => {
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

  it.each(LANGUAGES)('%s', language => {
    for (const english of ['on click put it into #chat', 'on message put it into #chat']) {
      const reference = parseSemantic(english, 'en')!.node!;
      const rendered = render(reference, language);
      const got = eventRole(rendered, language);
      const want = eventRole(english, 'en');
      expect(got, `${language}: no event re-parsing ${rendered}`).toBeDefined();
      expect(got!.type, `${language}: ${rendered} (from "${english}")`).toBe(want!.type);
    }
  });
});

describe('the rows the ratchet named', () => {
  // Both are a handler head inside a FEATURE block, which reaches the SOV
  // extraction rather than the pattern path — a separate construction site with
  // the same unconditional-literal bug.
  it.each([
    ['eventsource ChatStream from /events\n  on message\n    put it into #messages\n  end\nend'],
    ['socket ChatSocket ws://localhost:8080\n  on message\n    put it into #chat\n  end'],
  ])('ko keeps on.event:expression through %s', english => {
    const reference = parseSemantic(english, 'en')!.node!;
    const rendered = render(reference, 'ko');
    const parsed = parseSemantic(rendered, 'ko')?.node as
      { body?: Array<{ roles?: Map<string, unknown> }> } | undefined;
    expect(parsed?.body?.[0]?.roles?.get('event')).toMatchObject({
      type: 'expression',
      raw: 'message',
    });
    // The rest of the parse was already identical — that is what made this
    // invisible to every signal but R1.
    expect(render(parsed as never, 'en')).toBe(render(reference, 'en'));
  });
});
