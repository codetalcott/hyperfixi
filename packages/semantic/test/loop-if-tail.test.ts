/**
 * A loop that holds an `if`, and the commands after it.
 *
 * Two losses. (1) A fused handler's loop head re-parses its own clause, and
 * that clause ended at the first `end` — the if's. The loop took it for its
 * own, the loop's `end` then closed the handler, and every command after the
 * loop was dropped: `repeat 3 times if … end end then log 2` lost `log 2` in
 * 13 languages. (2) An `if` whose condition opens with a literal (`if 1 < 2`,
 * `if "a" is …`, `if true`) matched no `if` pattern inside a loop, so the head
 * was skipped and the branch ran unconditionally — in English, and so in
 * every translation.
 */
import { describe, it, expect } from 'vitest';
import { parse, render } from '../src/index';

// bn is left out: its শেষ (`end`, also `last`) moves a loop's `end` past the
// command after it — a separate, older defect, filed.
const FOREIGN = [
  'ar', 'de', 'es', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'ms',
  'pl', 'pt', 'qu', 'ru', 'sw', 'th', 'tl', 'tr', 'uk', 'vi', 'zh',
] as const;

const CASES = [
  'on click repeat 3 times if x > 1 log 1 end end then log 2',
  'on click repeat 3 times if x > 1 log 1 else log 3 end end then log 2',
  'on click repeat 3 times if ready log 1 else if done log 2 end end then log 3',
  'on click repeat 3 times repeat 2 times if x log 1 end end end then log 2',
  // Nested loops close through the open-loop count, not the clause scan.
  'on click repeat 3 times repeat 2 times log 1 end end then log 2',
  // A literal-first condition.
  'on click repeat 2 times if 1 < 2 log 1 end end then log 2',
  'on click repeat for item in .a if 1 < 2 log 1 end end then log 2',
  'on click repeat 2 times if "a" is "a" log 1 end end',
  'on click repeat 3 times if true log 1 else log 3 end end',
];

// English only: zh reads no `if` inside `repeat forever`, whatever the
// condition — a separate zh defect, filed.
const ENGLISH_ONLY = [
  'on click repeat forever if 1 < 2 log 1 end end',
  'on click repeat forever if "a" is "a" log 1 end end',
];

describe('English', () => {
  it.each([...CASES, ...ENGLISH_ONLY])('%s', src => {
    expect(render(parse(src, 'en')!, 'en')).toBe(src);
  });
});

describe.each(CASES)('%s, through every language', src => {
  it.each(FOREIGN)('%s', language => {
    const foreign = render(parse(src, 'en')!, language);
    expect(render(parse(foreign, language)!, 'en'), foreign).toBe(src);
  });
});
