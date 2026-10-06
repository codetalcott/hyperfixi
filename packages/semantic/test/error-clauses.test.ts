/**
 * A handler's and a function's error clauses (M1 phase 3, control flow):
 * `catch <name> …` runs when the body throws, `finally …` after it either way.
 * The handler patterns left `catch e …` unread, and a def ran its clauses as
 * more of its body, so error handling ran unconditionally — in silence.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';
import { splitErrorClauses } from '../src/parser/block-parser';

const en = (code: string) => render(parse(code, 'en'), 'en');

describe('a handler', () => {
  it.each([
    'on click throw "bar" catch e put e into me',
    'on click throw "bar" finally put "bar" into me',
    'on click throw "bar" catch e throw e finally put "bar" into me',
  ])('%s', code => {
    expect(en(code)).toBe(code);
    const node = parse(code, 'en') as { kind: string; catchBody?: unknown[] };
    expect(node.kind).toBe('event-handler');
  });

  it('chains a clause of several commands', () => {
    expect(en('on click fetch /test catch e log e put "yay" into me')).toBe(
      'on click fetch "/test" catch e log e then put "yay" into me'
    );
  });

  it.each(['es', 'ja', 'ar', 'de', 'ko', 'tr', 'zh', 'qu'])(
    'round-trips in %s (the English words where a language has none)',
    language => {
      const code = 'on click throw "bar" catch e put e into me finally log 1';
      expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
    }
  );
});

describe('a def', () => {
  it('writes its clauses before its end', () => {
    expect(en('def foo() throw "bar" catch e set window.bar to e end')).toBe(
      'def foo\n  throw "bar"\ncatch e\n  set window.bar to e\nend'
    );
    expect(en('def foo() set window.bar to 10 finally set window.bar to 20 end')).toBe(
      'def foo\n  set window.bar to 10\nfinally\n  set window.bar to 20\nend'
    );
  });

  it.each(['es', 'ja', 'ru'])('round-trips in %s', language => {
    const code = 'def foo() throw "bar" catch e return 42 end';
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(en(code));
  });
});

describe('splitErrorClauses', () => {
  it('reads only depth-0 clauses', () => {
    expect(splitErrorClauses('if x log 1 end catch e log e', 'en')).toEqual({
      main: 'if x log 1 end',
      catchName: 'e',
      catchText: 'log e',
    });
  });

  it('leaves a JavaScript catch alone', () => {
    expect(splitErrorClauses('js try { a() } catch(e) { b() } end', 'en')).toBeNull();
  });
});

describe('a tick', () => {
  it('is one turn of the event loop, the duration 0ms (as the engine runs it)', () => {
    expect(en('on click wait a tick then put 1 into me')).toBe(
      'on click wait 0ms then put 1 into me'
    );
    // Read as the article and a word, it was `wait tick`: a wait on a variable.
    expect(translate('on click wait a tick then log 1', 'en', 'es')).toContain('0ms');
  });
});
