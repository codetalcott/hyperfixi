/**
 * Shared vocabulary fragments for all SQL languages.
 */

import type { DomainVocabulary } from '@lokascript/framework';

/**
 * SQL's grammatical markers (FROM/INTO/WHERE/SET/LIMIT equivalents) are
 * authored per-language on the schemas via `markerOverride` — the language
 * profile's general-purpose `source`/`destination` markers must not leak in
 * as fallbacks, or bare-source patterns (`update {source}`, SVO `get
 * {source}`) would grow a marker the SQL grammar doesn't have. An
 * empty-string primary means "no marker" to the bridge's merge.
 */
export const SCHEMA_OWNED_MARKERS: NonNullable<DomainVocabulary['roleMarkerOverrides']> = {
  source: { primary: '' },
  destination: { primary: '' },
};
