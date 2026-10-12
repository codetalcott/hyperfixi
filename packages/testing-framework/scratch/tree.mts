const L = console.log; console.log = () => {}; console.warn = () => {};
const s: any = await import('../../semantic/src/index.ts');
const [l, t] = process.argv.slice(2);
const show = (n: any, d = 0): void => { if (!n) return; L(' '.repeat(d) + `${n.kind}:${n.action} ${JSON.stringify(n.roles ? Object.fromEntries([...n.roles].map(([k, v]: any) => [k, v.raw ?? v.value])) : {})}`); for (const f of ['body', 'statements', 'thenBranch', 'elseBranch']) (n[f] ?? []).forEach((c: any) => show(c, d + 2)); };
show(s.parse(t, l));
process.exit(0);
