#!/usr/bin/env node
/**
 * Language Bundle Generator
 *
 * Generates minimal language-specific bundles for HyperFixi Semantic.
 *
 * Usage:
 *   node scripts/generate-bundle.mjs es           # Spanish-only
 *   node scripts/generate-bundle.mjs es pt        # Spanish + Portuguese
 *   node scripts/generate-bundle.mjs --group western  # Predefined group
 *   node scripts/generate-bundle.mjs --auto es pt # Auto-update config files
 *   node scripts/generate-bundle.mjs --list       # List all languages
 *   node scripts/generate-bundle.mjs --dry-run es # Preview without writing
 *   node scripts/generate-bundle.mjs --estimate ja ko zh  # Show size estimate
 *
 * Language Groups:
 *   --group western      en, es, pt, fr, de
 *   --group east-asian   ja, zh, ko
 *   --group priority     en, es, pt, fr, de, ja, zh, ko, ar, tr, id
 *   --group all          All 13 languages
 *
 * Output:
 *   - src/browser-{codes}.ts          Entry point
 *   - dist/browser-{codes}.{codes}.global.js   (after build)
 *
 * With --auto:
 *   - Auto-updates tsup.config.ts
 *   - Auto-updates package.json exports
 *
 * After generating, run `npm run build` to create the bundle.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');

// All supported languages with metadata
const LANGUAGES = {
  en: { name: 'English', profile: 'englishProfile', tokenizer: 'englishTokenizer' },
  es: { name: 'Spanish', profile: 'spanishProfile', tokenizer: 'spanishTokenizer' },
  ja: { name: 'Japanese', profile: 'japaneseProfile', tokenizer: 'japaneseTokenizer' },
  ar: { name: 'Arabic', profile: 'arabicProfile', tokenizer: 'arabicTokenizer' },
  ko: { name: 'Korean', profile: 'koreanProfile', tokenizer: 'koreanTokenizer' },
  zh: { name: 'Chinese', profile: 'chineseProfile', tokenizer: 'chineseTokenizer' },
  tr: { name: 'Turkish', profile: 'turkishProfile', tokenizer: 'turkishTokenizer' },
  pt: { name: 'Portuguese', profile: 'portugueseProfile', tokenizer: 'portugueseTokenizer' },
  fr: { name: 'French', profile: 'frenchProfile', tokenizer: 'frenchTokenizer' },
  de: { name: 'German', profile: 'germanProfile', tokenizer: 'germanTokenizer' },
  id: { name: 'Indonesian', profile: 'indonesianProfile', tokenizer: 'indonesianTokenizer' },
  qu: { name: 'Quechua', profile: 'quechuaProfile', tokenizer: 'quechuaTokenizer' },
  sw: { name: 'Swahili', profile: 'swahiliProfile', tokenizer: 'swahiliTokenizer' },
};

// Predefined language groups
const LANGUAGE_GROUPS = {
  western: ['en', 'es', 'pt', 'fr', 'de'],
  'east-asian': ['ja', 'zh', 'ko'],
  priority: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id'],
  all: ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id', 'qu', 'sw'],
};

// Approximate bundle sizes (KB) for each language - based on actual measurements
const SIZES = {
  en: 25, es: 22, ja: 28, ar: 24, ko: 22, zh: 20,
  tr: 20, pt: 22, fr: 22, de: 24, id: 18, qu: 16, sw: 18,
  base: 45, // Core parsing infrastructure
};

// Gzip compression ratio (approximate)
const GZIP_RATIO = 0.35;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    list: false,
    auto: false,
    estimate: false,
    group: null,
    languages: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--list') {
      options.list = true;
    } else if (arg === '--auto') {
      options.auto = true;
    } else if (arg === '--estimate') {
      options.estimate = true;
    } else if (arg === '--group') {
      const group = args[++i];
      if (!LANGUAGE_GROUPS[group]) {
        console.error(`Unknown group: ${group}`);
        console.error(`Available groups: ${Object.keys(LANGUAGE_GROUPS).join(', ')}`);
        process.exit(1);
      }
      options.group = group;
      options.languages = [...LANGUAGE_GROUPS[group]];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    } else if (LANGUAGES[arg]) {
      options.languages.push(arg);
    } else {
      console.error(`Unknown language: ${arg}`);
      console.error(`Available: ${Object.keys(LANGUAGES).join(', ')}`);
      process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Language Bundle Generator for HyperFixi Semantic

Usage:
  node scripts/generate-bundle.mjs <lang1> [lang2] [lang3] ...
  node scripts/generate-bundle.mjs --group <group-name>
  node scripts/generate-bundle.mjs --auto <langs>
  node scripts/generate-bundle.mjs --list
  node scripts/generate-bundle.mjs --dry-run <langs>
  node scripts/generate-bundle.mjs --estimate <langs>

Options:
  --list         List all available languages with sizes
  --group <name> Use predefined language group
  --auto         Auto-update tsup.config.ts and package.json
  --estimate     Show size estimate without generating
  --dry-run      Preview generated files without writing
  --help, -h     Show this help message

Language Groups:
  western        en, es, pt, fr, de (~30 KB gzip)
  east-asian     ja, zh, ko (~24 KB gzip)
  priority       11 priority languages (~48 KB gzip)
  all            All 13 languages (~61 KB gzip)

Examples:
  node scripts/generate-bundle.mjs es              # Spanish-only
  node scripts/generate-bundle.mjs --group western # Western languages
  node scripts/generate-bundle.mjs --auto es pt    # Auto-configure Spanish + Portuguese
  node scripts/generate-bundle.mjs --estimate ja ko zh  # Preview East Asian size

Available Languages:
${Object.entries(LANGUAGES).map(([code, { name }]) => `  ${code.padEnd(4)} ${name}`).join('\n')}
`);
}

function printLanguageList() {
  console.log('\nAvailable Languages:\n');
  console.log('Code  Name          Est. Size    Gzip');
  console.log('----  ----          ---------    ----');
  for (const [code, { name }] of Object.entries(LANGUAGES)) {
    const size = SIZES[code] || 22;
    const total = SIZES.base + size;
    const gzip = Math.round(total * GZIP_RATIO);
    console.log(`${code.padEnd(6)}${name.padEnd(14)}~${total.toString().padStart(3)} KB     ~${gzip} KB`);
  }
  console.log('\nPredefined Groups:\n');
  for (const [name, langs] of Object.entries(LANGUAGE_GROUPS)) {
    const total = estimateSize(langs);
    const gzip = Math.round(total * GZIP_RATIO);
    console.log(`  ${name.padEnd(12)} ${langs.join(', ').padEnd(40)} ~${total} KB (~${gzip} KB gzip)`);
  }
  console.log();
}

function generateBundleId(languages) {
  return languages.sort().join('-');
}

function generateGlobalName(languages) {
  const names = languages.map(lang =>
    lang.charAt(0).toUpperCase() + lang.slice(1)
  );
  return `HyperFixiSemantic${names.join('')}`;
}

function estimateSize(languages) {
  let size = SIZES.base;
  for (const lang of languages) {
    size += SIZES[lang] || 22;
  }
  return size;
}

function printSizeEstimate(languages) {
  const bundleId = generateBundleId(languages);
  const langNames = languages.map(l => LANGUAGES[l].name).join(' + ');
  const size = estimateSize(languages);
  const gzip = Math.round(size * GZIP_RATIO);

  console.log(`\nSize Estimate: ${langNames}\n`);
  console.log('   Bundle ID:', bundleId);
  console.log('   Languages:', languages.length);
  console.log(`   Raw size:  ~${size} KB`);
  console.log(`   Gzip size: ~${gzip} KB`);
  console.log();

  // Show breakdown
  console.log('   Breakdown:');
  console.log(`     Base infrastructure: ~${SIZES.base} KB`);
  for (const lang of languages) {
    console.log(`     ${LANGUAGES[lang].name.padEnd(12)}: ~${SIZES[lang] || 22} KB`);
  }
  console.log();

  // Compare to alternatives
  console.log('   Comparison:');
  console.log(`     Full bundle (13 langs): ~${estimateSize(LANGUAGE_GROUPS.all)} KB (~${Math.round(estimateSize(LANGUAGE_GROUPS.all) * GZIP_RATIO)} KB gzip)`);
  console.log(`     This bundle:            ~${size} KB (~${gzip} KB gzip)`);
  console.log(`     Savings:                ~${estimateSize(LANGUAGE_GROUPS.all) - size} KB (${Math.round((1 - size / estimateSize(LANGUAGE_GROUPS.all)) * 100)}%)`);
  console.log();
}

// Language code to tokenizer file name mapping
const TOKENIZER_FILE_MAP = {
  en: 'english', es: 'spanish', ja: 'japanese', ar: 'arabic',
  ko: 'korean', zh: 'chinese', tr: 'turkish', pt: 'portuguese',
  fr: 'french', de: 'german', id: 'indonesian', qu: 'quechua', sw: 'swahili'
};

function generateEntryPoint(languages) {
  const bundleId = generateBundleId(languages);
  const langList = languages.join(', ');
  const langNames = languages.map(l => LANGUAGES[l].name).join(' + ');
  const isSingle = languages.length === 1;
  const lang = languages[0];

  // Generate imports
  const imports = languages.map(l => `import './languages/${l}';`).join('\n');

  // Generate tokenizer exports
  const tokenizerExports = languages
    .map(l => `export { ${LANGUAGES[l].tokenizer} } from './tokenizers/${TOKENIZER_FILE_MAP[l]}';`)
    .join('\n');

  // Generate profile exports
  const profileExports = languages
    .map(l => `export { ${LANGUAGES[l].profile} } from './generators/language-profiles';`)
    .join('\n');

  // Generate validation logic
  const supportedArray = `['${languages.join("', '")}']`;
  const validationCondition = isSingle
    ? `language !== '${lang}'`
    : `!SUPPORTED_LANGUAGES.includes(language as typeof SUPPORTED_LANGUAGES[number])`;

  return `/**
 * ${langNames} Browser Bundle Entry Point
 *
 * ${isSingle ? 'Minimal single-language bundle' : `Minimal bundle supporting ${langNames}`}.
 * Estimated size: ~${estimateSize(languages)} KB (~${Math.round(estimateSize(languages) * GZIP_RATIO)} KB gzip)
 *
 * @example
 * \`\`\`html
 * <script src="hyperfixi-semantic.${bundleId}.global.js"></script>
 * <script>
 *   const ast = ${generateGlobalName(languages)}.parse('${isSingle && lang === 'es' ? 'alternar .activo' : 'toggle .active'}', '${lang}');
 * </script>
 * \`\`\`
 */

// =============================================================================
// Register Languages: ${langList}
// =============================================================================

${imports}

// =============================================================================
// Version
// =============================================================================

export const VERSION = '1.0.0-${bundleId}';

// =============================================================================
// Supported Languages
// =============================================================================

const SUPPORTED_LANGUAGES = ${supportedArray} as const;

/**
 * Get all supported languages in this bundle.
 */
export function getSupportedLanguages(): string[] {
  return [...SUPPORTED_LANGUAGES];
}

/**
 * Validate that a language is supported by this bundle.
 */
function validateLanguage(language: string): void {
  if (${validationCondition}) {
    throw new Error(
      \`Language not supported in this bundle: \${language}. \` +
      \`Supported: ${langList}\`
    );
  }
}

// =============================================================================
// Tokenizers (from registry)
// =============================================================================

export {
  getTokenizer,
  isLanguageSupported,
} from './registry';

import type { LanguageToken } from './types';
import { tokenize as tokenizeInternal } from './tokenizers';

/**
 * Tokenize input and return array of tokens (browser-friendly wrapper).
 */
export function tokenize(input: string, language: string): LanguageToken[] {
  validateLanguage(language);
  const stream = tokenizeInternal(input, language);
  return [...stream.tokens];
}

// Re-export tokenizers
${tokenizerExports}

// =============================================================================
// Patterns (from registry - lazy generation)
// =============================================================================

import { getPatternsForLanguage as getPatternsFromRegistry } from './registry';
import type { LanguagePattern, ActionType } from './types';

/**
 * Get all patterns for a language.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  validateLanguage(language);
  return getPatternsFromRegistry(language);
}

/**
 * Get patterns for a language and specific command.
 */
export function getPatternsForLanguageAndCommand(
  language: string,
  command: ActionType
): LanguagePattern[] {
  return getPatternsForLanguage(language)
    .filter(p => p.command === command)
    .sort((a, b) => b.priority - a.priority);
}

// =============================================================================
// Language Profiles (from registry)
// =============================================================================

export { getProfile, tryGetProfile } from './registry';
${profileExports}

// =============================================================================
// Parsing
// =============================================================================

export { parse, canParse } from './parser';
export { parseAny, parseExplicit, isExplicitSyntax } from './explicit';

// =============================================================================
// Rendering
// =============================================================================

export { render, renderExplicit, toExplicit, fromExplicit } from './explicit';

// =============================================================================
// AST Builder
// =============================================================================

export { buildAST, ASTBuilder, getCommandMapper, registerCommandMapper } from './ast-builder';

// =============================================================================
// Semantic Analyzer (for core parser integration)
// =============================================================================

export {
  createSemanticAnalyzer,
  SemanticAnalyzerImpl,
  shouldUseSemanticResult,
  DEFAULT_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
} from './core-bridge';

export type { SemanticAnalyzer, SemanticAnalysisResult } from './core-bridge';

// =============================================================================
// Type Helpers
// =============================================================================

export {
  createSelector,
  createLiteral,
  createReference,
  createPropertyPath,
  createCommandNode,
  createEventHandler,
} from './types';

// =============================================================================
// Types
// =============================================================================

export type {
  ActionType,
  SemanticRole,
  SemanticValue,
  SemanticNode,
  LanguageToken,
  TokenStream,
} from './types';
`;
}

function generateTsupConfigEntry(languages) {
  const bundleId = generateBundleId(languages);
  const globalName = generateGlobalName(languages);
  const langNames = languages.map(l => LANGUAGES[l].name).join(' + ');

  return `  // ${langNames} browser bundle (IIFE)
  // Output: hyperfixi-semantic.browser-${bundleId}.${bundleId}.global.js
  // Generated by: node scripts/generate-bundle.mjs ${languages.join(' ')}
  {
    entry: ['src/browser-${bundleId}.ts'],
    outDir: 'dist',
    format: ['iife'],
    globalName: '${globalName}',
    minify: true,
    sourcemap: false,
    platform: 'browser',
    noExternal: ['@hyperfixi/i18n'],
    outExtension() {
      return { js: '.${bundleId}.global.js' };
    },
    esbuildOptions(options) {
      options.target = 'es2020';
      options.treeShaking = true;
    },
  },`;
}

function generatePackageExport(languages) {
  const bundleId = generateBundleId(languages);
  return `    "./browser/${bundleId}": {
      "default": "./dist/browser-${bundleId}.${bundleId}.global.js"
    }`;
}

function updateTsupConfig(languages) {
  const configPath = join(PACKAGE_ROOT, 'tsup.config.ts');
  let content = readFileSync(configPath, 'utf-8');

  const bundleId = generateBundleId(languages);
  const entryMarker = `['src/browser-${bundleId}.ts']`;

  // Check if this bundle already exists
  if (content.includes(entryMarker)) {
    return { updated: false, message: 'Bundle already exists in tsup.config.ts' };
  }

  // Find the insertion point: before "// Individual language modules"
  const insertMarker = '  // Individual language modules';
  const insertIndex = content.indexOf(insertMarker);

  if (insertIndex === -1) {
    return { updated: false, message: 'Could not find insertion point in tsup.config.ts' };
  }

  // Insert the new config entry
  const newEntry = generateTsupConfigEntry(languages) + '\n';
  content = content.slice(0, insertIndex) + newEntry + content.slice(insertIndex);

  writeFileSync(configPath, content);
  return { updated: true, message: 'Updated tsup.config.ts' };
}

function updatePackageJson(languages) {
  const packagePath = join(PACKAGE_ROOT, 'package.json');
  const content = readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content);

  const bundleId = generateBundleId(languages);
  const exportKey = `./browser/${bundleId}`;

  // Check if this export already exists
  if (pkg.exports && pkg.exports[exportKey]) {
    return { updated: false, message: 'Export already exists in package.json' };
  }

  // Add the new export
  if (!pkg.exports) {
    pkg.exports = {};
  }

  pkg.exports[exportKey] = {
    default: `./dist/browser-${bundleId}.${bundleId}.global.js`
  };

  // Write back with formatting
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  return { updated: true, message: 'Updated package.json exports' };
}

function main() {
  const options = parseArgs();

  if (options.list) {
    printLanguageList();
    return;
  }

  if (options.languages.length === 0) {
    console.error('Error: Please specify at least one language code or --group <name>.');
    console.error('Use --list to see available languages or --help for usage.');
    process.exit(1);
  }

  const languages = [...new Set(options.languages)]; // Remove duplicates
  const bundleId = generateBundleId(languages);
  const entryPath = join(PACKAGE_ROOT, 'src', `browser-${bundleId}.ts`);

  // Handle estimate-only mode
  if (options.estimate) {
    printSizeEstimate(languages);
    return;
  }

  console.log(`\nGenerating ${languages.map(l => LANGUAGES[l].name).join(' + ')} bundle\n`);
  console.log(`   Bundle ID: ${bundleId}`);
  console.log(`   Global name: ${generateGlobalName(languages)}`);
  console.log(`   Estimated size: ~${estimateSize(languages)} KB (~${Math.round(estimateSize(languages) * GZIP_RATIO)} KB gzip)`);
  console.log(`   Entry point: src/browser-${bundleId}.ts`);
  console.log(`   Output: dist/browser-${bundleId}.${bundleId}.global.js\n`);

  // Check if already exists
  if (existsSync(entryPath) && !options.dryRun) {
    console.log(`Entry point already exists: src/browser-${bundleId}.ts`);

    if (options.auto) {
      console.log('   Checking config files...\n');
      const tsupResult = updateTsupConfig(languages);
      const pkgResult = updatePackageJson(languages);
      console.log(`   ${tsupResult.updated ? '[OK]' : '[INFO]'} ${tsupResult.message}`);
      console.log(`   ${pkgResult.updated ? '[OK]' : '[INFO]'} ${pkgResult.message}`);
      if (!tsupResult.updated && !pkgResult.updated) {
        console.log('\n   Bundle is already fully configured.\n');
      } else {
        console.log('\n   Run `npm run build` to create the bundle.\n');
      }
    } else {
      console.log('   To regenerate, delete the file first.\n');
    }
    return;
  }

  // Generate entry point
  const entryContent = generateEntryPoint(languages);

  if (options.dryRun) {
    console.log('--- Entry Point (src/browser-' + bundleId + '.ts) ---\n');
    console.log(entryContent);
    console.log('\n--- tsup.config.ts addition ---\n');
    console.log(generateTsupConfigEntry(languages));
    console.log('\n--- package.json export addition ---\n');
    console.log(generatePackageExport(languages));
    console.log('\n[Dry run - no files written]\n');
    return;
  }

  // Write entry point
  writeFileSync(entryPath, entryContent);
  console.log(`Created: src/browser-${bundleId}.ts`);

  // Auto mode: update config files
  if (options.auto) {
    const tsupResult = updateTsupConfig(languages);
    const pkgResult = updatePackageJson(languages);
    console.log(`${tsupResult.updated ? '[OK]' : '[INFO]'} ${tsupResult.message}`);
    console.log(`${pkgResult.updated ? '[OK]' : '[INFO]'} ${pkgResult.message}`);
    console.log(`
Next steps:

   npm run build

   Verify bundle size:
   ls -la dist/browser-${bundleId}.${bundleId}.global.js
`);
  } else {
    // Show manual steps
    console.log(`
Next steps:

1. Add to tsup.config.ts (before "// Individual language modules"):
${generateTsupConfigEntry(languages)}

2. Add to package.json exports:
${generatePackageExport(languages)}

3. Build the bundle:
   npm run build

4. Verify bundle size:
   ls -la dist/browser-${bundleId}.${bundleId}.global.js

Tip: Use --auto to update config files automatically
`);
  }
}

main();
