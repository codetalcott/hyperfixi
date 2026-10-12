import { translate, tryGetProfile } from '@lokascript/semantic';
const [src, ...langs] = process.argv.slice(2);
for (const l of langs) { try { console.log(l, translate(src, 'en', l)); } catch (e: any) { console.log(l, 'ERR', e.message.slice(0, 200)); } }
