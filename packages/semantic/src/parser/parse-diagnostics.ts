/**
 * The parser's diagnostics: how one is made and attached, and the input-coverage
 * records (Arc C): the span a winning pattern left unread, and the hoist that
 * lifts every surviving record to the top node, where callers read them.
 *
 * Moved out of `semantic-parser.ts` (M3 (d), docs-internal/MULTILINGUAL_NEXT_STEPS.md);
 * the bodies are unchanged.
 */
import type { Diagnostic, PatternMatchResult, SemanticNode, TokenStream } from '../types';

/** Helper to create a parse diagnostic */
export function parseDiagnostic(
  message: string,
  severity: 'error' | 'warning' | 'info',
  code?: string
): Diagnostic {
  return { message, severity, source: 'semantic-parser', ...(code && { code }) };
}

/** Attach diagnostics to a semantic node */
export function withDiagnostics<T extends SemanticNode>(node: T, diagnostics: Diagnostic[]): T {
  if (diagnostics.length === 0) return node;
  return { ...node, diagnostics } as T;
}

/** Longest dropped span reported; keeps a runaway tail out of the diagnostic. */
export const MAX_UNCONSUMED_SPAN_CHARS = 120;

/**
 * Describe the suffix of `input` that a winning command pattern never consumed,
 * or null when the pattern accounted for the whole token stream.
 *
 * Purely observational: callers attach the result as a diagnostic. Confidence is
 * computed from role coverage alone and is deliberately left untouched here: a
 * penalty for an unconsumed tail was measured (OPEN_ITEMS G1, 2026-10-13) and
 * changes no pattern choice, while translate() already refuses the tail (F1)
 * and MCP reports it. The diagnostic is what callers act on.
 */
export function describeUnconsumedInput(
  match: PatternMatchResult,
  tokens: TokenStream,
  input: string
): string | null {
  const total = tokens.tokens.length;
  if (match.consumedTokens >= total) return null;

  const first = tokens.tokens[match.consumedTokens];
  const last = tokens.tokens[total - 1];
  if (!first || !last) return null;

  const text = input.slice(first.position.start, last.position.end);
  if (!text.trim()) return null;

  const shown =
    text.length > MAX_UNCONSUMED_SPAN_CHARS ? `${text.slice(0, MAX_UNCONSUMED_SPAN_CHARS)}…` : text;
  const dropped = total - match.consumedTokens;
  return `pattern ${match.pattern.id} left ${dropped} token(s) unconsumed: "${shown}"`;
}

/** The node fields a tree walk descends into. */
export const NODE_CHILD_FIELDS = [
  'body',
  'statements',
  'thenBranch',
  'elseBranch',
  'eventHandlers',
  'initBlock',
  'catchBody',
  'finallyBody',
] as const;
export type NodeChildren = Partial<Record<(typeof NODE_CHILD_FIELDS)[number], unknown>>;

/**
 * Hoist `unconsumed-input` and `verbatim-clause` diagnostics from every
 * descendant node onto the top node, deduplicated by message. The coverage sweep and `compile(...).meta`
 * read only the TOP node's diagnostics; per-segment drops are recorded on the
 * node whose parse produced them (so they die with a discarded speculative
 * parse), and this lifts the survivors into view at the outermost parse exit.
 */
export function hoistUnconsumedDiagnostics(top: SemanticNode): SemanticNode {
  const collected: Diagnostic[] = [];
  const seen = new Set<string>((top.diagnostics ?? []).map(d => `${d.code}|${d.message}`));
  const visit = (node: SemanticNode | null | undefined): void => {
    if (!node || typeof node !== 'object') return;
    if (node !== top) {
      for (const d of node.diagnostics ?? []) {
        if (d.code !== 'unconsumed-input' && d.code !== 'verbatim-clause') continue;
        const key = `${d.code}|${d.message}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(d);
      }
    }
    const rec = node as unknown as Record<string, unknown>;
    for (const field of NODE_CHILD_FIELDS) {
      const child = rec[field];
      if (Array.isArray(child)) for (const c of child) visit(c as SemanticNode);
    }
  };
  visit(top);
  if (collected.length === 0) return top;
  return withDiagnostics(top, [...(top.diagnostics ?? []), ...collected]);
}
