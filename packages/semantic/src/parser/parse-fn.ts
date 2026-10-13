import type { SemanticNode } from '../types';

/**
 * The parser's own `parse`, passed to a function moved out of
 * `semantic-parser.ts` that re-parses part of its input (M3 (d)).
 */
export type ParseFn = (input: string, language: string) => SemanticNode;
