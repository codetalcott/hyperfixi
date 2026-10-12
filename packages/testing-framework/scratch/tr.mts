const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const srcs = process.argv.slice(2).length ? process.argv.slice(2) : [
  'on click transition *width from 0px to 100px',
  'on click transition *width of #foo from 0px to 100px',
  "on click transition #foo's *width from 0px to 100px over 2s",
  'on click transition #foo\'s *width from 0px to 100px using "width 2s ease-in"',
  'on click transition my opacity to 0 over 500ms',
  'transition opacity from 1 to 0',
];
for (const src of srcs) {
  const n = sem.parse(src, 'en');
  L('\n' + src);
  const cmd = n.body?.[0] ?? n;
  L('  roles:', JSON.stringify([...(cmd.roles ?? new Map())].map(([r, v]: any) => [r, v.type, v.value ?? v.raw])), 'clause:', cmd.verbatimClause ?? '-');
  for (const l of ['en', 'es', 'de', 'ja', 'ko', 'tr', 'ar', 'zh']) {
    let r: string, back = '';
    try { r = sem.translate(src, 'en', l); try { back = sem.translate(r, l, 'en'); } catch (e: any) { back = 'REFUSED ' + e.message.split('\n')[0].slice(0, 60); } } catch (e: any) { r = 'REFUSED ' + e.message.split('\n')[0].slice(0, 80); }
    L(`  ${l}: ${r}${l === 'en' ? '' : `   ⇒ ${back}`}`);
  }
}
process.exit(0);
