/**
 * Tool dispatcher — shared types and re-exports for the multilingual-intent
 * tool set. Each tool is a pure function that takes its dependencies and
 * inputs and returns a plain result object. The HTTP server wraps these
 * results in Siren envelopes; the siren-mcp bridge then exposes them as
 * MCP tools.
 */

export { parseIntent } from './parse-intent.js';
export type { ParseIntentInput, ParseIntentResult, ParseIntentDeps } from './parse-intent.js';

export { detectDomain } from './detect-domain.js';
export type { DetectDomainInput, DetectDomainResult } from './detect-domain.js';

export { compileAuto } from './compile-auto.js';
export type { CompileAutoInput, CompileAutoResult } from './compile-auto.js';

export { getPatternExamples } from './get-pattern-examples.js';
export type {
  GetPatternExamplesInput,
  GetPatternExamplesResult,
  PatternExample,
} from './get-pattern-examples.js';
