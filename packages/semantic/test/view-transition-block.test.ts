/**
 * Upstream's `start [a] view transition [using "<type>"] <commands> end`
 * (OPEN_ITEMS D6). It used to parse as a `transition` command whose patient was
 * the body's verb (`on click transition swap`), in English and so in every
 * translation, with the block and its body lost.
 *
 * The head is the same English words in every language (patterns/view-transition.ts),
 * as core's `using view transition` tail already is. The clause walker nests the
 * body under the head as it nests a loop's, so a command after the block's `end`
 * stays after it; the structural layer counts the head as a block opener, so the
 * `end` is not a handler's or a behavior's. Every English render below parses on
 * `@hyperfixi/engine` and upstream (measured when this landed; the corpus row's
 * render is held there by the canonical-validity gates).
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
  [
    'on click start view transition swap #a with #b end',
    'on click start view transition swap #a with #b end',
  ],
  [
    'on click start a view transition add .x to me then remove .y from me end then log 1',
    'on click start view transition add .x to me then remove .y from me end then log 1',
  ],
  [
    'on click start view transition using "slide" put "x" into me end',
    'on click start view transition using "slide" put "x" into me end',
  ],
  [
    'on click start view transition if me matches .a add .b to me end end',
    'on click start view transition if me matches .a add .b to me end end',
  ],
  [
    'on click start view transition repeat 3 times add .x to me end end then log 1',
    'on click start view transition repeat 3 times add .x to me end end then log 1',
  ],
  ['on click start view transition end', 'on click start view transition end'],
  [
    'on click start view transition end then log 1',
    'on click start view transition end then log 1',
  ],
  [
    'on click add .a to me then start view transition remove .a from me end',
    'on click add .a to me then start view transition remove .a from me end',
  ],
  [
    'on click if me matches .a start view transition add .b to me end end',
    'on click if me matches .a start view transition add .b to me end end',
  ],
  [
    'on click start view transition using "slide" swap #a with #b end then remove me',
    'on click start view transition using "slide" swap #a with #b end then remove me',
  ],
  // Core's tail reads as the swap it is, and English writes upstream's block.
  [
    'on click swap #a with #b using view transition then add .x to me',
    'on click start view transition swap #a with #b end then add .x to me',
  ],
  ['start view transition add .x to me end', 'start view transition add .x to me end'],
];

// The `end` closes the block, not the handler, the behavior or the def: before
// the structural layer counted the head, the second handler and the `log 2`
// were lost (in English, so in every language).
const BLOCKS: [string, string][] = [
  [
    'on click start view transition add .a to me end end on keyup log 1',
    'on click start view transition add .a to me end\nend\non keyup log 1\nend',
  ],
  [
    'behavior F on click start view transition add .a to me end end on keyup log 1 end end',
    'behavior F\n  on click start view transition add .a to me end\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'def go() start view transition add .a to me end log 2 end',
    'def go\n  start view transition add .a to me end\n  log 2\nend',
  ],
];

const en = (src: string): string => render(parse(src, 'en')!, 'en');

describe('English reads the block', () => {
  it.each([...CASES, ...BLOCKS])('%s', (src, expected) => {
    expect(en(src)).toBe(expected);
  });

  it('nests the body under the head, and keeps what follows the `end` after it', () => {
    const handler = parse(
      'on click start view transition swap #a with #b end then log 1',
      'en'
    ) as SemanticNode & {
      body: Array<SemanticNode & { statements?: Array<SemanticNode & { body?: SemanticNode[] }> }>;
    };
    const [sequence] = handler.body;
    const [block, after] = sequence.statements!;
    expect([block.kind, block.action, block.body?.map(n => n.action)]).toEqual([
      'command',
      'viewTransition',
      ['swap'],
    ]);
    expect(after.action).toBe('log');
  });

  it('reads the transition type', () => {
    const handler = parse(
      'on click start view transition using "slide" add .x to me end',
      'en'
    ) as SemanticNode & {
      body: SemanticNode[];
    };
    expect(handler.body[0].roles.get('style')).toMatchObject({ type: 'literal', value: 'slide' });
  });

  it('builds the body as the one block arg, as a loop is built', () => {
    const ast = buildAST(parse('start view transition using "slide" add .x to me end', 'en')!)
      .ast as {
      name: string;
      args: Array<{ type: string; commands: Array<{ name: string }> }>;
      modifiers?: Record<string, unknown>;
    };
    expect(ast.name).toBe('viewTransition');
    expect(ast.args[0].commands.map(c => c.name)).toEqual(['add']);
    expect(ast.modifiers?.using).toMatchObject({ value: 'slide' });
  });
});

describe('every language writes the head in English and reads it back', () => {
  it.each(FOREIGN.flatMap(lang => [...CASES, ...BLOCKS].map(([src]) => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      const written = render(parse(src, 'en')!, lang);
      // A foreign render keeps core's tail as read; only English rewrites it.
      if (src.includes('start')) expect(written).toContain('start view transition');
      expect(render(parse(written, lang)!, 'en')).toBe(en(src));
    }
  );
});
