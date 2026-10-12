import { translate } from '@lokascript/semantic';
const srcs = [
  'on click\n    if window.tmp then\n      put "foo" into me\n    else if not window.tmp then\n      // do nothing\n    end\ncatch e\n    // just here for the parsing...',
  'on click if not window.tmp then put "a" into me end',
  'on click if window.tmp then put "a" into me end',
  'on click put not window.tmp into me',
  'on click if not document.body then put "a" into me end',
  'on click set x to not window.tmp',
];
for (const lang of (process.argv[2] ?? 'vi,th,bn').split(',')) {
  for (const s of srcs) {
    let r = '', back = '';
    try { r = translate(s, 'en', lang, { lossy: 'allow' } as any); } catch (e: any) { r = 'THROW ' + e.message; }
    try { back = translate(r, lang, 'en'); } catch (e: any) { back = 'THROW ' + String(e.message).slice(0, 200); }
    console.log(lang, '|', JSON.stringify(r), '\n   =>', JSON.stringify(back));
  }
}
