const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
const src = process.argv[2];
const n = sem.parse(src, 'en'); const c = n.body?.[0] ?? n;
L('en roles', JSON.stringify([...c.roles].map(([k, v]: any) => [k, v.type, v.value ?? v.raw])), 'clause', c.verbatimClause, 'diags', JSON.stringify((sem.parseSemantic?.(src,'en')?.diagnostics ?? []).map((d: any) => d.code + ':' + d.message).slice(0,4)));
for (const l of process.argv.slice(3)) {
  try { L(l, sem.translate(src, 'en', l)); } catch (e: any) { L(l, 'REFUSED', e.message.split('\n').slice(0, 3).join(' | ')); }
  L('   allow:', sem.translate(src, 'en', l, { lossy: 'allow' }));
}
process.exit(0);
