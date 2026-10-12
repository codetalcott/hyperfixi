import '../../semantic/src/index';
import { getPatternsForLanguage } from '../../semantic/src/registry';
import { PatternMatcher } from '../../semantic/src/parser/pattern-matcher';
import { tokenize } from '../../semantic/src/tokenizers/index';
const [src, lang = 'en', cmd = 'toggle'] = process.argv.slice(2);
const pats = (getPatternsForLanguage(lang) as any[]).filter(p => p.command === cmd);
for (const p of pats) {
  const m = new PatternMatcher();
  const ts: any = tokenize(src, lang);
  const r: any = (m as any).matchPattern(ts, p);
  console.log(p.id, r ? `conf=${r.confidence.toFixed(3)} consumed=${r.consumedTokens} roles=${JSON.stringify(Object.fromEntries(r.captured), (k, v) => (k === 'position' ? undefined : v))}` : 'no match');
}
