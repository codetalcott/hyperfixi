/**
 * Lightweight local type stubs — mirror the reactivity package pattern of
 * avoiding tight coupling to `@hyperfixi/core` internals. Parse fns and
 * evaluators consume raw shapes via these structural types, so production
 * code needs no value imports from core (the parser-extension registry hands
 * us the real objects at install time).
 */

export interface Token {
  kind: string;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

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

export interface ExecutionContext {
  me?: Element | null;
  you?: unknown;
  result?: unknown;
  it?: unknown;
  globals?: Map<string, unknown>;
  locals?: Map<string, unknown>;
  registerCleanup?: (element: Element, cleanup: () => void, description?: string) => void;
  [k: string]: unknown;
}

/**
 * Structural shape of the parser context surfaced to feature parse functions
 * (`registerFeature(...)`). The hyperfixi parser passes its full
 * `ParserContext`; we declare just the methods our parsers call.
 *
 * NOTE: `parseCommandListUntilEnd()` CONSUMES the terminating `end` token and
 * throws when it is missing — grammar code below is written around that.
 */
export interface FeatureParserCtx {
  peek(): Token;
  peekAt(offset: number): Token | null;
  advance(): Token;
  previous(): Token;
  consume(expected: string, message: string): Token;
  check(expected: string): boolean;
  match(...values: string[]): boolean;
  isAtEnd(): boolean;
  parseExpression(): ASTNode;
  parseCommandListUntilEnd(): ASTNode[];
  getPosition(): { start: number; end: number; line?: number; column?: number };
  getInputSlice(start: number, end?: number): string;
  addError(message: string): void;
}

/** Minimal runtime surface the evaluators need. */
export interface RuntimeLike {
  execute(node: ASTNode, ctx: ExecutionContext): Promise<unknown>;
  getCleanupRegistry?(): {
    registerCustom(element: Element, cleanup: () => void, description?: string): void;
  };
}

/** A named handler block: `on message [as json] <commands> end`. */
export interface HandlerBlock {
  event: string;
  as?: string;
  body: ASTNode[];
}
