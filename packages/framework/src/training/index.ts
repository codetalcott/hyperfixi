/**
 * Training Data Generation
 *
 * Generates (natural_language, LSE) pairs from domain schemas for
 * fine-tuning or few-shot prompting LLMs. Exports as JSONL.
 */

export type { TrainingPair, SynthesisConfig, SynthesisResult, SynthesisMetadata } from './types';

export { synthesizeFromSchemas } from './schema-synthesizer';

export { toJSONL, toJSONLRow, parseJSONL } from './jsonl-writer';
export type { JSONLRow } from './jsonl-writer';
