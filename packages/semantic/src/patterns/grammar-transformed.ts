/**
 * Grammar-Transformed Patterns (Consolidated)
 *
 * Patterns for SOV/VSO grammar-transformed output that the schema generators
 * don't cover. Most languages rely on auto-generation from profiles; entries
 * here are corpus-shaped one-offs.
 *
 * Phase 3.2: Consolidated from 4 files into single file.
 */

import type { LanguagePattern } from '../types';

/**
 * Get grammar-transformed patterns for a specific language.
 */
export function getGrammarTransformedPatternsForLanguage(_language: string): LanguagePattern[] {
  // Empty by design. This loader is the seam for patterns that exist only to
  // read the i18n transformer's output; its one occupant — `go-qu-url-dest`,
  // added to keep qu's fronted `url <dest> man riy` phrase together — is gone.
  //
  // It was doing HARM, not nothing. Its extraction re-typed the capture through
  // `transform`, and on the fused handler path that transform did not run: the
  // pattern still won the match at priority 105 and bound `back` as a string
  // LITERAL, where English (and every other language, via the generated
  // `go-{lang}-generated-url` shape) produces an EXPRESSION — `go url "back"`
  // instead of `go url back` (qu go-back). Measured with the pattern removed:
  // the quoted-URL row it was written for (`url "/page" man riy`) still parses
  // identically through the generated pattern, `go-back` is repaired, and no
  // other corpus row moves.
  return [];
}
