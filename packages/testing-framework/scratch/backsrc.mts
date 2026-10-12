import { translate, parse } from '../../semantic/src/index';
const [lang, ...texts] = process.argv.slice(2);
for (const t of texts) { try { console.log(t, '\n  =>', translate(t, lang, 'en')); } catch (e: any) { console.log(t, '\n  => ERR', e.code, e.message.slice(0, 200)); } }
