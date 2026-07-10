/**
 * fetch-with-options.test.ts
 *
 * `fetch <url> with { ... }` used to parse at confidence 1.0 while silently
 * discarding the options clause: the schema had no role for it, so the trailing
 * `with { ... } as json` was never captured and the request went out with no
 * method, body, or headers. These tests assert on the captured roles and on the
 * built AST — parsing successfully is not evidence of anything here.
 */
import { describe, it, expect } from 'vitest';

import { parse } from '../src/parser';
import { buildAST } from '../src/ast-builder';

type ObjectLiteral = { type: string; properties: Array<{ key: string }> };

function fetchModifiers(source: string) {
  const node = parse(source, 'en');
  const { ast } = buildAST(node);
  return { node, ast, modifiers: ast.modifiers ?? {} };
}

function objectKeys(value: unknown): string[] {
  const obj = value as ObjectLiteral;
  expect(obj?.type).toBe('objectLiteral');
  return obj.properties.map(p => p.key);
}

describe('fetch `with { ... }` request options', () => {
  it('captures the options object as the `style` role', () => {
    const node = parse("fetch '/x' with { method: 'POST' }", 'en');
    expect(node.action).toBe('fetch');
    expect(node.roles.get('style')).toEqual({
      type: 'expression',
      raw: "{ method: 'POST' }",
    });
  });

  it('captures a trailing `as` when `with` precedes it', () => {
    const node = parse("fetch '/x' with { method: 'POST', body: 'a=1' } as json", 'en');
    expect(node.roles.get('responseType')?.value ?? node.roles.get('responseType')?.raw).toBe(
      'json'
    );
  });

  it('builds a real objectLiteral into `modifiers.with`, including a `body` key', () => {
    const { modifiers } = fetchModifiers("fetch '/x' with { method: 'POST', body: 'a=1' } as json");

    // `body` tokenizes as a CONTEXT_VAR; in key position it is an ordinary
    // property name. Before the parser accepted it, the whole object literal
    // failed and degraded to an identifier node.
    expect(objectKeys(modifiers['with'])).toEqual(['method', 'body']);
    expect((modifiers['as'] as { name?: string })?.name).toBe('json');
  });

  it('preserves an interpolated template literal in the options source text', () => {
    const node = parse(
      "fetch '/api/me' with { headers: {Authorization: `Bearer ${$token}`} } as json",
      'en'
    );
    // The brace fold rebuilds `raw` from token offsets; a space-join would have
    // corrupted the `${...}` interpolation.
    expect(node.roles.get('style')?.raw).toBe('{ headers: {Authorization: `Bearer ${$token}`} }');

    const { ast } = buildAST(node);
    expect(objectKeys(ast.modifiers?.['with'])).toEqual(['headers']);
  });

  it('accepts the `by` / `using` alternatives for the options marker', () => {
    for (const marker of ['by', 'using']) {
      const node = parse(`fetch '/x' ${marker} { method: 'POST' } as json`, 'en');
      expect(node.roles.get('style')?.raw).toBe("{ method: 'POST' }");
    }
  });
});

describe('fetch without options is unchanged', () => {
  it('still parses a bare fetch at full confidence, with no `with`', () => {
    const node = parse("fetch '/x'", 'en');
    expect(node.metadata?.confidence).toBe(1);
    expect(node.roles.has('style')).toBe(false);
  });

  it('still parses `as json` at full confidence', () => {
    const node = parse("fetch '/x' as json", 'en');
    expect(node.metadata?.confidence).toBe(1);
    expect(node.roles.get('responseType')?.value ?? node.roles.get('responseType')?.raw).toBe(
      'json'
    );
    expect(node.roles.has('style')).toBe(false);
  });
});
