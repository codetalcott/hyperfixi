import { writeFileSync } from 'node:fs';
import { loadCommandShapeCases } from '../src/multilingual/command-shapes';
import { getAllPatterns } from '@hyperfixi/patterns-reference';
import { translate } from '../../semantic/src/index';
const sources: string[] = loadCommandShapeCases().cases.map(c => c.source);
for (const r of await getAllPatterns({ limit: 5000 }) as any[]) if (!r.rawCode.trimStart().startsWith('<')) sources.push(r.rawCode);
const out: Record<string, string> = {};
for (const l of ['de', 'pl', 'ru', 'uk']) for (const s of sources) { try { out[l + '|' + s] = translate(s, 'en', l); } catch (e: any) { out[l + '|' + s] = 'ERR'; } }
writeFileSync(process.argv[2], JSON.stringify(out));
