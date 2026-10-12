import { translate, parse, render } from '@lokascript/semantic';
import { readFileSync, writeFileSync } from 'fs';
const cases = JSON.parse(readFileSync('src/multilingual/command-shapes.cases.json', 'utf8'));
const list = (cases.cases ?? cases) as any[];
const { getAllPatterns } = await import('@hyperfixi/patterns-reference');
const rows = await getAllPatterns({ limit: 5000 });
const out: string[] = [];
for (const l of ['ja', 'ko', 'bn']) {
  for (const c of list) { let r; try { r = translate(c.source, 'en', l); } catch { r = 'REFUSED'; } out.push(`${l}\t${c.id}\t${r}`); }
  for (const row of rows as any[]) { if (row.rawCode.trimStart().startsWith('<')) continue; let r; try { r = render(parse(row.rawCode, 'en')!, l); } catch { r = 'ERR'; } out.push(`${l}\t${row.id}\t${r}`); }
}
writeFileSync(process.argv[2], out.join('\n'));
