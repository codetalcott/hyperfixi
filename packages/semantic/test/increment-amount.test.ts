/**
 * An increment's amount is any value.
 *
 * The `quantity` role took a literal only, so `increment x by n`, `by -2` and
 * `by obj.v` matched nothing and the whole `by …` clause fell away: the
 * command incremented by 1, in English and so in every translation, which is
 * rendered from the English parse.
 *
 * Eight languages (ar he id ms sw th tl zh) render the amount with no marker,
 * right after the target. There an amount that starts with `-` or `(` was
 * read into the target: ms `tambah_satu x - 2` as the target `x - 2`, and
 * `tambah_satu x (n + 1)` as a call. A target that is written is never an
 * operator run or a call.
 *
 * And `by true` rendered as the default amount, since `Number(true)` is 1.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

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
];

/**
 * Spellings that read the same on both engines: the English join spaces a
 * call's parentheses and a unary minus (`Math.max ( n , 1 )`, `- 2`).
 */
const normalize = (code: string): string =>
  code
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)/g, ')')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(^|[\s(])- (?=\w)/g, '$1-');

const SOURCES = [
  'on click increment x by n',
  'on click increment x by -2',
  'on click increment x by -n',
  'on click increment x by n + 1',
  'on click increment x by (n + 1)',
  'on click increment x by -(n + 1)',
  'on click increment x by obj.v',
  "on click increment x by obj's v",
  "on click increment x by #a's textContent",
  'on click increment x by Math.max(n, 1)',
  'on click increment x by "2"',
  'on click increment x by true',
  'on click decrement x by n + 1',
  'on click decrement x by -2',
  'on click decrement x by (n + 1)',
  // A written target keeps its own shape.
  "on click increment #a's textContent by n",
  'on click increment obj.v by -2',
];

describe.each(SOURCES)('%s', source => {
  it('keeps the amount in English', () => {
    expect(normalize(render(parse(source, 'en')!, 'en'))).toBe(normalize(source));
  });

  it.each(LANGUAGES)('%s', language => {
    const foreign = render(parse(source, 'en')!, language);
    expect(normalize(render(parse(foreign, language)!, 'en')), foreign).toBe(normalize(source));
  });
});

describe('the default amount', () => {
  it('is not written out when the parse supplied it', () => {
    expect(render(parse('on click increment x', 'en')!, 'en')).toBe('on click increment x');
    for (const language of LANGUAGES) {
      expect(render(parse('on click increment x', 'en')!, language)).not.toMatch(/\b1\b/);
    }
  });

  // An authored `by 1` is the author's: a translation keeps it (de wrote `um 1`
  // for every increment, en dropped every `by 1`, and each read as a lost value).
  it('is written out when the author wrote it', () => {
    expect(render(parse('on click increment x by 1', 'en')!, 'en')).toBe(
      'on click increment x by 1'
    );
  });
});
