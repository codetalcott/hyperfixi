#!/usr/bin/env npx tsx
/**
 * Generate the SYNTAX table from command schemas.
 *
 * Imports the canonical schemas and English profile from @lokascript/semantic,
 * calls deriveEnglishSyntax(), and writes a TypeScript file that
 * hyperscript-renderer.ts imports.
 *
 * Usage: npx tsx scripts/generate-syntax.ts
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSchemas, englishProfile } from '@lokascript/semantic';
import { deriveEnglishSyntax } from '../src/derive-syntax';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/generated/syntax-table.ts');

const syntax = deriveEnglishSyntax(commandSchemas, englishProfile);

// Generate the TypeScript source
const lines: string[] = [
  '// @generated — do not edit manually.',
  '// Regenerate with: npm run generate:syntax',
  '//',
  '// Derived from command schemas + English profile via deriveEnglishSyntax().',
  '',
  'export const SYNTAX: Record<string, readonly [string, string][]> = {',
];

for (const [action, entries] of Object.entries(syntax).sort(([a], [b]) => a.localeCompare(b))) {
  const tuples = (entries as [string, string][])
    .map(([role, prep]) => `['${role}', '${prep}']`)
    .join(', ');
  lines.push(`  ${action}: [${tuples}],`);
}

lines.push('};');
lines.push('');

writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');
console.log(`Generated: ${OUTPUT_PATH} (${Object.keys(syntax).length} commands)`);
