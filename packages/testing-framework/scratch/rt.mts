// Read foreign text back to English: npx tsx scratch/rt.mts <lang> <text>...
const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const [l, ...ts] = process.argv.slice(2);
for (const t of ts) { try { L(`${l} ${t} => ${sem.translate(t, l, 'en')}`); } catch (e: any) { L(`${l} ${t} => REFUSED ${e.message.split('\n')[0].slice(0, 90)}`); } }
process.exit(0);
