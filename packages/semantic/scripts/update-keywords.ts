#!/usr/bin/env npx ts-node
/**
 * Update Keywords CLI Tool
 *
 * Adds new keywords to all existing language profiles and i18n dictionaries.
 * Useful when adding new features like when/where modifiers.
 *
 * Usage:
 *   npm run update-keywords -- --keyword=when --after=if
 *   npm run update-keywords -- --keyword=where --after=when
 *   npm run update-keywords -- --list  # List all profiles
 *   npm run update-keywords -- --dry-run --keyword=when  # Preview changes
 *
 * Examples:
 *   # Add 'when' keyword after 'if' in all profiles
 *   npm run update-keywords -- --keyword=when --after=if
 *
 *   # Add 'where' keyword after 'when' in all profiles
 *   npm run update-keywords -- --keyword=where --after=when
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Configuration
// =============================================================================

const SEMANTIC_ROOT = path.join(__dirname, '..', 'src');
const PROFILES_DIR = path.join(SEMANTIC_ROOT, 'generators', 'profiles');
const I18N_ROOT = path.join(__dirname, '..', '..', 'i18n', 'src');
const DICTIONARIES_DIR = path.join(I18N_ROOT, 'dictionaries');

// Skip these files when processing profiles
const SKIP_FILES = ['index.ts', 'types.ts'];

// =============================================================================
// Types
// =============================================================================

interface UpdateConfig {
  keyword: string;
  after?: string;
  dryRun: boolean;
  listOnly: boolean;
  category: 'keywords' | 'logical';
}

// =============================================================================
// Argument Parsing
// =============================================================================

function parseArgs(): UpdateConfig {
  const args = process.argv.slice(2);
  const config: Partial<UpdateConfig> = {
    dryRun: false,
    listOnly: false,
    category: 'keywords',
  };

  for (const arg of args) {
    if (arg === '--list') {
      config.listOnly = true;
      continue;
    }
    if (arg === '--dry-run') {
      config.dryRun = true;
      continue;
    }

    const match = arg.match(/^--(\w+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      switch (key) {
        case 'keyword':
          config.keyword = value;
          break;
        case 'after':
          config.after = value;
          break;
        case 'category':
          if (value === 'keywords' || value === 'logical') {
            config.category = value;
          }
          break;
      }
    }
  }

  if (!config.listOnly && !config.keyword) {
    console.error(`Missing required argument: --keyword=<name>

Usage:
  npm run update-keywords -- --keyword=when --after=if
  npm run update-keywords -- --keyword=where --after=when
  npm run update-keywords -- --list
  npm run update-keywords -- --dry-run --keyword=when

Options:
  --keyword     Keyword to add (e.g., 'when', 'where')
  --after       Insert after this keyword (e.g., 'if')
  --category    'keywords' (profiles) or 'logical' (dictionaries)
  --dry-run     Preview changes without writing
  --list        List all language profiles
`);
    process.exit(1);
  }

  return config as UpdateConfig;
}

// =============================================================================
// Profile Helpers
// =============================================================================

function getProfileFiles(): string[] {
  if (!fs.existsSync(PROFILES_DIR)) {
    console.error(`Profiles directory not found: ${PROFILES_DIR}`);
    return [];
  }

  return fs
    .readdirSync(PROFILES_DIR)
    .filter((f) => f.endsWith('.ts') && !SKIP_FILES.includes(f))
    .map((f) => path.join(PROFILES_DIR, f));
}

function getDictionaryFiles(): string[] {
  if (!fs.existsSync(DICTIONARIES_DIR)) {
    console.warn(`Dictionaries directory not found: ${DICTIONARIES_DIR}`);
    return [];
  }

  return fs
    .readdirSync(DICTIONARIES_DIR)
    .filter((f) => f.endsWith('.ts') && !SKIP_FILES.includes(f) && f !== 'derive.ts')
    .map((f) => path.join(DICTIONARIES_DIR, f));
}

function getLanguageCode(filePath: string): string {
  return path.basename(filePath, '.ts');
}

// =============================================================================
// Update Logic
// =============================================================================

function addKeywordToProfile(content: string, keyword: string, afterKeyword?: string): string | null {
  // Check if keyword already exists
  const keywordRegex = new RegExp(`\\b${keyword}:\\s*\\{`);
  if (keywordRegex.test(content)) {
    return null; // Already exists
  }

  // Find the keywords section
  const keywordsMatch = content.match(/keywords:\s*\{/);
  if (!keywordsMatch) {
    return null; // No keywords section
  }

  // Build the new keyword entry
  const newEntry = `    ${keyword}: { primary: 'TODO', normalized: '${keyword}' },`;

  if (afterKeyword) {
    // Insert after specific keyword
    const afterRegex = new RegExp(
      `(${afterKeyword}:\\s*\\{[^}]+\\},?)`,
      'g'
    );

    if (afterRegex.test(content)) {
      return content.replace(afterRegex, `$1\n${newEntry}`);
    }
  }

  // Fallback: insert at the beginning of keywords section
  return content.replace(
    /keywords:\s*\{/,
    `keywords: {\n${newEntry}`
  );
}

function addKeywordToDictionary(content: string, keyword: string, afterKeyword?: string): string | null {
  // Check if keyword already exists in logical section
  const keywordRegex = new RegExp(`\\b${keyword}:\\s*['"]`);
  if (keywordRegex.test(content)) {
    return null; // Already exists
  }

  // Find the logical section
  const logicalMatch = content.match(/logical:\s*\{/);
  if (!logicalMatch) {
    return null; // No logical section
  }

  // Build the new keyword entry
  const newEntry = `    ${keyword}: 'TODO',`;

  if (afterKeyword) {
    // Insert after specific keyword in logical section
    const afterRegex = new RegExp(
      `(logical:\\s*\\{[^}]*${afterKeyword}:\\s*'[^']*',?)`,
      's'
    );

    const match = content.match(afterRegex);
    if (match) {
      return content.replace(match[0], `${match[0]}\n${newEntry}`);
    }
  }

  // Fallback: insert at the beginning of logical section
  return content.replace(
    /logical:\s*\{/,
    `logical: {\n${newEntry}`
  );
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const config = parseArgs();

  // List mode
  if (config.listOnly) {
    console.log('\n=== Semantic Language Profiles ===\n');
    const profiles = getProfileFiles();
    profiles.forEach((f) => {
      const code = getLanguageCode(f);
      console.log(`  ${code.padEnd(6)} ${f}`);
    });
    console.log(`\nTotal: ${profiles.length} profiles\n`);

    console.log('\n=== i18n Dictionaries ===\n');
    const dicts = getDictionaryFiles();
    dicts.forEach((f) => {
      const code = getLanguageCode(f);
      console.log(`  ${code.padEnd(6)} ${f}`);
    });
    console.log(`\nTotal: ${dicts.length} dictionaries\n`);
    return;
  }

  const { keyword, after, dryRun, category } = config;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Adding keyword: ${keyword}`);
  console.log(`  After: ${after || '(beginning)'}`);
  console.log(`  Category: ${category}`);
  console.log(`  Dry run: ${dryRun}`);
  console.log(`${'='.repeat(60)}\n`);

  // Process semantic profiles
  if (category === 'keywords') {
    console.log('Processing semantic profiles...\n');
    const profiles = getProfileFiles();
    let updated = 0;
    let skipped = 0;

    for (const filePath of profiles) {
      const code = getLanguageCode(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const newContent = addKeywordToProfile(content, keyword, after);

      if (newContent === null) {
        console.log(`  [skip] ${code} - keyword already exists or no keywords section`);
        skipped++;
      } else {
        if (dryRun) {
          console.log(`  [would update] ${code}`);
        } else {
          fs.writeFileSync(filePath, newContent, 'utf-8');
          console.log(`  [updated] ${code}`);
        }
        updated++;
      }
    }

    console.log(`\nProfiles: ${updated} updated, ${skipped} skipped\n`);
  }

  // Process i18n dictionaries
  if (category === 'logical') {
    console.log('Processing i18n dictionaries...\n');
    const dicts = getDictionaryFiles();
    let updated = 0;
    let skipped = 0;

    for (const filePath of dicts) {
      const code = getLanguageCode(filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      const newContent = addKeywordToDictionary(content, keyword, after);

      if (newContent === null) {
        console.log(`  [skip] ${code} - keyword already exists or no logical section`);
        skipped++;
      } else {
        if (dryRun) {
          console.log(`  [would update] ${code}`);
        } else {
          fs.writeFileSync(filePath, newContent, 'utf-8');
          console.log(`  [updated] ${code}`);
        }
        updated++;
      }
    }

    console.log(`\nDictionaries: ${updated} updated, ${skipped} skipped\n`);
  }

  if (dryRun) {
    console.log('Dry run complete. No files were modified.\n');
    console.log('Run without --dry-run to apply changes.\n');
  }
}

main();
