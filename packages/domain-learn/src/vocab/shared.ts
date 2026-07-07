/**
 * Shared vocabulary fragments for all learn languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * The learn schemas reuse the semantic role names `patient`, `destination`,
 * `source`, and `style`, and author every marker as a flat per-language
 * `markerOverride` map (the collapsed 5-tier resolution — see
 * schemas/index.ts). The language profile's general-purpose markers for
 * those roles would otherwise flow into generation as defaults wherever a
 * schema role lacks an override entry. An empty-string primary means "no
 * marker" to the bridge's merge, so generation falls back to the schema
 * override or word-order default, keeping the pre-bridge patterns
 * byte-identical. (`instrument`/`manner`/`possessive` are not marker-bearing
 * roles in any slice — they need no suppression.)
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  patient: { primary: '' },
  destination: { primary: '' },
  source: { primary: '' },
  style: { primary: '' },
};
