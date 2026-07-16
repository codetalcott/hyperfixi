/**
 * Generator: extract the reverse property-name lexicon (foreign surface → English
 * DOM property) from the i18n dictionaries, to seed the semantic package's
 * expression lexicon (`packages/semantic/src/parser/utils/expression-lexicon.ts`).
 *
 * Semantic is UPSTREAM of i18n in the build order, so it cannot import these
 * dictionaries at runtime — this one-off copies the relevant subset across. Run
 * it and paste the emitted `PROPERTY_NAME_LEXICON` literal into the semantic
 * lexicon file when the i18n dictionaries gain new property translations:
 *
 *   npx tsx packages/i18n/scripts/extract-property-lexicon.ts
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
