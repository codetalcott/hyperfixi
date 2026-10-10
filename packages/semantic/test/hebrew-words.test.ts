/**
 * he's missing words (M2, vocabulary sheet B7): the positional words, the
 * condition words, `in`, `as`, `at end of`, `do not throw`, and `document`,
 * `window` and `is`. he had none of them, so each stayed English, and he was
 * the one language over the words target in both halves.
 *
 * Where the sheet's word was already another of he's words, he takes another
 * (the sheet lists each): `as` is `כ`, the word he's `fetch … as` already
 * wrote (`בתור` reads as ב + תור); `ריק` (empty) was the tokenizer's alias for
 * `null`, which no render wrote. `הוא` (is) is also the pronoun `it`, as ar
 * `هو` is, and reads as `is` only between an operand and its predicate.
 */
import { describe, it, expect } from 'vitest';
import { translate } from '../src/index';

const words = (text: string): string[] => text.split(/\s+/);

describe.each([
  ['on click toggle .open on closest .accordion-item', 'הקרוב', 'closest'],
  ['on click remove .highlight from previous <li/>', 'הקודם', 'previous'],
  ['on click toggle .open on next .dropdown-menu', 'הבא', 'next'],
  ['on click focus first <input/> in closest <form/>', 'ראשון', 'first'],
  ['on click if target matches .modal-backdrop hide .modal-backdrop end', 'תואם', 'matches'],
  ['on click if I do not match .disabled toggle .selected end', 'לא', 'not'],
  ['on click if #modal exists show #modal end', 'קיים', 'exists'],
  ['on blur if my value is empty add .error to me end', 'ריק', 'empty'],
  ['on blur if my value is not empty add .error to me end', 'הוא', 'is'],
  ['on submit if result is false log "x" end', 'הוא', 'is'],
  ['on click set cls to dragClass or "sorting"', 'או', 'or'],
  ['on pointerdown from (dragHandle or me) log 1', 'או', 'or'],
  ['on submit add @disabled to <button/> in me', 'בתוך', 'in'],
  ['on click repeat for item in .items add .processed to item end', 'בתוך', 'in'],
  ['on click put :arr as String into me', 'כ', 'as'],
  ['on click fetch /api/users as JSON do not throw then log it', 'זרוק', 'throw'],
  ['on click make a <div.toast/> then put it at end of body', 'סוף', 'at'],
  ['on keydown[key=="Escape"] from window hide .modal', 'חלון', 'window'],
  ['on mousemove from document log 1', 'מסמך', 'document'],
])('%s', (source, word, english) => {
  it('he writes its own word, and reads it back', () => {
    const rendered = translate(source, 'en', 'he');
    expect(words(rendered), rendered).toContain(word);
    expect(words(rendered), rendered).not.toContain(english);
    expect(translate(rendered, 'he', 'en')).toBe(translate(source, 'en', 'en'));
  });
});

// he `אם לא` is `if not` and an `else` alternative; it splits where an operand
// follows, as bn's and vi's do (tokenizers/if-not-split.ts).
it.each([
  'on click if not window.tmp then put "a" into me end',
  'on click if not x then log 1 else log 2 end',
  'on click if x then log 1 else if not y then log 2 end',
])('he: %s', source => {
  const rendered = translate(source, 'en', 'he');
  expect(translate(rendered, 'he', 'en')).toBe(translate(source, 'en', 'en'));
});

describe('הוא is `it` where it is no copula', () => {
  it.each([
    ['ב לחיצה רשום את הוא', 'on click log it'],
    ['ב לחיצה אם הוא הוא ריק רשום את 1 סוף', 'on click if it is empty log 1 end'],
  ])('%s', (hebrew, english) => {
    expect(translate(hebrew, 'he', 'en')).toBe(english);
  });
});

// A copula after a variable with upstream's `^` sigil (ar هو, he הוא, hi है and
// th เป็น read `it` there before).
it.each(['ar', 'he', 'hi', 'th'])('%s: `^color is not undefined`', language => {
  const source = 'on click if ^color is not undefined log 1 end';
  expect(translate(translate(source, 'en', language), language, 'en')).toBe(source);
});

// A one-line handler's `at end of`: the fused handler pattern took the end noun
// for put's destination wherever the `at` word is also a destination marker
// (patterns/put.ts isAtEndNounBeforeOf).
describe.each(['es', 'he', 'id', 'it', 'pt', 'tl', 'uk'])('%s', language => {
  it.each(['on click put x at end of body', 'on click put "foo" at end of #d1'])('%s', source => {
    const rendered = translate(source, 'en', language);
    expect(translate(rendered, language, 'en')).toBe(source);
  });
});
