/**
 * `live ... end` — reactive block. Body re-runs whenever any dependency read
 * during its execution changes.
 *
 * Upstream syntax:
 *   live [commandList] end
 *
 * Each command in the body is re-executed as a single effect. The entire
 * body shares one effect instance; its dependency set is the union of every
 * read performed during body execution.
 */

import type { ASTNode, ExecutionContext } from './types';
import { reactive } from './signals';

export interface LiveFeatureNode extends ASTNode {
  type: 'liveFeature';
  body: ASTNode[];
}

type ParserCtx = {
  match(expected: string | string[]): boolean;
  check(expected: string | string[]): boolean;
  consume(expected: string, message: string): unknown;
  isAtEnd(): boolean;
  parseCommandListUntilEnd(): ASTNode[];
  getPosition(): { start: number; end: number; line?: number; column?: number };
};

/**
 * Parse `live ... end`. The `live` keyword has already been consumed by the
 * parser dispatcher; we parse the body and expect a trailing `end`.
 */
export function parseLiveFeature(ctx: unknown, token: unknown): ASTNode {
  const pctx = ctx as ParserCtx;
  const body = pctx.parseCommandListUntilEnd();
  // parseCommandListUntilEnd stops when it sees `end` (but doesn't consume it).
  if (!pctx.isAtEnd() && pctx.check('end')) pctx.match('end');
  const tok = token as { start?: number; end?: number; line?: number; column?: number };
  return {
    type: 'liveFeature',
    body,
    start: tok?.start ?? 0,
    end: pctx.getPosition().end,
    line: tok?.line,
    column: tok?.column,
  } as LiveFeatureNode;
}

/**
 * Create an evaluator bound to a runtime reference. The plugin captures
 * `runtime` at install time and passes it in so effect re-runs can dispatch
 * the body commands without going through module-scope state.
 */
export function makeEvaluateLiveFeature(runtime: {
  execute(node: ASTNode, ctx: ExecutionContext): Promise<unknown>;
}): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return async function evaluateLiveFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const owner = (context.me as Element) ?? document.body;
    const n = node as LiveFeatureNode;

    const stop = reactive.createEffect(
      async () => {
        for (const cmd of n.body) {
          await runtime.execute(cmd, context);
        }
      },
      () => {
        /* no-op — side effects happened inside the expression */
      },
      owner
    );
    context.registerCleanup?.(owner, stop, 'live-effect');
    return undefined;
  };
}
