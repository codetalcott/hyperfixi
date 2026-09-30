/**
 * A loop its own `end` closes is empty (PR 126).
 *
 * The walkers mark where an `end` closes a loop, and foldLoopBlocks nests the
 * body. A head with no body stayed the flat head it was, and a flat head's body
 * is every command after it: `repeat 3 times end then increment n` put the
 * increment in the loop, three times over, in English and so in every
 * translation, and a bare sequence dropped the command outright. In the SOV
 * six the `end` never closed the loop: right after the loop's verb, PR 121's
 * loop words read it as a variable.
 */
import { describe, it, expect } from 'vitest';
import { buildAST, parse, render } from '../src/index';
import type { SemanticNode } from '../src/types';

const english = (code: string, language: string): string => render(parse(code, language)!, 'en');

const LANGUAGES = 'ar bn de es fr he hi id it ja ko ms pl pt qu ru sw th tl tr uk vi zh'.split(' ');

describe('an empty loop keeps the command after it', () => {
  it.each([
    'on click repeat 3 times end then put 1 into #out',
    'on click repeat forever end then put 1 into #out',
    'on click repeat until x > 3 end then put 1 into #out',
    'on click repeat while x < 3 end then put 1 into #out',
    'on click for x in .a end then put 1 into #out',
    'repeat 3 times end then put 1 into #out',
  ])('%s', code => {
    expect(english(code, 'en')).toBe(code);
  });

  it('reads the juxtaposed form', () => {
    expect(english('on click repeat 3 times end put 1 into #out', 'en')).toBe(
      'on click repeat 3 times end then put 1 into #out'
    );
  });

  it('builds the loop empty, and the command beside it', () => {
    const node = parse('repeat 3 times end then put 1 into #out', 'en')!;
    const [loop, put] = (node as SemanticNode & { statements: SemanticNode[] }).statements;
    expect(loop.kind).toBe('loop');
    expect((loop as SemanticNode & { body: unknown[] }).body).toEqual([]);
    expect(put).toMatchObject({ kind: 'command', action: 'put' });
    const json = JSON.stringify(buildAST(node).ast);
    expect(json).toContain('"name":"repeat","args":[{"type":"block","commands":[]}]');
  });

  it('keeps an unclosed head flat', () => {
    expect(parse('on click repeat 3 times', 'en')).toMatchObject({
      body: [{ kind: 'command', action: 'repeat' }],
    });
  });

  it.each(LANGUAGES)('%s', language => {
    const code =
      'on click set n to 0 then repeat 3 times end then increment n then put n into #out';
    expect(english(render(parse(code, 'en')!, language), language)).toBe(code);
  });
});

// The SOV six, with the render's English `repeat` and with their own verb.
describe("an empty loop after an SOV loop's verb", () => {
  it.each([
    ['tr', '3 times i tekrarla son ardından 1 i #out e koy'],
    ['tr', 'tıklama i üzerinde 3 kez i tekrarla son ardından 1 i #out e koy'],
    ['ja', 'クリック で 3 回 繰り返す 終わり それから 1 を #out に 置く'],
    ['qu', 'maykama click 3 times ta kutipay tukukuy chaymantataq 1 ta #out man churay'],
    ['ko', '클릭 할 때 3 times 를 repeat 끝 그다음 1 을 #out 에 넣다'],
    ['hi', 'click पर 3 times को repeat समाप्त फिर 1 को रखें #out में'],
    ['bn', 'ক্লিক তে 3 বার কে repeat শেষ তারপর 1 কে #out এ রাখুন'],
  ])('%s: %s', (language, code) => {
    expect(english(code, language)).toMatch(/repeat 3 times end then put 1 into #out$/);
  });
});
