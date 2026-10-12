const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
for (const s of process.argv.slice(2)) { const n = sem.parse(s, 'en'); const c = n?.body?.at(-1) ?? n; L(s, '\n  ', c?.metadata?.patternId, JSON.stringify(Object.fromEntries(c?.roles ?? []))); }
process.exit(0);
