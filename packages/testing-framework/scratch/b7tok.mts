import { tokenize } from '@lokascript/semantic';
for (const [lang, s] of [
  ['vi', 'khi nhấp nếu không window.tmp đặt "a" vào tôi kết thúc'],
  ['bn', 'ক্লিক তে যদি না window.tmp "a" কে আমি এ রাখুন শেষ'],
] as const) {
  const t: any = tokenize(s, lang);
  console.log(lang, (t.tokens ?? t).map((x: any) => `${x.kind}:${x.value}${x.normalized ? '=' + x.normalized : ''}`).join(' | '));
}
