/**
 * `scroll [<el>] up|down|left|right by <n>` in each language's own words (M2,
 * vocabulary sheet B9; the owner's call, 2026-10-12; OPEN_ITEMS P8). The
 * direction is written in the language's word (grammar-words.ts: es `abajo`,
 * ja `下`, ko `아래쪽`) before the amount's phrase, and `by` as `increment`
 * writes it (es `por`, de `um`; bare where the language writes an amount bare).
 * Every reader still takes English's direction.
 *
 * Refused in every language before (the command-shape gate's LOUD `scroll-by`
 * family, 7 cases × 24 lanes): no direction had a word, and scroll's schema
 * modeled `scroll to <el>` alone.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate, getSupportedLanguages } from '../src/index';
import { GRAMMAR_WORDS, type GrammarWordKey } from '../src/parser/utils/grammar-words';
import { dictionaries } from '../../i18n/src/dictionaries';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

// Upstream's test sources and the reference's examples, with the direction each holds.
const SHAPES: Array<[string, GrammarWordKey | null]> = [
  ['on click scroll down by 300px', 'down'],
  ['on click scroll up by 100px', 'up'],
  ['on click scroll by 200px', null],
  ['on click scroll #box down by 200px', 'down'],
  ['on click scroll #box right by 300px', 'right'],
  ['scroll down by 200', 'down'],
  ['scroll to #section scroll to the top of me scroll down by 200', 'down'],
  ['on click scroll me down by 50 then log 1', 'down'],
  ['on click log 1 then scroll #box left by 20', 'left'],
  ['on keyup scroll up by 10', 'up'],
  // Not a by-form: a trailing `in` clause stayed with the destination before, and must
  // (a first cut's bare amount slot took the `in` in ar and zh).
  ['on click scroll to #item in #box', null],
];

// ko refuses a bare chain that holds `scroll to #section` before this change
// (`scroll to #section then log 1` → `#section에 …` reads back short), with or
// without a by-form; inside a handler the same chain round-trips.
const KNOWN_REFUSED = new Set([
  'ko|scroll to #section scroll to the top of me scroll down by 200',
  // The `in #box` clause: refused in these three before this change (the shapes baseline).
  'de|on click scroll to #item in #box',
  'it|on click scroll to #item in #box',
  'tr|on click scroll to #item in #box',
]);

describe.each(SHAPES)('%s', (source, direction) => {
  it.each(FOREIGN)('%s', language => {
    if (KNOWN_REFUSED.has(`${language}|${source}`)) {
      expect(() => translate(source, 'en', language)).toThrow(/lose/);
      return;
    }
    const rendered = translate(source, 'en', language);
    if (direction) {
      const native = GRAMMAR_WORDS[language]![direction];
      expect(rendered.replace(/\s+/g, '')).toContain(native.replace(/\s+/g, ''));
      if (native !== direction) expect(rendered.split(/\s+/)).not.toContain(direction);
    }
    expect(rendered.split(/\s+/)).not.toContain('by');
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('the English parse', () => {
  const command = (source: string) => {
    const node = parse(source, 'en');
    return node?.kind === 'event-handler' ? (node as { body?: unknown[] }).body?.[0] : node;
  };

  it('an amount, a direction, no destination', () => {
    const node = command('on click scroll down by 300px') as {
      action: string;
      roles: Map<string, { type: string; raw?: string }>;
      scrollDirection?: string;
    };
    expect(node.action).toBe('scroll');
    expect(node.scrollDirection).toBe('down');
    expect(node.roles.get('quantity')).toMatchObject({ type: 'expression', raw: '300px' });
    expect(node.roles.has('destination')).toBe(false);
    expect(node.roles.has('patient')).toBe(false);
  });

  it('the element scrolled is the patient; `down` is the default the engine takes, so it is kept as written', () => {
    const node = command('scroll #box right by 300px') as {
      roles: Map<string, { type: string; value?: string }>;
      scrollDirection?: string;
    };
    expect(node.roles.get('patient')).toMatchObject({ type: 'selector', value: '#box' });
    expect(node.scrollDirection).toBe('right');
    expect(translate('scroll #box by 20', 'en', 'en')).toBe('scroll #box by 20');
  });

  it('a position still reads as a position (`left of #x`), an adverb as an adverb', () => {
    expect(translate('scroll to left of #x', 'en', 'en')).toBe('scroll to left of #x');
    expect(translate('on click scroll to top of #box smoothly', 'en', 'en')).toBe(
      'on click scroll to top of #box smoothly'
    );
    expect(translate('scroll down by 200 smoothly', 'en', 'en')).toBe('scroll down by 200 smoothly');
  });
});

describe('the direction word is read only before an amount', () => {
  it.each([
    // es `tecla arriba` is keyup: the handler's event, not a direction.
    ['es', 'on keyup scroll up by 10'],
    ['es', 'on keyup log 1'],
    // A variable spelled like a direction keeps its name.
    ['es', 'set arriba to 1 then log arriba'],
    ['ja', 'set 下 to 1 then log 下'],
  ])('%s: %s', (language, source) => {
    expect(translate(translate(source, 'en', language), language, 'en')).toBe(
      translate(source, 'en', 'en')
    );
  });
});

describe('the words are the dictionaries’', () => {
  it.each(FOREIGN)('%s', language => {
    const expressions = dictionaries[language]!.expressions as Record<string, string>;
    for (const key of ['up', 'down', 'left', 'right'] as const) {
      expect(expressions[key]).toBe(GRAMMAR_WORDS[language]![key]);
    }
  });
});
