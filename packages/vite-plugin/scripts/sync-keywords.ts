#!/usr/bin/env npx ts-node
/**
 * Sync Keywords Script
 *
 * Synchronizes language keywords from @hyperfixi/semantic profiles to
 * vite-plugin's language-keywords.ts for detection.
 *
 * Usage:
 *   npm run sync-keywords
 *   npm run sync-keywords -- --dry-run
 *   npm run sync-keywords -- --language=ru
 *
 * This script:
 * 1. Reads language profiles from packages/semantic/src/generators/profiles/
 * 2. Extracts primary keywords and alternatives
 * 3. Updates packages/vite-plugin/src/language-keywords.ts
 *
 * Run after adding/modifying languages in the semantic package.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const SEMANTIC_PROFILES_DIR = path.resolve(__dirname, '../../semantic/src/generators/profiles');
const KEYWORDS_FILE = path.resolve(__dirname, '../src/language-keywords.ts');

// Keywords to extract for detection (most distinctive for language detection)
const DETECTION_KEYWORDS = [
  // Commands
  'toggle', 'add', 'remove', 'show', 'hide', 'set', 'increment', 'decrement',
  // Events
  'trigger', 'send',
  // Control flow
  'if', 'else', 'repeat', 'wait', 'while',
  // References
  'result',
  // Positional
  'first', 'last', 'next', 'previous',
];

// Languages that use non-Latin scripts (use simple includes for detection)
const NON_LATIN_LANGUAGES = ['ja', 'ko', 'zh', 'ar', 'ru', 'uk', 'hi', 'bn', 'th'];

// =============================================================================
// Parse Arguments
// =============================================================================

interface Args {
  dryRun: boolean;
  language?: string;
  help: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = { dryRun: false, help: false };

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg.startsWith('--language=')) {
      result.language = arg.split('=')[1];
    }
  }

  return result;
}

// =============================================================================
// Extract Keywords from Profile
// =============================================================================

function extractKeywordsFromProfile(profilePath: string): Set<string> | null {
  if (!fs.existsSync(profilePath)) {
    return null;
  }

  const content = fs.readFileSync(profilePath, 'utf-8');
  const keywords = new Set<string>();

  // Parse keywords section using regex (simpler than full TS parsing)
  for (const keyword of DETECTION_KEYWORDS) {
    // Match: keyword: { primary: 'X', alternatives: ['Y', 'Z'] }
    const primaryMatch = content.match(new RegExp(`${keyword}:\\s*\\{[^}]*primary:\\s*['"]([^'"]+)['"]`));
    if (primaryMatch && primaryMatch[1] !== 'TODO') {
      keywords.add(primaryMatch[1]);
    }

    // Extract alternatives
    const altMatch = content.match(new RegExp(`${keyword}:\\s*\\{[^}]*alternatives:\\s*\\[([^\\]]+)\\]`));
    if (altMatch) {
      const alts = altMatch[1].match(/['"]([^'"]+)['"]/g);
      if (alts) {
        for (const alt of alts) {
          const cleaned = alt.replace(/['"]/g, '');
          if (cleaned !== 'TODO') {
            keywords.add(cleaned);
          }
        }
      }
    }
  }

  return keywords.size > 0 ? keywords : null;
}

// =============================================================================
// Update Keywords File
// =============================================================================

function updateKeywordsFile(
  languageUpdates: Map<string, { name: string; keywords: Set<string>; isNonLatin: boolean }>
): void {
  let content = fs.readFileSync(KEYWORDS_FILE, 'utf-8');

  for (const [code, { name, keywords, isNonLatin }] of languageUpdates) {
    const upperCode = code.toUpperCase();
    const keywordArray = [...keywords].map(k => `'${k}'`);

    // Format keywords nicely
    let keywordString: string;
    if (keywordArray.join(', ').length > 60) {
      // Multi-line format
      keywordString = keywordArray.join(',\n  ');
    } else {
      keywordString = keywordArray.join(', ');
    }

    // Find existing keyword set and update it
    const existingSetRegex = new RegExp(
      `export const ${upperCode}_KEYWORDS = new Set\\(\\[[\\s\\S]*?\\]\\);`,
      'g'
    );

    const existingMatch = content.match(existingSetRegex);
    if (existingMatch) {
      const scriptType = isNonLatin ? 'non-Latin script' : 'Latin script';
      const newSet = `export const ${upperCode}_KEYWORDS = new Set([
  ${keywordString}
]);`;

      // Also update the comment
      const commentRegex = new RegExp(
        `\\/\\*\\*\\n \\* ${name} keywords[^*]*\\*\\/\\nexport const ${upperCode}_KEYWORDS`,
        'g'
      );
      const commentMatch = content.match(commentRegex);

      if (commentMatch) {
        content = content.replace(
          commentMatch[0],
          `/**
 * ${name} keywords (${scriptType}).
 * Auto-synced from semantic profile.
 */
export const ${upperCode}_KEYWORDS`
        );
      }

      content = content.replace(existingSetRegex, newSet);
      console.log(`  [UPDATED] ${code} (${name}): ${keywords.size} keywords`);
    } else {
      console.log(`  [SKIP] ${code}: No existing keyword set found (add language first)`);
    }
  }

  fs.writeFileSync(KEYWORDS_FILE, content);
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const args = parseArgs();

  if (args.help) {
    console.log(`
Sync Keywords Script

Usage:
  npm run sync-keywords               # Sync all languages
  npm run sync-keywords -- --dry-run  # Preview changes without writing
  npm run sync-keywords -- --language=ru  # Sync specific language

This script synchronizes keywords from semantic package profiles
to the vite-plugin's language-keywords.ts file.

It reads the 'keywords' section from each profile and extracts
the primary and alternative keywords for detection.
`);
    return;
  }

  console.log('Syncing keywords from semantic profiles...\n');

  // Find all profile files
  const profileFiles = fs.readdirSync(SEMANTIC_PROFILES_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts');

  const languageUpdates = new Map<string, { name: string; keywords: Set<string>; isNonLatin: boolean }>();

  for (const file of profileFiles) {
    const code = file.replace('.ts', '');

    // Skip if specific language requested and this isn't it
    if (args.language && code !== args.language) {
      continue;
    }

    const profilePath = path.join(SEMANTIC_PROFILES_DIR, file);
    const keywords = extractKeywordsFromProfile(profilePath);

    if (!keywords || keywords.size === 0) {
      console.log(`  [SKIP] ${code}: No valid keywords found (may be TODO)`);
      continue;
    }

    // Get language info from profile
    const content = fs.readFileSync(profilePath, 'utf-8');
    const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
    const name = nameMatch ? nameMatch[1] : code.toUpperCase();

    // Check if non-Latin
    const isNonLatin = NON_LATIN_LANGUAGES.includes(code);

    languageUpdates.set(code, { name, keywords, isNonLatin });
  }

  console.log(`\nFound ${languageUpdates.size} languages with keywords to sync.`);

  if (languageUpdates.size === 0) {
    console.log('\nNo languages to update.');
    return;
  }

  if (args.dryRun) {
    console.log('\n[DRY RUN] Would update:');
    for (const [code, { name, keywords }] of languageUpdates) {
      console.log(`  - ${code} (${name}): ${keywords.size} keywords`);
    }
    console.log('\nTo apply changes, run without --dry-run');
  } else {
    console.log('\nUpdating language-keywords.ts...');
    updateKeywordsFile(languageUpdates);
    console.log('\nDone! Run "npm run typecheck" to verify.');
  }
}

main();
