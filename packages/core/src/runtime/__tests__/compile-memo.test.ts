/**
 * Arc 4b step 4 — the Program cache IS the runtime's compile memo.
 *
 * The plan said "the API's `ASTCache` becomes a Program cache". Measured on
 * the design: an `Op` closes over the RUNTIME that compiled it, so a program
 * cannot live in the module-global AST cache (many runtimes, one cache). It
 * lives on the runtime instead — `compile(node)` is memoised on the node
 * object — and the AST cache's job is to hand back the SAME node object for
 * the same source, which is exactly what makes the memo hit. This test pins
 * both halves.
 */
import { describe, it, expect } from 'vitest';
import { Runtime } from '../runtime';
import { parse } from '../../parser/parser';
import { hyperscript } from '../../api/hyperscript-api';
import type { AnyNode } from '../../ast/legacy';

function nodeOf(source: string): AnyNode {
  const result = parse(source) as { node?: AnyNode };
  const node = result.node ?? (result as unknown as AnyNode);
  if (!node) throw new Error(`no node for ${source}`);
  return node;
}

describe('compile is memoised per node (Arc 4b)', () => {
  it('returns the same Op for the same node object', () => {
    const runtime = new Runtime();
    const node = nodeOf('if true then add .a else remove .a end');
    expect(runtime.compile(node)).toBe(runtime.compile(node));
  });

  it('returns a different Op for a structurally equal but distinct node', () => {
    const runtime = new Runtime();
    expect(runtime.compile(nodeOf('add .a'))).not.toBe(runtime.compile(nodeOf('add .a')));
  });

  it('binds bodies once: a nested block compiles to one Op shared by its command', () => {
    const runtime = new Runtime();
    const node = nodeOf('if true then add .a end') as AnyNode & { args?: AnyNode[] };
    const block = node.args?.[1];
    expect(block?.type).toBe('block');
    const before = runtime.compile(block as AnyNode);
    runtime.compile(node); // compiling the command must reuse the block's Op
    expect(runtime.compile(block as AnyNode)).toBe(before);
  });

  it("the API's AST cache hands back the same node, so the memo hits across compiles", () => {
    hyperscript.clearCache();
    const runtime = new Runtime();
    const a = hyperscript.compileSync('on click add .x');
    const b = hyperscript.compileSync('on click add .x');
    expect(a.ast).toBe(b.ast);
    expect(runtime.compile(a.ast as AnyNode)).toBe(runtime.compile(b.ast as AnyNode));
  });

  it('two runtimes compile the same node to different Ops (the memo is per runtime)', () => {
    const node = nodeOf('add .a');
    expect(new Runtime().compile(node)).not.toBe(new Runtime().compile(node));
  });
});
