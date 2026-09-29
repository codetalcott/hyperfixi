/**
 * A variable as the element a command acts on, in every language.
 *
 * A bare variable arrives as an `expression`, and the roles that name an
 * element took a selector or a reference only. So `hide el` rendered `hide`
 * (the command acted on `me`) and `remove el` lost the command, in English
 * and so in every translation; toggle's `on el`, which English's handcrafted
 * pattern leaves untyped, was lost in 14 languages. At the top level, the
 * handler splitter read the `on el` of `toggle .a on el then …` as a new
 * handler, and the commands after it moved there; es/pt/he did the same with
 * put's `en item`.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';
import { tryGetProfile } from '../src/registry';

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

const inLoop = (body: string): string => `on click repeat for el in .x ${body} end`;

// Each renders as written in English.
const CASES: string[] = [
  inLoop('remove el'),
  inLoop('show el'),
  inLoop('hide el'),
  inLoop('hide el with *opacity'),
  inLoop('show el with *opacity'),
  inLoop('toggle .a on el'),
  inLoop('trigger foo on el'),
  inLoop('take .a from el'),
  inLoop('tell el add .t end'),
  inLoop('settle el'),
  inLoop('focus el'),
  inLoop('blur el'),
  inLoop('empty el'),
  inLoop('open el'),
  inLoop('close el'),
  inLoop('select el'),
  inLoop('reset el'),
  inLoop('morph el to "<p/>"'),
  inLoop('measure width of el'),
  inLoop('swap el with #t'),
  // At the top level, a command's own `on` is not a new handler.
  'on click get #d1 then set el to it then toggle .a on el then add .b to #d2',
  'on click get #d1 then set el to it then trigger foo on el then add .b to #d2',
  // es/pt/he write put's `into` as their `on`.
  'on click get #d1 then set el to it then put "x" into el then add .b to #d2',
  // de writes set's `to` as its `on` (`auf`): a chain's second `set` read
  // `auf n` as a handler for an event `n` (PR 110).
  'on click set p to 1 then set x to n + 3 then put x into #out',
  "on click set p to 1 then set x to obj's v then put x into #out",
  'on click set p to 1 then set x to not flag then put x into #out',
];

describe.each(CASES)('%s, through every language', src => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

// A real second handler still splits: the command before it takes no `on`,
// has used its own, or ended with its clause.
const SPLITS: [string, string][] = [
  ['on click log 1 on keyup log 2', 'on click log 1\nend\non keyup log 2\nend'],
  ['on click add .a on keyup log 2', 'on click add .a\nend\non keyup log 2\nend'],
  ['on click toggle .a on #x on keyup log 2', 'on click toggle .a on #x\nend\non keyup log 2\nend'],
  [
    'on click if x toggle .a end on keyup log 2',
    'on click if x toggle .a end\nend\non keyup log 2\nend',
  ],
  [
    'on click toggle .a then foo() on keyup log 2',
    'on click toggle .a then call foo()\nend\non keyup log 2\nend',
  ],
  // A marker the command has used is no longer owed: de `auf 1`, es/pt/he
  // `into x`, then the next handler (PR 110: each split a segment that was no
  // handler, and the whole program read as one).
  ['on click set x to 1 on keyup log 2', 'on click set x to 1\nend\non keyup log 2\nend'],
  ['on click put 1 into x on keyup log 2', 'on click put 1 into x\nend\non keyup log 2\nend'],
];

// Without a `then`, the `on` is still toggle's or trigger's: the commands that
// take an `on` target. English renders the `then`, so each language's input
// is its render with the `then` taken out, in the languages whose `on` is
// also toggle's marker. (vi is left out: without `rồi` it loses toggle's
// `trên` target, a selector's too.)
const WITHOUT_THEN: [string, string][] = [
  ['on click toggle .a on el add .b to #d2', 'on click toggle .a on el then add .b to #d2'],
  ['on click trigger foo on el add .b to #d2', 'on click trigger foo on el then add .b to #d2'],
];
const ON_IS_A_MARKER = ['ar', 'de', 'es', 'fr', 'he', 'id', 'it', 'pl', 'pt', 'sw'] as const;

describe.each(WITHOUT_THEN)('%s, without a `then`', (src, expected) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it.each(ON_IS_A_MARKER)('%s', language => {
    const then = tryGetProfile(language)!.keywords.then!.primary;
    const foreign = render(parse(src, 'en')!, language).split(` ${then} `).join(' ');
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});

describe('a marker the command has passed opens a handler (PR 110)', () => {
  // es `en` is es's `on`, and an alternative to set's `a`: written after `a`,
  // it is no longer set's, and a hand-written chain splits there.
  it('es `establecer x a 5 en keyup`', () => {
    expect(render(parse('al clic establecer x a 5 en keyup registrar 2', 'es')!, 'en')).toBe(
      'on click set x to 5\nend\non keyup log 2\nend'
    );
  });

  // de `bei` begins put's `bei ende von` (at end of): a literal that marks no
  // role alone is owed by nothing.
  it('de `setzen 1 in #out bei keyup`', () => {
    expect(
      render(parse('bei klick setzen 1 in #out bei keyup setzen 2 in #out', 'de')!, 'en')
    ).toBe('on click put 1 into #out\nend\non keyup put 2 into #out\nend');
  });
});

describe.each(SPLITS)('%s, through every language', (src, expected) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});
