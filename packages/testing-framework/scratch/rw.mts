const L = console.log; console.log = () => {}; console.warn = () => {};
const sem: any = await import('../../semantic/src/index.ts');
const P: any = await import('../../semantic/src/parser/semantic-parser.ts');
const parser = P.semanticParser ?? new P.SemanticParserImpl();
const [l, ...ts] = process.argv.slice(2);
for (const t of ts) L(`${l} ${t} -> ${parser.readNativeGrammarWords(t, l)} | toks ${sem.tokenize(t, l).tokens.map((x: any) => x.value + '<' + x.kind + ':' + (x.normalized ?? '') + '>').join(' ')}`);
process.exit(0);
