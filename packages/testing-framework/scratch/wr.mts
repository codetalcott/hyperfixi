const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import(process.env.MAIN ? '/Users/williamtalcott/projects/hyperfixi/packages/semantic/src/index.ts' : '../../semantic/src/index.ts');
for (const s of ['on click wait for reset from #b then log 1', 'on click wait for reset then log 1', 'on click send reset to #x then log 1']) { try { L(s, '=>', sem.translate(s, 'en', 'en')); } catch (e: any) { L(s, '=> REFUSED', e.message.split('\n')[0]); } }
process.exit(0);
