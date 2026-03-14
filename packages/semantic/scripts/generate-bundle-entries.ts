#!/usr/bin/env npx tsx
/**
 * Generate/Validate Bundle Entry Points (Phase 4.2)
 *
 * Reads `regions` field from semantic profiles and validates that
 * browser-*.ts entry points match. Reports mismatches and can update
 * the language import lists in existing bundle files.
 *
 * Usage:
 *   npx tsx scripts/generate-bundle-entries.ts
 *   npx tsx scripts/generate-bundle-entries.ts --dry-run
 *
 * The script:
 * 1. Reads all semantic profiles' `regions` fields
 * 2. Groups languages by region
 * 3. Checks each browser-{region}.ts file for consistency
 * 4. Updates language imports and SUPPORTED_LANGUAGES if needed
 *
 * Note: bundle entry files have significant hand-crafted boilerplate
 * (tokenizer re-exports, profile re-exports, etc.) that is preserved.
 * This script only updates the language registration sections.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { englishProfile } from '../src/generators/profiles/english';
import { spanishProfile } from '../src/generators/profiles/spanish';
import { portugueseProfile } from '../src/generators/profiles/portuguese';
import { frenchProfile } from '../src/generators/profiles/french';
import { germanProfile } from '../src/generators/profiles/german';
import { italianProfile } from '../src/generators/profiles/italian';
import { japaneseProfile } from '../src/generators/profiles/japanese';
import { chineseProfile } from '../src/generators/profiles/chinese';
import { koreanProfile } from '../src/generators/profiles/korean';
import { arabicProfile } from '../src/generators/profiles/arabic';
import { turkishProfile } from '../src/generators/profiles/turkish';
import { indonesianProfile } from '../src/generators/profiles/indonesian';
import { russianProfile } from '../src/generators/profiles/russian';
import { hindiProfile } from '../src/generators/profiles/hindi';
import { bengaliProfile } from '../src/generators/profiles/bengali';
import { thaiProfile } from '../src/generators/profiles/thai';
import { vietnameseProfile } from '../src/generators/profiles/vietnamese';
import { polishProfile } from '../src/generators/profiles/polish';
import { ukrainianProfile } from '../src/generators/profiles/ukrainian';
import { swahiliProfile } from '../src/generators/profiles/swahili';
import { quechuaProfile } from '../src/generators/profiles/quechua';
import { hebrewProfile } from '../src/generators/profiles/hebrew';
import { malayProfile } from '../src/generators/profiles/ms';
import { tagalogProfile } from '../src/generators/profiles/tl';

import type { LanguageProfile } from '../src/generators/profiles/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');
const DRY_RUN = process.argv.includes('--dry-run');

// All profiles
const ALL_PROFILES: LanguageProfile[] = [
  englishProfile, spanishProfile, portugueseProfile, frenchProfile, germanProfile,
  italianProfile, japaneseProfile, chineseProfile, koreanProfile, arabicProfile,
  turkishProfile, indonesianProfile, russianProfile, hindiProfile, bengaliProfile,
  thaiProfile, vietnameseProfile, polishProfile, ukrainianProfile, swahiliProfile,
  quechuaProfile, hebrewProfile, malayProfile, tagalogProfile,
];

// =============================================================================
// Build region -> languages map from profiles
// =============================================================================

function buildRegionMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const profile of ALL_PROFILES) {
    if (!profile.regions) continue;
    for (const region of profile.regions) {
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(profile.code);
    }
  }

  // Sort languages within each region
  for (const [, langs] of map) {
    langs.sort();
  }

  return map;
}

// =============================================================================
// Extract languages from existing bundle file
// =============================================================================

function extractBundleLanguages(filePath: string): string[] | null {
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');
  const langs: string[] = [];

  // Match: import './languages/xx';
  const importRegex = /import\s+['"]\.\/languages\/([a-z-]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    langs.push(match[1]);
  }

  return langs;
}

// =============================================================================
// Update bundle file's language imports
// =============================================================================

function updateBundleFile(filePath: string, expectedLangs: string[]): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the import block (all consecutive import './languages/xx' lines)
  const importBlockRegex = /((?:\/\/[^\n]*\n)*(?:import\s+['"]\.\/languages\/[a-z-]+['"];\n)+)/g;
  const blocks: { start: number; end: number; text: string }[] = [];
  let m;
  while ((m = importBlockRegex.exec(content)) !== null) {
    blocks.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }

  if (blocks.length === 0) {
    console.log(`  WARN: No language import block found in ${path.basename(filePath)}`);
    return false;
  }

  // Generate new import block
  const newImports = expectedLangs.map(l => `import './languages/${l}';`).join('\n') + '\n';

  // Replace the first import block (which is the language registration section)
  // Preserve any comment lines before the imports
  const firstBlock = blocks[0];
  const commentLines = firstBlock.text.split('\n').filter(l => l.startsWith('//'));
  const prefix = commentLines.length > 0 ? commentLines.join('\n') + '\n' : '';

  const newContent = content.slice(0, firstBlock.start) + prefix + newImports + content.slice(firstBlock.end);

  // Also update SUPPORTED_LANGUAGES array
  const langArrayStr = expectedLangs.map(l => `'${l}'`).join(', ');
  const updatedContent = newContent.replace(
    /const SUPPORTED_LANGUAGES\s*=\s*\[[\s\S]*?\]\s*as\s*const/,
    `const SUPPORTED_LANGUAGES = [${langArrayStr}] as const`
  );

  if (updatedContent === content) {
    return false; // No changes
  }

  if (!DRY_RUN) {
    fs.writeFileSync(filePath, updatedContent);
  }
  return true;
}

// =============================================================================
// Main
// =============================================================================

console.log('=== Generate/Validate Bundle Entries ===\n');

if (DRY_RUN) {
  console.log('[DRY RUN MODE]\n');
}

const regionMap = buildRegionMap();

console.log('Region -> Language mapping from profiles:');
for (const [region, langs] of regionMap) {
  console.log(`  ${region}: ${langs.join(', ')}`);
}
console.log();

let updates = 0;
let mismatches = 0;

for (const [region, expectedLangs] of regionMap) {
  const bundleFile = path.join(SRC_DIR, `browser-${region}.ts`);
  const existingLangs = extractBundleLanguages(bundleFile);

  if (existingLangs === null) {
    console.log(`  NEW   browser-${region}.ts -- no file exists yet`);
    console.log(`        Languages: ${expectedLangs.join(', ')}`);
    console.log(`        (Create manually from browser-western.ts template)`);
    mismatches++;
    continue;
  }

  const existingSet = new Set(existingLangs);
  const expectedSet = new Set(expectedLangs);

  const missing = expectedLangs.filter(l => !existingSet.has(l));
  const extra = existingLangs.filter(l => !expectedSet.has(l));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  OK    browser-${region}.ts -- ${existingLangs.length} languages match`);
  } else {
    console.log(`  DIFF  browser-${region}.ts`);
    if (missing.length) console.log(`        Missing: ${missing.join(', ')}`);
    if (extra.length) console.log(`        Extra:   ${extra.join(', ')}`);

    const changed = updateBundleFile(bundleFile, expectedLangs);
    if (changed) {
      console.log(`        ${DRY_RUN ? 'Would update' : 'Updated'} imports and SUPPORTED_LANGUAGES`);
      updates++;
    }
    mismatches++;
  }
}

console.log(`\nSummary: ${regionMap.size} regions, ${mismatches} mismatches, ${updates} ${DRY_RUN ? 'would update' : 'updated'}`);
