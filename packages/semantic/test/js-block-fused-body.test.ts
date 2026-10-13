/**
 * A `js(…) … end` block after `then`, behind a fused handler head, is read whole.
 *
 * In bn/es/it/ko/pl/ru/th/tl/uk a handler head fuses with its first command
 * (`log-event-es-vso`: `al clic registrar …`), and the rest of the body went through
 * parseBodyWithGrammarPatterns, which ran the generated `js` pattern: it took `(t)` as
 * the value and left the JavaScript to the command patterns (`window.x = t` read as a
 * `set`). That walk now reads a block at a clause start as parseBodyWithClauses does.
 */
import { describe, it, expect } from 'vitest';
import { parse, translate } from '../src/index';

const FOREIGN = [
  'ar', 'bn', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const CASES = [
  'on click set t to true then js(t) window.testSuccess = t end',
  'on click log 1 then js(t) window.x = t end',
];

describe.each(CASES)('%s', source => {
  const english = translate(source, 'en', 'en');
  it.each(FOREIGN)('reads back from %s', language => {
    const foreign = translate(source, 'en', language);
    expect(translate(foreign, language, 'en'), foreign).toBe(english);
  });
});

it('es reads the block as one js command after the fused head', () => {
  const handler = parse('al clic registrar 1 entonces js (t) window.x = t fin', 'es');
  const actions = (handler.body![0] as { statements: { action: string }[] }).statements.map(
    s => s.action
  );
  expect(actions).toEqual(['log', 'js']);
});
