/**
 * Shared vocabulary fragments for all LLM languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * LLM's `source`/`destination`/`patient` roles reuse semantic role names, so
 * the language profile's general-purpose markers for them would leak in as
 * fallbacks (e.g. ja `patient` → 'を', en `source` → 'from'). The LLM schemas
 * own these markers via `markerOverride` (source → from/de/から…, destination →
 * to/a/に…) or leave them bare (`patient` is the primary content role, never
 * marked). An empty-string primary means "no marker" to the bridge's merge, so
 * generation falls back to the schema override or word-order default — keeping
 * the pre-bridge patterns byte-identical.
 *
 * `manner`/`quantity` are NOT semantic roles, so no slice ever carries them —
 * they need no suppression (their markers live entirely on the schemas, with
 * the ja position override authored in ./ja).
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  source: { primary: '' },
  destination: { primary: '' },
  patient: { primary: '' },
};
