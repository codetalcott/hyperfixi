/**
 * A behavior's handlers need no `end` of their own.
 *
 * Upstream ends a handler's command list at the next feature, so in
 * `behavior F on click add .a on keyup log 1 end end` the first `end` is
 * keyup's and the second the behavior's. The behavior parser split its body
 * only at `end`, read `on click add .a on keyup log 1` as ONE handler, failed
 * the whole behavior, and English wrote `behavior F then add .a then log 1`,
 * which the engine rejects, in every language. Each end-delimited piece now
 * goes through the top-level splitter (`tryParseProgram`) first.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';
import type { BehaviorSemanticNode } from '../src/types';

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
    'behavior F on click add .a on keyup log 1 end end',
    'behavior F\n  on click add .a\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'behavior F on click add .a on keyup log 1 end',
    'behavior F\n  on click add .a\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'behavior F on click add .a on keyup log 1 on focus log 2 end end',
    'behavior F\n  on click add .a\n  end\n  on keyup log 1\n  end\n  on focus log 2\n  end\nend',
  ],
  [
    'behavior F on click add .a then log 1 on keyup log 2 end end',
    'behavior F\n  on click add .a then log 1\n  end\n  on keyup log 2\n  end\nend',
  ],
  [
    'behavior F(x) on click if x add .a end on keyup log 1 end end',
    'behavior F(x)\n  on click if x add .a end\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'behavior F on click repeat 3 times add .a end on keyup log 1 end end',
    'behavior F\n  on click repeat 3 times add .a end\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'behavior F init add .a on keyup log 1 on focus log 2 end end',
    'behavior F\n  init\n    add .a\n  end\n  on keyup log 1\n  end\n  on focus log 2\n  end\nend',
  ],
  [
    'behavior F on click add .a end on keyup log 1 on focus log 2 end end',
    'behavior F\n  on click add .a\n  end\n  on keyup log 1\n  end\n  on focus log 2\n  end\nend',
  ],
  // `on me` is toggle's target, not a handler.
  [
    'behavior F on click toggle .a on me end end',
    'behavior F\n  on click toggle .a on me\n  end\nend',
  ],
  // A tell the next handler ends takes no `end`; one its own `end` closes keeps it.
  [
    'behavior F on click tell #x add .a on keyup log 1 end end',
    'behavior F\n  on click tell #x add .a end\n  end\n  on keyup log 1\n  end\nend',
  ],
  [
    'behavior F on click tell #x add .a end on keyup log 1 end end',
    'behavior F\n  on click tell #x add .a end\n  end\n  on keyup log 1\n  end\nend',
  ],
];

const en = (src: string): string => render(parse(src, 'en')!, 'en');

/** The node without what records where it came from (source text, positions, confidence). */
const withoutMetadata = (node: unknown): unknown =>
  JSON.parse(
    JSON.stringify(node, (key, value: unknown) =>
      key === 'metadata' || key === 'position'
        ? undefined
        : value instanceof Map
          ? Object.fromEntries(value)
          : value
    )
  );

describe('English reads handlers with no end of their own', () => {
  it.each(CASES)('%s', (src, expected) => {
    expect(en(src)).toBe(expected);
  });

  it('parses to the same node as the form with every end written', () => {
    const bare = parse('behavior F on click add .a then log 1 on keyup log 2 end end', 'en');
    const ended = parse('behavior F on click add .a then log 1 end on keyup log 2 end end', 'en');
    expect((bare as BehaviorSemanticNode).eventHandlers).toHaveLength(2);
    expect(withoutMetadata(bare)).toEqual(withoutMetadata(ended));
    expect(bare!.metadata?.confidence).toBeGreaterThanOrEqual(0.9);
  });
});

describe('every language writes the behavior and reads it back', () => {
  it.each(FOREIGN.flatMap(lang => CASES.map(([src, expected]) => [lang, src, expected] as const)))(
    '%s: %s',
    (lang, src, expected) => {
      const written = render(parse(src, 'en')!, lang);
      expect(render(parse(written, lang)!, 'en')).toBe(expected);
    }
  );
});

/**
 * Each language's own spelling, with the handlers' `end`s left out (the renderer
 * always writes them, so no corpus row has this form). The boundary is the
 * top-level splitter's (handlerStartAt); `native-handler-chain.test.ts` covers
 * it at top level and after `init`.
 */
const NATIVE: string[] = [
  'behavior F on click add .a end on keyup log 1 end end',
  'behavior F on click add .a then log 1 end on keyup log 2 end on focus log 3 end end',
  'behavior F on click tell #x add .a end end on keyup log 1 end end',
];

/** Drop every line that is only an `end`, except the behavior's own (the last). */
function withoutHandlerEnds(written: string): string {
  const lines = written.split('\n');
  const end = lines[lines.length - 1].trim();
  return lines.filter((line, i) => i === lines.length - 1 || line.trim() !== end).join('\n');
}

describe('a behavior written natively without handler ends', () => {
  it.each(FOREIGN.flatMap(lang => NATIVE.map(src => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      const native = withoutHandlerEnds(render(parse(src, 'en')!, lang));
      expect(render(parse(native, lang)!, 'en')).toBe(en(src));
    }
  );
});
