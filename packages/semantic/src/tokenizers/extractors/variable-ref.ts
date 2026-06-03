/**
 * Variable Reference Extractor
 *
 * Extracts variable references:
 * - `:varname` — element-scoped local variables (`:count`, `:x`)
 * - `$varname` — global variables (`$count`, `$greeting`)
 *
 * This is hyperscript-specific syntax. Both prefixes are kept attached to the
 * name so the reference tokenizes as a single token (otherwise `$greeting`
 * would split into `$` + `greeting` and never fill a role).
 *
 * The `$` form deliberately does NOT match `${` (template-literal
 * interpolation): the char after `$` must be an identifier start.
 */

import type { ValueExtractor, ExtractionResult } from '../value-extractor-types';

/**
 * VariableRefExtractor - Extracts variable references (e.g., :count, $greeting).
 */
export class VariableRefExtractor implements ValueExtractor {
  readonly name = 'variable-ref';

  canExtract(input: string, position: number): boolean {
    const ch = input[position];
    return (
      (ch === ':' || ch === '$') &&
      position + 1 < input.length &&
      /[a-zA-Z_]/.test(input[position + 1])
    );
  }

  extract(input: string, position: number): ExtractionResult | null {
    if (!this.canExtract(input, position)) return null;

    // Start after the ':'/'$' prefix
    let length = 1;

    // Continue while we have identifier characters
    while (position + length < input.length && /[a-zA-Z0-9_]/.test(input[position + length])) {
      length++;
    }

    return {
      value: input.substring(position, position + length),
      length,
      metadata: {
        type: 'variable-reference',
      },
    };
  }
}
