import { getPatternsForLanguage, tryGetProfile, commandSchemas } from '@lokascript/semantic';
const heads = new Set(['on','if','unless','else','repeat','for','while','when','init','behavior','install','live','js','compound','eventsource','socket','worker']);
for (const l of ['ar','de','es','fr','it','pl','pt','ru','uk']) {
  const p: any = tryGetProfile(l);
  const markers = new Set<string>();
  for (const t of Object.values(p.roleMarkers) as any[]) for (const w of [t.primary, ...(t.alternatives ?? [])]) markers.add(w);
  const forms: string[] = [];
  for (const c of Object.keys(commandSchemas)) { const t = p.keywords[c]; if (t && !heads.has(c)) forms.push(t.primary, ...(t.alternatives ?? [])); }
  for (const pat of getPatternsForLanguage(l) as any[]) { const f = pat.template?.tokens?.[0]; if (!heads.has(pat.command) && f?.type === 'literal') forms.push(f.value, ...(f.alternatives ?? [])); }
  const hits = forms.filter(f => f && markers.has(f.split(/\s+/).pop()!));
  console.log(l, JSON.stringify(p.keywords.get), [...new Set(hits)].join(' | '));
}
