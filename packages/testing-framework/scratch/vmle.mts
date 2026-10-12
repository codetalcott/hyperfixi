import { translate } from '../../semantic/src/index';
const srcs = ['on click set le to 1 then if le put "Y" into #out else put "N" into #out end', 'on click if le put "Y" into #out else put "N" into #out end'];
for (const s of srcs) { const o = translate(s, 'en', 'fr'); let b; try { b = translate(o, 'fr', 'en'); } catch (e: any) { b = 'REFUSED ' + e.message.slice(0,100); } console.log(o, '\n  =>', b); }
