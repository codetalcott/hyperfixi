import { translate, getTokenizer } from '../../semantic/src/index';
const tk: any = getTokenizer('fr');
for (const s of ["quand clic le mettre dans #out", "quand clic l'afficher", "quand clic le cacher", "quand clic mettre le premier <p/> dans #out", "quand clic mettre il dans #out", "quand clic y mettre \"x\""]) {
  const toks = tk.tokenize(s).tokens.map((t: any) => `${t.value}:${t.kind}${t.normalized ? '=' + t.normalized : ''}`);
  let b; try { b = translate(s, 'fr', 'en'); } catch (e: any) { b = 'REFUSED ' + String(e.message).slice(0, 80); }
  console.log(s, '\n  ', toks.join(' '), '\n  =>', b);
}
