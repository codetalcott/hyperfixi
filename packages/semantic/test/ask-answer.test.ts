/**
 * `ask` and `answer` in each language's own word (M2, vocabulary sheet B8; the
 * owner's call, 2026-10-12). Upstream's two dialog commands: `ask <message>`
 * prompts and the reply is `it`; `answer <message>` alerts; `answer <message>
 * with <a> or <b>` confirms, and `it` is the chosen value. Both were refused in
 * every language (the command-shape gate's LOUD `ask-answer` family, 192 lanes):
 * no schema, no word.
 *
 * The choices are the `style` role, whose marker is `with` in every profile
 * (es `con`, ja `で`, ko `로`, tr `le`), and the expression's `or` is written in
 * the language by the value pass (`"Yes" o "No"`, `"Yes" または "No"`).
 */
import { describe, it, expect } from 'vitest';
import { parse, translate, getSupportedLanguages } from '../src/index';
import { tryGetProfile } from '../src/registry';
import { dictionaries } from '../../i18n/src/dictionaries';

const FOREIGN = getSupportedLanguages().filter(l => l !== 'en');

// Upstream's own test sources (askAnswer.js) and the reference's examples.
const SHAPES: Array<[string, 'ask' | 'answer']> = [
  ['on click ask "What is your name?" then put it into #out', 'ask'],
  ['on click ask "Name?" then put it into #out', 'ask'],
  ['ask "Your name?" then put it into #name', 'ask'],
  ['ask :question', 'ask'],
  ['on click answer "Hello!" then put "done" into #out', 'answer'],
  ['on click answer "Save?" with "Yes" or "No" then put it into #out', 'answer'],
  ['answer "Saved"', 'answer'],
  ['answer "Delete it?" with "yes" or "no"', 'answer'],
  ['answer "Saved" answer "Delete it?" with "yes" or "no"', 'answer'],
  ['answer "Go?" with :yes or :no then log it', 'answer'],
];

describe.each(SHAPES)('%s', (source, command) => {
  it.each(FOREIGN)('%s', language => {
    const rendered = translate(source, 'en', language);
    const word = tryGetProfile(language)!.keywords[command]!.primary;
    // ko `할 때` and vi `trả lời` are written as the tokens they read as.
    expect(rendered.replace(/\s+/g, '')).toContain(word.replace(/\s+/g, ''));
    expect(rendered.split(/\s+/)).not.toContain(command);
    expect(translate(rendered, language, 'en')).toBe(translate(source, 'en', 'en'));
  });
});

describe('the English parse', () => {
  it('ask takes one message', () => {
    const node = parse('ask "Name?"', 'en');
    expect(node?.action).toBe('ask');
    expect(node?.roles.get('patient')).toMatchObject({ type: 'literal', value: 'Name?' });
    expect(node?.roles.has('style')).toBe(false);
  });

  it("answer's choices are one expression, `a or b`", () => {
    const node = parse('answer "Save?" with "Yes" or "No"', 'en');
    expect(node?.action).toBe('answer');
    expect(node?.roles.get('patient')).toMatchObject({ type: 'literal', value: 'Save?' });
    expect(node?.roles.get('style')).toMatchObject({ type: 'expression', raw: '"Yes" or "No"' });
  });

  it('a plain answer has no choices', () => {
    const node = parse('answer "Saved"', 'en');
    expect(node?.action).toBe('answer');
    expect(node?.roles.has('style')).toBe(false);
  });
});

describe('the words are the dictionaries’', () => {
  it.each(FOREIGN)('%s', language => {
    const dictionary = dictionaries[language]!;
    const keywords = tryGetProfile(language)!.keywords;
    expect(dictionary.commands.ask).toBe(keywords.ask!.primary);
    expect(dictionary.commands.answer).toBe(keywords.answer!.primary);
  });
});
