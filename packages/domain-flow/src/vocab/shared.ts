/**
 * Shared vocabulary fragments for all FlowScript languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * FlowScript reuses the semantic role names `source` (URL), `destination`
 * (target element / URL / variable), `style` (format), and `patient` (form,
 * data, link relation, action name). The language profile's general-purpose
 * markers for those roles would otherwise flow into generation as defaults —
 * every one of them is either bare in the schemas (`source` in
 * fetch/poll/stream/enter, `patient` everywhere) or carries a full
 * schema-authored `markerOverride` (`style`, `destination`, `perform.source`).
 * An empty-string primary means "no marker" to the bridge's merge, so
 * generation falls back to the schema override or word-order default, keeping
 * the pre-bridge patterns byte-identical. (`duration`/`instrument` are not
 * marker-bearing roles in any slice — they need no suppression.)
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  source: { primary: '' },
  destination: { primary: '' },
  style: { primary: '' },
  patient: { primary: '' },
};
