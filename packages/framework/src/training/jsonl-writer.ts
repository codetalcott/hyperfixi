/**
 * JSONL Writer
 *
 * Exports training pairs in JSONL (JSON Lines) format,
 * compatible with standard fine-tuning pipelines.
 */

import type { TrainingPair } from './types';

/**
 * Convert training pairs to JSONL format (one JSON object per line).
 *
 * Each line contains:
 * - id: unique pair identifier
 * - prompt: the natural language input
 * - completion: the LSE bracket syntax output
 * - metadata: domain, action, language, source, quality
 */
export function toJSONL(pairs: readonly TrainingPair[]): string {
  return pairs.map(pair => JSON.stringify(toJSONLRow(pair))).join('\n');
}

/**
 * Convert a single training pair to a JSONL row.
 */
export function toJSONLRow(pair: TrainingPair): JSONLRow {
  return {
    id: pair.id,
    prompt: pair.natural,
    completion: pair.explicit,
    metadata: {
      domain: pair.domain,
      action: pair.action,
      language: pair.language,
      source: pair.source,
      quality: pair.quality,
      ...(pair.confidence !== undefined && { confidence: pair.confidence }),
    },
  };
}

/**
 * Parse JSONL back into rows (for validation/roundtrip testing).
 */
export function parseJSONL(text: string): JSONLRow[] {
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as JSONLRow);
}

/**
 * A single row in JSONL format.
 */
export interface JSONLRow {
  readonly id: string;
  readonly prompt: string;
  readonly completion: string;
  readonly metadata: {
    readonly domain: string;
    readonly action: string;
    readonly language: string;
    readonly source: string;
    readonly quality: number;
    readonly confidence?: number;
  };
}
