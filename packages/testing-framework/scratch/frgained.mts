import { translate } from '../../semantic/src/index';
import { readFileSync } from 'fs';
const c = JSON.parse(readFileSync('src/multilingual/command-shapes.cases.json', 'utf8'));
const list = (c.cases ?? c) as any[];
for (const x of list.filter((x: any) => ['c0ad58570f','520002c276','79674d3450','e8446a57e2'].includes(x.id))) console.log(x.id, translate(x.source, 'en', 'fr').replace(/\n/g, ' ⏎ ').slice(0, 200));
