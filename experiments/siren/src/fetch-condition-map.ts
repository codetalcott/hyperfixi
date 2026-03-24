/**
 * Fetch the GRAIL condition map from a /conditions endpoint.
 *
 * The response is a Siren entity with class: ["condition-registry"]
 * and properties.conditions containing the condition map (GRAIL spec §7.6).
 */

import type { ConditionMapEntry } from './types';

/**
 * Fetch and return the condition map from a GRAIL conditions endpoint.
 * Throws on network error or missing conditions data.
 */
export async function fetchConditionMap(
  url: string,
): Promise<Record<string, ConditionMapEntry>> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`fetchConditionMap: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const conditions = body?.properties?.conditions;

  if (!conditions || typeof conditions !== 'object') {
    throw new Error('fetchConditionMap: response missing properties.conditions');
  }

  return conditions as Record<string, ConditionMapEntry>;
}
