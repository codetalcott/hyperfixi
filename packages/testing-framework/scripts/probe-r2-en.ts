/**
 * Session-8 probe: validate the en reference of every EXECUTION_SUBSET pattern
 * (lesson 15 — exclude broken references before scoring languages against them).
 * Usage: npx tsx scripts/probe-r2-en.ts [lang ...]
 */
import {
  ExecutionValidator,
  EXECUTION_SUBSET,
  loadExecutionSubset,
} from '../src/multilingual/validators/execution-validator';
import type { LanguageCode } from '../src/multilingual/types';

async function main() {
  const langs = (process.argv.slice(2).length ? process.argv.slice(2) : ['en']) as LanguageCode[];
  const validator = new ExecutionValidator();
  await validator.initialize();
  const sources = await loadExecutionSubset(['en', ...langs.filter(l => l !== 'en')]);

  const enRef = new Map<string, string[]>();
  for (const lang of langs) {
    console.log(`\n=== ${lang} ===`);
    const byId = sources.get(lang)!;
    for (const id of EXECUTION_SUBSET) {
      const code = byId.get(id);
      if (!code) {
        console.log(`${id}: NO SOURCE`);
        continue;
      }
      const res = await validator.execute(id, code, lang);
      if (lang === 'en') enRef.set(id, res.effects);
      const status = res.error
        ? `ERROR: ${res.error}`
        : res.effects.length === 0
          ? 'NO EFFECTS'
          : lang === 'en'
            ? 'OK'
            : JSON.stringify(res.effects) === JSON.stringify(enRef.get(id))
              ? 'MATCH'
              : 'DIVERGE';
      console.log(`${id}: ${status}`);
      if (lang === 'en' && !res.error && res.effects.length) {
        for (const e of res.effects) console.log(`    ${e}`);
      }
      if (status === 'DIVERGE') {
        console.log(`    en: ${JSON.stringify(enRef.get(id))}`);
        console.log(`    ${lang}: ${JSON.stringify(res.effects)}  code: ${code}`);
      }
    }
  }
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
