/**
 * Control flow read whole (M1 phase 3). Each of these lost part of a script,
 * most of them without a word: a bare `if` block read as a handler, an `if`
 * under `else` on its own line read as a chain, `break`/`continue` unread,
 * a bottom-tested loop running forever, `repeat in` losing its collection.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate, tokenize } from '../src/index';

const en = (code: string) => render(parse(code, 'en'), 'en');

type Node = {
  kind: string;
  action: string;
  body?: Node[];
  thenBranch?: Node[];
  elseBranch?: Node[];
  statements?: Node[];
  bottomTested?: boolean;
  loopVariant?: string;
  loopVariable?: string;
  indexVariable?: string;
  roles: Map<string, { value?: unknown; raw?: string }>;
};
const handlerBody = (code: string) => (parse(code, 'en') as unknown as Node).body!;

describe('a bare if block', () => {
  it.each([
    ['if :error halt end', 'if :error halt end'],
    ['if true put "foo" into me end', 'if true put "foo" into me end'],
    ['if x log 1 else log 2 end', 'if x log 1 else log 2 end'],
    ['if x log 1 log 2 end', 'if x log 1 then log 2 end'],
  ])('%s is a conditional, not a handler', (code, english) => {
    expect(parse(code, 'en').kind).toBe('conditional');
    expect(en(code)).toBe(english);
  });

  it('a prefix unless stays as it was (core-only; not folded)', () => {
    expect(parse('unless x log 1 end', 'en').kind).not.toBe('conditional');
  });
});

describe('else, then if on the next line', () => {
  const nested = 'if a log 1 else\n  if b log 2 end\n  log 3\nend';

  it('opens a block of its own: the else branch runs on after it', () => {
    const node = parse(nested, 'en') as unknown as Node;
    expect(node.elseBranch!.map(n => n.kind)).toEqual(['conditional', 'command']);
    expect(en(nested)).toBe('if a log 1 else\nif b log 2 end then log 3 end');
  });

  it('on the same line it is a chain, which one end closes', () => {
    const node = parse('if a log 1 else if b log 2 end log 3', 'en') as unknown as Node;
    expect(node.kind).toBe('compound');
    expect(node.statements!.map(n => n.kind)).toEqual(['conditional', 'command']);
    expect(en('if a log 1 else if b log 2 else log 3 end')).toBe(
      'if a log 1 else if b log 2 else log 3 end'
    );
  });

  it('tokens that begin a line say so', () => {
    const tokens = tokenize('if a\nlog 1', 'en').tokens;
    expect(tokens.map(t => !!t.metadata?.lineStart)).toEqual([false, false, true, false]);
    expect(tokenize('if a log 1', 'en').tokens.some(t => t.metadata?.lineStart)).toBe(false);
  });

  it.each(['es', 'ja', 'ar', 'zh', 'ko', 'tr'])('round-trips in %s', language => {
    const code = 'on click\nif window.tmp then\nelse\n  if window.tmp then end\n  put "foo" into me\nend';
    const english = en(code);
    expect(english).toBe(
      'on click if window.tmp else\nif window.tmp then end then put "foo" into me end'
    );
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(english);
  });
});

describe('an empty block', () => {
  it('`if x then end` keeps its end, and what follows stays after it', () => {
    expect(en('on click if x then end log 1')).toBe('on click if x then end then log 1');
  });

  it('a condition ends at its else', () => {
    const node = parse('if x else log 1 end', 'en') as unknown as Node;
    expect(node.roles.get('condition')?.raw).toBe('x');
    expect(node.thenBranch).toEqual([]);
    expect(node.elseBranch!.map(n => n.action)).toEqual(['log']);
  });
});

describe('break and continue', () => {
  it.each(['break', 'continue'])('%s reads in a loop body', word => {
    const [loop] = handlerBody(`on click repeat 3 times log 1 then ${word} end`);
    expect(loop!.body!.map(n => n.action)).toEqual(['log', word]);
  });

  it.each(['es', 'ja', 'ar', 'de'])('round-trips in %s', language => {
    const code = 'on click for x in [1,2,3] if x is 2 continue end log x end';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(en(code));
  });
});

describe('a bottom-tested loop (P30)', () => {
  it.each([
    ['until', 'on click repeat set x to x + 1 until x is 3 end put x into me'],
    ['while', 'on click repeat set x to x + 1 while x < 3 end put x into me'],
  ])('`repeat … %s <cond> end` tests after its body', (word, code) => {
    const [loop, after] = handlerBody(code)[0]!.statements!;
    expect(loop!.kind).toBe('loop');
    expect(loop!.bottomTested).toBe(true);
    expect(loop!.loopVariant).toBe(word);
    expect(loop!.body!.map(n => n.action)).toEqual(['set']);
    expect(after!.action).toBe('put');
    expect(en(code)).toBe(
      `on click repeat forever set x to x + 1 ${word} ${word === 'until' ? 'x is 3' : 'x < 3'} end then put x into me`
    );
  });

  it('a bare repeat before a command is a forever head, not a count', () => {
    const [loop] = handlerBody('on click repeat log 1 end');
    expect(loop!.loopVariant).toBe('forever');
    expect(loop!.body!.map(n => n.action)).toEqual(['log']);
  });

  it("an until after a toggle is the toggle's, never the loop's", () => {
    expect(() => translate('on click repeat forever toggle .x until transitionend end', 'en', 'en')).toThrow(
      /lose/
    );
  });

  it('an until that ends no loop stays unread', () => {
    expect(() => translate('on click log 1 until x', 'en', 'es')).toThrow(/lose/);
    const node = parse('on click log 1 until x', 'en') as unknown as Node & {
      diagnostics?: Array<{ code?: string; message: string }>;
    };
    expect(node.body!.map(n => n.action)).toEqual(['log']);
    expect(node.diagnostics?.some(d => d.message.includes('"until x"'))).toBe(true);
  });

  // An SOV while-phrase comes before its own `repeat` (`… の間 x < 3 繰り返し …`):
  // inside a forever loop, it is the inner loop's head, not the outer's test.
  it.each(['ja', 'ko', 'hi', 'tr', 'bn', 'qu'])('a nested while loop stays nested in %s', language => {
    const code = 'on click repeat forever log 1 then repeat while x < 3 log 2 end end';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(en(code));
  });

  it.each(['es', 'ja', 'ar', 'zh', 'tr', 'hi', 'qu'])('round-trips in %s', language => {
    const code = 'on click repeat forever log 1 until x is 3 end';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(en(code));
  });
});

describe('the end of `at end of`', () => {
  it('is a position, never the end of a conditional', () => {
    const [cond, after] = handlerBody(
      "on click if x then put 'a' at end of me end put 'b' at end of me"
    )[0]!.statements!;
    expect(cond!.kind).toBe('conditional');
    expect(cond!.thenBranch!.map(n => n.action)).toEqual(['put']);
    expect(after!.action).toBe('put');
  });
});

describe('loop spellings', () => {
  it('`repeat in <collection>` binds it', () => {
    const [loop] = handlerBody('on click repeat in [1, 2, 3] log it end');
    expect(loop!.loopVariant).toBe('for');
    expect(loop!.loopVariable).toBe('it');
    expect(en('on click repeat in [1, 2, 3] log it end')).toBe(
      'on click repeat for it in [1, 2, 3] log it end'
    );
  });

  it('`indexed by i` is `index i`', () => {
    const [loop] = handlerBody('on click repeat for x in [1, 2] indexed by i log i end');
    expect(loop!.indexVariable).toBe('i');
    expect(en('on click repeat for x in [1, 2] indexed by i log i end')).toBe(
      'on click repeat for x in [1, 2] index i log i end'
    );
  });
});
