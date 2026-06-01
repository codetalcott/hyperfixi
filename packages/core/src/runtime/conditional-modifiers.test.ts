/**
 * Tests for the `when` conditional command modifier (guard).
 *
 * `when` lets any command be conditionally executed:
 *   add .active to me when <condition>
 * The command runs only when the guard evaluates truthy, and is skipped on
 * falsy. The runtime (CommandAdapterV2) evaluates `modifiers.when` (and, for
 * hand-built / semantic ASTs, `modifiers.where`).
 *
 * Note: `where` is NOT an equivalent surface guard. It is a real collection-
 * filter operator (`<collection> where <predicate>`), so a trailing `where`
 * after a command's target binds as a filter expression and never reaches the
 * guard position. `when` is the unambiguous command guard; the tests below pin
 * that distinction so it is not accidentally "fixed" into a regression.
 *
 * Unlike the original version of this suite (which built synthetic
 * `{ type: 'expression' }` nodes and a mock evaluator the runtime no longer
 * consults), these tests drive the *real* parser + runtime end-to-end. That
 * way they exercise both halves of the feature — the parser attaching the guard
 * to `modifiers.when` / `modifiers.where`, and the runtime (CommandAdapterV2)
 * skipping on a falsy result. A regression in either half fails a test here.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import type { CommandNode, ExecutionContext } from '../types/core';

// ========== Test Utilities ==========

const created: HTMLElement[] = [];

function createTestElement(html = '<div id="test">Content</div>'): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html.trim();
  const element = container.firstElementChild as HTMLElement;
  document.body.appendChild(element);
  created.push(element);
  return element;
}

function createContext(me: HTMLElement): ExecutionContext {
  return {
    me,
    it: null,
    you: null,
    result: null,
    locals: new Map(),
    globals: new Map(),
    variables: new Map(),
    events: new Map(),
  } as unknown as ExecutionContext;
}

/** Parse a single command and return its (typed) node. */
function parseCommandNode(source: string): CommandNode {
  const result = parse(source);
  expect(result.success, `failed to parse: ${source}`).toBe(true);
  return result.node as unknown as CommandNode;
}

/** Parse + execute a single command against a fresh element; return the element. */
async function run(source: string): Promise<HTMLElement> {
  const el = createTestElement();
  const result = parse(source);
  expect(result.success, `failed to parse: ${source}`).toBe(true);
  await new Runtime().execute(result.node!, createContext(el));
  return el;
}

afterEach(() => {
  for (const el of created.splice(0)) {
    el.parentNode?.removeChild(el);
  }
});

// ========== Tests ==========

describe('when/where conditional modifiers', () => {
  describe('parser attaches the guard', () => {
    it('stores a `when` guard on modifiers.when', () => {
      const node = parseCommandNode('add .active to me when false');
      expect(node.modifiers?.when).toBeDefined();
      expect(node.modifiers?.where).toBeUndefined();
    });

    it('parses trailing `where` as the collection-filter operator, not a guard', () => {
      // `where` is a real collection-filter operator (binding power 28 in the
      // pratt parser, evaluated by the `where` case in the runtime), so
      // `me where false` binds as a filter expression during target parsing and
      // never reaches the command-guard position. `when` has no such collision,
      // which is why `when` — not `where` — is the command guard. See
      // PRE-EXISTING-FAILURES.md. (The runtime still honors a hand-built /
      // semantic `modifiers.where`; it is just unreachable via this surface.)
      const node = parseCommandNode('add .active to me where false');
      expect(node.modifiers?.where).toBeUndefined();
      const lastArg = node.args[node.args.length - 1] as { operator?: string } | undefined;
      expect(lastArg?.operator).toBe('where');
    });

    it('leaves modifiers unset when there is no guard', () => {
      const node = parseCommandNode('add .active to me');
      expect(node.modifiers?.when).toBeUndefined();
      expect(node.modifiers?.where).toBeUndefined();
    });
  });

  describe('when modifier', () => {
    it('executes the command when the condition is truthy', async () => {
      const el = await run('add .active to me when true');
      expect(el.classList.contains('active')).toBe(true);
    });

    it('skips the command when the condition is falsy', async () => {
      const el = await run('add .active to me when false');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('evaluates a comparison expression as the condition', async () => {
      const truthy = await run('add .active to me when 1 is 1');
      expect(truthy.classList.contains('active')).toBe(true);

      const falsy = await run('add .active to me when 1 is 2');
      expect(falsy.classList.contains('active')).toBe(false);
    });
  });

  describe('when (guard) vs where (filter operator)', () => {
    it('`when false` guards the command (skipped), `where false` does not', async () => {
      // `when` is the command guard: a falsy condition skips execution.
      const whenEl = await run('add .active to me when false');
      expect(whenEl.classList.contains('active')).toBe(false);

      // `where` is the collection-filter operator, not a guard, so it never
      // skips the command — `me where false` binds as the target expression.
      const whereEl = await run('add .active to me where false');
      expect(whereEl.classList.contains('active')).toBe(true);
    });
  });

  describe('no modifier', () => {
    it('executes the command normally', async () => {
      const el = await run('add .active to me');
      expect(el.classList.contains('active')).toBe(true);
    });
  });

  describe('falsy values skip execution', () => {
    it('skips when the condition is 0', async () => {
      const el = await run('add .active to me when 0');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('skips when the condition is an empty string', async () => {
      const el = await run('add .active to me when ""');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('skips when the condition is an undefined variable', async () => {
      const el = await run('add .active to me when $missing');
      expect(el.classList.contains('active')).toBe(false);
    });

    it('runs when the condition is a non-empty string', async () => {
      const el = await run('add .active to me when "yes"');
      expect(el.classList.contains('active')).toBe(true);
    });
  });
});
