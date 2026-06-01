/**
 * Expression-parity Phase C — regression guards (source-level, run in CI's unit
 * job) mirroring the upstream cases fixed in the post-#236 parity follow-up.
 *
 * Phase 1: classRef CSS tokenization + escaping. Upstream `_hyperscript` stores
 * a bare class ref as the LITERAL class name (author backslashes stripped) and
 * re-escapes CSS-special chars (`escapeSelector`: `[:&()[\]\/]`) before
 * querySelectorAll. We match that for bare `.`-refs; pseudo-class selection
 * stays on query refs (`<button:hover/>`).
 *
 * These run under happy-dom; querySelectorAll escape handling is exercised in
 * the chromium parity harness (expressions.spec.ts) too.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tokenize, TokenKind } from '../parser/tokenizer';
import { evaluateExpressionFromSourceSync } from '../parser/runtime';
import { createMockHyperscriptContext } from '../test-setup';
import type { ExecutionContext } from '../types/core';

describe('expression parity (Phase C) — Phase 1: classRef tokenization + escaping', () => {
  describe('tokenization captures the literal class name', () => {
    const cases: Array<[string, string]> = [
      ['.c1:foo:bar', '.c1:foo:bar'], // multiple colons (`:` is a literal class char)
      ['.-c1', '.-c1'], // leading minus
      ['.-c1\\/22', '.-c1/22'], // escaped slash → literal `/`
      [
        '.group-\\[:nth-of-type\\(3\\)_\\&\\]:block',
        '.group-[:nth-of-type(3)_&]:block', // tailwind: backslashes stripped to literal
      ],
    ];
    for (const [src, expected] of cases) {
      it(`tokenizes ${JSON.stringify(src)} → ${JSON.stringify(expected)}`, () => {
        const tokens = tokenize(src).filter(t => t.kind !== TokenKind.EOF);
        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toMatchObject({ kind: TokenKind.SELECTOR, value: expected });
      });
    }
  });

  describe('DOM resolution matches the literal class', () => {
    let context: ExecutionContext;
    const made: Element[] = [];

    const mount = (className: string) => {
      const el = document.createElement('div');
      el.className = className;
      document.body.appendChild(el);
      made.push(el);
      return el;
    };

    beforeEach(() => {
      context = createMockHyperscriptContext();
    });
    afterEach(() => {
      while (made.length) made.pop()!.remove();
    });

    const resolves = (className: string, source: string) => {
      const el = mount(className);
      const result = evaluateExpressionFromSourceSync(source, context) as Element[];
      expect(Array.from(result)).toContain(el);
    };

    it('.c1:foo:bar matches class "c1:foo:bar"', () => resolves('c1:foo:bar', '.c1:foo:bar'));
    it('.-c1 matches class "-c1"', () => resolves('-c1', '.-c1'));
    it('.-c1\\/22 matches class "-c1/22"', () => resolves('-c1/22', '.-c1\\/22'));
    it('tailwind insanity matches the literal class', () =>
      resolves('group-[:nth-of-type(3)_&]:block', '.group-\\[:nth-of-type\\(3\\)_\\&\\]:block'));

    it('bare .btn:hover is a LITERAL class, not a pseudo (upstream-faithful)', () => {
      // Matches a class literally named `btn:hover`; pseudo selection is on
      // query refs (`<button:hover/>`). Do not regress to pseudo semantics here.
      resolves('btn:hover', '.btn:hover');
    });
  });
});
