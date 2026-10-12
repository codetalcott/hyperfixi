const L = console.log;
const cs: any = await import('../src/multilingual/command-shapes.ts');
const r = await cs.loadEngineReaders();
for (const s of process.argv.slice(2)) { try { L(s, '=>', JSON.stringify(cs.plainParse(r.program.parse(s))).slice(0, 400)); } catch (e: any) { L(s, 'ERR', e.message.slice(0, 100)); } }
process.exit(0);
