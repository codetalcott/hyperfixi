import { translate } from '../../semantic/src/index';
const rows: [string,string][] = [
  ['es','al clic enfoque yo'],['es','al clic enfoque #name'],['es','al clic pérdida de foco #name'],['es','al clic desenfoque #name'],['es','al enfoque agregar .x'],['es','al enfocar agregar .x'],['es','al clic enfocar #a entonces desenfocar #b'],
  ['pt','ao clique foco eu'],['pt','ao clique perda de foco #name'],['pt','ao foco adicionar .x'],['pt','ao focar adicionar .x'],['pt','ao clique focar #a então desfocar #b'],['pt','ao clique focar-me'],['es','al clic enfocarlo'],
];
for (const [l, s] of rows) { let b; try { b = translate(s, l, 'en'); } catch (e: any) { b = 'REFUSED ' + e.message.slice(0,80); } console.log(l, s, '=>', b); }
