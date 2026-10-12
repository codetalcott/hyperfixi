import { translate, tryGetProfile } from '@lokascript/semantic';
const FORMS: Record<string, string[]> = { de: ['ihm'], pl: ['tego', 'tym'], ru: ['этому', 'этого', 'этом', 'этим'], uk: ['цього', 'цьому', 'цим'], fr: ['lui'], hi: ['इस'] };
const SHAPES = ['on click put 1 into it', 'on click add .x to it', 'on click remove .x from it', 'on click send foo to it', 'on click toggle .x on it', 'on click put it into #out', 'on click put 1 before it', 'on click put 1 after it', 'on click put 1 at end of it', 'on click hide <p/> in it', 'on click take .x from it', 'on click get first <p/> in it'];
let ok = 0, bad = 0, base = 0;
for (const [l, forms] of Object.entries(FORMS)) {
  const it = (tryGetProfile(l) as any).references.it;
  for (const s of SHAPES) {
    let rendered = ''; try { rendered = translate(s, 'en', l); } catch { console.log('REFUSED', l, s); continue; }
    let ref = ''; try { ref = translate(rendered, l, 'en'); } catch { ref = 'ERR'; }
    if (ref !== translate(s, 'en', 'en')) { base++; console.log('BASE-FAIL', l, s, '|', rendered, '=>', ref); continue; }
    if (!rendered.split(/\s+/).includes(it)) { console.log('NO-IT', l, s, '|', rendered); continue; }
    for (const f of forms) {
      const w = rendered.split(/\s+/).map(x => (x === it ? f : x)).join(' ');
      let back = ''; try { back = translate(w, l, 'en'); } catch (e: any) { back = 'ERR ' + (e.code ?? ''); }
      if (back === ref) ok++; else { bad++; console.log('FAIL', l, f, '|', w, '=>', back); }
    }
  }
}
console.log({ ok, bad, base });
