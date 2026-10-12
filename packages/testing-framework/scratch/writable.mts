import { getPatternsForLanguage, tryGetProfile } from '@lokascript/semantic';
const QUERY_IN: any = { de: 'in', es: 'en', hi: 'में', it: 'in', pl: 'w', pt: 'dentro', ru: 'в', tl: 'sa_loob', uk: 'у' };
for (const l of ['es','pt','it','tl','pl','ru','uk','de','hi']) {
  const written = new Set<string>([QUERY_IN[l]]);
  const walk = (ts: any[]) => { for (const t of ts) { if (t.type === 'literal') { const ws = t.value.split(' '); written.add(ws[0]); written.add(ws[ws.length-1]); } if (t.type === 'group') walk(t.tokens); } };
  for (const p of getPatternsForLanguage(l) as any[]) walk(p.template.tokens);
  const keys = Object.keys((tryGetProfile(l) as any).obliqueReferences.me);
  console.log(l, 'never written:', keys.filter(k => !written.has(k)).join(' ') || '-');
}
