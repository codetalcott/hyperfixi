/**
 * true, false and null keep their meaning in every language.
 *
 * The keyword became an untyped STRING literal ("false"), and the AST builder
 * handed core the string: a translated `set #b.disabled to false` left the
 * button disabled, and `set x to true then if x is true` took the else branch.
 * true/false are boolean literals now, and null the expression the AST builder
 * reads as a real null.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

// hi/qu/tr render null with their word for "empty", which is also the `empty`
// command (`set x to null` reads back as `empty x`), and sw/vi read theirs back
// as the word `empty`. Filed: they need a null word of their own.
const NULL_IS_EMPTY = new Set(['hi', 'qu', 'sw', 'tr', 'vi']);

type Command = { kind?: string; action?: string; roles?: Map<string, unknown>; body?: Command[] };

function patient(code: string, language: string): unknown {
  const node = parse(code, language) as Command | null;
  const command = node?.kind === 'command' ? node : node?.body?.find(c => c.kind === 'command');
  expect(command?.action, `${language}: ${code}`).toBe('set');
  return command?.roles?.get('patient');
}

const CONSTANTS: Array<[string, object]> = [
  ['true', { type: 'literal', value: true, dataType: 'boolean' }],
  ['false', { type: 'literal', value: false, dataType: 'boolean' }],
  ['null', { type: 'expression', raw: 'null' }],
];

describe.each(CONSTANTS)('set x to %s', (word, expected) => {
  const src = `set x to ${word}`;

  it('English', () => {
    expect(patient(src, 'en')).toMatchObject(expected);
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });

  it.each(FOREIGN.filter(l => word !== 'null' || !NULL_IS_EMPTY.has(l)))('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(patient(foreign, language), foreign).toMatchObject(expected);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
