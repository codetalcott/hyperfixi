const L = console.log; console.log = () => {}; console.warn = () => {};
const reg: any = await import('../../semantic/src/lexicon-registry.ts');
const sem: any = await import('../../semantic/src/index.ts');
const words = process.argv.slice(2);
for (const l of sem.getSupportedLanguages()) {
  const lex = reg.getLexicon(l);
  const row = words.map(w => { const hits: string[] = []; for (const c of Object.keys(lex ?? {})) { const v = lex[c]?.[w]; if (v) hits.push(`${c}:${JSON.stringify(v)}`); } return `${w}=${hits.join(',') || '-'}`; });
  L(`${l}: ${row.join('  ')}`);
}
process.exit(0);
