import { getTokenizer } from '../../semantic/src/index';
import { BaseTokenizer } from '../../semantic/src/tokenizers/base';
const tk: any = getTokenizer('fr');
for (const s of ["quand clic l'afficher puis l'ajouter .x", "quand clic l'afficher", "quand clic mettre 'abc' dans l'élément"]) {
  const toks = (BaseTokenizer.prototype as any).tokenize.call(tk, s).tokens.map((t: any) => `${t.value}:${t.kind}`);
  console.log(s, '\n  ', toks.join(' | '));
}
