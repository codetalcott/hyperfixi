/**
 * Shared vocabulary fragments for all voice languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * Voice commands reuse the semantic role names `patient` (the target element)
 * and `destination` (navigation/search target). The language profile's
 * general-purpose markers for those roles would otherwise flow into generation
 * as defaults — `patient` is bare or has only a partial per-command
 * `markerOverride`, and `destination`'s marker is schema-authored. An
 * empty-string primary means "no marker" to the bridge's merge, so generation
 * falls back to the schema override or word-order default, keeping the
 * pre-bridge patterns byte-identical. (`manner`/`quantity` are not semantic
 * roles, so no slice carries them — they need no suppression.)
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  patient: { primary: '' },
  destination: { primary: '' },
};
