import type { Diagnostic } from '../types';

/**
 * Error thrown when semantic parsing fails.
 * Contains structured diagnostics from each fallback stage.
 */
export class SemanticParseError extends Error {
  readonly diagnostics: readonly Diagnostic[];
  readonly language: string;
  readonly input: string;

  constructor(
    message: string,
    language: string,
    input: string,
    diagnostics: readonly Diagnostic[]
  ) {
    super(message);
    this.name = 'SemanticParseError';
    this.language = language;
    this.input = input;
    this.diagnostics = diagnostics;
  }
}
