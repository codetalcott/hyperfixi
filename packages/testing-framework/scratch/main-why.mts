const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.SRC ? '../../semantic/src/index.ts' : '/Users/williamtalcott/projects/hf-m2/packages/semantic/dist/index.js');
const [src, ...langs] = process.argv.slice(2);
for (const l of langs) { try { const r = sem.translate(src, 'en', l); const b = sem.translate(r, l, 'en'); L(`${l}: ${b === sem.translate(src, 'en', 'en') ? 'ok' : 'WRONG ' + b}  | ${r}`); } catch (e: any) { L(`${l}: REFUSED ${e.message.split('\n')[0].slice(0, 100)}`); } }
process.exit(0);
