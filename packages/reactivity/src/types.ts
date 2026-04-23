/**
 * Lightweight local type stubs — mirror the speech package pattern of
 * avoiding tight coupling to `@hyperfixi/core` internals. Commands and
 * evaluators consume raw shapes via these structural types.
 */

export interface ASTNode {
  type: string;
  name?: string;
  value?: unknown;
  start?: number;
  end?: number;
  line?: number;
  column?: number;
  [k: string]: unknown;
}

export interface ExpressionEvaluator {
  evaluate(node: ASTNode, context: unknown): Promise<unknown>;
}

export interface ExecutionContext {
  me?: Element | null;
  result?: unknown;
  it?: unknown;
  globals?: Map<string, unknown>;
  locals?: Map<string, unknown>;
  registerCleanup?: (element: Element, cleanup: () => void, description?: string) => void;
  [k: string]: unknown;
}
