const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const reg: any = await import('../../semantic/src/lexicon-registry.ts');
const src = 'on click fetch /x as json then put it into me';
for (const l of sem.getSupportedLanguages().filter((x: string) => x !== 'en')) {
  const p = sem.tryGetProfile(l); const not = reg.getLexicon(l)?.logical?.not?.primary; const thr = p.keywords.throw?.primary;
  const r = sem.translate('fetch /x as json', 'en', l);
  const a = `${r} ${not} ${thr}`, b = `${r} ${thr} ${not}`;
  const tk = (s: string) => sem.tokenize(s, l).tokens.slice(-4).map((t: any) => `${t.value}<${t.kind}${t.normalized ? ':' + t.normalized : ''}>`).join(' ');
  L(`${l} ${p.wordOrder}: ${r} || ${tk(a)} || ${tk(b)}`);
}
process.exit(0);
