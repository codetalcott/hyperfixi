/**
 * Shared vocabulary fragments for all BehaviorSpec languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * BehaviorSpec's `when` command has a `destination` role, reusing the semantic
 * role name. The language profile's general-purpose `destination` marker would
 * otherwise flow into generation as a default; the schema owns this marker via
 * a full `markerOverride` (into/dentro/に/…). An empty-string primary means
 * "no marker" to the bridge's merge, so generation falls back to the schema
 * override or word-order default — keeping the pre-bridge patterns
 * byte-identical. (No other BehaviorSpec role collides with a semantic role.)
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  destination: { primary: '' },
};
