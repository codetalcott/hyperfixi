import { translate } from '../../semantic/src/index';
for (const s of ['on click beep! me', 'on click default it to 5', 'on click render it', 'on click transition me opacity to 0', 'on click scroll to me']) { let o; try { o = translate(s, 'en', 'fr'); } catch (e: any) { o = 'REFUSED'; } console.log(s, '=>', o); }
