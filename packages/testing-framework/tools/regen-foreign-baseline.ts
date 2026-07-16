/**
 * Regenerate the foreign→English canonical-validity allowlist
 * (`baselines/foreign-canonical-validity.json`) from a freshly-`populate`d
 * patterns.db. Run after an intentional parser/renderer change that clears (or
 * adds) invalid foreign→English renders:
 *
 *   npm run populate --prefix packages/patterns-reference
 *   npx tsx packages/testing-framework/tools/regen-foreign-baseline.ts
 *
 * Prints the pruned/added pairs, then rewrites the JSON in place (preserving the
 * description/note). Commit the baseline — NOT the regenerated patterns.db.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  checkForeignRenderValidity,
  groupFailuresByPattern,
} from '../src/multilingual/foreign-canonical-validity';

const baselinePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../baselines/foreign-canonical-validity.json'
);

interface AllowlistDoc {
  description: string;
  note: string;
  checkedAtGeneration: number;
  validAtGeneration: number;
  allowedInvalid: Record<string, string[]>;
}

const key = (id: string, lang: string) => `${id} ${lang}`;

async function main() {
  const doc = JSON.parse(readFileSync(baselinePath, 'utf8')) as AllowlistDoc;
  const oldPairs = new Set(
    Object.entries(doc.allowedInvalid).flatMap(([id, langs]) => langs.map(l => key(id, l)))
  );

  const result = await checkForeignRenderValidity();
  const grouped = groupFailuresByPattern(result.failures);
  const newPairs = new Set(
    Object.entries(grouped).flatMap(([id, langs]) => langs.map(l => key(id, l)))
  );

  const cleared = [...oldPairs].filter(p => !newPairs.has(p)).sort();
  const added = [...newPairs].filter(p => !oldPairs.has(p)).sort();

  console.log(`checked=${result.checked} valid=${result.valid} failing=${result.failures.length}`);
  console.log(`\nCLEARED (${cleared.length}) — now render valid, pruned from allowlist:`);
  for (const p of cleared) console.log(`  - ${p}`);
  console.log(`\nADDED (${added.length}) — new invalid renders, added to allowlist:`);
  for (const p of added) console.log(`  + ${p}`);

  doc.checkedAtGeneration = result.checked;
  doc.validAtGeneration = result.valid;
  doc.allowedInvalid = grouped;
  writeFileSync(baselinePath, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${baselinePath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
