const L = console.log; console.log = () => {};
const langs = ['ar','bn','de','es','fr','he','hi','id','it','ja','ko','ms','pl','pt','qu','ru','sw','th','tl','tr','uk','vi','zh'];
const concepts = process.argv.slice(2);
const dicts: Record<string, any> = {};
for (const l of langs) { const m: any = await import(`../../i18n/src/dictionaries/${l}.ts`); dicts[l] = m[l] ?? m.default ?? Object.values(m)[0]; }
const find = (d: any, w: string) => { for (const [cat, entries] of Object.entries(d ?? {})) if (entries && typeof entries === 'object' && w in (entries as any)) return `${(entries as any)[w]}`; return ''; };
for (const w of concepts) {
  const have = langs.filter(l => find(dicts[l], w));
  L(`${w.padEnd(11)} ${String(have.length).padStart(2)}/23  ${langs.slice(0, 8).map(l => `${l}:${find(dicts[l], w) || '-'}`).join(' ')}`);
}
process.exit(0);
