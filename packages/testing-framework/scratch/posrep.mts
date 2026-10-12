import { parse } from '../../semantic/src/index';
const show = (n: any) => n?.kind === 'event-handler' ? n.body?.[0] : n;
for (const [l, s] of [['en','on click get the first <p/> in me'],['tr','tıklama i üzerinde ilk <p/> içinde ben i al'],['en','on click hide <p/> in me'],['tr','tıklama i üzerinde <p/> içinde ben i gizle'],['en','on click add .x to <li/> in #list'],['en','on click hide <input/> in closest <form/>']] as const) {
  const n: any = show(parse(s, l));
  console.log(l, s, '\n   ', n?.action, JSON.stringify([...(n?.roles ?? new Map()).entries()]));
}
