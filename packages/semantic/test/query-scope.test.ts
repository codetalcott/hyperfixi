/**
 * A query keeps its `in <scope>`.
 *
 * The role capture took a `<…/>` query and stopped, so its `in me` / `in
 * #list` tail went unconsumed and dropped, in English and so in every
 * translation: `add @disabled to <button/> in me` disabled every button on the
 * page. Only a positional query kept one (`last <li/> in #list`), and only
 * when the scope was a plain selector. The scope now rides on the selector
 * value (a reference, a selector, or `closest …`), and a positional query takes
 * a reference or `closest` scope too.
 */
import { describe, it, expect } from 'vitest';
import { parse, render, buildAST } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const SHAPES = [
  'on click focus first <input/> in closest <form/>',
  'on click add @disabled to <button/> in me',
  'on click put "x" into <button/> in me',
  'on click remove <li/> in #list',
  'on click show <div/> in me',
  'on click toggle .on on <li/> in me',
  'on click log <li/> in me',
  // Bare, outside a handler.
  'add @disabled to <button/> in me',
  'remove <li/> in #list',
];

describe('English keeps the scope', () => {
  it.each(SHAPES)('%s', src => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it('as a scope on the selector value', () => {
    const add = (parse('on click add @disabled to <button/> in me', 'en') as { body: { roles: Map<string, unknown> }[] }).body[0];
    expect(add.roles.get('destination')).toMatchObject({
      type: 'selector',
      value: '<button/>',
      scope: { type: 'reference', value: 'me' },
    });
  });
});

describe.each(SHAPES)('%s, through every language', src => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});

it('buildAST writes core’s `in` expression', () => {
  const { ast } = buildAST(parse('add @disabled to <button/> in me', 'en')!);
  expect((ast as { modifiers?: { to?: unknown } }).modifiers?.to).toMatchObject({
    type: 'binaryExpression',
    operator: 'in',
    left: { type: 'selector', value: 'button' },
    right: { type: 'identifier', name: 'me' },
  });
});
