const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const [text, l] = process.argv.slice(2);
const n = sem.parse(text, l);
const walk = (x: any, d = 0): void => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(y => walk(y, d)); if (x.kind) L(' '.repeat(d) + x.kind + ' ' + (x.action ?? '') + ' ' + JSON.stringify(Object.fromEntries(x.roles ?? [])).slice(0, 160)); for (const dd of x.diagnostics ?? []) L(' '.repeat(d) + '  diag: ' + dd.message.slice(0, 200)); for (const k of ['body', 'statements', 'thenBody', 'elseBody']) walk(x[k], d + 2); };
walk(n);
process.exit(0);
