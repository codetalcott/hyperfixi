import { loadCommandShapeCases } from '../src/multilingual/command-shapes';
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { translate, parse, render, tryGetProfile } from '@lokascript/semantic';
const langs = ['es','pt','it','tl','pl','ru','uk','de','hi'];
const sources: string[] = [];
for (const c of loadCommandShapeCases().cases) sources.push(c.source);
for (const r of await getAllPatterns({ limit: 5000 }) as any[]) if (!r.rawCode.trimStart().startsWith('<')) sources.push(r.rawCode);
for (const l of langs) {
  const p: any = tryGetProfile(l);
  const counts = new Map<string, number>();
  const phrases: string[] = [];
  for (const [m, f] of Object.entries(p.obliqueReferences.me)) for (const ph of typeof f === 'string' ? [f] : Object.values(f as any)) { phrases.push(ph as string); counts.set(`${m} → ${ph}`, 0); }
  for (const s of sources) {
    let out = ''; try { out = translate(s, 'en', l); } catch { continue; }
    for (const [m, f] of Object.entries(p.obliqueReferences.me)) for (const ph of (typeof f === 'string' ? [f] : Object.values(f as any)) as string[]) {
      const n = out.split(ph).length - 1; if (n) counts.set(`${m} → ${ph}`, counts.get(`${m} → ${ph}`)! + n);
    }
  }
  console.log(l, [...counts].map(([k, n]) => `${k}:${n}`).join(' | '));
}
