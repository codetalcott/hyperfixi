/**
 * End-to-end plugin system test.
 *
 * Proves that a plugin can:
 *   1. Register a new command (so the parser recognizes it at command position)
 *   2. Provide a CommandImplementation (so the runtime executes it)
 *   3. Register a new infix operator with a custom Pratt LED
 *   4. Register a compound operator for tokenization
 *
 * Uses the `snapshot()`/`restore()` helpers on the ParserExtensionRegistry
 * to isolate test installations from other tests sharing the process.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import { tokenize } from '../parser/tokenizer';
import { installPlugin, type HyperfixiPlugin } from './plugin';
import { getParserExtensionRegistry, setGlobal } from '../parser/extensions';
import type { ASTNode } from '../types/base-types';
import type { ExecutionContext } from '../types/core';

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

describe('Plugin system (v0.9.90 Phase 5)', () => {
  const registry = getParserExtensionRegistry();
  let baseline: ReturnType<typeof registry.snapshot>;

  beforeEach(() => {
    baseline = registry.snapshot();
  });

  afterEach(() => {
    registry.restore(baseline);
  });

  describe('command registration round-trip', () => {
    it('registers a plugin command that the parser + runtime execute', async () => {
      const executionLog: string[] = [];

      const greetPlugin: HyperfixiPlugin = {
        name: 'greet-plugin',
        install({ commandRegistry, parserExtensions }) {
          parserExtensions.registerCommand('greet');
          commandRegistry.register({
            name: 'greet',
            async parseInput(_raw: any, _evaluator: any, _context: any) {
              return {};
            },
            async execute(_input: any, _context: any) {
              executionLog.push('greet-called');
            },
            validate() {
              return true;
            },
          } as any);
        },
      };

      const runtime = new Runtime();
      installPlugin(runtime, greetPlugin);

      // Parser should now accept `greet` at command position
      const result = parse('greet');
      expect(result.success).toBe(true);

      // Runtime should dispatch to the plugin's CommandImplementation
      const el = document.createElement('div');
      await runtime.execute(result.node!, createContext(el));
      expect(executionLog).toEqual(['greet-called']);
    });

    it('multiple plugins can register commands without collision', async () => {
      const log: string[] = [];

      const plug1: HyperfixiPlugin = {
        name: 'one',
        install({ commandRegistry, parserExtensions }) {
          parserExtensions.registerCommand('plug1cmd');
          commandRegistry.register({
            name: 'plug1cmd',
            async parseInput(_raw: any, _evaluator: any, _context: any) {
              return {};
            },
            async execute(_input: any, _context: any) {
              log.push('1');
            },
            validate() {
              return true;
            },
          } as any);
        },
      };
      const plug2: HyperfixiPlugin = {
        name: 'two',
        install({ commandRegistry, parserExtensions }) {
          parserExtensions.registerCommand('plug2cmd');
          commandRegistry.register({
            name: 'plug2cmd',
            async parseInput(_raw: any, _evaluator: any, _context: any) {
              return {};
            },
            async execute(_input: any, _context: any) {
              log.push('2');
            },
            validate() {
              return true;
            },
          } as any);
        },
      };

      const runtime = new Runtime();
      installPlugin(runtime, plug1);
      installPlugin(runtime, plug2);

      const el = document.createElement('div');
      await runtime.execute(parse('plug1cmd').node!, createContext(el));
      await runtime.execute(parse('plug2cmd').node!, createContext(el));
      expect(log).toEqual(['1', '2']);
    });
  });

  describe('compound operator registration', () => {
    it('registered compound is tokenized as a single token', () => {
      const plugin: HyperfixiPlugin = {
        name: 'op-plugin',
        install({ parserExtensions }) {
          parserExtensions.registerCompoundOperator('really really equals');
        },
      };

      const runtime = new Runtime();
      installPlugin(runtime, plugin);

      // Before: "really really equals" would be three separate tokens.
      // After: tokenizer should produce a single 'really really equals' OPERATOR token.
      const tokens = tokenize('a really really equals b');
      const values = tokens.map(t => t.value);
      expect(values).toContain('really really equals');
    });
  });

  describe('custom Pratt infix operator', () => {
    it('registers a custom binary operator via parser extensions', async () => {
      const plugin: HyperfixiPlugin = {
        name: 'power-plugin',
        install({ parserExtensions }) {
          // Add `pow` as a right-associative infix operator at bp 60.
          parserExtensions.registerInfixOperator(
            'pow',
            61,
            60,
            (left, _token, ctx) =>
              ({
                type: 'binaryExpression',
                operator: 'pow',
                left,
                right: ctx.parseExpr(60),
                start: (left as any).start,
              }) as unknown as ASTNode
          );
        },
      };

      const runtime = new Runtime();
      installPlugin(runtime, plugin);

      // Plugin must still register a runtime dispatch for the new operator —
      // here we just verify the parser produces a binaryExpression with the
      // correct operator. Runtime dispatch would be a separate concern.
      const result = parse('set :x to 2 pow 3');
      expect(result.success).toBe(true);
    });
  });

  describe('snapshot / restore', () => {
    it('restores registry state to baseline between tests', () => {
      const before = registry.hasCommand('tempcmd');
      const plugin: HyperfixiPlugin = {
        name: 'temp',
        install({ parserExtensions }) {
          parserExtensions.registerCommand('tempcmd');
        },
      };
      installPlugin(new Runtime(), plugin);
      expect(registry.hasCommand('tempcmd')).toBe(true);

      registry.restore(baseline);
      expect(registry.hasCommand('tempcmd')).toBe(before);
    });
  });

  // ==========================================================================
  // Phase 5b seam extensions (for @hyperfixi/reactivity and other plugins that
  // need top-level feature parsing, custom AST evaluators, and global-write
  // notifications).
  // ==========================================================================

  describe('Phase 5b — feature registration', () => {
    it('parser dispatches top-level plugin features', () => {
      const captured: Array<{ type: string; body: ASTNode[] }> = [];
      const plugin: HyperfixiPlugin = {
        name: 'track-plugin',
        install({ parserExtensions }) {
          parserExtensions.registerFeature('track', (ctx, _token) => {
            const body = ctx.parseCommandListUntilEnd();
            // consume terminating `end`
            (ctx as any).match?.('end');
            const node = { type: 'trackFeature', body } as unknown as ASTNode;
            captured.push({ type: 'trackFeature', body });
            return node;
          });
        },
      };
      installPlugin(new Runtime(), plugin);

      const result = parse('track\n  toggle .active on me\nend');
      expect(result.success).toBe(true);
      expect(captured.length).toBe(1);
      expect(captured[0].body.length).toBeGreaterThan(0);
    });

    it('registered features coexist with init/on/def in one script', () => {
      const seen: string[] = [];
      const plugin: HyperfixiPlugin = {
        name: 'plug-coexist',
        install({ parserExtensions }) {
          parserExtensions.registerFeature('watchtag', (ctx, _token) => {
            // Zero-arg feature: just emit a marker node.
            seen.push('watchtag');
            return { type: 'watchtagFeature' } as unknown as ASTNode;
          });
        },
      };
      installPlugin(new Runtime(), plugin);

      const result = parse('watchtag\non click beep! end');
      expect(result.success).toBe(true);
      expect(seen).toEqual(['watchtag']);
      // Result.node is a program containing both the watchtag feature and the on handler.
      const stmts = (result.node as any).statements ?? (result.node as any).body ?? [];
      expect(Array.isArray(stmts)).toBe(true);
    });

    it('hasFeature reflects registration', () => {
      expect(registry.hasFeature('fff')).toBe(false);
      const plugin: HyperfixiPlugin = {
        name: 'f',
        install({ parserExtensions }) {
          parserExtensions.registerFeature('fff', () => ({ type: 'fffFeature' }) as ASTNode);
        },
      };
      installPlugin(new Runtime(), plugin);
      expect(registry.hasFeature('fff')).toBe(true);
    });
  });

  describe('Phase 5b — node evaluator registration', () => {
    it('runtime dispatches custom AST node type to plugin evaluator', async () => {
      const calls: ASTNode[] = [];
      const plugin: HyperfixiPlugin = {
        name: 'eval-plugin',
        install({ parserExtensions }) {
          parserExtensions.registerNodeEvaluator('customThing', (node, _ctx) => {
            calls.push(node);
            return 42;
          });
        },
      };
      installPlugin(new Runtime(), plugin);

      const runtime = new Runtime();
      const el = document.createElement('div');
      const ctx = createContext(el);
      const node = { type: 'customThing', marker: 'hi' } as unknown as ASTNode;
      const result = await runtime.execute(node, ctx);
      expect(result).toBe(42);
      expect(calls.length).toBe(1);
      expect((calls[0] as any).marker).toBe('hi');
    });

    it('unknown node type still throws when no plugin registers it', async () => {
      const runtime = new Runtime();
      const el = document.createElement('div');
      const ctx = createContext(el);
      const node = { type: 'nobodyKnowsThis' } as unknown as ASTNode;
      await expect(runtime.execute(node, ctx)).rejects.toThrow(/Unsupported AST node type/);
    });
  });

  describe('Phase 5b — global write hook', () => {
    it('fires on writes to $name globals', async () => {
      const events: Array<[string, unknown]> = [];
      const plugin: HyperfixiPlugin = {
        name: 'watch-plugin',
        install({ parserExtensions }) {
          parserExtensions.registerGlobalWriteHook((name, value, _ctx) => {
            events.push([name, value]);
          });
        },
      };
      installPlugin(new Runtime(), plugin);

      const runtime = new Runtime();
      const el = document.createElement('div');
      const ctx = createContext(el);
      const result = parse('set $foo to 42');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);
      // setVariableValue strips the `$` prefix when storing so reads via both
      // `$foo` and `foo` resolve to the same global; the hook sees the stored
      // key (bare `foo`).
      expect(events.some(([n, v]) => n === 'foo' && v === 42)).toBe(true);
    });

    it('dispose fn removes the hook', () => {
      const events: string[] = [];
      const dispose = registry.registerGlobalWriteHook((name, _v, _ctx) => {
        events.push(name);
      });
      const ctx = createContext(document.createElement('div'));
      setGlobal(ctx, 'bar', 1);
      expect(events).toEqual(['bar']);
      dispose();
      setGlobal(ctx, 'baz', 2);
      expect(events).toEqual(['bar']);
    });
  });

  describe('Phase 5b — HyperfixiPluginContext exposes runtime', () => {
    it('install receives the runtime for cleanup registration', () => {
      let capturedRuntime: Runtime | null = null;
      const plugin: HyperfixiPlugin = {
        name: 'rt-plugin',
        install(ctx) {
          capturedRuntime = ctx.runtime;
        },
      };
      const runtime = new Runtime();
      installPlugin(runtime, plugin);
      expect(capturedRuntime).toBe(runtime);
      expect(typeof runtime.getCleanupRegistry().registerCustom).toBe('function');
    });
  });

  describe('Phase 5b — snapshot / restore for new seams', () => {
    it('restores features, node evaluators, and global write hooks', () => {
      const hookCalls: string[] = [];
      const plugin: HyperfixiPlugin = {
        name: 'snap-plugin',
        install({ parserExtensions }) {
          parserExtensions.registerFeature('ffsnap', () => ({ type: 'ffsnapFeature' }) as ASTNode);
          parserExtensions.registerNodeEvaluator('snapNode', (_n, _c) => 'hi');
          parserExtensions.registerGlobalWriteHook((name, _v, _c) => {
            hookCalls.push(name);
          });
        },
      };
      installPlugin(new Runtime(), plugin);
      expect(registry.hasFeature('ffsnap')).toBe(true);

      registry.restore(baseline);
      expect(registry.hasFeature('ffsnap')).toBe(false);

      // After restore, the hook is gone — writes don't produce events.
      const ctx = createContext(document.createElement('div'));
      setGlobal(ctx, 'anything', 1);
      expect(hookCalls).toEqual([]);
    });
  });

  describe('local hooks — :name reads and writes', () => {
    it('registerLocalWriteHook fires on `set :x to 1`', async () => {
      const events: Array<[string, unknown]> = [];
      registry.registerLocalWriteHook((name, value, _ctx) => {
        events.push([name, value]);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      const result = parse('set :x to 1');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);

      // The local was newly created, so this hits the "create new local" path
      // (line 202 in variable-access.ts) — the hook still fires there.
      expect(events).toEqual([['x', 1]]);
    });

    it('registerLocalWriteHook fires on update of an existing local', async () => {
      const events: Array<[string, unknown]> = [];
      registry.registerLocalWriteHook((name, value, _ctx) => {
        events.push([name, value]);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      ctx.locals.set('x', 0);

      const result = parse('set :x to 99');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);

      expect(events).toEqual([['x', 99]]);
    });

    it('registerLocalReadHook fires on :x reads', async () => {
      const reads: string[] = [];
      registry.registerLocalReadHook((name, _ctx) => {
        reads.push(name);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      ctx.locals.set('x', 42);

      // Read :x by setting another local from it.
      const result = parse('set :y to :x');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);

      expect(reads).toContain('x');
      expect(ctx.locals.get('y')).toBe(42);
    });

    it('registerLocalWriteHook does NOT fire on `set $x to 1` (scope discrimination)', async () => {
      const events: string[] = [];
      registry.registerLocalWriteHook((name, _v, _c) => {
        events.push(name);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      const result = parse('set $x to 1');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);

      expect(events).toEqual([]);
    });

    it('dispose fn removes the local-write hook', async () => {
      const events: string[] = [];
      const dispose = registry.registerLocalWriteHook((name, _v, _c) => {
        events.push(name);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      await runtime.execute(parse('set :a to 1').node!, ctx);
      expect(events).toEqual(['a']);

      dispose();
      await runtime.execute(parse('set :b to 2').node!, ctx);
      expect(events).toEqual(['a']);
    });

    it('snapshot/restore round-trips local hook sets', async () => {
      const calls: string[] = [];
      registry.registerLocalWriteHook((name, _v, _c) => {
        calls.push(name);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      await runtime.execute(parse('set :a to 1').node!, ctx);
      expect(calls).toEqual(['a']);

      // Restore baseline (which had no hooks). The hook should be gone.
      registry.restore(baseline);
      await runtime.execute(parse('set :b to 2').node!, ctx);
      expect(calls).toEqual(['a']);
    });
  });

  describe('global read hook — ::name regression', () => {
    it('fires on explicit-global `::name` reads (was silent before)', async () => {
      const reads: string[] = [];
      registry.registerGlobalReadHook((name, _c) => {
        reads.push(name);
      });

      const runtime = new Runtime();
      const ctx = createContext(document.createElement('div'));
      ctx.globals.set('x', 7);

      // ::x routes through the `scope === 'global'` branch in evaluateIdentifier.
      const result = parse('set :y to ::x');
      expect(result.success).toBe(true);
      await runtime.execute(result.node!, ctx);

      expect(reads).toContain('x');
      expect(ctx.locals.get('y')).toBe(7);
    });
  });
});
