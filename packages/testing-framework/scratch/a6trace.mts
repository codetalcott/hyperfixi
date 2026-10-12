import '../../semantic/src/index';
import { getPatternsForLanguage } from '../../semantic/src/registry';
import { PatternMatcher } from '../../semantic/src/parser/pattern-matcher';
import { tokenize } from '../../semantic/src/tokenizers/index';
const [src, lang = 'en', id] = process.argv.slice(2);
const p = (getPatternsForLanguage(lang) as any[]).find(p => p.id === id);
const m: any = new PatternMatcher();
const proto = Object.getPrototypeOf(m);
for (const name of ['matchRoleToken', 'tryMatchOfPossessiveExpression', 'matchLiteralToken', 'absorbExpressionTail', 'matchGroupToken']) {
  const orig = proto[name];
  if (!orig) { console.log('no method', name); continue; }
  m[name] = function (...args: any[]) {
    const ts = args[0];
    const before = ts.position?.();
    const r = orig.apply(this, args);
    const tok = args[1];
    console.log(name, 'at', before, '→', ts.position?.(), JSON.stringify(tok && (tok.role ?? tok.value ?? tok.type)), '=>', JSON.stringify(r)?.slice(0, 160));
    return r;
  };
}
const ts: any = tokenize(src, lang);
console.log(ts.tokens.map((t: any) => `${t.value}:${t.kind}`).join(' '));
const r = m.matchPattern(ts, p);
console.log('RESULT', r && JSON.stringify(Object.fromEntries(r.captured)));
