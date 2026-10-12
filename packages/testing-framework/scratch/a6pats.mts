import '../../semantic/src/index';
import { getPatternsForLanguage } from '../../semantic/src/registry';
const [lang = 'en', cmd = 'toggle'] = process.argv.slice(2);
for (const p of (getPatternsForLanguage(lang) as any[]).filter(p => p.command === cmd)) console.log(p.priority, p.id, '|', p.template.format);
