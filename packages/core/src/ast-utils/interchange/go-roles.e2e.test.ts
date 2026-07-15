/**
 * End-to-end regression for the `go` URL-destination drop.
 *
 * Exercises the exact path the AOT interchange adapter uses
 * (core-parser-adapter.ts): compileSync(code, { traditional: true }) →
 * fromCoreAST(goNode) → roles. Kept separate from from-core.test.ts so that
 * file stays parser-free. Fixtures are REAL parser output, not hand-built —
 * the previous handoff misdiagnosed the bug precisely because its fixtures were
 * fabricated.
 */
import { describe, it, expect } from 'vitest';
import { hyperscript } from '../../api/hyperscript-api';
import { fromCoreAST } from './from-core';

function findGoNodes(node: unknown, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out;
  const n = node as Record<string, unknown>;
  if (n.type === 'command' && n.name === 'go') out.push(n);
  for (const key of Object.keys(n)) {
    const v = n[key];
    if (Array.isArray(v)) v.forEach(c => findGoNodes(c, out));
    else if (v && typeof v === 'object') findGoNodes(v, out);
  }
  return out;
}

function rolesFor(src: string, traditional = true): any {
  const res: any = hyperscript.compileSync(src, { traditional });
  const go = findGoNodes(res.ast ?? res.node ?? res)[0];
  expect(go, `no go node for: "${src}"`).toBeDefined();
  return (fromCoreAST(go) as any).roles;
}

describe('go interchange roles (traditional parse → fromCoreAST)', () => {
  it('naked path keeps the destination', () => {
    const roles = rolesFor('go to /page');
    expect(roles.destination).toMatchObject({ type: 'literal', value: '/page' });
    expect(roles.method).toBeUndefined();
  });

  it('scheme URL keeps the destination', () => {
    expect(rolesFor('go to https://example.com').destination).toMatchObject({
      type: 'literal',
      value: 'https://example.com',
    });
  });

  it('deprecated url form → destination + method', () => {
    const roles = rolesFor('go to url "/page"');
    expect(roles.destination).toMatchObject({ type: 'literal', value: '/page' });
    expect(roles.method).toMatchObject({ type: 'literal', value: 'url' });
  });

  it('go back → destination identifier back', () => {
    expect(rolesFor('go back').destination).toMatchObject({ type: 'identifier', value: 'back' });
  });

  it('preserves the destination for a go inside an event handler', () => {
    // Handler-level conversion (the go lives in the handler body).
    expect(rolesFor('on click go to /x').destination).toMatchObject({
      type: 'literal',
      value: '/x',
    });
  });

  it('semantic parse path also binds the destination', () => {
    const roles = rolesFor('go to url "/page"', false);
    expect(roles.destination).toMatchObject({ type: 'literal', value: '/page' });
    expect(roles.method).toMatchObject({ type: 'literal', value: 'url' });
  });
});
