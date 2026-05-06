/**
 * `when <expr> [or <expr>]* changes [commandList] end` — observer feature.
 *
 * Runs the body when any watched expression's value changes (Object.is
 * semantics). One effect is created per watched expression so writes to a
 * given dep only re-run that watcher.
 */

import type { ASTNode, ExecutionContext, FeatureParserCtx } from './types';
import { reactive } from './signals';

export interface WhenFeatureNode extends ASTNode {
  type: 'whenFeature';
  watched: ASTNode[];
  body: ASTNode[];
}

export function parseWhenFeature(ctx: unknown, token: unknown): ASTNode {
  const pctx = ctx as FeatureParserCtx;
  const watched: ASTNode[] = [pctx.parseExpression()];
  while (pctx.match('or')) {
    watched.push(pctx.parseExpression());
  }
  pctx.consume('changes', "Expected 'changes' after when expression list");
  const body = pctx.parseCommandListUntilEnd();
  if (!pctx.isAtEnd() && pctx.check('end')) pctx.match('end');
  const tok = token as { start?: number; end?: number; line?: number; column?: number };
  return {
    type: 'whenFeature',
    watched,
    body,
    start: tok?.start ?? 0,
    end: pctx.getPosition().end,
    line: tok?.line,
    column: tok?.column,
  } as WhenFeatureNode;
}

export function makeEvaluateWhenFeature(runtime: {
  execute(node: ASTNode, ctx: ExecutionContext): Promise<unknown>;
  evaluateExpressionWithResult?: (
    node: ASTNode,
    ctx: ExecutionContext
  ) => Promise<{ value: unknown }>;
}): (node: ASTNode, ctx: unknown) => unknown | Promise<unknown> {
  return async function evaluateWhenFeature(node, ctx) {
    const context = ctx as ExecutionContext;
    const owner = (context.me as Element) ?? document.body;
    const n = node as WhenFeatureNode;

    for (const watchedExpr of n.watched) {
      const stop = reactive.createEffect(
        async () => {
          // Evaluate the watched expression as a regular expression through the
          // runtime so that trackGlobal/trackElement fire via the global-write
          // hook and caret-var reads.
          return await runtime.execute(watchedExpr, context);
        },
        async newValue => {
          // Fire the body with `it` / `result` bound to the new value.
          const subCtx: ExecutionContext = { ...context, it: newValue, result: newValue };
          for (const cmd of n.body) {
            await runtime.execute(cmd, subCtx);
          }
        },
        owner
      );
      context.registerCleanup?.(owner, stop, 'when-effect');
    }
    return undefined;
  };
}
