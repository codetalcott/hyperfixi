#!/usr/bin/env npx ts-node
/**
 * Sync Keywords Script
 *
 * Synchronizes language keywords from @lokascript/semantic profiles to
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
import * as prettier from 'prettier';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// Configuration
// =============================================================================

const SEMANTIC_PROFILES_DIR = path.resolve(__dirname, '../../semantic/src/generators/profiles');
// Render vocabulary lives alongside the profiles rather than inside them, so it
// can be tree-shaken out of parse-only bundles (see semantic/src/lexicon-registry.ts).
// Detection still wants those words — `resultado`/`最初`/`первый` mark a file as
// non-English just as well as a command verb does — so both files are scraped.
const SEMANTIC_LEXICONS_DIR = path.resolve(__dirname, '../../semantic/src/lexicons');
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
const NON_LATIN_LANGUAGES = ['ja', 'ko', 'zh', 'ar', 'he', 'ru', 'uk', 'hi', 'bn', 'th'];

// The semantic profiles dir mixes full-name filenames (arabic.ts, spanish.ts)
// with ISO-code filenames (he.ts, ms.ts, tl.ts). The keyword Set constants in
// language-keywords.ts track the FILENAME (SPANISH_KEYWORDS, HE_KEYWORDS), but
// the --language= filter and the NON_LATIN_LANGUAGES check expect ISO codes —
// without this map, `--language=ru` silently never matched russian.ts and
// isNonLatin was wrong for 9 of the 10 non-Latin languages.
const FILENAME_TO_ISO: Record<string, string> = {
  arabic: 'ar',
  bengali: 'bn',
  chinese: 'zh',
  english: 'en',
  french: 'fr',
  german: 'de',
  he: 'he',
  hindi: 'hi',
  indonesian: 'id',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  ms: 'ms',
  polish: 'pl',
  portuguese: 'pt',
  quechua: 'qu',
  russian: 'ru',
  spanish: 'es',
  swahili: 'sw',
  thai: 'th',
  tl: 'tl',
  turkish: 'tr',
  ukrainian: 'uk',
  vietnamese: 'vi',
};

// =============================================================================
// Parse Arguments
// =============================================================================

interface Args {
  dryRun: boolean;
  check: boolean;
  language?: string;
  help: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const result: Args = { dryRun: false, check: false, help: false };

  for (const arg of args) {
    if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--check') {
      result.check = true;
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

  // The lexicon module for the same language, when present, is scraped as part
  // of the profile: the two together are what used to be one file.
  const code = path.basename(profilePath, '.ts');
  const lexiconPath = path.join(SEMANTIC_LEXICONS_DIR, `${FILENAME_TO_ISO[code] ?? code}.ts`);
  const content =
    fs.readFileSync(profilePath, 'utf-8') +
    (fs.existsSync(lexiconPath) ? `\n${fs.readFileSync(lexiconPath, 'utf-8')}` : '');
  const keywords = new Set<string>();

  // Non-distinctive values (English command names or TODO stubs) that must not
  // be copied into a non-English detection set, because they'd match English
  // source and produce false-positive language detection.
  const ENGLISH_COMMAND_NAMES = new Set(DETECTION_KEYWORDS);
  const isDistinctive = (value: string) =>
    value !== 'TODO' && !ENGLISH_COMMAND_NAMES.has(value);

  // Parse keywords section using regex (simpler than full TS parsing)
  for (const keyword of DETECTION_KEYWORDS) {
    // Match: keyword: { primary: 'X', alternatives: ['Y', 'Z'] }
    const primaryMatch = content.match(new RegExp(`${keyword}:\\s*\\{[^}]*primary:\\s*['"]([^'"]+)['"]`));
    if (primaryMatch && isDistinctive(primaryMatch[1])) {
      keywords.add(primaryMatch[1]);
    }

    // Extract alternatives
    const altMatch = content.match(new RegExp(`${keyword}:\\s*\\{[^}]*alternatives:\\s*\\[([^\\]]+)\\]`));
    if (altMatch) {
      const alts = altMatch[1].match(/['"]([^'"]+)['"]/g);
      if (alts) {
        for (const alt of alts) {
          const cleaned = alt.replace(/['"]/g, '');
          if (isDistinctive(cleaned)) {
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

/**
 * Rewrite the keyword sets and return the formatted file content.
 *
 * Formatting with the repo's prettier config is what makes a regeneration
 * byte-idempotent: the raw regex splice emits one keyword per line with
 * trailing-comma choices prettier then rewrites, so every sync used to produce
 * a diff full of formatting noise on top of the real vocabulary change. That
 * noise is why this was rarely run and the file drifted across all 24 languages.
 */
async function buildKeywordsFile(
  languageUpdates: Map<string, { name: string; keywords: Set<string>; isNonLatin: boolean }>
): Promise<string> {
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

    // Find existing keyword set and update it.
    // Match `new Set([...])` and `new Set<string>([...])` — the latter is
    // needed for empty stub sets where the explicit generic prevents
    // `Set<never>` inference.
    const existingSetRegex = new RegExp(
      `export const ${upperCode}_KEYWORDS = new Set(?:<[^>]+>)?\\(\\[[\\s\\S]*?\\]\\);`,
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

  const prettierConfig = await prettier.resolveConfig(KEYWORDS_FILE);
  return prettier.format(content, {
    ...prettierConfig,
    filepath: KEYWORDS_FILE,
    parser: 'typescript',
  });
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
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

  // Find all profile files (marker-templates.ts is shared tooling, not a language)
  const profileFiles = fs.readdirSync(SEMANTIC_PROFILES_DIR)
    .filter(
      f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts' && f !== 'marker-templates.ts'
    );

  const languageUpdates = new Map<string, { name: string; keywords: Set<string>; isNonLatin: boolean }>();

  for (const file of profileFiles) {
    // `code` (the filename base) names the Set constant in language-keywords.ts;
    // `isoCode` is what --language= filtering and script classification use.
    const code = file.replace('.ts', '');
    const isoCode = FILENAME_TO_ISO[code] ?? code;

    // Skip if specific language requested and this isn't it (accept either
    // the ISO code or the profile filename)
    if (args.language && isoCode !== args.language && code !== args.language) {
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

    // Check if non-Latin (by ISO code, not filename)
    const isNonLatin = NON_LATIN_LANGUAGES.includes(isoCode);

    languageUpdates.set(code, { name, keywords, isNonLatin });
  }

  console.log(`\nFound ${languageUpdates.size} languages with keywords to sync.`);

  if (languageUpdates.size === 0) {
    console.log('\nNo languages to update.');
    return;
  }

  if (args.check) {
    const expected = await buildKeywordsFile(languageUpdates);
    const committed = fs.readFileSync(KEYWORDS_FILE, 'utf-8');
    if (committed !== expected) {
      console.error(
        `\n✗ ${path.relative(process.cwd(), KEYWORDS_FILE)} is stale.\n` +
          `  The semantic language profiles changed without re-syncing.\n` +
          `  Run: npm run sync-keywords --prefix packages/vite-plugin\n`
      );
      process.exit(1);
    }
    console.log(`\n✓ ${path.relative(process.cwd(), KEYWORDS_FILE)} is up to date`);
  } else if (args.dryRun) {
    console.log('\n[DRY RUN] Would update:');
    for (const [code, { name, keywords }] of languageUpdates) {
      console.log(`  - ${code} (${name}): ${keywords.size} keywords`);
    }
    console.log('\nTo apply changes, run without --dry-run');
  } else {
    console.log('\nUpdating language-keywords.ts...');
    fs.writeFileSync(KEYWORDS_FILE, await buildKeywordsFile(languageUpdates));
    console.log('\nDone! Run "npm run typecheck" to verify.');
  }
}

await main();
