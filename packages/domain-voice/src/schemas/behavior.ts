/**
 * Behavior-verb schemas for voice — REUSED from the `@lokascript/semantic`
 * reference schemas rather than re-authored.
 *
 * `toggle`/`add` need a thin per-language `markerOverride` wrapper because voice
 * suppresses the slice's `destination` marker (see `../vocab/shared.ts`
 * `SCHEMA_OWNED_MARKERS`), and the reference schemas don't carry a full
 * per-language destination marker map. The markers are DERIVED from the same
 * grammar slices (via `deriveRoleMarkers`), so they stay sourced from the
 * multilingual layer, not hand-authored.
 *
 * `remove`'s trailing target is captured as `source` (not `destination`), which
 * voice does NOT suppress — so its marker wrapper is a verified no-op, applied
 * uniformly for defensiveness. `show`/`hide` have only a (bare, suppressed)
 * `patient` + an optional markerless `style` literal, so they need no marker
 * wrapper — but, like all five, are still adapted to voice's position/type
 * conventions via `adaptForVoice` (see below).
 */

import type { CommandSchema } from '@lokascript/framework';
import { deriveRoleMarkers } from '@lokascript/framework';
import {
  toggleSchema,
  addSchema,
  removeSchema,
  showSchema,
  hideSchema,
} from '@lokascript/semantic';
import { VOICE_LANGUAGES } from '../vocab';

/**
 * Build a `{ lang: marker }` map for a semantic `role`, derived from each wired
 * language's grammar slice. Any `markerOverride` the reference schema already
 * authored wins over the derived default.
 */
function sliceMarkerOverride(
  role: string,
  reference: Readonly<Record<string, string>> = {}
): Record<string, string> {
  const derived: Record<string, string> = {};
  for (const [lang, { slice }] of Object.entries(VOICE_LANGUAGES)) {
    const marker = deriveRoleMarkers(slice, { [role]: role })[role];
    if (marker) derived[lang] = marker;
  }
  return { ...derived, ...reference };
}

/**
 * Reinstate a per-language `markerOverride` for `role`, sourced from the slices.
 * The pattern generator reads `roleSpec.markerOverride[lang]` before the
 * (suppressed) profile default, so this cleanly restores the marker for exactly
 * this schema without un-suppressing it for the existing voice schemas.
 */
function withMarker(schema: CommandSchema, role: string): CommandSchema {
  const reference = schema.roles.find(r => r.role === role)?.markerOverride ?? {};
  const markerOverride = sliceMarkerOverride(role, reference);
  return {
    ...schema,
    roles: schema.roles.map(r => (r.role === role ? { ...r, markerOverride } : r)),
  };
}

/**
 * Convert the reference schema's position convention to voice's.
 *
 * The framework pattern generator orders role tokens by DESCENDING position
 * (higher svoPosition/sovPosition = earlier — see `sortRolesByWordOrder` in
 * `@lokascript/framework` pattern-generator). Voice's own schemas follow that
 * convention, but the reused `@lokascript/semantic` reference schemas use
 * ASCENDING 1-based positions (position 1 = first). Inverting each role's
 * position (`n + 1 - pos`) makes voice's generator emit the correct surface
 * order — `toggle {patient} on {destination}`, not `toggle on {destination} {patient}`.
 */
function invertRolePositions(schema: CommandSchema): CommandSchema {
  const n = schema.roles.length;
  return {
    ...schema,
    roles: schema.roles.map(r => ({
      ...r,
      ...(r.svoPosition != null && { svoPosition: n + 1 - r.svoPosition }),
      ...(r.sovPosition != null && { sovPosition: n + 1 - r.sovPosition }),
    })),
  };
}

/**
 * Let voice's selector tokens satisfy the reused schemas.
 *
 * Voice tokenizes CSS selectors (`.active`, `#box`) as identifier→`expression`
 * values — its established model (see the `click` command, whose patient is
 * `expression`-typed). The reference schemas' selector-capturing roles expect
 * only `selector`/`reference`, which an `expression`-typed value fails. Add
 * `expression` (a wildcard in `isTypeCompatible`) to every role that already
 * accepts a `selector`, so voice's selector tokens match. The literal-only
 * `style` role is left untouched.
 */
function acceptExpression(schema: CommandSchema): CommandSchema {
  return {
    ...schema,
    roles: schema.roles.map(r =>
      r.expectedTypes?.includes('selector') && !r.expectedTypes.includes('expression')
        ? { ...r, expectedTypes: [...r.expectedTypes, 'expression'] }
        : r
    ),
  };
}

/** Adapt a reused reference schema to voice's generator + tokenizer conventions. */
function adaptForVoice(schema: CommandSchema): CommandSchema {
  return acceptExpression(invertRolePositions(schema));
}

// toggle/add: adapt to voice conventions, then reinstate the slice-derived
// destination marker (suppressed by voice's SCHEMA_OWNED_MARKERS).
export const voiceToggleSchema: CommandSchema = withMarker(
  adaptForVoice(toggleSchema),
  'destination'
);
export const voiceAddSchema: CommandSchema = withMarker(adaptForVoice(addSchema), 'destination');
// remove: `source` is not suppressed by voice — the withMarker call is a verified
// no-op, applied uniformly for symmetry.
export const voiceRemoveSchema: CommandSchema = withMarker(adaptForVoice(removeSchema), 'source');
// show/hide: only patient (bare) + optional markerless style literal — no marker
// wrapper needed.
export const voiceShowSchema: CommandSchema = adaptForVoice(showSchema);
export const voiceHideSchema: CommandSchema = adaptForVoice(hideSchema);

/** The five behavior-verb schemas, in stable order. */
export const behaviorSchemas: CommandSchema[] = [
  voiceToggleSchema,
  voiceAddSchema,
  voiceRemoveSchema,
  voiceShowSchema,
  voiceHideSchema,
];
