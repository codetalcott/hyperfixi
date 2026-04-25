#!/usr/bin/env npx tsx
/**
 * Generate Language Assets (Phase 4.2)
 *
 * Master script that derives all downstream artifacts from semantic profiles.
 * This is the single command to run after modifying any language profile.
 *
 * Usage:
 *   npx tsx scripts/generate-language-assets.ts
 *   npx tsx scripts/generate-language-assets.ts --dry-run
 *   npx tsx scripts/generate-language-assets.ts --only=dictionaries,vite-keywords
 *
 * Scripts:
 *   1. generate-i18n-dictionaries.ts    — keywords.primary → i18n dictionary files
 *   2. generate-i18n-grammar-profiles.ts — wordOrder, markers → i18n grammar profiles
 *   3. generate-vite-keywords.ts         — top-N keywords → vite-plugin detection sets
 *   4. generate-bundle-entries.ts        — regions → semantic browser-*.ts entries
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse args
const dryRun = process.argv.includes('--dry-run');
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=')[1].split(',') : null;

interface GeneratorStep {
  name: string;
  script: string;
}

const ALL_STEPS: GeneratorStep[] = [
  { name: 'dictionaries', script: 'generate-i18n-dictionaries.ts' },
  { name: 'grammar-profiles', script: 'generate-i18n-grammar-profiles.ts' },
  { name: 'vite-keywords', script: 'generate-vite-keywords.ts' },
  { name: 'bundle-entries', script: 'generate-bundle-entries.ts' },
];

const steps = only
  ? ALL_STEPS.filter(s => only.includes(s.name))
  : ALL_STEPS;

console.log('╔══════════════════════════════════════════╗');
console.log('║   Generate Language Assets (Phase 4.2)   ║');
console.log('╚══════════════════════════════════════════╝');
console.log();

if (dryRun) {
  console.log('[DRY RUN MODE]\n');
}

if (only) {
  console.log(`Running subset: ${steps.map(s => s.name).join(', ')}\n`);
}

let passed = 0;
let failed = 0;

for (const step of steps) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Step ${steps.indexOf(step) + 1}/${steps.length}: ${step.name}`);
  console.log(`${'─'.repeat(50)}\n`);

  const scriptPath = path.join(__dirname, step.script);
  const args = dryRun ? '--dry-run' : '';

  try {
    execSync(`npx tsx "${scriptPath}" ${args}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    passed++;
    console.log(`\n✓ ${step.name} completed`);
  } catch {
    failed++;
    console.error(`\n✗ ${step.name} failed`);
  }
}

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${steps.length} steps`);
console.log(`${'═'.repeat(50)}`);

if (failed > 0) {
  process.exit(1);
}
