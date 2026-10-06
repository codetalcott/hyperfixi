/**
 * A chain of handlers written natively without their `end`s (was OPEN_ITEMS P47).
 *
 * Upstream ends a handler's commands at the next feature, so `on click add .a on
 * keyup log 1` is two handlers. The splitter knew a handler head only as `on`'s
 * forms after an `on`-led clause, or as ja/ko's `を で` / `을 에`, so in 9 languages
 * a native chain merged into one handler, silently: de/fr/id/zh/ko/qu/tr dropped
 * the second event and ran its commands on the first, and hi/bn read it as a
 * destination (`add .a to keyup`). It now reads each language's own heads
 * (block-parser.ts, handlerHeads): the `when` word (de `wenn`, fr `quand`, id
 * `ketika`, qu `maykama`), a circumfix (zh `一 … 就`), the words after the event
 * (ko `할 때`, tr `i üzerinde`), and hi/bn's `पर` / `তে` after a finished command.
 * The same rule ends an `init` that has no `end`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, parseWithConfidence } from '../src/index';

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

const en = (src: string): string => render(parse(src, 'en')!, 'en');

/**
 * The language's render of `src` (every `end` written) with the handlers' `end`
 * lines dropped; with `keepLast`, the last one stays (a behavior's own).
 */
function native(src: string, lang: string, keepLast = false): string {
  const lines = render(parse(src, 'en')!, lang).split('\n');
  const end = lines[lines.length - 1].trim();
  return lines
    .filter((line, i) => (keepLast && i === lines.length - 1) || line.trim() !== end)
    .join('\n');
}

// Written with every `end`; each test reads the native form without them.
const TOP_LEVEL = [
  'on click add .a end on keyup log 1 end',
  'on click add .a then log 1 end on keyup log 2 end on focus log 3 end',
  'on click if me matches .x add .a end end on keyup log 1 end',
  'on click repeat 3 times add .a end end on keyup log 1 end',
  'on click tell #x add .a end end on keyup log 1 end',
  // A fronted source (ja/ko/hi/qu write it ahead of the event) is its handler's.
  'on click from #b add .a end on keyup log 1 end',
  'on click add .a end on keyup from #b log 1 end',
  // The toggle's own `on` is written; the next one opens a handler (he, vi).
  'on click toggle .a on #x end on keyup log 1 end',
  // hi writes put's destination after its verb (`1 को रखें #out में`).
  'on click put 1 into #out end on keyup wait 1s then log 2 end',
  'on mouseenter add .a end on mouseleave remove .a end',
  'on myevent add .a end on keyup log 1 end',
];

const AFTER_INIT = [
  'behavior F init add .a end on click add .b end end',
  'behavior F init add .a end on click add .b end on keyup log 1 end end',
];

/**
 * Pairs that read wrongly for another reason, with or without the `end`s.
 * Shrink-only: a pair that starts reading as written fails here until removed.
 * ar loses `from` after its two-word `keyup` (`رفع المفتاح من #b`), even in a
 * handler of its own (OPEN_ITEMS P48).
 */
const OTHER_CAUSE = new Set(['ar|on click add .a end on keyup from #b log 1 end']);

describe('a chain written natively without handler ends reads as written', () => {
  it.each(FOREIGN.flatMap(lang => TOP_LEVEL.map(src => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      const read = render(parse(native(src, lang), lang)!, 'en');
      if (OTHER_CAUSE.has(`${lang}|${src}`)) expect(read).not.toBe(en(src));
      else expect(read).toBe(en(src));
    }
  );

  it.each(FOREIGN.flatMap(lang => AFTER_INIT.map(src => [lang, src] as const)))(
    '%s: %s (init ends at the handler)',
    (lang, src) => {
      expect(render(parse(native(src, lang, true), lang)!, 'en')).toBe(en(src));
    }
  );
});

/**
 * hi `पर` and bn `তে` are also the destination marker, which nearly every hi/bn
 * command may write first. After a command written without `then`, `input पर .b
 * को टॉगल` is a handler for `input` or a toggle on `input`, even though `input`
 * names a DOM event. So a chain split there reads as written but is never
 * trusted: its confidence falls below the adapter's threshold (0.5), the adapter
 * leaves the script as written, and the engine reports it, rather than running a
 * reading that may be wrong. (Until P47, these chains read as one handler, with
 * the second event as a destination, at full confidence.)
 */
describe('hi/bn: a handler head that may be a destination is not trusted', () => {
  const CHAINS = [
    ['on click add .a end on keyup log 1 end', false],
    ['on click put 1 into #out end on myevent log 2 end', false],
    ['behavior F on click add .a end on keyup log 1 end end', true],
    ['behavior F init add .a end on keyup add .b end end', true],
  ] as const;

  it.each(['hi', 'bn'].flatMap(lang => CHAINS.map(([src, keep]) => [lang, src, keep] as const)))(
    '%s: %s',
    (lang, src, keep) => {
      const result = parseWithConfidence(native(src, lang, keep), lang);
      expect(render(result.node!, 'en')).toBe(en(src));
      expect(result.confidence).toBeLessThan(0.5);
    }
  );

  // bn writes toggle's target first, so this is also a toggle on `input`.
  it('bn: a command written without `then` after another is not trusted either', () => {
    const result = parseWithConfidence('ক্লিক তে .a কে যোগ করুন\ninput তে .b কে টগল', 'bn');
    expect(result.confidence).toBeLessThan(0.5);
  });

  // A patient still owes its verb: `.b को input पर टॉगल` toggles .b on `input`.
  it.each(['hi', 'bn'])('%s: a target after a patient stays a target', lang => {
    for (const src of [
      'on click toggle .a on input then log 1',
      'on click put 1 into keyup then log 2',
    ]) {
      expect(render(parse(render(parse(src, 'en')!, lang), lang)!, 'en')).toBe(en(src));
    }
  });

  it('hi: commands written without `then` stay one handler', () => {
    const result = parseWithConfidence('click पर .a को जोड़ें\n.b को input पर टॉगल', 'hi');
    expect(render(result.node!, 'en')).toBe('on click add .a then toggle .b on input');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});

/**
 * The new head words have other uses: `when` is also the reactive feature, and
 * the `on` patterns' other leading words include `if` (fr `si`, id `jika`) and a
 * destination marker (fr `à`), which the split does not take as heads.
 */
describe('one handler stays one handler', () => {
  const SINGLE = [
    'on click toggle .a on #x then log 1',
    'on click trigger foo on #x then log 1',
    'on click if x add .a end then log 1',
    'on click unless x add .a end',
    'when $x changes put $x into me',
    'on click wait for keyup then add .a',
    'on click repeat until event keyup add .a end',
    'on click toggle .a for 2s then log 1',
    'on click add .a to click',
    'on click send myevent to #x',
    'on click go to url /page',
    'on click from #b add .a then log 1',
  ];

  it.each(FOREIGN.flatMap(lang => SINGLE.map(src => [lang, src] as const)))(
    '%s: %s',
    (lang, src) => {
      expect(render(parse(render(parse(src, 'en')!, lang), lang)!, 'en')).toBe(en(src));
    }
  );
});
