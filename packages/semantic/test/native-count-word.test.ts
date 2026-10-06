/**
 * Each language's own word for `times` is read (PR 127).
 *
 * The render writes English `times` in every language whose dictionary has no
 * word for it (all but bn, ms, th, tl and vi), so a writer's own word was
 * unknown to the reader. PRs 118–119 read a NUMBER before it as the count by
 * position, and nothing else:
 *
 * - a variable count read `forever`, a silent infinite loop (es `repetir n
 *   veces`), or lost the loop (ja `n 回 繰り返し`);
 * - de `wiederholen 3 mal setze x auf 1` lost its body: the generated pattern's
 *   event slot took the body's verb;
 * - the English `repeat` the SOV renders write, beside a native word, read the
 *   body as the head (hi `3 बार को repeat मैं में hello पर भेजें`, `repeat for me
 *   in hello`).
 *
 * The words are read (`patterns/count-words.ts`): the counted heads take them,
 * and so do the count readers, where a head needs a marker the writer left out
 * (ja `n 回 繰り返し`, zh `重复 n 次`). Since PR 131 the render writes them too
 * (`native-count-render.test.ts`).
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, render } from '../src/index';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

describe("a variable count before the language's own word", () => {
  it.each([
    ['es', 'al clic repetir n veces incrementar x fin'],
    ['pt', 'ao clique repetir n vezes incrementar x fim'],
    ['fr', 'quand clic répéter n fois incrémenter x fin'],
    ['de', 'wenn klick wiederholen n mal erhöhe x ende'],
    ['it', 'su click ripetere n volte incrementare x fine'],
    ['id', 'ketika klik ulangi n kali tingkatkan x selesai'],
    ['sw', 'unapo click rudia n mara ongezeko x mwisho'],
    ['sw', 'unapo click rudia mara n ongezeko x mwisho'],
    ['pl', 'gdy click powtórz n razy zwiększ x koniec'],
    ['ru', 'при click повторить n раз увеличить x конец'],
    ['uk', 'при click повторити n разів збільшити x кінець'],
    ['ar', 'على النقر كرر n مرات زِد x نهاية'],
    ['he', 'ב click חזור את n פעמים הגדל את x סוף'],
    ['zh', '一 点击 就 重复 把 n 次 增加 把 x 结束'],
    ['zh', '一 点击 就 重复 n 次 增加 把 x 结束'],
    ['tr', 'tıklama i üzerinde n kez tekrarla x i artır son'],
    ['qu', 'maykama click n kuti kutipay x ta yapachiy tukukuy'],
    ['ja', 'クリック で n 回 繰り返し x を 増加 終わり'],
    ['ko', '클릭 할 때 n 번 반복 x 을 증가 끝'],
    ['hi', 'click पर n बार दोहराएं x को बढ़ाएं समाप्त'],
    ['bn', 'ক্লিক তে n বার পুনরাবৃত্তি x কে বৃদ্ধি শেষ'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toBe('on click repeat n times increment x end');
  });

  // sw writes the count after its word; the render writes it before (the
  // render's head outranks the word-first one), in sw's own word since PR 131.
  it('reads sw word-first and renders count-first', () => {
    expect(english('unapo click rudia mara 3 ongezeko x mwisho', 'sw')).toBe(
      'on click repeat 3 times increment x end'
    );
    expect(render(parse('on click repeat 3 times increment x end', 'en')!, 'sw')).toBe(
      'unapo click rudia 3 mara ongezeko x mwisho'
    );
  });

  it('builds a counted loop, not a forever one', () => {
    const { ast } = buildAST(parse('al clic repetir n veces incrementar x fin', 'es')!);
    const json = JSON.stringify(ast);
    expect(json).toContain('"loopType":{"type":"literal","value":"times"');
    expect(json).not.toContain('"forever"');
  });
});

describe("the body after the language's own word", () => {
  it.each([
    ['de', 'wenn klick wiederholen 3 mal setze x auf 1 ende', 'set x to 1'],
    ['de', 'wenn klick wiederholen 3 mal verstecke ich ende', 'hide me'],
    ['de', 'wenn klick wiederholen 3 mal warten 1s ende', 'wait 1s'],
    ['hi', 'click पर 3 बार को repeat मैं में hello पर भेजें समाप्त', 'send hello to me'],
    ['tr', 'tıklama i üzerinde 3 kez i repeat "/api" getir son', 'fetch "/api"'],
  ])('%s: %s', (language, code, body) => {
    expect(english(code, language)).toBe(`on click repeat 3 times ${body} end`);
  });
});
