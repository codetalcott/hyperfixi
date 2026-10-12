const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const [l, ...ts] = process.argv.slice(2);
for (const t of ts) { const n = sem.parse(t, l); const go = (x: any): any => x?.action === 'go' ? x : (x?.body ?? []).map(go).find(Boolean); const g = go(n); L(`${l} ${t} => ${g ? JSON.stringify(Object.fromEntries(g.roles)) : 'no go'} | ${sem.render(n, 'en')}`); }
process.exit(0);
