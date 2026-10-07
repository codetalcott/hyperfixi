/**
 * `install` keeps its arguments (M1 phase 3, program structure). The bare-call
 * fold skipped `install` with the declarations (`behavior`, `def`), whose
 * parentheses are a signature; an install's are arguments, and they were left
 * unread: `install Toggleable(cls: 'highlighted')` became `install Toggleable`.
 */
import { describe, it, expect } from 'vitest';
import '../src/languages/_all';
import { parse, render, translate } from '../src/index';

const en = (code: string) => render(parse(code, 'en'), 'en');

describe('install arguments', () => {
  it.each([
    "install Toggleable(cls: 'highlighted')",
    'install Behave(foo: 1, bar: 1)',
    'install Behave()',
    'install Draggable(dragHandle: .titlebar) on #box',
  ])('%s', code => {
    expect(en(code)).toBe(code);
  });

  it.each(['es', 'ja', 'ar', 'ko', 'bn', 'hi'])('round-trip in %s', language => {
    const code = "install Toggleable(cls: 'highlighted')";
    expect(translate(translate(code, 'en', language), language, 'en')).toBe(code);
  });

  it('a behavior header keeps its signature reading', () => {
    const node = parse('behavior Draggable(dragHandle) on click log dragHandle end end', 'en');
    expect(node.kind).toBe('behavior');
  });
});

describe('features in a row', () => {
  // Neither is ever a command in a body, and the engine rejects `then` between
  // features: `install A then install B`.
  it.each(['install Behave(foo:10) install BehaveTwo(foo:42)', 'bind $x to #a bind $y to #b'])(
    '%s is written with no then',
    code => {
      expect(en(code)).toBe(code);
    }
  );
});
