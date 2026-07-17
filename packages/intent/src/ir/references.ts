/**
 * Reference Validation
 *
 * Configurable validation for reference values (me, you, it, result, etc.).
 * Domain DSLs can provide custom reference sets.
 */

/** Default set of valid references for hyperscript-style DSLs. */
export const DEFAULT_REFERENCES: ReadonlySet<string> = new Set([
  'me',
  'you',
  'it',
  'result',
  'event',
  'target',
  'body',
  // DOM context globals — as reference-typed as `body`, and already advertised as
  // references by core's REFERENCE_KEYWORDS and the parser's PROPERTY_ACCESS_BASES.
  // Without them here, a foreign surface (ja ドキュメント, es documento) lexes as a
  // keyword but fails isValidReference, degrades to a literal, and leaks verbatim.
  'document',
  'window',
  'detail',
]);

/**
 * Check if a value is a valid reference name.
 *
 * @param value - The string to check
 * @param referenceSet - Custom reference set (defaults to DEFAULT_REFERENCES)
 */
export function isValidReference(
  value: string,
  referenceSet: ReadonlySet<string> = DEFAULT_REFERENCES
): boolean {
  return referenceSet.has(value);
}
