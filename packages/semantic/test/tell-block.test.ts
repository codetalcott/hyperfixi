/**
 * `tell <target> <commands> end` nests its body (was OPEN_ITEMS P1).
 *
 * Semantic kept a tell FLAT: the header, then its body as every statement after
 * it, closed at the end of the list. So in English, and so in every language, a
 * command after the tell's `end` was lost (`tell #modal show end then log 2`) or
 * pulled into the body (`… end log 2`), a nested tell swallowed its parent's
 * rest, and in a behavior or `def` the `end` closed the enclosing block. The
 * clause walker now nests a tell's body as it nests a loop's
 * (BlockCommandSemanticNode), and the structural layer counts a tell as an
 * opener when an `end` closes it before a new feature, which is when the engine
 * takes an `end` for it.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';
import type { SemanticNode } from '../src/types';

const FOREIGN = [
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
] as const;

// [source, its English render]
const CASES: [string, string][] = [
  ['on click tell #modal show end then log 2', 'on click tell #modal show end then log 2'],
  ['on click tell #modal show end log 2', 'on click tell #modal show end then log 2'],
  [
    'on click tell #x add .a then remove .b end then log 1',
    'on click tell #x add .a then remove .b end then log 1',
  ],
  ['on click tell #x add .a', 'on click tell #x add .a end'],
  [
    'on click log 0 then tell #x add .a end then log 1',
    'on click log 0 then tell #x add .a end then log 1',
  ],
  [
    'on click if me matches .a tell #x add .b end end',
    'on click if me matches .a tell #x add .b end end',
  ],
  [
    'on click tell #x tell #y add .a end add .b end then log 1',
    'on click tell #x tell #y add .a end then add .b end then log 1',
  ],
  [
    'on click tell <p/> in me add .highlight end then remove .x',
    'on click tell <p/> in me add .highlight end then remove .x',
  ],
  ['on click tell #x end then log 1', 'on click tell #x end then log 1'],
];

// The tell's `end` is not the handler's, the behavior's or the def's; and a tell
// a new handler ends (no `end` of its own) does not take that handler's.
const BLOCKS: [string, string][] = [
  [
    'behavior F on click tell #x add .a end end on keyup log 1 end end',
    'behavior F\n  on click tell #x add .a end\n  end\n  on keyup log 1\n  end\nend',
  ],
  ['def go() tell #x add .a end log 2 end', 'def go\n  tell #x add .a end\n  log 2\nend'],
  [
    'on click tell #x add .a on keyup log 1',
    'on click tell #x add .a end\nend\non keyup log 1\nend',
  ],
  [
    'on click tell #x add .a end end on keyup log 1',
    'on click tell #x add .a end\nend\non keyup log 1\nend',
  ],
];

const en = (src: string): string => render(parse(src, 'en')!, 'en');

describe('English reads a tell block', () => {
  it.each([...CASES, ...BLOCKS])('%s', (src, expected) => {
    expect(en(src)).toBe(expected);
  });

  it('nests the body under the tell, and keeps what follows its `end` after it', () => {
    const handler = parse('on click tell #modal show end then log 2', 'en') as SemanticNode & {
      body: Array<SemanticNode & { statements?: Array<SemanticNode & { body?: SemanticNode[] }> }>;
    };
    const [tell, after] = handler.body[0].statements!;
    expect([tell.action, tell.body?.map(n => n.action), after.action]).toEqual([
      'tell',
      ['show'],
      'log',
    ]);
  });

  it("builds core's tell: the target, then the body, as its args", () => {
    const ast = buildAST(parse('tell #x add .a then remove .b end', 'en')!).ast as {
      name: string;
      args: Array<{ name?: string; type?: string }>;
    };
    expect(ast.name).toBe('tell');
    expect(ast.args.slice(1).map(a => a.name)).toEqual(['add', 'remove']);
  });
});

describe('every language writes the block and reads it back', () => {
  it.each(FOREIGN.flatMap(lang => [...CASES, ...BLOCKS].map(([src]) => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      expect(render(parse(render(parse(src, 'en')!, lang), lang)!, 'en')).toBe(en(src));
    }
  );
});
