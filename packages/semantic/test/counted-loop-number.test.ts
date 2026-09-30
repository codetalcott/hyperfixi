/**
 * A number where a loop's form goes is its count (PR 118).
 *
 * The render writes English `times` in most languages (es `repetir 3 times`),
 * and localizes it in a few (tl `ulitin 3 beses`). A writer uses the language's
 * own word, which no reader knows (es `veces`, fr `fois`, de `mal`). The
 * generated repeat pattern then took the count for the loop's form and the word
 * after it for the count or for nothing:
 *
 * - es `repetir 3 veces …` (and pt, it, id, sw, pl, ru, uk) read `forever`,
 *   and the direct path built a silent infinite loop;
 * - fr `répéter 3 fois …` (and de, tr, ja, ko, ar) counted to a variable named
 *   `fois`.
 *
 * Found by PR 117's loop probes. Reading the native words is a vocabulary
 * decision; the count is never in doubt.
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, render } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe("a counted loop with the language's own `times` word", () => {
  it.each([
    ['es', 'al clic repetir 3 veces incrementar x fin'],
    ['pt', 'ao clique repetir 3 vezes incrementar x fim'],
    ['it', 'su click ripetere 3 volte incrementare x fine'],
    ['id', 'ketika klik ulangi 3 kali tingkatkan x selesai'],
    ['pl', 'gdy click powtórz 3 razy zwiększ x koniec'],
    ['fr', 'quand clic répéter 3 fois incrémenter x fin'],
    ['de', 'wenn klick wiederholen 3 mal erhöhe x um 2 ende'],
    ['ar', 'على النقر كرر 3 مرات زِد x نهاية'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toMatch(/^on click repeat 3 times increment x( by 2)? end$/);
  });

  it('builds a counted loop, not a forever one', () => {
    const { ast } = buildAST(parse('al clic repetir 3 veces incrementar x fin', 'es')!);
    const json = JSON.stringify(ast);
    expect(json).toContain('"loopType":{"type":"literal","value":"times"');
    expect(json).not.toContain('"forever"');
  });
});

// The index reader allows only the loop's own words between the head and
// `index`: the native word the count now stands before is one of them. Before
// the count moved, es read no index (the loop was `forever`) and ja, fr, de,
// tr, ko, ar read one only because the word was the count.
describe("the index after the language's own `times` word", () => {
  it.each([
    ['es', 'al clic repetir 3 veces index idx registrar idx fin'],
    ['fr', 'quand clic répéter 3 fois index idx enregistrer idx fin'],
    ['ja', 'クリック で 3 回 繰り返す index idx idx を 記録 終わり'],
    ['tr', 'tıklama i üzerinde 3 kez i tekrarla index idx idx i kaydet son'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat 3 times index idx log idx end');
  });
});

describe('the rendered forms still read', () => {
  it.each([
    ['es', 'al clic repetir 3 times incrementar x fin'],
    ['tl', 'kapag click ulitin 3 beses dagdagan x wakas'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat 3 times increment x end');
  });
});
