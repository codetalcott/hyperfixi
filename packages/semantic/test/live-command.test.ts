/**
 * Live Block Tests
 *
 * `live` is a reactive block whose body re-runs when its tracked dependencies
 * change. It takes no leading role (the body follows the keyword directly), so
 * its schema opts into `bareKeyword` pattern generation — which used to mean the
 * lone keyword matched at Stage 2 and the body was dropped at a vacuous
 * confidence 1.0. The structural layer folds it into a `feature` node instead.
 *
 * Assert on the captured body, not on "does it parse": it always parsed.
 */
import { describe, it, expect } from 'vitest';
import { parse, canParse, buildAST } from '../src';
import type { CommandSemanticNode, FeatureSemanticNode } from '../src/types';

const DERIVED = 'live put `Count: ${$count}` into me end';
const MULTI_DEP = 'live put `${$price * $quantity}` into #total end';

describe('live block', () => {
  it('captures the body of a derived-value live block', () => {
    const node = parse(DERIVED, 'en') as FeatureSemanticNode;

    expect(node.kind).toBe('feature');
    expect(node.action).toBe('live');
    expect(node.name).toBeUndefined(); // `live` has no name to bind
    expect(node.body.map(c => c.action)).toEqual(['put']);
  });

  it('captures the body of a live block with multiple dependencies', () => {
    const node = parse(MULTI_DEP, 'en') as FeatureSemanticNode;
    expect(node.body.map(c => c.action)).toEqual(['put']);
  });

  it('carries the body into the built AST', () => {
    const { ast } = buildAST(parse(DERIVED, 'en')) as unknown as {
      ast: { name: string; args: Array<{ type: string; commands?: unknown[] }> };
    };
    expect(ast.name).toBe('live');
    expect(ast.args.find(a => a.type === 'block')?.commands).toHaveLength(1);
  });

  it('parses a multi-line live block', () => {
    const node = parse('live\n  put it into me\nend', 'en') as FeatureSemanticNode;
    expect(node.body.map(c => c.action)).toEqual(['put']);
  });

  it('parses the Japanese rendering (keyword-initial in every language)', () => {
    const node = parse('ライブ それ を 私 に 置く 終わり', 'ja') as FeatureSemanticNode;
    expect(node.kind).toBe('feature');
    expect(node.action).toBe('live');
    expect(node.body.map(c => c.action)).toEqual(['put']);
  });

  it('canParse reports true for a live block', () => {
    expect(canParse(DERIVED, 'en')).toBe(true);
  });

  it('leaves no unconsumed input behind', () => {
    const diagnostics = parse(DERIVED, 'en').diagnostics ?? [];
    expect(diagnostics.filter(d => d.code === 'unconsumed-input')).toHaveLength(0);
  });

  it('does not hijack a non-block command that merely contains text', () => {
    // sanity: ordinary commands are unaffected by the bare `live` keyword pattern
    expect((parse('toggle .active', 'en') as CommandSemanticNode).action).toBe('toggle');
    expect((parse('put :x into me', 'en') as CommandSemanticNode).action).toBe('put');
  });
});
