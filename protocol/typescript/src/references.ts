/** The built-in set of recognized reference names. */
export const DEFAULT_REFERENCES: ReadonlySet<string> = new Set([
  'me',
  'you',
  'it',
  'result',
  'event',
  'target',
  'body',
]);

/**
 * Checks if a value is a valid reference name.
 * The check is case-insensitive.
 */
export function isValidReference(
  value: string,
  refs: ReadonlySet<string> = DEFAULT_REFERENCES,
): boolean {
  return refs.has(value.toLowerCase());
}
