const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const { semanticRenderer } = await import('../../semantic/src/explicit/renderer.ts');
const [src, ...langs] = process.argv.slice(2);
const node = sem.parse(src, 'en');
for (const l of langs) {
  const r = semanticRenderer.render(node, l);
  L(`${l}: ${r}`);
  try { const n = sem.parse(r, l); const c = n?.body?.at(-1) ?? n; L('  node:', n?.kind, n?.action, c?.action, JSON.stringify(Object.fromEntries(c?.roles ?? [])).slice(0, 500), c?.verbatimClause ?? ''); L('  en:', semanticRenderer.render(n, 'en')); } catch (e: any) { L('  parse threw', e.message.slice(0, 200)); }
}
process.exit(0);
