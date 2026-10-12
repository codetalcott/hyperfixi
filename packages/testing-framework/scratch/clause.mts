const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
for (const s of process.argv.slice(2)) { const n = sem.parse(s, 'en'); const c = n?.body ?? [n]; L(s, '=>', JSON.stringify(c.map((x: any) => [x.action, x.verbatimClause]))); }
const langs = ['ja', 'ar', 'es', 'ko', 'de', 'zh', 'tr', 'pl'];
for (const s of ['on click toggle between .foo and .bar', 'on click render #tmpl into #target', 'on click take .a from .b when it matches .c', 'on click toggle .a when it matches .c']) {
  const bad = langs.filter(l => { try { return sem.translate(sem.translate(s, 'en', l), l, 'en') !== s; } catch { return true; } });
  L('rt', s, bad.length ? 'FAILS ' + bad.join(' ') : 'ok');
}
process.exit(0);
