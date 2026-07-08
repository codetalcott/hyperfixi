/**
 * `worker <Name> (def <fn>(<params>) <commands> end)+ end` — named function
 * bundle, API-compatible with upstream _hyperscript's worker extension.
 *
 * v1 is an ASYNC MAIN-THREAD SHIM: each `def` becomes a Promise-returning
 * method on the named global (`Calculator.add(1, 2)` awaits the def body on
 * the main thread). There is NO thread isolation — real Web Worker execution
 * (AOT-compiled def bodies in a Blob worker) is a future arc. The Promise
 * API matches upstream, so scripts written against the shim keep working
 * when real isolation lands.
 *
 * Core note: `def` nodes are parse-only in core (no runtime executor), so
 * the shim executes each def body itself as a CommandSequence with the
 * call's arguments bound as locals; a `return <expr>` in the body is
 * captured via the context's `returnValue` slot.
 */

import type { ASTNode, ExecutionContext, FeatureParserCtx, RuntimeLike, Token } from './types';

export interface WorkerDef {
  name: string;
  params: string[];
  body: ASTNode[];
}

export interface WorkerFeatureNode extends ASTNode {
  type: 'workerFeature';
  name: string;
  defs: WorkerDef[];
}

/**
 * Parse the worker feature. The `worker` keyword has already been consumed
 * by the parser dispatcher. Defs are parsed manually (core's parseDefFeature
 * is not exposed on ParserContext): `def <name>(<params>) <commands> end`.
 */
export function parseWorkerFeature(ctx: unknown, token: unknown): ASTNode | null {
  const p = ctx as FeatureParserCtx;
  const tok = token as Token;
  try {
    const name = p.advance().value;

    const defs: WorkerDef[] = [];
    while (p.check('def')) {
      p.advance();
      const fnName = p.advance().value;
      const params: string[] = [];
      if (p.check('(')) {
        p.advance();
        while (!p.check(')') && !p.isAtEnd()) {
          const param = p.advance();
          if (param.value !== ',') params.push(param.value);
        }
        p.consume(')', "Expected ')' after worker def parameters");
      }
      // Consumes this def's `end`.
      const body = p.parseCommandListUntilEnd();
      defs.push({ name: fnName, params, body });
    }

    if (defs.length === 0) {
      p.addError(`Expected at least one 'def' in worker ${name}`);
      return null;
    }

    p.consume('end', "Expected 'end' to close worker feature");

    return {
      type: 'workerFeature',
      name,
      defs,
      start: tok?.start ?? 0,
      end: p.getPosition().end,
      line: tok?.line,
      column: tok?.column,
    } as WorkerFeatureNode;
  } catch (error) {
    p.addError(error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Create the workerFeature evaluator bound to a runtime reference. */
export function makeEvaluateWorkerFeature(
  runtime: RuntimeLike
): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return function evaluateWorkerFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const n = node as WorkerFeatureNode;

    const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
    for (const def of n.defs) {
      api[def.name] = async (...args: unknown[]): Promise<unknown> => {
        const fnCtx: ExecutionContext = {
          me: (context.me as Element) ?? null,
          you: null,
          it: null,
          result: null,
          locals: new Map<string, unknown>(def.params.map((param, i) => [param, args[i]])),
          globals: context.globals,
          // Presence of the key lets the core `return` command record its
          // value here (in addition to signalling the sequence to stop).
          returnValue: undefined,
        };
        const result = await runtime.execute(
          { type: 'CommandSequence', commands: def.body } as ASTNode,
          fnCtx
        );
        const recorded = (fnCtx as { returnValue?: unknown }).returnValue;
        return recorded !== undefined ? recorded : result;
      };
    }

    context.globals?.set(n.name, api);
    return undefined;
  };
}
