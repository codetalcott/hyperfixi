import '../../semantic/src/index';
import { getPatternsForLanguage } from '../../semantic/src/registry';
const [lang = 'ms', re = 'toggle'] = process.argv.slice(2);
for (const p of (getPatternsForLanguage(lang) as any[]).filter(p => p.id.includes(re))) console.log(p.priority, p.id, p.command, '|', p.template.format);
