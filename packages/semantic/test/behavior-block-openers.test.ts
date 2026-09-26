/**
 * A behavior keeps every handler when one of them holds a block head of
 * several words.
 *
 * The block parser splits a behavior into handlers by tracking block depth:
 * each word that opens a block raises it, each `end` lowers it, and a handler
 * ends at an `end` at depth 0. It counted every opener word, so a head of two
 * (`repeat while`, `repeat for`) raised the depth twice, and a marker that
 * spells an opener (`wait for`, `take … for me`, `toggle … for 2s`, and ja `間`
 * / ko `동안` in toggle's duration) raised it for nothing. The handler's own
 * `end` then closed nothing, and every later handler landed inside it with its
 * head lost, in English and so in every translation. `else if` was the same:
 * its `if` continues the chain, which one `end` closes.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// The first of two handlers; the second is always `on keyup log 2 end`.
const FIRST = {
  'wait for': 'on click wait for keyup end',
  'wait for … or': 'on click wait for keyup or 1s end',
  'take … for me': 'on click take .a from .b for me end',
  'toggle … for 2s': 'on click toggle .x for 2s end',
  'repeat while': 'on click repeat while x < 3 increment x end end',
  'repeat for': 'on click repeat for x in .a log x end end',
  'a wait in a repeat for': 'on click repeat for x in .a wait for keyup end end',
  'repeat while inside an if': 'on click if x repeat while x < 3 increment x end end end',
  'an if inside repeat while': 'on click repeat while x < 3 if x log 1 end increment x end end',
  'for': 'on click for x in .a log x end end',
  // The chain's one `end`, then the handler's.
  'else if': 'on click if x log 1 else if x log 2 end end',
};

// pt `para` and sw `kwa` also mark a destination, and their tokenizers read the
// for-loop's word as that marker, so the loop's `end` closes the handler (filed).
const GAPS = new Set(['for/pt', 'for/sw']);

type Handler = { roles: Map<string, { value?: unknown }> };

/** The events of a parsed behavior's handlers, in order. */
function handlerEvents(node: unknown): unknown[] {
  const handlers = (node as { eventHandlers?: Handler[] }).eventHandlers ?? [];
  return handlers.map(h => h.roles.get('event')?.value);
}

const behavior = (first: string) => `behavior Demo(h)\n  ${first}\n  on keyup log 2 end\nend`;

describe.each(Object.entries(FIRST))('%s', (shape, first) => {
  const src = behavior(first);

  it('en', () => {
    expect(handlerEvents(parse(src, 'en'))).toEqual(['click', 'keyup']);
  });

  it.each(FOREIGN.filter(language => !GAPS.has(`${shape}/${language}`)))('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(handlerEvents(parse(foreign, language)), foreign).toEqual(['click', 'keyup']);
  });
});

it('pt and sw still close a bare for-loop’s handler early (known gap)', () => {
  for (const language of ['pt', 'sw']) {
    const foreign = render(parse(behavior(FIRST.for), 'en')!, language);
    expect(handlerEvents(parse(foreign, language))).not.toEqual(['click', 'keyup']);
  }
});
