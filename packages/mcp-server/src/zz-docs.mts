import * as engine from '@hyperfixi/engine';
import { createCompleter } from '@hyperfixi/engine/next-words';
import { commands as reference } from '@hyperfixi/core/reference';
import { handleLanguageDocsTool } from './tools/language-docs.js';
(engine as any).register(...(engine as any).everything);
const g = createCompleter(engine as any).groups;
const keywords = [...new Set([...g.commands, ...g.features])];
const semantic: any = await import('@lokascript/semantic');
const schemaKeys = Object.keys(semantic.commandSchemas);
const ask = async (c: string) => JSON.parse((await handleLanguageDocsTool('get_command_docs', { command: c })).content[0].text);
const missing: string[] = [], found: string[] = [];
for (const k of keywords) ((await ask(k)).found ? found : missing).push(k);
console.log(`engine keywords ${keywords.length}: get_command_docs finds ${found.length}, not ${missing.length}: ${missing.join(' ')}`);
const extra = schemaKeys.filter(k => !keywords.includes(k));
console.log(`documented by get_command_docs and no engine keyword (${extra.length}): ${extra.join(' ')}`);
console.log(`core reference keys ${Object.keys(reference).length}; missing from it: ${keywords.filter(k => !(k in reference)).join(' ') || 'none'}`);
for (const c of ['toggle', 'put', 'fetch', 'repeat', 'go', 'prepend', 'swap', 'compound']) { const a = await ask(c); console.log(c.padEnd(8), '| mcp:', a.found ? `${JSON.stringify(a.syntax)} — ${a.description}` : 'NOT FOUND', '\n         | ref:', reference[c] ? `${JSON.stringify(reference[c].syntax)} — ${reference[c].description} | e.g. ${reference[c].examples[0]}` : 'none'); }
// does the mcp syntax line parse on the engine, for found commands, when wrapped in a handler?
let parses = 0; for (const k of found) { const a = await ask(k); try { (engine as any).parse('on click ' + a.syntax); parses++; } catch {} }
console.log(`mcp syntax lines the engine parses as written (in a handler): ${parses} of ${found.length}`);
