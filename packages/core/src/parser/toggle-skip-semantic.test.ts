/**
 * Regression test: `toggle` with @attribute / .class / *property arguments
 *
 * Fix: Added 'toggle' to the parser's skipSemanticParsing list, alongside its
 * sibling DOM commands 'add' and 'remove'.
 *
 * With the semantic analyzer active — which is the default in eval-hyperscript,
 * and therefore for every `_=` attribute at runtime — `toggle @disabled` was
 * routed through semantic parsing. Semantic parsing drops the `@` prefix from
 * the argument, so ToggleCommand.parseInput never saw the attribute reference
 * and threw "toggle command: no valid class names found". The traditional
 * parser emits an `attributeAccess` node that ToggleCommand handles correctly.
 *
 * These tests parse WITH a semantic analyzer attached (mirroring the runtime
 * path) and assert `toggle` still reaches the traditional parser.
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { createSemanticAdapter } from './semantic-integration';
import { parseSemantic, isLanguageRegistered, getRegisteredLanguages } from '@lokascript/semantic';

// Mirror eval-hyperscript.ts's getSemanticAnalyzer(): the semantic analyzer is
// present for every runtime parse, so the regression only reproduces with it.
const semanticAnalyzer = createSemanticAdapter({
  parse: parseSemantic,
  isRegistered: isLanguageRegistered,
  registered: getRegisteredLanguages,
});

function parseWithSemantic(src: string) {
  return parse(src, { semanticAnalyzer, language: 'en' } as Parameters<typeof parse>[1]);
}

/** Depth-first search for the first `toggle` command node in a parse result. */
function findToggle(root: unknown): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  const walk = (n: unknown): void => {
    if (found || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const node = n as Record<string, unknown>;
    if (node.type === 'command' && node.name === 'toggle') {
      found = node;
      return;
    }
    Object.values(node).forEach(walk);
  };
  walk(root);
  return found;
}

describe('toggle skips the semantic parser (regression)', () => {
  it('toggle @disabled keeps the attributeAccess node', () => {
    const result = parseWithSemantic('on click toggle @disabled on #target');
    expect(result.success).toBe(true);

    const toggle = findToggle(result);
    expect(toggle).not.toBeNull();
    const firstArg = (toggle!.args as Record<string, unknown>[])[0];
    // Traditional-parser output. Semantic parsing would drop the `@` prefix.
    expect(firstArg.type).toBe('attributeAccess');
    expect(firstArg.attributeName).toBe('disabled');
  });

  it('toggle @required keeps the attributeAccess node', () => {
    const result = parseWithSemantic('on click toggle @required on #email');
    expect(result.success).toBe(true);

    const toggle = findToggle(result);
    expect(toggle).not.toBeNull();
    const firstArg = (toggle!.args as Record<string, unknown>[])[0];
    expect(firstArg.type).toBe('attributeAccess');
    expect(firstArg.attributeName).toBe('required');
  });

  it('toggle .class still parses with the semantic analyzer present', () => {
    const result = parseWithSemantic('on click toggle .active on #box');
    expect(result.success).toBe(true);
    expect(findToggle(result)).not.toBeNull();
  });
});
