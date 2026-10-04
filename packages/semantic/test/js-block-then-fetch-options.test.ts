/**
 * A `js … end` block followed by `then` and a fetch with an options object
 * reads back in every language (found by the fetch-formdata corpus row, C2c).
 *
 * Two readers broke it in ja. The program splitter closed the handler at the
 * js block's `end`: it does not count `js` as a block opener, and the rest,
 * `それから "/x" {method:"POST"} で フェッチ`, parsed as a second handler. ja's
 * `で` is both the event marker and the instrument marker, so the options
 * object's `}` became an event. A handler's `end` is never followed by
 * `then`, so that `end` now closes the inner block. And the bare form's
 * custom-event pass took the `}` itself for an event name; an event name is
 * now a name.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const HANDLER = `on submit js(me) return new FormData(me.closest('form')) end then fetch /api/submit with method:"POST", body:it`;
const BARE = `js(me) return 1 end then fetch /api/submit with method:"POST"`;

describe('a js block, then a fetch with options, through every language', () => {
  const english = render(parse(HANDLER, 'en')!, 'en');

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(HANDLER, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

describe('bare, in the SOV languages whose marker reads `{…} <marker>`', () => {
  const english = render(parse(BARE, 'en')!, 'en');

  it.each(['ja', 'ko', 'tr', 'qu', 'bn'])('%s', language => {
    const foreign = render(parse(BARE, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(english);
  });
});

it('a handler that ends before `then` is still two handlers when it really is', () => {
  const node = parse('on click add .a end on keyup add .b end', 'en');
  expect(render(node!, 'en')).toMatch(/^on click add \.a\s+end\s+on keyup add \.b\s+end$/);
});
