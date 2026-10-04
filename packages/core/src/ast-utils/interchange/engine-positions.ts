/**
 * Source positions for interchange nodes, from @hyperfixi/engine's parse of the same source.
 *
 * Since Phase C4 the language tools read interchange built by @lokascript/semantic
 * (`fromSemanticAST`), whose events and commands carry no source span (its role values
 * carry offsets, and no line or column). The engine's nodes carry `[start, end)` for every
 * feature and command. Walking both trees in source order, each interchange `event`,
 * `command`, `if` and loop takes the span of the next engine node of its kind; then every
 * node with an offset gets the 1-based `line` and 0-based `column` the LSP helpers read.
 * A node with no counterpart keeps what it had (the helpers estimate a length).
 *
 * This is the first slice of the engine-AST → interchange converter (owner decision 5,
 * 2026-10-03): positions from the engine, structure and roles from semantic. It reads the
 * engine's tree as plain data, so nothing here depends on the engine package.
 */
import type { InterchangeNode } from './types';

/** An engine parse node, as far as positions are concerned. */
interface EngineSpan {
  readonly type: string;
  readonly start: number;
  readonly end: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isEngineSpan = (value: unknown): value is EngineSpan =>
  isRecord(value) &&
  typeof value.type === 'string' &&
  typeof value.start === 'number' &&
  typeof value.end === 'number';

/** Interchange command names whose engine node is not `<name>Command`. */
const COMMAND_TYPES: Readonly<Record<string, readonly string[]>> = {
  call: ['getCommand'],
  trigger: ['sendCommand'],
  toggle: ['toggleCommand', 'toggleElementCommand'],
  transition: ['transitionCommand', 'viewTransitionCommand'],
};

/** The engine node types an interchange node takes its span from. */
function engineTypesFor(node: Record<string, unknown>): readonly string[] {
  switch (node.type) {
    case 'event':
      return ['onFeature'];
    case 'if':
      return ['ifCommand'];
    case 'repeat':
    case 'foreach':
    case 'while':
      return ['repeatCommand'];
    case 'command': {
      const name = typeof node.name === 'string' ? node.name : '';
      return COMMAND_TYPES[name] ?? [`${name}Command`];
    }
    default:
      return [];
  }
}

/** The engine's features and commands, in source order (a pre-order walk). */
function engineSpans(tree: unknown, out: EngineSpan[] = []): EngineSpan[] {
  if (Array.isArray(tree)) {
    for (const item of tree) engineSpans(item, out);
    return out;
  }
  if (!isRecord(tree)) return out;
  if (isEngineSpan(tree) && /(Command|Feature)$/.test(tree.type)) out.push(tree);
  for (const value of Object.values(tree)) {
    if (typeof value === 'object' && value !== null) engineSpans(value, out);
  }
  return out;
}

/**
 * The interchange nodes with source positions: spans from the engine's parse (`engineTree`,
 * what `parse(source)` from @hyperfixi/engine returns), lines and columns from `source`.
 */
export function withEnginePositions(
  nodes: readonly InterchangeNode[],
  source: string,
  engineTree: unknown
): InterchangeNode[] {
  const spans = engineSpans(engineTree);
  let cursor = 0;
  const lineStarts = [0];
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') lineStarts.push(i + 1);
  const lineAndColumn = (offset: number): { line: number; column: number } => {
    let line = 0;
    while (line + 1 < lineStarts.length && (lineStarts[line + 1] ?? Infinity) <= offset) line++;
    return { line: line + 1, column: offset - (lineStarts[line] ?? 0) };
  };

  const place = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(place);
    if (!isRecord(value) || typeof value.type !== 'string') return value;
    let span =
      typeof value.start === 'number' && typeof value.end === 'number'
        ? { start: value.start, end: value.end }
        : undefined;
    // The node takes its span before its children do: source order is pre-order.
    const kinds = engineTypesFor(value);
    if (kinds.length > 0) {
      const index = spans.findIndex((s, i) => i >= cursor && kinds.includes(s.type));
      const match = spans[index];
      if (match) {
        span = { start: match.start, end: match.end };
        cursor = index + 1;
      }
    }
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      out[key] = typeof child === 'object' ? place(child) : child;
    }
    return span ? { ...out, ...span, ...lineAndColumn(span.start) } : out;
  };

  return nodes.map(node => place(node) as InterchangeNode);
}
