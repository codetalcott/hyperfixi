import { tryGetProfile, getPatternsForLanguageAndCommand } from '@lokascript/semantic';
const p: any = tryGetProfile('ar');
const V = ['add','append','bind','blur','call','clear','clone','close','copy','decrement','default','empty','focus','get','hide','increment','log','make','measure','morph','open','pick','prepend','put','remove','render','reset','return','select','send','set','show','swap','take','tell','throw','toggle','transition','trigger'];
for (const v of V) {
  const lits = new Set<string>();
  for (const pat of getPatternsForLanguageAndCommand('ar', v) as any[]) { const t = pat.template.tokens[0]; if (t?.type === 'literal') lits.add(t.value); }
  console.log(v.padEnd(10), (p.keywords[v]?.primary ?? '-').padEnd(10), [...lits].join(' '));
}
