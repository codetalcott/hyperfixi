import { translate } from '../../semantic/src/index';
const [src, ...langs] = process.argv.slice(2);
for (const l of langs) { try { console.log(l, translate(src, 'en', l)); } catch (e: any) { console.log(l, 'ERR', e.message.slice(0, 100)); } }
