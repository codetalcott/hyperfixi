const L = console.log; console.log = () => {}; console.warn = () => {};
const { initLeakScanner } = await import('../src/multilingual/english-leaks.ts');
const sem: any = await import('@lokascript/semantic');
const s = await initLeakScanner();
for (const src of ['on click take .foo from .div for #d3', 'on click render #tmpl into #target', 'on click toggle between .foo and .bar']) {
  const r = sem.translate(src, 'en', 'es');
  const info = s.sourceInfo(src, 'program');
  L(src, '=>', r, JSON.stringify(s.scan(r, info, 'es')));
}
process.exit(0);
