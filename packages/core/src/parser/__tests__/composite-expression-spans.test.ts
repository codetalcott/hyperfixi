/**
 * A composite expression spans ALL of itself, not just its last token
 *
 * The traditional parser builds every node through `createXxx(…, getPosition())`,
 * and `getPosition()` reports the token consumed LAST. For a leaf that is
 * right. For a node assembled out of other nodes it is not, and the parser
 * builds three of those — with the results below, all measured on `main` before
 * this file existed:
 *
 *   get me.parentElement      memberExpression      [7, 20)  = "parentElement"
 *   call myFunction()         callExpression        [16, 17) = ")"
 *   log #target's innerHTML   possessiveExpression  [23, 32) = "innerHTML"
 *
 * Two synthesized CHILD nodes had the same defect in mirror image, taking a
 * span from a token that is not theirs at all:
 *
 *   first .item               callee identifier     [19, 24) = ".item"
 *   copy my textContent       object identifier     [8, 19)  = "textContent"
 *
 * And a sigil-scoped variable moved its `start` back over the `:` without
 * moving its `column`, so `clear :count` reported column 8 for a value starting
 * at offset 6 — a node whose two position fields pointed at different text.
 *
 * ## Why this is not a style question
 *
 * LSP hover, go-to-definition and diagnostic ranges read exactly these fields,
 * so each defect highlighted the wrong text in an editor. `call myFunction()`
 * highlighted a closing paren.
 *
 * ## How it was found
 *
 * By `tools/triage-parse-paths.ts`, once `@lokascript/semantic` began reporting
 * spans of its own: the two parse paths disagreed about the same source, and
 * the SEMANTIC one turned out to be right. `HANDOFF-convergence-next.md` had
 * named the traditional parse the oracle for spans. It was not.
 *
 * The assertions below use the source text as the oracle instead — a span is
 * correct when slicing the source with it returns the expression as written.
 * Two parsers agreeing on a wrong offset is a failure mode this arc has already
 * hit once, so agreement alone is not asserted here.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

interface Span {
  start?: number;
  end?: number;
  line?: number;
  column?: number;
  [key: string]: unknown;
}

/** The traditional parse — this file is about the traditional parser only. */
function nodeAt(source: string, path: readonly (string | number)[]): Span {
  const result = parse(source, {}) as { success: boolean; node?: unknown };
  expect(result.success, source).toBe(true);
  let node: unknown = result.node;
  for (const key of path) {
    node = (node as Record<string | number, unknown>)?.[key];
  }
  expect(node, `${source} @ ${path.join('.')}`).toBeDefined();
  return node as Span;
}

/** What the span actually picks out of the source. */
function surface(source: string, node: Span): string {
  return source.slice(node.start, node.end);
}

describe('composite expression spans', () => {
  const CASES: readonly (readonly [
    label: string,
    source: string,
    path: readonly (string | number)[],
    expected: string,
  ])[] = [
    ['memberExpression (dot)', 'get me.parentElement', ['args', 0], 'me.parentElement'],
    ['memberExpression (dot)', 'log me.value', ['args', 0], 'me.value'],
    ['memberExpression (possessive)', 'copy my textContent', ['args', 0], 'my textContent'],
    ['callExpression (bare)', 'call myFunction()', ['args', 0], 'myFunction()'],
    ['callExpression (method)', 'call element.focus()', ['args', 0], 'element.focus()'],
    ['possessiveExpression', "log #target's innerHTML", ['args', 0], "#target's innerHTML"],
    ['navigation callExpression', 'remove closest .item', ['args', 0], 'closest .item'],
  ];

  it.each(CASES)('%s — %s spans the whole expression', (_label, source, path, expected) => {
    expect(surface(source, nodeAt(source, path))).toBe(expected);
  });

  const CHILDREN: readonly (readonly [
    label: string,
    source: string,
    path: readonly (string | number)[],
    expected: string,
  ])[] = [
    ['navigation callee', 'remove closest .item', ['args', 0, 'callee'], 'closest'],
    ['possessive object', 'copy my textContent', ['args', 0, 'object'], 'my'],
    ['possessive object', 'set my innerHTML to "x"', ['args', 0, 'object'], 'my'],
  ];

  it.each(CHILDREN)('%s — %s spans only itself', (_label, source, path, expected) => {
    expect(surface(source, nodeAt(source, path))).toBe(expected);
  });

  it('a node’s column indexes the same character its start does', () => {
    // `clear :count` is the case that had them disagree: the `:` moved `start`
    // back to 6 while `column` stayed on the `count` token at 8.
    for (const source of ['clear :count', 'get me.parentElement', 'call myFunction()']) {
      const node = nodeAt(source, ['args', 0]);
      expect(node.column, source).toBe((node.start as number) + 1);
      expect(node.line, source).toBe(1);
    }
  });

  it('the assertions are not vacuous — a wrong span really does fail them', () => {
    // Mutation guard for this file. Each expectation above compares a SLICE of
    // the source, so it can only pass for one span; this pins that reading by
    // showing the pre-fix offsets no longer produce the expected text.
    expect('get me.parentElement'.slice(7, 20)).toBe('parentElement');
    expect('call myFunction()'.slice(16, 17)).toBe(')');
    expect(surface('get me.parentElement', nodeAt('get me.parentElement', ['args', 0]))).not.toBe(
      'parentElement'
    );
  });
});
