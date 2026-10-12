const L = console.log; console.log = () => {};
import { writeFileSync } from 'node:fs';
const langs = ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh'];
const concepts = process.argv.slice(2);
const out: Record<string, Record<string, string>> = {};
const cats = new Set<string>();
for (const l of langs) {
  const m: any = await import(`../../i18n/src/dictionaries/${l}.ts`);
  const d = m[l] ?? Object.values(m)[0];
  for (const [cat, entries] of Object.entries(d ?? {})) { cats.add(cat); if (entries && typeof entries === 'object') for (const w of concepts) if (w in (entries as any) && !(out[w]?.[l])) (out[w] ??= {})[l] = `${(entries as any)[w]}`; }
}
L('categories:', [...cats].join(' '));
for (const w of concepts) L(`${w}: ${langs.map(l => `${l}=${out[w]?.[l] ?? '-'}`).join(' ')}`);
writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(out, null, 1));
process.exit(0);
