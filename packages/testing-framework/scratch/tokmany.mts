// Tokenize many: args are "lang:word,word" groups.
const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
for (const g of process.argv.slice(2)) {
  const [l, ws] = g.split(':');
  for (const w of ws.split(',')) L(`${l} ${w}: ${sem.tokenize(w, l).tokens.map((t: any) => `${t.value}<${t.kind}${t.normalized && t.normalized !== t.value ? ':' + t.normalized : ''}>`).join(' ')}`);
}
process.exit(0);
