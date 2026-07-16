/**
 * Generator: extract the reverse expression lexicons (foreign surface → English)
 * from the i18n dictionaries, to seed the semantic package's expression lexicon
 * (`packages/semantic/src/parser/utils/expression-lexicon.ts`).
 *
 * Semantic is UPSTREAM of i18n in the build order, so it cannot import these
 * dictionaries at runtime — this one-off copies the relevant subset across. Run
 * it and paste the emitted literals into the semantic lexicon file when the i18n
 * dictionaries gain new translations:
 *
 *   npx tsx packages/i18n/scripts/extract-property-lexicon.ts
 *
 * Emits three literals:
 *   - PROPERTY_NAME_LEXICON — possessive property names (`valor` → `value`).
 *   - CONNECTIVE_LEXICON    — expression connectives (`como` → `as`).
 *   - LOCATIVE_SURFACES     — locative markers inside a positional expression.
 */
import { dictionaries } from '../src/dictionaries';

// DOM property concepts that can appear as a possessive property name (`my X`,
// `X of Y`, `#el's X`). English is the canonical target; only NON-identity
// translations are emitted (an unlisted surface passes through unchanged).
const CONCEPTS = [
  'value',
  'innerHTML',
  'innerText',
  'textContent',
  'checked',
  'length',
  'disabled',
  'hidden',
];

const langs = Object.keys(dictionaries).filter(l => l !== 'en');
const out: Record<string, Record<string, string>> = {};

for (const lang of langs) {
  const dict: any = (dictionaries as any)[lang];
  if (!dict) continue;
  const map: Record<string, string> = {};
  const buckets = [dict.values, dict.attributes, dict.expressions, dict.properties].filter(Boolean);
  for (const concept of CONCEPTS) {
    for (const bucket of buckets) {
      const surface = bucket[concept];
      if (
        typeof surface === 'string' &&
        surface.length > 0 &&
        surface.toLowerCase() !== concept.toLowerCase()
      ) {
        map[surface.toLowerCase()] = concept;
      }
    }
  }
  if (Object.keys(map).length) out[lang] = map;
}

// Emit a TS object literal (sorted for a stable diff).
const lines: string[] = [
  'export const PROPERTY_NAME_LEXICON: Record<string, Record<string, string>> = {',
];
for (const lang of Object.keys(out).sort()) {
  const entries = Object.entries(out[lang])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([surface, concept]) => `${JSON.stringify(surface)}: ${JSON.stringify(concept)}`)
    .join(', ');
  lines.push(`  ${lang}: { ${entries} },`);
}
lines.push('};');
console.log(lines.join('\n'));

// ---------------------------------------------------------------------------
// CONNECTIVE_LEXICON — expression connectives.
//
// Only UNAMBIGUOUS surfaces are emitted. A connective is translated as a free
// token — no surrounding slot vouches for it — so any surface the language reuses
// for a different sense ANYWHERE in its dictionary must be dropped, or that other
// sense gets mistranslated. Two real collisions this guard catches:
//   - es `de` is both `of` and `from`; `en` is `in`/`into`/`at`.
//   - th `เป็น` is both `as` (modifiers) and `is` (logical) — emitting it would
//     rewrite every Thai `is` condition to `as`. The guard must therefore scan
//     ALL buckets, not just `modifiers`.
// `of` is not extracted at all: it collides in most languages, and the
// of-possessive anchor in the semantic lexicon emits it structurally instead.
const CONNECTIVE_CONCEPTS = ['as'];
const connectives: Record<string, Record<string, string>> = {};

/** Every (concept → surface) pair in a dictionary, across all buckets. */
function allSenses(dict: any): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const bucket of Object.values(dict)) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const [concept, surface] of Object.entries(bucket as Record<string, unknown>)) {
      if (typeof surface === 'string' && surface.length) pairs.push([concept, surface]);
    }
  }
  return pairs;
}

for (const lang of langs) {
  const dict: any = (dictionaries as any)[lang];
  if (!dict?.modifiers) continue;
  const senses = allSenses(dict);
  const map: Record<string, string> = {};
  for (const concept of CONNECTIVE_CONCEPTS) {
    const surface = dict.modifiers[concept];
    if (typeof surface !== 'string' || !surface.length) continue;
    if (surface.toLowerCase() === concept.toLowerCase()) continue; // identity
    const collides = senses.some(
      ([otherConcept, otherSurface]) =>
        otherConcept !== concept && otherSurface.toLowerCase() === surface.toLowerCase()
    );
    if (collides) continue;
    map[surface.toLowerCase()] = concept;
  }
  if (Object.keys(map).length) connectives[lang] = map;
}

const connectiveLines: string[] = [
  '',
  'export const CONNECTIVE_LEXICON: Record<string, Record<string, string>> = {',
];
for (const lang of Object.keys(connectives).sort()) {
  const entries = Object.entries(connectives[lang])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([surface, concept]) => `${JSON.stringify(surface)}: ${JSON.stringify(concept)}`)
    .join(', ');
  connectiveLines.push(`  ${lang}: { ${entries} },`);
}
connectiveLines.push('};');
console.log(connectiveLines.join('\n'));

// ---------------------------------------------------------------------------
// LOCATIVE_SURFACES — every surface a language uses for a "within" preposition.
//
// Unlike the connectives above, these need NO ambiguity guard: they are only
// consulted in the positional expression's locative slot (`last <.message/> in
// #chat`), and that slot fixes the sense. So es spelling `in`/`into`/`at` all as
// `en` is harmless here — every one of them means `in` in this position.
const LOCATIVE_CONCEPTS = ['in', 'into', 'at', 'within', 'inside'];
const locatives: Record<string, string[]> = {};

for (const lang of langs) {
  const dict: any = (dictionaries as any)[lang];
  if (!dict?.modifiers) continue;
  const surfaces = new Set<string>();
  for (const concept of LOCATIVE_CONCEPTS) {
    const surface = dict.modifiers[concept];
    if (typeof surface !== 'string' || !surface.length) continue;
    if (surface.toLowerCase() === 'in') continue; // identity — already English
    surfaces.add(surface.toLowerCase());
  }
  if (surfaces.size) locatives[lang] = [...surfaces].sort();
}

const locativeLines: string[] = [
  '',
  'export const LOCATIVE_SURFACES: Record<string, ReadonlySet<string>> = {',
];
for (const lang of Object.keys(locatives).sort()) {
  const entries = locatives[lang].map(s => JSON.stringify(s)).join(', ');
  locativeLines.push(`  ${lang}: new Set([${entries}]),`);
}
locativeLines.push('};');
console.log(locativeLines.join('\n'));
