/**
 * Shared vocabulary fragments for all JSX languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * JSX's `render` command reuses the semantic role names `source` (component to
 * render) and `destination` (target container). The language profile's
 * general-purpose markers for those roles would otherwise flow into generation
 * as defaults — `source` is a bare positional arg here (`render App into root`)
 * and `destination`'s marker is schema-authored (`into`/`に`/…). An empty-string
 * primary means "no marker" to the bridge's merge, so generation falls back to
 * the schema override or word-order default, keeping the pre-bridge patterns
 * byte-identical.
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  source: { primary: '' },
  destination: { primary: '' },
};
