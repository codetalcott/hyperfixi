/**
 * Helpers for this package's own test files (not part of the built entry).
 */

/**
 * The element at `index`, or a thrown error naming the index and the length:
 * a test that reads `results[0]` means "there is one", and should fail there
 * when there is not, rather than on `undefined.suite`.
 */
export function nth<T>(items: readonly T[], index: number): T {
  if (index < 0 || index >= items.length) {
    throw new Error(`no element at index ${index}: the array has ${items.length}`);
  }
  return items[index] as T;
}
