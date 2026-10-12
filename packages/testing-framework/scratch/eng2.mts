const L = console.log;
const cs: any = await import('../src/multilingual/command-shapes.ts');
const r = await cs.loadEngineReaders();
const pairs = process.argv.slice(2);
for (let i = 0; i < pairs.length; i += 2) {
  const f = (s: string) => { try { return JSON.stringify(cs.normalize ? cs.normalize(cs.plainParse(r.statements.parse(s))) : cs.plainParse(r.statements.parse(s))); } catch (e: any) { return 'ERR ' + e.message.slice(0, 80); } };
  const a = f(pairs[i]), b = f(pairs[i + 1]);
  L(pairs[i], '|', pairs[i + 1], '=>', a === b ? 'SAME' : 'DIFF\n   ' + a.slice(0, 300) + '\n   ' + b.slice(0, 300));
}
process.exit(0);
