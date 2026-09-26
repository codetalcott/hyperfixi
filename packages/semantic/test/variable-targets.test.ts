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

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
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
  inLoop('clone #t into el'),
  inLoop('clone el into #t'),
  inLoop('morph el to "<p/>"'),
  inLoop('install Foo on el'),
  inLoop('measure width of el'),
  inLoop('swap el with #t'),
  inLoop('set @x to 1 on el'),
  inLoop('transition *opacity to 0 on el'),
  // The whole body: the SOV languages' handler patterns take it in.
  'on click set @x to 1 on el',
  // At the top level, a command's own `on` is not a new handler.
  'on click get #d1 then set el to it then toggle .a on el then add .b to #d2',
  'on click get #d1 then set el to it then trigger foo on el then add .b to #d2',
  'on click get #d1 then set el to it then set @x to 1 on el then add .b to #d2',
  // es/pt/he write put's `into` as their `on`.
  'on click get #d1 then set el to it then put "x" into el then add .b to #d2',
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
];

describe.each(SPLITS)('%s, through every language', (src, expected) => {
  it('English', () => {
    expect(render(parse(src, 'en')!, 'en')).toBe(expected);
  });

  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(expected);
  });
});
