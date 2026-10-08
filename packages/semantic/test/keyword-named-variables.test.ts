/**
 * A variable named like an event or a keyword (was OPEN_ITEMS P49, P28).
 *
 * Upstream and the engine run `set input to "a"` on a variable named `input`.
 * English's own semantic parse dropped the command (an event name alone took
 * the value as the text "input", which a `set` cannot write), so every
 * language lost it; de, fr, ar, id and zh, whose tokenizers read `input` as the
 * event, lost `put "a" into input` too. The renderer wrote a lone variable in
 * the language's own word when the value lexicon had one (`set when to 1`, es
 * `establecer cuando a 1`, read back as a variable named `cuando`; bn
 * `increment i by সূচক`). The value matrix runs these names on both engines
 * (KEYWORD_NAMES); this pins the reading and the writing.
 */

import { describe, it, expect } from 'vitest';
import { parse, render, translate, getSupportedLanguages } from '../src';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');
/** Whitespace collapsed, and a name alone in parentheses (`(change)`, fr) unwrapped. */
const norm = (s: string): string =>
  s
    .replace(/(^|[^\p{L}\p{N}_$)\]])\(([\p{L}_$][\p{L}\p{M}\p{N}_$]*)\)/gu, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();

function roundTripFailures(src: string): string[] {
  const failures: string[] = [];
  const en = norm(translate(src, 'en', 'en'));
  if (en !== src) failures.push(`en: "${src}" → "${en}"`);
  for (const lang of FOREIGN) {
    const translated = translate(src, 'en', lang);
    const back = norm(translate(translated, lang, 'en'));
    if (back !== src) failures.push(`${lang}: "${translated}" → "${back}"`);
  }
  return failures;
}

describe('a variable named like an event', () => {
  for (const name of ['input', 'keyup', 'change', 'click']) {
    for (const src of [
      `on click set ${name} to "a"`,
      `on click put "a" into ${name} then log 1`,
      `on click increment ${name}`,
      `on click toggle .a on ${name}`,
      `on click put ${name} into #out`,
    ]) {
      it(src, () => {
        const failures = roundTripFailures(src);
        expect(failures, failures.join('\n')).toEqual([]);
      });
    }
  }

  it('English reads it as the variable', () => {
    const node = parse('set input to "a"', 'en');
    expect(node.action).toBe('set');
    expect(node.roles.get('destination')).toMatchObject({ type: 'expression', raw: 'input' });
  });

  // Where an event stands, an event name is still the event: a command that
  // names one (a fused handler pattern captures `send`'s under another role),
  // and a wait.
  for (const src of [
    'on click send click to #x',
    'on click trigger keyup on #x',
    'on click wait for click then log 1',
    'on click repeat until event keyup from #b add .a end',
  ]) {
    it(`an event stays an event: ${src}`, () => {
      const failures = roundTripFailures(src);
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }
});

describe('a variable is written as spelled where its own word would read as another', () => {
  for (const src of [
    'on click set when to 1',
    'on click increment i by index',
    'on click set x to length',
    'on click put value into #out',
    'on click put when + 1 into #out',
    'on click put value + 1 into #out',
    'on click if not value put 1 into #out end',
  ]) {
    it(src, () => {
      const failures = roundTripFailures(src);
      expect(failures, failures.join('\n')).toEqual([]);
    });
  }

  it('es writes `when` as spelled, not as its keyword', () => {
    expect(translate('on click set when to 1', 'en', 'es')).toBe('al clic establecer when a 1');
  });

  // vi's `giá trị` alone reads as `value`, but after `đặt` (put) the two
  // read as vi's `set` verb: the verified render re-reads it and spells it.
  it('vi spells a variable its own word would fuse with', () => {
    expect(translate('on click put value into #out', 'en', 'vi')).toBe(
      'khi nhấp đặt value vào #out'
    );
  });

  // A word the reader takes for the same value keeps its localized form.
  it('a value word keeps its localized form', () => {
    expect(translate('on click if it log 1 end', 'en', 'es')).toContain('si ello');
    expect(render(parse('on click pick characters 0 to 5 of #note', 'en'), 'es')).toContain(
      'caracteres'
    );
    // A positional word is vocabulary, not a variable.
    expect(translate('on click add .a to next <li/>', 'en', 'vi')).toContain('tiếp theo');
  });
});
