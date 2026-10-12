import { translate } from '../../semantic/src/index';
const s = 'on click set le to 1 then if le put "Y" into #out else put "N" into #out end';
const o = translate(s, 'en', 'fr'); console.log(o); console.log(translate(o, 'fr', 'en')); console.log(translate(s, 'en', 'en'));
