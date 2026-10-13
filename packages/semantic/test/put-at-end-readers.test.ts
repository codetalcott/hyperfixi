/**
 * `put X at end of Y` reads back where two readers took the phrase apart.
 *
 * - vi writes `tại kết thúc của tôi` for `at end of me`, and its tokenizer reads
 *   `của tôi` as one `my` token, so the at-end pattern saw no `của` and no
 *   destination, and the clause walk cut a handler's body at `kết thúc` (end).
 * - In bn, hi, ja, qu and tr the `at` word is the event marker too, so a bare
 *   name before it (`response で 終わり の #results を 置く`) read as a handler
 *   on `response`.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';

const squeeze = (s: string) => s.replace(/\s+/g, '');

const roundTrip = (source: string, language: string) => {
  const foreign = translate(source, 'en', language);
  expect(squeeze(translate(foreign, language, 'en')), foreign).toBe(squeeze(source));
};

describe('vi `at end of me`', () => {
  it.each([
    'put "x" at end of me',
    'on click put "x" at end of me then add .done to me',
    'on click repeat 3 times put "a" at end of me end',
    'on click put "x" at end of #list',
  ])('%s', source => roundTrip(source, 'vi'));

  it('reads `của tôi` as of me', () => {
    const node = parse('đặt "x" tại kết thúc của tôi', 'vi') as {
      roles: Map<string, { value?: unknown }>;
    };
    expect(node.roles.get('destination')?.value).toBe('me');
    expect(node.roles.get('manner')?.value).toBe('at end of');
  });
});

describe.each(['bn', 'hi', 'ja', 'qu', 'tr'])('%s: a name before `at end of`', language => {
  it.each([
    'put response at end of #results',
    'on click put response at end of #results',
    'put "Hello" into #message then put response at end of #results',
  ])('%s', source => roundTrip(source, language));

  it('a custom event before its marker is still the head', () => {
    roundTrip('on hello put 1 into me', language);
    roundTrip('on foo put response at end of #results', language);
  });
});
