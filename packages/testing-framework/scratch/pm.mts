const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('@lokascript/semantic');
for (const s of process.argv.slice(2)) { const n = sem.parse(s, 'en'); const c = n.body?.[0] ?? n; L(s, '\n  ', JSON.stringify(c.metadata), '\n  ', JSON.stringify(Object.fromEntries(c.roles)), c.verbatimClause ?? ''); }
process.exit(0);
