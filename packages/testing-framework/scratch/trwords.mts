import { getTokenizer, translate } from '../../semantic/src/index';
const tk: any = getTokenizer('tr');
const words = ['sonucu','sonuca','sonuçtan','olayı','olaya','olaydan','hedefi','hedefe','hedeften','gövdeyi','gövdeye','gövdeden','belgeyi','belgeye','belgeden','pencereyi','pencereye','pencereden','detayı','detaya','detaydan'];
for (const w of words) console.log(w, tk.tokenize(w).tokens.map((t: any) => `${t.value}:${t.kind}${t.normalized ? '=' + t.normalized : ''}`).join(' '));
for (const s of ['on click put result into #out','on click put "x" into the target','on click put it into document.body','on click send foo to the target','on click remove .a from the target','on click get the event','on click log result','on click put event.detail into #out','on click add .x to document.body','on click set the result to 5','on click put "x" into document']) console.log(s, '=>', translate(s, 'en', 'tr'));
