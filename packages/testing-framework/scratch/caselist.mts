import { translate } from '../../semantic/src/index';
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const r of rows) {
  let out = ''; try { out = translate(r.src, 'en', r.lang); } catch (e: any) { out = 'REFUSED'; }
  console.log(`${r.kind.padEnd(14)} ${r.lang}  ${r.src}\n      ${out}`);
}
