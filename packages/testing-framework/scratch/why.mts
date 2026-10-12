const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.SRC ? '../../semantic/src/index.ts' : '@lokascript/semantic');
const [src, ...langs] = process.argv.slice(2);
for (const l of langs) {
  let r = '';
  try { r = sem.translate(src, 'en', l); L(`${l}: ${r}`); } catch (e: any) { L(`${l} render REFUSED: ${e.message.slice(0, 300)}`); continue; }
  try { L(`  back: ${sem.translate(r, l, 'en')}`); } catch (e: any) { L(`  back REFUSED: ${e.message.slice(0, 400)}`); }
  try { const n = sem.parse(r, l); const c = n?.body?.[0] ?? n; L('  node:', c?.action, JSON.stringify(Object.fromEntries(c?.roles ?? [])).slice(0, 400), c?.verbatimClause ?? ''); } catch (e: any) { L('  parse threw', e.message.slice(0, 200)); }
}
process.exit(0);
