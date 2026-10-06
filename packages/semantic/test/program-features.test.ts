/**
 * A script of several top-level features reads as one program (M1 phase 3,
 * program structure). Upstream reads each feature of a script on its own:
 * `def a … end def b … end` is two functions, `init … end on click …` an init
 * block and a handler. The single-statement path kept the first feature and
 * dropped the rest without a word, or chained the rest on with `then`.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';

const kinds = (code: string) => {
  const node = parse(code, 'en') as {
    kind: string;
    statements?: Array<{ kind: string; action: string }>;
  };
  return node.kind === 'compound'
    ? node.statements!.map(s => `${s.kind}:${s.action}`)
    : [`${node.kind}:${(node as { action?: string }).action}`];
};

describe('a program of features', () => {
  it.each([
    ['def foo() log 1 end on click foo()', ['def:def', 'event-handler:on']],
    ['def foo() wait 2ms log 1 end def bar() call foo() end', ['def:def', 'def:def']],
    ['when $x changes put it into me end on click log 1', ['feature:when', 'event-handler:on']],
    ['bind $x to me end live set my @a to $x', ['command:bind', 'feature:live']],
    ['on click log 1 end def foo() log 2 end', ['event-handler:on', 'def:def']],
    ['set :foo to 42 on click put :foo into me', ['command:set', 'event-handler:on']],
    ['init set :count to 0 on click increment :count', ['feature:init', 'event-handler:on']],
  ])('%s', (code, expected) => {
    expect(kinds(code)).toEqual(expected);
  });

  it('renders each feature on its own line, a handler closed by `end`', () => {
    expect(render(parse('def foo() log 1 end on click foo()', 'en'), 'en')).toBe(
      'def foo\n  log 1\nend\non click call foo()\nend'
    );
    expect(render(parse('set :foo to 42 on click put :foo into me', 'en'), 'en')).toBe(
      'set :foo to 42\non click put :foo into me\nend'
    );
  });

  it.each(['es', 'ja', 'ar', 'de', 'ko', 'tr', 'zh'])('round-trips in %s', language => {
    for (const code of [
      'def foo() log 1 end on click foo()',
      'when $x changes put it into me end on click log 1',
      'set :foo to 42 on click put :foo into me',
    ]) {
      const english = render(parse(code, 'en'), 'en');
      expect(translate(translate(code, 'en', language), language, 'en')).toBe(english);
    }
  });
});

describe('what is not a program', () => {
  it('a command sequence, a loop and a single feature', () => {
    expect(kinds('set x to 1 then put x into me')).toEqual(['command:set', 'command:put']);
    expect(render(parse('set x to 1 then put x into me', 'en'), 'en')).toBe(
      'set x to 1 then put x into me'
    );
    expect(kinds('repeat 3 times log 1 end log 2')).toEqual(['loop:repeat', 'command:log']);
    expect(kinds('live put $x into me end')).toEqual(['feature:live']);
  });

  it('a behavior keeps its handlers, keyword-led or verb-final', () => {
    expect(kinds('behavior B on click log 1 end on keyup log 2 end end')).toEqual([
      'behavior:behavior',
    ]);
    const ko = translate('behavior Foo(x) on click log x end end', 'en', 'ko');
    expect((parse(ko, 'ko') as { kind: string }).kind).toBe('behavior');
  });

  it('`set … on <element>` keeps its target: no event follows the `on`', () => {
    expect(render(parse('on click set @a to 1 on #x', 'en'), 'en')).toBe(
      'on click set @a of #x to 1'
    );
  });
});

describe('init', () => {
  it.each([
    ['init set ^x to 1', 'init\n  set ^x to 1\nend'],
    ['init halt end', 'init\n  halt\nend'],
  ])('%s reads as a block', (code, english) => {
    expect(render(parse(code, 'en'), 'en')).toBe(english);
  });

  it('an event named init is not a block (bn writes the event first)', () => {
    const bn = translate('on load trigger init', 'en', 'bn');
    expect(translate(bn, 'bn', 'en')).toBe('on load trigger init');
  });
});

describe('block names and bodies', () => {
  it('a namespaced def is one name', () => {
    expect(render(parse('def utils.foo() add .called to #d1 end', 'en'), 'en')).toBe(
      'def utils.foo\n  add .called to #d1\nend'
    );
  });

  it('a namespaced behavior is one name', () => {
    expect(kinds('behavior App.Widgets.Clickable on click add .clicked end end')).toEqual([
      'behavior:behavior',
    ]);
  });

  it('a behavior whose handler has no `end`, and no `end` of its own', () => {
    expect(render(parse('behavior Behave(foo) on click set @out to foo', 'en'), 'en')).toBe(
      'behavior Behave(foo)\n  on click set @out to foo\n  end\nend'
    );
  });

  it('a behavior that ends in an init block with no `end`', () => {
    expect(render(parse('behavior B init set x to 1', 'en'), 'en')).toBe(
      'behavior B\n  init\n    set x to 1\n  end\nend'
    );
  });

  it('an init block written before a behavior handler with no `end`', () => {
    expect(render(parse('behavior B init set x to 1 on click log x end end', 'en'), 'en')).toBe(
      'behavior B\n  init\n    set x to 1\n  end\n  on click log x\n  end\nend'
    );
  });
});
