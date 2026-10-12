import { translate, parse, semanticRenderer } from '../../semantic/src/index';
for (const s of ['on click log me', 'def foo() log me end', 'def foo() hide me end', 'def foo() log it end']) { const o = translate(s, 'en', 'fr'); console.log(s, '=>', o.replace(/\n/g, ' ⏎ '), '| plain:', semanticRenderer.render(parse(s, 'en')!, 'fr').replace(/\n/g,' ⏎ ')); }
