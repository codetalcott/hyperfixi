import '../../semantic/src/index';
import { tokenize } from '../../semantic/src/tokenizers/index';
const [src, lang] = process.argv.slice(2);
console.log((tokenize(src, lang) as any).tokens.map((t: any) => `${t.value}:${t.kind}${t.normalized ? '=' + t.normalized : ''}`).join('  '));
