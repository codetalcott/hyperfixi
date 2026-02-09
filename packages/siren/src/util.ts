/**
 * Siren utility functions.
 */

import type { SirenField } from './types';

/**
 * Resolve a potentially relative URL against a base URL.
 */
export function resolveUrl(href: string, baseUrl: string): string {
  return new URL(href, baseUrl).href;
}

/**
 * Reconcile user-provided data with an action's field definitions.
 * Fills in default values from field.value when the user omits them.
 */
export function reconcileFields(
  data: Record<string, unknown> | undefined,
  fields: SirenField[] | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (fields) {
    for (const field of fields) {
      if (field.value !== undefined) {
        result[field.name] = field.value;
      }
    }
  }

  // User-provided data overrides field defaults
  if (data) {
    Object.assign(result, data);
  }

  return result;
}

/**
 * Classify an HTTP error status as transient or permanent.
 * Transient errors (429, 5xx) are worth retrying; permanent errors (4xx) are not.
 */
export function classifyError(status: number): { transient: boolean } {
  if (status === 429 || status >= 500) {
    return { transient: true };
  }
  return { transient: false };
}
