/**
 * Localized htmx-compat attribute name maps for the scanner.
 *
 * The vocab generator at `packages/core/scripts/gen-htmx-vocab.mjs`
 * emits per-language vocab modules under `packages/core/vocab/htmx/`.
 * Those modules drive the runtime orchestrator. The scanner needs the
 * same information at build time so it can route projects authored in
 * non-English languages to the correct bundle.
 *
 * Re-sync this file whenever the vocab regenerates:
 *
 *   npm run sync-htmx-vocab --prefix packages/vite-plugin
 *
 * Drift detection happens via a unit test that re-derives the maps from
 * `packages/core/vocab/htmx/*.js` and compares against this file's
 * contents.
 */

/**
 * Localized names that mean `hx-live` (htmx v4 reactive expression).
 * Used to set `needsHxLive` + `needsReactivity` for non-English authors.
 *
 * Auto-derived from `packages/core/vocab/htmx/*.js`. Re-sync if vocab
 * changes (see file-level comment).
 */
export const HX_LIVE_LOCALIZED: ReadonlySet<string> = new Set([
  // Each entry is the suffix after the `hx-` prefix.
  'مباشر', // ar
  'লাইভ', // bn
  'direkt', // de
  'en-vivo', // es
  'en-direct', // fr
  'חי', // he
  'लाइव', // hi
  'langsung', // id
  'in-diretta', // it
  'ライブ', // ja
  '실시간', // ko
  'langsung', // ms
  'na-żywo', // pl
  'ao-vivo', // pt
  'kawsachkaq', // qu
  'в-прямом-эфире', // ru
  'moja-kwa-moja', // sw
  'ไลฟ์', // th
  'canlı', // tr
  'наживо', // uk
  'trực-tiếp', // vi
  '实时', // zh
]);

/**
 * Build a single regex that matches any localized form of `hx-live`.
 * Anchored on word boundary + attribute-assignment to avoid matching
 * inside JS strings or partial words.
 */
export function buildLocalizedHxLivePattern(): RegExp {
  const suffixes = [...HX_LIVE_LOCALIZED]
    .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  // Unicode mode required for Hebrew/Arabic/CJK character classes.
  return new RegExp(`\\bhx-(?:${suffixes})\\s*=\\s*["']`, 'u');
}

/**
 * Any `sse-*` attribute (English or localized) triggers needsSSE.
 * The htmx-compat layer scopes SSE features to attributes inside the
 * `sse-` namespace, so namespace-only matching is correct.
 */
export const SSE_NS_PATTERN = /\bsse-[\w\-\p{L}]+\s*=\s*["']/u;

/** Any `ws-*` attribute triggers needsWS — see SSE_NS_PATTERN. */
export const WS_NS_PATTERN = /\bws-[\w\-\p{L}]+\s*=\s*["']/u;
