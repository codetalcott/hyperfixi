/**
 * Generate the full-vs-slim preprocessor parity fixture.
 *
 * Runs the shared corpus (test/parity-harness.ts) through both
 * preprocessor paths and snapshots each path's output byte-exactly into
 * test/fixtures/preprocessor-parity.json. The two parity test files diff
 * against this snapshot on every vitest run — see
 * test/preprocessor-parity.full.test.ts for the full rationale.
 *
 * This script runs under tsx against the workspace DIST artifacts, where
 * the full package (`@lokascript/semantic`) and the slim chain
 * (`@lokascript/semantic/core` + `/languages/*`) are separate bundles with
 * separate registries — the same isolation the shipped browser bundles
 * have, so wiring the slim pattern generator below cannot leak into the
 * full path's rich builder. (The vitest tests get the same isolation from
 * per-file module graphs instead.)
 *
 * Regenerate ONLY for an intentional behavior change, from a tree whose
 * semantic dist is fresh (`npm run check:fresh` at the repo root first):
 *
 *   npx tsx scripts/generate-parity-fixture.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  setPatternGenerator,
  generatePatternsForLanguage,
  type LanguageProfile,
} from '@lokascript/semantic/core';

// Side-effect language registrations for the slim chain — same as the
// per-language bundle entries. Keep in sync with SLIM_LANGS.
import '@lokascript/semantic/languages/es';
import '@lokascript/semantic/languages/ja';
import '@lokascript/semantic/languages/ko';
import '@lokascript/semantic/languages/zh';
import '@lokascript/semantic/languages/fr';
import '@lokascript/semantic/languages/ar';

import { preprocessToEnglish as fullPreprocess } from '../src/preprocessor';
import { preprocessToEnglish as slimPreprocess } from '../src/slim-preprocessor';
import { PARITY_CORPUS } from '../test/parity-harness';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same wiring as src/bundles/shared.ts.
setPatternGenerator((profile: LanguageProfile) => generatePatternsForLanguage(profile));

const rows = PARITY_CORPUS.map(({ lang, input, config }) => ({
  lang,
  input,
  ...(config ? { config } : {}),
  full: fullPreprocess(input, lang, config ?? {}),
  slim: slimPreprocess(input, lang, config ?? {}),
}));

const divergent = rows.filter(r => r.full !== r.slim).length;
const outDir = path.join(__dirname, '..', 'test', 'fixtures');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'preprocessor-parity.json');
writeFileSync(outFile, JSON.stringify(rows, null, 2) + '\n');

console.log(
  `Wrote ${rows.length} rows to ${path.relative(process.cwd(), outFile)} ` +
    `(${divergent} full-vs-slim divergences)`
);
