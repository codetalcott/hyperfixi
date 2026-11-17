/**
 * The words the engine's grammar takes at a cursor, and their order.
 * The engine is the oracle throughout: an expectation here is a word the
 * engine parses in that place (or does not).
 */

import { describe, it, expect } from 'vitest';
import * as engine from '@hyperfixi/engine';
import { createCompleter, type CompletionEngine } from './next-words.js';
import { namesInScopeAtEnd } from './tree-symbols.js';

engine.register(...engine.everything);
const asEngine = engine as unknown as CompletionEngine;
const completer = createCompleter(asEngine, [
  'on click put "a" into #out',
  'on click put it into me then set x to 1',
  'on click set x to 2',
  'on click toggle .active',
]);
const next = (text: string) => completer.nextWords(text)!;

describe('the words the grammar takes', () => {
  it('after an event: commands, and nothing an expression would need', () => {
    const { words, takesName } = next('on click ');
    expect(words).toEqual(expect.arrayContaining(['toggle', 'add', 'put', 'set', 'if', 'repeat']));
    expect(words).not.toContain('into');
    expect(takesName).toBe(false);
  });

  it('inside a command: its own words first, and no command where a value must come', () => {
    const afterValue = next('on click put x ');
    expect(afterValue.words.slice(0, afterValue.ownCount)).toEqual(
      expect.arrayContaining(['into', 'before', 'after'])
    );
    expect(afterValue.words.indexOf('into')).toBeLessThan(afterValue.words.indexOf('is'));
    expect(afterValue.words).not.toContain('toggle');

    const beforeValue = next('on click put ');
    expect(beforeValue.words).not.toContain('toggle');
    expect(beforeValue.words).not.toContain('then');
    expect(beforeValue.takesName).toBe(true);
  });

  it('after a finished command: its optional words, then closers and commands', () => {
    const { words, ownCount } = next('on click add .a ');
    expect(words.slice(0, ownCount)).toContain('to');
    expect(words).toEqual(expect.arrayContaining(['then', 'end', 'toggle']));
    expect(words.indexOf('to')).toBeLessThan(words.indexOf('then'));
  });

  it('every offered word is one the engine parses there', () => {
    for (const text of ['on click ', 'on click put x ', 'on click if x ', 'on click repeat ']) {
      for (const word of next(text).words) {
        let stoppedAt = Infinity;
        try {
          engine.parse(text + word);
        } catch (error) {
          stoppedAt = (error as { token: { start: number } }).token.start;
        }
        expect(stoppedAt, `"${text}${word}"`).toBeGreaterThan(text.length);
      }
    }
  });

  it('names the keyword just before the cursor', () => {
    expect(next('install ').lastWord).toBe('install');
    expect(next('on click call ').lastWord).toBe('call');
    expect(next('on click put x ').lastWord).toBeNull();
  });

  it('answers nothing after an error the cursor is past', () => {
    expect(completer.nextWords('on click set x 5 then ')).toBeNull();
  });
});

describe('order', () => {
  it('puts the commands the examples use most first', () => {
    const { words } = next('on click ');
    expect(words.indexOf('put')).toBeLessThan(words.indexOf('toggle'));
    expect(words.indexOf('toggle')).toBeLessThan(words.indexOf('halt'));
  });

  // Found in VS Code: after `on click ` the list opened with `queue`,
  // `throttled`, `debounced`: words of `on` the grammar takes there and no
  // example ever writes.
  it('puts a word of the command that no example uses after the commands', () => {
    const { words } = next('on click ');
    expect(words.indexOf('put')).toBeLessThan(words.indexOf('queue'));
    expect(words.indexOf('queue')).toBeLessThan(
      words.indexOf('is') < 0 ? Infinity : words.indexOf('is')
    );
    const afterAdd = next('on click put x ');
    expect(afterAdd.words[0]).toBe('into');
  });

  it("does not offer the possessive 's as a word", () => {
    expect(next('on click put x ').words).not.toContain('s');
  });

  it("without examples keeps the grammar's order", () => {
    const plain = createCompleter(asEngine).nextWords('on click ')!.words;
    expect(plain).toEqual(expect.arrayContaining(['put', 'toggle']));
    expect([...plain].sort()).toEqual([...next('on click ').words].sort());
  });
});

describe('a long script', () => {
  const handler = (i: number) =>
    `on click${i}\n  set :count to :count + ${i}\n  toggle .active on me\nend\n`;
  const long = Array.from({ length: 150 }, (_, i) => handler(i)).join('');

  it('is answered from its last feature alone, with the same words', () => {
    const tail = 'on keyup\n  set x to 1\n  put x ';
    const started = performance.now();
    const inLong = next(long + tail);
    const elapsed = performance.now() - started;
    expect(inLong.words).toEqual(next(tail).words);
    // 600 lines parsed whole for each candidate took ~300 ms in the spike;
    // from the last feature, a few. The bound is loose on purpose.
    expect(elapsed).toBeLessThan(150);
  });
});

describe('a tree for an unfinished script', () => {
  it('is the script cut back to where it parses, with the names in scope there', () => {
    const before = completer.treeBefore('on click(who) set total to 1 then set :n to 2 then put ');
    expect(before).not.toBeNull();
    expect(namesInScopeAtEnd(before!.tree, before!.code).sort()).toEqual([':n', 'total', 'who']);
  });

  it("sees a behavior's parameters from its last handler", () => {
    const code = 'behavior B(limit)\n  on click set n to limit\n  end\nend';
    const names = namesInScopeAtEnd(engine.parse(code), code);
    expect(names.sort()).toEqual(['limit', 'n']);
  });

  it("does not leak another handler's locals", () => {
    const code = 'on click set a to 1 end on keyup set b to 2';
    expect(namesInScopeAtEnd(engine.parse(code), code)).toEqual(['b']);
  });
});
