/**
 * SPIKE — characterizing, not aspirational. These assert what `def` does TODAY.
 *
 * `def … end` parses fine: parser.ts:parseDefFeature produces a DefNode carrying
 * `errorSymbol` / `errorHandler` / `finallyHandler`, and hyperscript-parser.test.ts
 * has passing tests for that shape. So the syntax LOOKS supported.
 *
 * Nothing executes it. RuntimeBase.execute()'s switch dispatches command,
 * eventHandler, event, behavior, Program, initBlock, block, sequence,
 * CommandSequence, objectLiteral, templateLiteral and memberExpression — there
 * is no `def` case, and `Runtime` does not override execute(). A DefNode falls
 * to `default:` -> evaluateExpression -> evaluateAST, which throws
 * `Unknown AST node type: def`.
 *
 * So the downstream report's framing ("parsed and silently dropped") is too
 * generous: it is parsed and then THROWS. On a page the attribute processor
 * catches that into a console.error naming an internal node type, which tells
 * an author nothing about `def` being unimplemented.
 *
 * A separate implementation sits in src/features/def.ts (TypedDefFeatureImplementation
 * and DefFeature, ~1574 lines) with ZERO production callers — only src/index.ts
 * re-exports and its own tests. It cannot execute a real DefNode.body: its
 * mini-interpreter branches on string args (`args.indexOf('to')`) rather than
 * the CommandNodes the parser emits, its executeCatchBlock returns the string
 * 'handled', and its executeFinallyBlock is a bare `return`. Its catch shape is
 * `{parameter, body}`, not the parser's `{errorSymbol, errorHandler, finallyHandler}`.
 *
 * One place `def` DOES work: inside a `worker` feature, which hand-rolls its own
 * def parsing (packages/realtime/src/worker.ts) into a `workerFeature` node and
 * never touches DefNode. That confirms the gap is specifically top-level `def`
 * reaching RuntimeBase.execute.
 *
 * INVERT these when a `case 'def'` lands.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Runtime } from './runtime';
import { parse } from '../parser/parser';
import { createContext } from '../core/context';
import type { ExecutionContext } from '../types/core';
import type { DefNode } from '../types/base-types';

describe('def — current runtime behavior (spike)', () => {
  let runtime: Runtime;
  let context: ExecutionContext;

  beforeEach(() => {
    runtime = new Runtime();
    // A fresh globals Map: createContext() otherwise defaults to the
    // module-level sharedGlobals, which would leak between tests.
    context = createContext(document.createElement('div'), new Map());
  });

  it('parses to a DefNode with the error blocks populated', () => {
    const result = parse(`def risky()
      throw 'boom'
    catch e
      log e
    finally
      log 'done'
    end`);

    expect(result.success).toBe(true);
    const def = result.node as DefNode;
    expect(def.type).toBe('def');
    expect(def.errorSymbol).toBe('e');
    expect(def.errorHandler?.length).toBeGreaterThan(0);
    expect(def.finallyHandler?.length).toBeGreaterThan(0);
  });

  it('CURRENT: executing a def throws "Unknown AST node type: def"', async () => {
    const result = parse('def greet(n)\n  return n\nend');
    await expect(runtime.execute(result.node!, context)).rejects.toThrow(
      'Unknown AST node type: def'
    );
  });

  it('CURRENT: installs the function nowhere', async () => {
    const result = parse('def greet(n)\n  return n\nend');
    await runtime.execute(result.node!, context).catch(() => {});

    expect(context.globals.has('greet')).toBe(false);
    expect(context.locals.has('greet')).toBe(false);
    expect((globalThis as Record<string, unknown>).greet).toBeUndefined();
  });

  it('CURRENT: the def BODY never runs', async () => {
    const probe = document.createElement('div');
    probe.id = 'def-probe';
    document.body.appendChild(probe);

    const result = parse("def sideEffect()\n  put 'ran' into #def-probe\nend");
    await runtime.execute(result.node!, context).catch(() => {});

    expect(probe.textContent).toBe('');
    probe.remove();
  });

  it('CURRENT: in a Program the handler binds, then the def aborts the rest', async () => {
    // executeProgram buckets eventHandlers first and runs them before
    // otherStatements, so the handler DOES register — and then the def throws,
    // taking every statement after it with it.
    const result = parse(`def greet(n)
  return n
end
on click
  call greet('x')
end`);
    expect(result.success).toBe(true);

    const added: Array<(e: Event) => unknown> = [];
    const el = context.me as HTMLElement;
    el.addEventListener = ((_type: string, fn: unknown) => {
      added.push(fn as (e: Event) => unknown);
    }) as unknown as typeof el.addEventListener;

    await expect(runtime.execute(result.node!, context)).rejects.toThrow(
      'Unknown AST node type: def'
    );
    expect(added).toHaveLength(1);
  });

  it('CURRENT: calling the never-installed name fails at call time', async () => {
    const result = parse("call greet('x')");
    await expect(runtime.execute(result.node!, context)).rejects.toThrow(
      /Cannot call non-function|greet/
    );
  });

  it('CURRENT: catch never runs, because the body never runs', async () => {
    // The whole point of the reported defect: `def … catch … end` looks
    // supported and does nothing. Not even the error path.
    const probe = document.createElement('div');
    probe.id = 'def-catch-probe';
    document.body.appendChild(probe);

    const result = parse(`def risky()
  throw 'boom'
catch e
  put 'caught' into #def-catch-probe
end`);
    await runtime.execute(result.node!, context).catch(() => {});

    expect(probe.textContent).toBe('');
    probe.remove();
  });
});
