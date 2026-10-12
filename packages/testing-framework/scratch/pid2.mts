const L = console.log; console.log = () => {}; console.warn = () => {};
const s: any = await import('../../semantic/src/index.ts');
const [l, ...ts] = process.argv.slice(2);
for (const t of ts) { const n = s.parse(t, l); L(t, '=>', n.kind, n.action, JSON.stringify(n.metadata ?? {}).slice(0, 300), JSON.stringify(n.roles ? Object.fromEntries(n.roles) : {}).slice(0, 200)); }
process.exit(0);
