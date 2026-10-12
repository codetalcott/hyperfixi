// Render en source in lang, then read back: npx tsx scratch/rr.mts <lang> <src> [foreign...]
const L = console.log; console.log = () => {}; console.warn = () => {};
const s: any = await import('../../semantic/src/index.ts');
const [l, src, ...extra] = process.argv.slice(2);
const r = s.render(s.parse(src, 'en'), l); L('render:', r);
for (const t of [r, ...extra]) { try { L('back:', t, '=>', s.render(s.parse(t, l), 'en')); } catch (e: any) { L('back:', t, '=> ERR', e.message.slice(0, 120)); } }
process.exit(0);
