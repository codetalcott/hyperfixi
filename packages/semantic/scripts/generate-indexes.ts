#!/usr/bin/env npx tsx
/**
 * Generate Index Files
 *
 * Auto-generates barrel files from directory contents.
 * Run this before build to ensure all index files are in sync.
 *
 * Usage:
 *   npm run generate:indexes
 *
 * What it generates:
 *   - src/languages/_all.ts
 *   - src/tokenizers/index.ts (tokenizer re-exports section)
 *   - src/generators/profiles/index.ts
 *   - src/generators/language-profiles.ts
 *   - src/patterns/{command}/index.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// Configuration
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEMANTIC_SRC = path.resolve(__dirname, '../src');

/**
 * Language code to full name mapping.
 * Used to generate variable names (e.g., 'en' -> 'english' -> 'englishProfile').
 */
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'english',
  es: 'spanish',
  ja: 'japanese',
  ar: 'arabic',
  ko: 'korean',
  zh: 'chinese',
  tr: 'turkish',
  pt: 'portuguese',
  fr: 'french',
  de: 'german',
  he: 'hebrew',
  id: 'indonesian',
  qu: 'quechua',
  sw: 'swahili',
  it: 'italian',
  vi: 'vietnamese',
  pl: 'polish',
  ru: 'russian',
  uk: 'ukrainian',
  hi: 'hindi',
  bn: 'bengali',
  th: 'thai',
  ms: 'malay',
  tl: 'tagalog',
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get all .ts files in a directory, excluding specified files.
 */
function getLanguageFiles(dir: string, excludes: string[] = []): string[] {
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.ts') && !excludes.includes(f))
    .map(f => f.replace('.ts', ''))
    .sort();
  return files;
}

/**
 * Convert language code to profile variable name.
 * e.g., 'en' → 'englishProfile', 'ms' → 'malayProfile'
 */
function toProfileName(code: string): string {
  const name = LANGUAGE_NAMES[code] || code;
  return `${name}Profile`;
}

/**
 * Convert language code to tokenizer variable name.
 * e.g., 'en' → 'englishTokenizer', 'ms' → 'malayTokenizer'
 */
function toTokenizerName(code: string): string {
  const name = LANGUAGE_NAMES[code] || code;
  return `${name}Tokenizer`;
}

/**
 * Get file name (without extension) for a language in a specific directory.
 * Some directories use full names (english.ts), others use codes (en.ts).
 */
function getFileName(dir: string, code: string): string {
  const fullName = LANGUAGE_NAMES[code];
  const codePath = path.join(dir, `${code}.ts`);
  const fullNamePath = fullName ? path.join(dir, `${fullName}.ts`) : null;

  if (fs.existsSync(codePath)) return code;
  if (fullNamePath && fs.existsSync(fullNamePath)) return fullName!;
  return code; // fallback
}

// =============================================================================
// Generator Functions
// =============================================================================

/**
 * Generate src/languages/_all.ts
 */
function generateLanguagesAll(): void {
  const dir = path.join(SEMANTIC_SRC, 'languages');
  const files = getLanguageFiles(dir, ['index.ts', '_all.ts']);

  const imports = files.map(f => `import './${f}';`).join('\n');
  const exports = files.map(f => `export * from './${f}';`).join('\n');

  const content = `/**
 * All Languages Module
 *
 * Imports and registers all ${files.length} supported languages.
 * Use this for the full bundle with all language support.
 *
 * @example
 * \`\`\`typescript
 * import '@lokascript/semantic/languages/_all';
 * // or
 * import '@lokascript/semantic/languages';
 * \`\`\`
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Import all language modules to trigger registration
${imports}

// Re-export everything for convenience
${exports}
`;

  fs.writeFileSync(path.join(dir, '_all.ts'), content);
  console.log(`  Generated: src/languages/_all.ts (${files.length} languages)`);
}

/**
 * Generate tokenizer re-exports for src/tokenizers/index.ts
 * Note: This only generates the re-exports section, not the full file.
 */
function generateTokenizerExports(): void {
  const dir = path.join(SEMANTIC_SRC, 'tokenizers');
  const files = getLanguageFiles(dir, ['index.ts', 'base.ts']);

  // Generate re-export lines
  const exports = files.map(f => {
    // Find the language code for this file
    const code = Object.keys(LANGUAGE_NAMES).find(c =>
      LANGUAGE_NAMES[c] === f || c === f
    ) || f;
    const tokenizerName = toTokenizerName(code);
    return `export { ${tokenizerName} } from './${f}';`;
  });

  console.log(`  Tokenizer exports to add manually (${files.length} tokenizers):`);
  console.log('  // Re-exports (tree-shakeable - only included if imported)');
  exports.forEach(e => console.log(`  ${e}`));
}

/**
 * Generate src/generators/profiles/index.ts
 */
function generateProfilesIndex(): void {
  const dir = path.join(SEMANTIC_SRC, 'generators/profiles');
  const files = getLanguageFiles(dir, ['index.ts', 'types.ts', 'marker-templates.ts']);

  const exports = files.map(f => {
    const code = Object.keys(LANGUAGE_NAMES).find(c =>
      LANGUAGE_NAMES[c] === f || c === f
    ) || f;
    const profileName = toProfileName(code);
    return `export { ${profileName} } from './${f}';`;
  });

  const content = `/**
 * Language Profiles Index
 *
 * Re-exports all profile types and individual profiles.
 * For tree-shaking, import specific profiles directly:
 *   import { englishProfile } from './profiles/english';
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Types
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './types';

// Individual profiles - import individually for tree-shaking
${exports.join('\n')}
`;

  fs.writeFileSync(path.join(dir, 'index.ts'), content);
  console.log(`  Generated: src/generators/profiles/index.ts (${files.length} profiles)`);
}

/**
 * Generate src/generators/language-profiles.ts
 */
function generateLanguageProfiles(): void {
  const dir = path.join(SEMANTIC_SRC, 'generators/profiles');
  const files = getLanguageFiles(dir, ['index.ts', 'types.ts', 'marker-templates.ts']);

  // Build code → file/profile mapping
  const languages = files.map(f => {
    const code = Object.keys(LANGUAGE_NAMES).find(c =>
      LANGUAGE_NAMES[c] === f || c === f
    ) || f;
    const profileName = toProfileName(code);
    return { code, file: f, profileName };
  });

  // Validate: warn if any profile file is missing from LANGUAGE_NAMES
  // ISO 639-1 codes are exactly 2 lowercase letters
  const missingMappings = languages.filter(l => !/^[a-z]{2}$/.test(l.code));
  if (missingMappings.length > 0) {
    console.warn('\n⚠️  WARNING: Profile files missing from LANGUAGE_NAMES mapping:');
    for (const m of missingMappings) {
      console.warn(`   - ${m.file}.ts → code "${m.code}" is not a valid ISO 639-1 code`);
      console.warn(`     Add the mapping to LANGUAGE_NAMES: { xx: '${m.file}' }`);
    }
    console.warn('   This will cause incorrect keys in language-profiles.ts\n');
  }

  const reExports = languages.map(l =>
    `export { ${l.profileName} } from './profiles/${l.file}';`
  ).join('\n');

  const imports = languages.map(l =>
    `import { ${l.profileName} } from './profiles/${l.file}';`
  ).join('\n');

  const objectEntries = languages.map(l =>
    `  ${l.code}: ${l.profileName},`
  ).join('\n');

  const content = `/**
 * Language Profiles
 *
 * Re-exports from individual profile files for backwards compatibility.
 * For minimal bundles, import specific profiles directly:
 *
 * @example
 * \`\`\`typescript
 * // Tree-shakeable import
 * import { englishProfile } from './profiles/english';
 *
 * // Full import (all profiles bundled)
 * import { englishProfile, languageProfiles } from './language-profiles';
 * \`\`\`
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

// Re-export types
export type {
  LanguageProfile,
  WordOrder,
  MarkingStrategy,
  RoleMarker,
  VerbConfig,
  VerbForm,
  PossessiveConfig,
  KeywordTranslation,
  TokenizationConfig,
} from './profiles/types';

// Re-export individual profiles
${reExports}

// Import for creating the combined object
${imports}
import type { LanguageProfile } from './profiles/types';

// =============================================================================
// Profile Registry (backwards compatibility)
// =============================================================================

/**
 * All available language profiles.
 * @deprecated Import individual profiles for tree-shaking.
 */
export const languageProfiles: Record<string, LanguageProfile> = {
${objectEntries}
};

/**
 * Get a language profile by code.
 * @deprecated Use the registry's getProfile instead.
 */
export function getProfile(code: string): LanguageProfile | undefined {
  return languageProfiles[code];
}

/**
 * Get all supported language codes.
 * @deprecated Use the registry's getRegisteredLanguages instead.
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(languageProfiles);
}

/**
 * Check if a language is supported.
 * @deprecated Use the registry's isLanguageRegistered instead.
 */
export function isLanguageSupported(code: string): boolean {
  return code in languageProfiles;
}
`;

  fs.writeFileSync(path.join(SEMANTIC_SRC, 'generators/language-profiles.ts'), content);
  console.log(`  Generated: src/generators/language-profiles.ts (${files.length} profiles)`);
}

/**
 * Convert a hyphenated string to PascalCase.
 */
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Generate a pattern index file for a specific command.
 */
function generatePatternIndex(command: string): void {
  const dir = path.join(SEMANTIC_SRC, `patterns/${command}`);
  if (!fs.existsSync(dir)) return;

  const files = getLanguageFiles(dir, ['index.ts', 'shared.ts']);
  if (files.length === 0) return;

  const cmdPascal = toPascalCase(command);

  // Build language info
  const languages = files.map(f => {
    const code = Object.keys(LANGUAGE_NAMES).find(c =>
      LANGUAGE_NAMES[c] === f || c === f
    ) || f;
    const upperCode = code.charAt(0).toUpperCase() + code.slice(1);
    const funcName = `get${cmdPascal}Patterns${upperCode}`;
    return { code, file: f, funcName };
  });

  const imports = languages.map(l =>
    `import { ${l.funcName} } from './${l.file}';`
  ).join('\n');

  const reExports = languages.map(l =>
    `export { ${l.funcName} } from './${l.file}';`
  ).join('\n');

  const switchCases = languages.map(l =>
    `    case '${l.code}':\n      return ${l.funcName}();`
  ).join('\n');

  const languageArray = languages.map(l => `'${l.code}'`).join(', ');

  const content = `/**
 * ${cmdPascal} Command Patterns
 *
 * Hand-crafted patterns for "${command}" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

${imports}

/**
 * Get ${command} patterns for a specific language.
 */
export function get${cmdPascal}PatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
${switchCases}
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
${reExports}

/**
 * Languages that have hand-crafted ${command} patterns.
 */
export const ${command.replace(/-/g, '')}PatternLanguages = [${languageArray}];
`;

  fs.writeFileSync(path.join(dir, 'index.ts'), content);
  console.log(`  Generated: src/patterns/${command}/index.ts (${files.length} languages)`);
}

/**
 * Generate all pattern index files.
 */
function generateAllPatternIndexes(): void {
  const patternsDir = path.join(SEMANTIC_SRC, 'patterns');
  const commands = fs.readdirSync(patternsDir)
    .filter(f => fs.statSync(path.join(patternsDir, f)).isDirectory())
    .filter(f => f !== 'index.ts');

  commands.forEach(generatePatternIndex);
}

// =============================================================================
// Main
// =============================================================================

function main() {
  console.log('Generating index files...\n');

  generateLanguagesAll();
  generateProfilesIndex();
  generateLanguageProfiles();
  generateAllPatternIndexes();

  console.log('\nNote: tokenizers/index.ts has static content that shouldn\'t be auto-generated.');
  console.log('If you added a new tokenizer, add the export manually.\n');

  console.log('Done!');
}

main();
