const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const [l, ...srcs] = process.argv.slice(2);
for (const s of srcs) { const n = sem.parse(s, l); const c = n?.body?.at(-1) ?? n; L(s, '\n  ', JSON.stringify(c?.metadata), Object.keys(Object.fromEntries(c?.roles ?? [])).join(',')); }
process.exit(0);
