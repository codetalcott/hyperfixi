/**
 * Lightweight local type stubs — mirror the speech/reactivity pattern of
 * avoiding tight coupling to `@hyperfixi/core` internals.
 */

export interface RuntimeLike {
  execute(node: unknown, context: unknown): Promise<unknown>;
  getCleanupRegistry(): {
    registerCustom(element: Element, cleanup: () => void, description?: string): void;
  };
  // Optional — core's Runtime has this for re-processing a subtree.
  process?: (root: Element) => void | Promise<void>;
}

export interface ASTNode {
  type: string;
  name?: string;
  value?: unknown;
  [k: string]: unknown;
}

export interface ExecutionContext {
  me?: Element | null;
  result?: unknown;
  it?: unknown;
  globals?: Map<string, unknown>;
  locals?: Map<string, unknown>;
  [k: string]: unknown;
}
