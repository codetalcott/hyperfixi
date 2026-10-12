import { parse, semanticRenderer, translate } from '../../semantic/src/index';
for (const [l, s] of [['ja','on click put my value into #out'],['bn','on click put my value into #out'],['ja','on click hide me']] as const) {
  const node = parse(s, 'en')!;
  const plain = semanticRenderer.render(node, l);
  let back; try { back = translate(plain, l, 'en'); } catch (e: any) { back = 'REFUSED ' + String(e.message).slice(0, 120); }
  console.log(l, '|', plain, '|', back);
}
for (const [l, s] of [['ja','クリックで 自分を 隠す'],['ja','クリック で 私の 値を #outに 置く'],['ja','クリック を で 私の 値を #out に 置く'],['bn','ক্লিক তে আমার মানকে #outএ রাখুন'],['bn','ক্লিক তে আমার মান কে #outএ রাখুন']] as const) {
  let back; try { back = translate(s, l, 'en'); } catch (e: any) { back = 'REFUSED ' + String(e.message).slice(0, 120); } console.log(l, s, '=>', back);
}
