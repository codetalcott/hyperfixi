import '../../semantic/src/index';
import { getPatternsForLanguage } from '../../semantic/src/registry';
const [lang = 'ja', id] = process.argv.slice(2);
for (const p of (getPatternsForLanguage(lang) as any[]).filter(p => p.id === id)) console.log(JSON.stringify(p.template.tokens));
