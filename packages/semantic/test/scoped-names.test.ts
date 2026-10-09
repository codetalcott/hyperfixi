/**
 * A variable with its scope (`global x`, `element x`, `the element's x`,
 * `local x`, `dom x`) is one name, as upstream reads it (P45, M1 phase 3 group
 * 4). The tokenizer fuses it into one token in every language, the reader
 * takes it as a reference, as it does `$x`, and every language writes it as
 * written, `element` in its own word (M2 sheet A10, element-scope.test.ts).
 * Before, the scope word stood alone and its command was dropped.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, tokenize, translate } from '../src/index';
import { ELEMENT_SCOPE } from '../src/element-scope';

const roundTrip = (code: string, language: string): string =>
  translate(translate(code, 'en', language), language, 'en');

const firstCommand = (code: string, language = 'en') =>
  (
    parse(code, language) as unknown as {
      body: Array<{ action: string; roles: Map<string, { type: string; value?: unknown }> }>;
    }
  ).body[0]!;

describe('a name with its scope is one value', () => {
  it.each([
    ['on click set global x to 10', 'global x'],
    ['on click set element x to 10', 'element x'],
    ["on click set the element's x to 10", "the element's x"],
    ["on click set element's x to 10", "element's x"],
    ['on click set local x to 1', 'local x'],
    ['on click set dom x to 1', 'dom x'],
  ])('%s', (code, name) => {
    const set = firstCommand(code);
    expect(set.roles.get('destination')).toMatchObject({ type: 'reference', value: name });
    expect(translate(code, 'en', 'en')).toBe(code);
  });

  it('in any value position', () => {
    expect(firstCommand('on click increment global count').roles.get('patient')).toMatchObject({
      type: 'reference',
      value: 'global count',
    });
    expect(translate('on click put element x into me', 'en', 'en')).toBe(
      'on click put element x into me'
    );
  });

  it.each(['es', 'ja', 'zh', 'ar', 'ko', 'tr', 'ru', 'hi', 'de'])(
    'every language writes it as written, element in its own word (%s)',
    language => {
      for (const code of [
        'on click set element x to 10 then put element x into me',
        'on click set global x to 10 then set @out to x',
      ]) {
        expect(translate(code, 'en', language)).toContain(
          code.includes('global') ? 'global x' : `${ELEMENT_SCOPE[language]} x`
        );
        expect(roundTrip(code, language)).toBe(code);
      }
      // `the element's x` is `element x` on both engines, and reads back so.
      expect(
        roundTrip("on click set the element's x to 10 then set @out to the element's x", language)
      ).toBe('on click set element x to 10 then set @out to element x');
    }
  );
});

describe('where a scoped name stands, and what stays apart', () => {
  const values = (code: string, language = 'en') =>
    tokenize(code, language).tokens.map(t => t.value);

  it('a scope word alone is a name', () => {
    expect(values('set element to 5')).toEqual(['set', 'element', 'to', '5']);
    expect(firstCommand('on click set element to 5').roles.get('destination')).toMatchObject({
      raw: 'element',
    });
  });

  it('a call argument is a value position too', () => {
    expect(values('call foo(global x)')).toContain('global x');
  });

  it('a word of the language after it (es `mi`, my)', () => {
    expect(values('establecer element mi a 5', 'es')).not.toContain('element mi');
  });

  it('a name outside ASCII: the scope word stands alone, and the command stays loud', () => {
    expect(values('global 合計 を 10 に 設定', 'ja')).not.toContain('global 合計');
  });

  it('two scope words', () => {
    expect(values('set global element to 5')).not.toContain('global element');
  });
});
