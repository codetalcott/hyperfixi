import { translate } from '../../semantic/src/index';
const groups: Record<string, [string[], string[]]> = {
  focus: [['es','pt','it','fr'], ['on click focus me','on click focus #name','on click blur me','on focus add .x','on blur remove .x','on click focus','on click blur #name']],
  query: [['bn','hi','tr','ja','ko','qu'], ['on click hide <p/> in me','on click hide <p/> in #list','on click add .x to <li/> in #list','on click put "x" into <p/> in me','on click repeat for x in <p/> in me log x end','on click get the first <p/> in me']],
  fr: [['fr'], ['on click put it into #out','on click show it','on click put "x" into it','on click add .a to it','on click hide it','on click get #a then put it into me','on click put me into #o','on click show me','on click toggle .a on it','on click send foo to it', 'on click set $x to it']],
  spacing: [['ko','bn','ja','tr','qu'], ['on click put "x" into #out','on click toggle .active','on click add .a to #b','on click remove .a from me','on click set $x to 5','on click increment :n by 2','on click wait 2s then hide #m']],
};
for (const [g, [langs, shapes]] of Object.entries(groups)) {
  console.log('== ' + g);
  for (const s of shapes) {
    let ref: string; try { ref = translate(s, 'en', 'en'); } catch { ref = 'REFUSED'; }
    for (const l of langs) {
      let out = '', back = '';
      try { out = translate(s, 'en', l); } catch (e: any) { out = 'REFUSED ' + (e.code ?? ''); }
      if (!out.startsWith('REFUSED')) { try { back = translate(out, l, 'en'); } catch (e: any) { back = 'REFUSED'; } }
      console.log(`${l}\t${s}\t=> ${out}${back === ref ? '' : '\t!! ' + back}`);
    }
  }
}
