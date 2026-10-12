import { translate } from '../../semantic/src/index';
import { readFileSync } from 'fs';
const cases = JSON.parse(readFileSync('src/multilingual/command-shapes.cases.json', 'utf8'));
const list = (cases.cases ?? cases) as any[];
const markers: Record<string, string[]> = { ko: ['을','를','에','으로','로','의','에서','부터','에게'], ja: ['を','に','へ','から','の','として'] };
const lang = process.argv[2];
let n = 0;
for (const c of list) {
  let r: string; try { r = translate(c.source, 'en', lang); } catch { continue; }
  const m = r.match(new RegExp(`\\S\\s+(${markers[lang].join('|')})(?=\\s|$)`, 'u'));
  if (m) { console.log(r.replace(/\n/g, ' ⏎ ').slice(0, 160)); if (++n > 25) break; }
}
