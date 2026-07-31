// @vitest-environment jsdom
/**
 * Core's semantic→AST step delegates to `@lokascript/semantic`'s `ASTBuilder`.
 *
 * `semantic-integration.ts` used to carry a SECOND role→AST implementation: a
 * blanket `destination`→`modifiers.on` / `source`→`modifiers.from` switch. It
 * had drifted from the builder for 15 of the 29 commands with a parsing English
 * surface, and — because `parser.ts`'s `skipSemanticParsing` list names only 24
 * commands — it was the LIVE English path for the rest. Five commands were
 * broken end to end as a result (measured 2026-07-31 at `d4452821`):
 *
 *   go back                            → threw `Go command requires arguments`
 *   go to url "/page"                  → threw, same
 *   get #target                        → threw `get command requires an expression argument`
 *   scroll to #header                  → threw `scroll command requires a target`
 *   pick first 2 from .items           → NO error, WRONG result (1 item, not 2)
 *
 * plus `default`, whose AST shape was wrong on top of a separate runtime bug.
 *
 * Two things the delegation deliberately does NOT change, both pinned below:
 * the four command shapes the builder cannot produce keep their dedicated
 * builders, and `show/hide/transition … *prop` keeps returning no node.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSemantic,
  isLanguageRegistered,
  getRegisteredLanguages,
  buildAST,
} from '@lokascript/semantic';
import { createSemanticAdapter, SemanticIntegrationAdapter } from './semantic-integration';
import type { SemanticAnalyzer } from './semantic-integration';
import { hyperscript } from '../api/hyperscript-api';

function makeAdapter(withBuilder = true): SemanticIntegrationAdapter {
  const analyzer = createSemanticAdapter({
    parse: parseSemantic,
    isRegistered: isLanguageRegistered,
    registered: getRegisteredLanguages,
    ...(withBuilder ? { buildAST } : {}),
  });
  return new SemanticIntegrationAdapter({ analyzer, language: 'en' });
}

/** Comparable shape: name, arg types, sorted modifier keys. */
function shapeOf(node: unknown): string {
  const n = node as { name?: string; args?: unknown[]; modifiers?: Record<string, unknown> };
  const args = (n.args ?? []).map(a => (a as { type?: string }).type).join(',');
  const mods = Object.keys(n.modifiers ?? {})
    .sort()
    .join(',');
  return `${n.name}|args:${args}|mods:${mods}`;
}

function host(html: string): HTMLElement {
  document.body.innerHTML = `<div id="host"></div>${html}`;
  return document.getElementById('host') as HTMLElement;
}

// =============================================================================
// The delegated tail IS the builder
// =============================================================================

describe('the generic command tail delegates to buildAST', () => {
  /**
   * Every reachable command with a parsing English surface. "Reachable" means
   * excluded by neither `parser.ts`'s `skipSemanticParsing` nor the adapter's
   * own `SKIP_SEMANTIC_COMMANDS` — i.e. the semantic path is what English
   * actually runs for these.
   */
  const SURFACES = [
    'go back',
    'go to url "/page"',
    'get #target',
    'pick first 2 from .items',
    'scroll to #header',
    'scroll to last <.message/> in #chat',
    'default :x to 0',
    'bind $greeting to #name-input',
    'send refresh to #target',
    'show #panel',
    'hide #panel',
    'log me',
    'settle',
    'blur me',
    'clear :x',
    'focus first <input/>',
    'take .active from .tab',
    'throw "boom"',
    'push url "/next"',
    'replace url "/next"',
    'empty #list',
    'open #dlg as non-modal',
    'close #dlg',
    'reset #form',
    'call foo()',
    'copy "hello"',
    'render #tpl',
    'live #out',
    'behavior Foo',
  ];

  it.each(SURFACES)('%s builds the same node the ASTBuilder does', src => {
    const parsed = parseSemantic(src, 'en');
    expect(parsed.node, `no semantic parse for "${src}"`).toBeTruthy();

    const viaBuilder = shapeOf(buildAST(parsed.node as never).ast);
    const attempt = makeAdapter().trySemanticParse(src);

    expect(attempt.success, `adapter refused "${src}": ${(attempt.errors ?? []).join('; ')}`).toBe(
      true
    );
    expect(shapeOf(attempt.node)).toBe(viaBuilder);
  });

  it('stamps the fields core requires but the builder does not emit', () => {
    const node = makeAdapter().trySemanticParse('scroll to #header').node;
    // `ASTBuilder` emits position-free nodes and marks isBlocking only where a
    // schema declares it; core's CommandNode requires isBlocking and reads the
    // span in error messages.
    expect(node).toMatchObject({ type: 'command', isBlocking: false, start: 0, line: 1 });
  });

  it("carries the builder's isBlocking through rather than hardcoding false", () => {
    // `fetch` declares isBlocking in its schema. The deleted switch hardcoded
    // `isBlocking: false` for every command, which is what made this worth
    // pinning: it is a behavior delta of the delegation, not an accident.
    const parsed = parseSemantic('fetch /api/x', 'en');
    const built = buildAST(parsed.node as never).ast as { isBlocking?: boolean };
    expect(built.isBlocking, 'precondition: fetch is a blocking schema').toBe(true);

    const analyzer = createSemanticAdapter({
      parse: parseSemantic,
      isRegistered: isLanguageRegistered,
      registered: getRegisteredLanguages,
      buildAST,
    });
    const node = analyzer.buildCommandNode?.({
      name: 'fetch',
      roles: (parsed.node as unknown as { roles: never }).roles,
    });
    expect(node?.isBlocking).toBe(true);
  });
});

// =============================================================================
// What delegation must NOT take over
// =============================================================================

describe('shapes the ASTBuilder cannot produce keep their dedicated builders', () => {
  /**
   * Measured both paths on one parse. The builder's shapes are right for ITS
   * consumers — it carries the loop variant on `LoopSemanticNode`, which a
   * single-command parse has already discarded — but they are not core's
   * runtime contract, so these four stay behind.
   */
  it('repeat keeps the loop-variant discriminator the builder drops', () => {
    const node = makeAdapter().trySemanticParse('repeat forever').node;
    expect(node?.name).toBe('repeat');
    expect(node?.args?.[0]).toMatchObject({ type: 'identifier', name: 'forever' });

    // The builder alone would have produced no discriminator at all.
    const built = buildAST(parseSemantic('repeat forever', 'en').node as never).ast as {
      args?: unknown[];
    };
    expect(built.args ?? []).toHaveLength(0);
  });

  it('repeat N times keeps [times, count]', () => {
    const node = makeAdapter().trySemanticParse('repeat 5 times').node;
    expect(node?.args?.[0]).toMatchObject({ type: 'identifier', name: 'times' });
    expect(node?.args?.[1]).toMatchObject({ type: 'literal', value: 5 });
  });

  it('for is renamed to repeat, which the builder does not do', () => {
    const node = makeAdapter().trySemanticParse('for item in items').node;
    expect(node?.name).toBe('repeat');

    const built = buildAST(parseSemantic('for item in items', 'en').node as never).ast as {
      name?: string;
    };
    expect(built.name, 'the builder keeps the `for` name core has no command for').toBe('for');
  });

  it('set keeps the positional `to` marker SetCommand.parseInput reads', () => {
    const node = makeAdapter().trySemanticParse('set x to 5').node;
    expect(node?.args?.[1]).toMatchObject({ type: 'identifier', name: 'to' });
    expect(node?.args?.[2]).toMatchObject({ type: 'literal', value: 5 });

    // The builder puts the value in `modifiers.to`, which SetCommand never reads.
    const built = buildAST(parseSemantic('set x to 5', 'en').node as never).ast as {
      modifiers?: Record<string, unknown>;
    };
    expect(built.modifiers?.['to']).toBeDefined();
  });
});

describe('the *prop refusal survives delegation', () => {
  it.each([
    'show #panel with *opacity',
    'hide #panel with *opacity',
    'transition my *opacity to 0 over 200ms',
  ])('%s returns no node so the traditional parser takes it', src => {
    const attempt = makeAdapter().trySemanticParse(src);
    expect(attempt.success).toBe(false);
    expect(attempt.node).toBeUndefined();
  });

  it('is a refusal, not an inability — the builder would have built one', () => {
    const parsed = parseSemantic('transition my *opacity to 0 over 200ms', 'en');
    expect(parsed.node).toBeTruthy();
    expect(buildAST(parsed.node as never).ast).toMatchObject({ type: 'command' });
  });
});

describe('an analyzer with no builder degrades to the traditional parser', () => {
  it('reports failure for the generic tail rather than inventing a node', () => {
    const attempt = makeAdapter(false).trySemanticParse('scroll to #header');
    expect(attempt.success).toBe(false);
    expect((attempt.errors ?? []).join(' ')).toMatch(/buildCommandNode/);
  });

  it('still serves the four dedicated shapes', () => {
    // Those never needed the builder, so an unwired analyzer keeps them.
    const attempt = makeAdapter(false).trySemanticParse('set x to 5');
    expect(attempt.success).toBe(true);
    expect(attempt.node?.name).toBe('set');
  });

  it('is what the SemanticAnalyzer contract advertises', () => {
    const bare: SemanticAnalyzer = {
      analyze: () => ({ confidence: 0 }),
      supportsLanguage: () => true,
      supportedLanguages: () => ['en'],
    };
    expect(bare.buildCommandNode).toBeUndefined();
  });
});

// =============================================================================
// The five live English defects, end to end
// =============================================================================

describe('the defects the duplicated switch caused', () => {
  it('`go back` executes instead of throwing', async () => {
    const result = (await hyperscript.eval('go back', host(''))) as { type?: string };
    expect(result?.type).toBe('back');
  });

  it('`go to url "/page"` executes instead of throwing', async () => {
    await expect(hyperscript.eval('go to url "/page"', host(''))).resolves.toBeDefined();
  });

  it('`get #target` returns the element instead of throwing', async () => {
    const el = host('<div id="target">T</div>');
    const result = (await hyperscript.eval('get #target', el)) as { value?: unknown };
    expect(result?.value).toBe(document.getElementById('target'));
  });

  it('`scroll to #header` finds its target instead of throwing', async () => {
    const el = host('<div id="header">H</div>');
    const result = (await hyperscript.eval('scroll to #header', el)) as { element?: unknown };
    expect(result?.element).toBe(document.getElementById('header'));
  });

  it('`scroll to last <.message/> in #chat` (the corpus row) executes', async () => {
    const el = host('<div id="chat"><p class="message">a</p><p class="message">b</p></div>');
    const result = (await hyperscript.eval('scroll to last <.message/> in #chat', el)) as {
      element?: unknown;
    };
    expect(result?.element).toBe(document.querySelectorAll('#chat .message')[1]);
  });

  it('`pick first 2 from .items` returns TWO items, not one', async () => {
    // The only defect of the five that failed silently: the switch bound the
    // count to args[0] and the source to modifiers.from, so PickCommand read
    // its count as the collection and returned a single element.
    const el = host('<i class="items">a</i><i class="items">b</i><i class="items">c</i>');
    const result = (await hyperscript.eval('pick first 2 from .items', el)) as {
      selectedItem?: unknown;
    };
    expect(Array.isArray(result?.selectedItem)).toBe(true);
    expect(result?.selectedItem).toHaveLength(2);
  });

  it('`default` now reaches the same runtime as the traditional parser', async () => {
    // The AST-shape half of default's breakage is what this phase fixes: the
    // switch emitted `args:[value] mods:{on:target}` where DefaultCommand reads
    // `args[0]`-is-target / `modifiers.to`-is-value. Both paths now agree —
    // and both hit DefaultCommand's own separate defect (it EVALUATES the
    // target name), which is a runtime fix, not a parser one.
    const el = host('');
    const semantic = await hyperscript.eval('default :x to 0', el).catch(e => `${e.message}`);
    const traditional = await hyperscript
      .eval('default :x to 0', el, { traditional: true } as never)
      .catch(e => `${e.message}`);
    expect(semantic).toBe(traditional);
  });
});
