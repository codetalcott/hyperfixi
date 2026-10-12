import { translate } from '../../semantic/src/index';
for (const [l, s] of [['es','def foo() hide me end'],['it','def foo() hide me end'],['pt','def foo() hide me end']] as const) console.log(l, translate(s, 'en', l).replace(/\n/g, ' ⏎ '));
for (const [l, s] of [['fr', "fonction foo\n  m'enregistrer\nfin"],['fr', 'fonction foo\n  me cacher\nfin'],['es', 'función foo\n  ocultarme\nfin']] as const) { let b; try { b = translate(s, l, 'en'); } catch (e: any) { b = 'REFUSED ' + String(e.message).slice(0,120); } console.log(l, JSON.stringify(s), '=>', JSON.stringify(b)); }
