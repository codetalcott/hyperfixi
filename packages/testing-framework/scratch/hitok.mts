import { getTokenizer } from '../../semantic/src/index';
const tk: any = getTokenizer('hi');
for (const s of ['स्थित', 'वाले', 'के अंदर के', 'में स्थित', 'मुझ में स्थित <p/>']) console.log(s, '\n   ', tk.tokenize(s).tokens.map((t: any) => `${t.value}:${t.kind}${t.normalized && t.normalized !== t.value ? '=' + t.normalized : ''}`).join(' | '));
