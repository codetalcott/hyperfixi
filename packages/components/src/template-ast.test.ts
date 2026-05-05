import { describe, it, expect } from 'vitest';
import { parseTemplate, renderTemplate } from './template-ast';

const noopInterp = (t: string): string => t;

describe('parseTemplate', () => {
  it('parses plain text as a single text node', () => {
    const ast = parseTemplate('hello world');
    expect(ast).toEqual([{ kind: 'text', content: 'hello world' }]);
  });

  it('parses a simple #if/#end', () => {
    const ast = parseTemplate('before\n#if cond\ninner\n#end\nafter');
    expect(ast.length).toBe(3);
    expect(ast[0]).toEqual({ kind: 'text', content: 'before' });
    expect(ast[1].kind).toBe('if');
    if (ast[1].kind === 'if') {
      expect(ast[1].cond).toBe('cond');
      expect(ast[1].then).toEqual([{ kind: 'text', content: 'inner' }]);
      expect(ast[1].else).toEqual([]);
    }
    expect(ast[2]).toEqual({ kind: 'text', content: 'after' });
  });

  it('parses #if/#else/#end', () => {
    const ast = parseTemplate('#if cond\nT\n#else\nF\n#end');
    expect(ast.length).toBe(1);
    expect(ast[0].kind).toBe('if');
    if (ast[0].kind === 'if') {
      expect(ast[0].then).toEqual([{ kind: 'text', content: 'T' }]);
      expect(ast[0].else).toEqual([{ kind: 'text', content: 'F' }]);
    }
  });

  it('parses #for/#end', () => {
    const ast = parseTemplate('#for item in items\nbody\n#end');
    expect(ast.length).toBe(1);
    expect(ast[0].kind).toBe('for');
    if (ast[0].kind === 'for') {
      expect(ast[0].varName).toBe('item');
      expect(ast[0].iterableExpr).toBe('items');
      expect(ast[0].body).toEqual([{ kind: 'text', content: 'body' }]);
    }
  });
});

describe('renderTemplate', () => {
  it('renders text with interpolation passthrough', () => {
    const ast = parseTemplate('hello world');
    const out = renderTemplate(ast, {}, noopInterp, () => undefined);
    expect(out).toBe('hello world');
  });

  it('renders the then-branch when condition is truthy', () => {
    const ast = parseTemplate('#if cond\nyes\n#else\nno\n#end');
    const out = renderTemplate(ast, {}, noopInterp, expr => expr === 'cond');
    expect(out).toBe('yes');
  });

  it('renders the else-branch when condition is falsy', () => {
    const ast = parseTemplate('#if cond\nyes\n#else\nno\n#end');
    const out = renderTemplate(ast, {}, noopInterp, () => false);
    expect(out).toBe('no');
  });

  it('renders #for body once per item', () => {
    const ast = parseTemplate('#for item in items\n${item}\n#end');
    const out = renderTemplate(
      ast,
      {},
      (t, s) => t.replace('${item}', String(s.item ?? '')),
      expr => (expr === 'items' ? ['a', 'b', 'c'] : undefined)
    );
    expect(out).toBe('a\nb\nc');
  });

  it('renders #for #else when iterable is empty', () => {
    const ast = parseTemplate('#for item in items\n${item}\n#else\nempty\n#end');
    const out = renderTemplate(ast, {}, noopInterp, expr => (expr === 'items' ? [] : undefined));
    expect(out).toBe('empty');
  });
});
