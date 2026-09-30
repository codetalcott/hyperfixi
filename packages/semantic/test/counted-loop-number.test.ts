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
 *
 * PR 119: in he, hi, qu and zh no loop pattern matched at all, and the clause
 * walk read the verb alone, `forever`, dropping the count beside it. PR 120:
 * in hi and qu a loop pattern matched at the verb and read on into the body.
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

// PR 119. The counted patterns of he, hi, qu and zh write a marker by the
// count and the English `times` after it (he `חזור את {quantity} times`). With
// the language's own word no loop pattern matched, and the clause walk read
// the verb alone: a bare `repeat`, `forever`, with the count dropped.
describe('a count beside a repeat verb no loop pattern matches', () => {
  it.each([
    ['he', 'ב click חזור את 3 פעמים הגדל את x סוף'],
    ['zh', '一 点击 就 重复 把 3 次 增加 把 x 结束'],
    ['hi', 'click पर 3 बार को दोहराएं x को बढ़ाएं समाप्त'],
    ['qu', 'maykama click 3 kuti ta kutipay x ta yapachiy tukukuy'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat 3 times increment x end');
  });

  // The count, its marker and the word after it are the loop's: nothing is
  // left over, where the walk used to report the run it dropped.
  it.each([
    ['he', 'ב click חזור את 3 פעמים הגדל את x סוף'],
    ['hi', 'click पर 3 बार को दोहराएं x को बढ़ाएं समाप्त'],
  ])('leaves nothing unconsumed: %s', (language, code) => {
    const unconsumed = (parse(code, language)?.diagnostics ?? []).filter(
      d => d.code === 'unconsumed-input'
    );
    expect(unconsumed).toEqual([]);
  });

  // A number, as PR 118 reads one: a string or a duration there is no count.
  it.each(['"a"', '3s'])('%s beside the verb is no count (zh)', value => {
    expect(english(`一 点击 就 重复 把 ${value} 次 增加 把 x 结束`, 'zh')).not.toContain('times');
  });

  it.each([
    ['zh', '一 点击 就 重复 把 3 次 index idx 日志 把 idx 结束'],
    ['hi', 'click पर 3 बार को दोहराएं index idx idx को लॉग समाप्त'],
  ])('keeps the index: %s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat 3 times index idx log idx end');
  });

  // The English verb the render writes in the SOV languages (qu `3 times ta
  // repeat`) is a plain identifier there, which no bare-verb reading saw: with
  // the language's own `times` the loop was dropped, or the parse failed.
  it.each([
    ['qu', 'maykama click 3 kuti ta repeat click suyay tukukuy', 'wait for click'],
    ['tr', 'tıklama i üzerinde 3 kez i repeat x i artır son', 'increment x'],
    ['ja', 'クリック を で 3 回 を repeat x を 増加 終わり', 'increment x'],
  ])('beside the English verb: %s: %s', (language, code, body) => {
    expect(english(code, language)).toBe(`on click repeat 3 times ${body} end`);
  });

  // A verb-final command that anchors at the verb (qu `kutipay suyay`) gives
  // the verb back as a bare loop head; the count before it is its count.
  it('when a verb-final command takes the verb (qu)', () => {
    const code = "maykama click 3 kuti ta kutipay suyay .a ta t'ikray tukukuy";
    expect(english(code, 'qu')).toBe('on click repeat 3 times toggle .a end');
  });

  // The English verb with no count reads as it did: not a loop head (a
  // `forever` would turn a dropped loop into an infinite one).
  it('the English verb alone is no loop (qu)', () => {
    expect(english('maykama click repeat x ta yapachiy tukukuy', 'qu')).not.toContain('repeat');
  });

  it('builds a counted loop, not a forever one', () => {
    const { ast } = buildAST(parse('ב click חזור את 3 פעמים הגדל את x סוף', 'he')!);
    const json = JSON.stringify(ast);
    expect(json).toContain('"loopType":{"type":"literal","value":"times"');
    expect(json).not.toContain('"forever"');
  });
});

// PR 120. An SOV loop head ends with its verb, so a repeat match anchored at
// the verb reads on into the body: the verb-first fallback (qu `kutipay
// {loopType}`) took the body's first value for the loop's form, and after a
// count any loop pattern could take the body (hi's `for … in`).
describe('an SOV loop verb ends its head', () => {
  it.each([
    ['hi', 'click पर 3 बार को दोहराएं 1s प्रतीक्षा समाप्त', 'wait 1s'],
    ['qu', 'maykama click 3 kuti ta kutipay 1s suyay tukukuy', 'wait 1s'],
    ['qu', 'maykama click 3 kuti ta kutipay click suyay tukukuy', 'wait for click'],
    ['qu', 'maykama click 3 kuti ta kutipay "x" ta qillqakuy tukukuy', 'log "x"'],
    // A number after the verb is the body's too, after a count.
    ['hi', 'click पर 3 बार को दोहराएं 1 को लॉग समाप्त', 'log 1'],
    // And so is a whole loop form: `me in hello` read `for me in hello`.
    ['hi', 'click पर 3 बार को दोहराएं मैं में hello पर भेजें समाप्त', 'send hello to me'],
  ])('%s: %s', (language, code, body) => {
    expect(english(code, language)).toBe(`on click repeat 3 times ${body} end`);
  });

  // Without a count, the bare verb before a body is `forever`, as hi and ja
  // read it (qu read `repeat 1s` and lost the wait).
  it('the bare verb before a value (qu)', () => {
    expect(english('maykama click kutipay 1s suyay tukukuy', 'qu')).toBe(
      'on click repeat wait 1s end'
    );
  });

  // Only where the verb ends the head: before a verb-first loop a stray
  // number is not its count, and the loop keeps its form.
  it('a number before a verb-first loop (es)', () => {
    expect(english('al clic 3 repetir mientras x < 3 incrementar x fin', 'es')).toBe(
      'on click repeat while x < 3 increment x end'
    );
  });

  // Code-switched verb-first forms stay the head's: a loop form, or a number
  // with no count before the verb.
  it.each([
    ["maykama click kutipay forever .a ta t'ikray tukukuy", 'repeat forever'],
    ["maykama click kutipay 3 .a ta t'ikray tukukuy", 'repeat 3 times'],
  ])('qu: %s', (code, head) => {
    expect(english(code, 'qu')).toBe(`on click ${head} toggle .a end`);
  });
});

describe('the rendered forms still read', () => {
  it.each([
    ['es', 'al clic repetir 3 times incrementar x fin'],
    ['tl', 'kapag click ulitin 3 beses dagdagan x wakas'],
    ['he', 'ב click חזור את 3 times הגדל את x סוף'],
    ['qu', 'maykama click 3 times ta repeat x ta yapachiy tukukuy'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat 3 times increment x end');
  });
});
