import { getPatternsForLanguage, tryGetProfile, commandSchemas } from '@lokascript/semantic';
const heads = new Set(['on','if','unless','else','repeat','for','while','when','init','behavior','install','live','js','compound','eventsource','socket','worker']);
for (const l of ['ar','de','es','fr','it','pl','pt','ru','uk']) {
  const p: any = tryGetProfile(l);
  const kw = new Set<string>();
  for (const c of Object.keys(commandSchemas)) { const t = p.keywords[c]; if (t) [t.primary, ...(t.alternatives ?? [])].forEach((x: string) => kw.add(x)); }
  const extra = new Map<string, string>();
  for (const pat of getPatternsForLanguage(l) as any[]) {
    const f = pat.template?.tokens?.[0];
    if (heads.has(pat.command) || f?.type !== 'literal') continue;
    for (const w of [f.value, ...(f.alternatives ?? [])]) if (!kw.has(w)) extra.set(w, pat.command);
  }
  console.log(l, [...extra].map(([w, c]) => `${w}(${c})`).join(' '));
}
