#!/usr/bin/env npx tsx
/**
 * Generate i18n Grammar Profiles from Semantic Profiles
 *
 * Reads all semantic language profiles and generates/updates the i18n grammar
 * profiles file at packages/i18n/src/grammar/profiles/index.ts.
 *
 * The script preserves existing hand-crafted `rules` arrays (which contain
 * custom transform functions that cannot be generated from semantic profiles).
 *
 * Usage:
 *   npx tsx packages/semantic/scripts/generate-i18n-grammar-profiles.ts
 *   npx tsx packages/semantic/scripts/generate-i18n-grammar-profiles.ts --dry-run
 *
 * What it generates:
 *   - code, name, wordOrder, adpositionType, morphology, direction
 *   - canonicalOrder (derived from wordOrder)
 *   - markers (from semantic roleMarkers)
 *
 * What it preserves:
 *   - rules arrays (hand-crafted, contain functions)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Import all semantic profiles
import { englishProfile } from '../src/generators/profiles/english';
import { japaneseProfile } from '../src/generators/profiles/japanese';
import { koreanProfile } from '../src/generators/profiles/korean';
import { chineseProfile } from '../src/generators/profiles/chinese';
import { arabicProfile } from '../src/generators/profiles/arabic';
import { turkishProfile } from '../src/generators/profiles/turkish';
import { spanishProfile } from '../src/generators/profiles/spanish';
import { germanProfile } from '../src/generators/profiles/german';
import { frenchProfile } from '../src/generators/profiles/french';
import { portugueseProfile } from '../src/generators/profiles/portuguese';
import { indonesianProfile } from '../src/generators/profiles/indonesian';
import { quechuaProfile } from '../src/generators/profiles/quechua';
import { swahiliProfile } from '../src/generators/profiles/swahili';
import { bengaliProfile } from '../src/generators/profiles/bengali';
import { italianProfile } from '../src/generators/profiles/italian';
import { russianProfile } from '../src/generators/profiles/russian';
import { ukrainianProfile } from '../src/generators/profiles/ukrainian';
import { vietnameseProfile } from '../src/generators/profiles/vietnamese';
import { hindiProfile } from '../src/generators/profiles/hindi';
import { tagalogProfile } from '../src/generators/profiles/tl';
import { thaiProfile } from '../src/generators/profiles/thai';
import { polishProfile } from '../src/generators/profiles/polish';
import { hebrewProfile } from '../src/generators/profiles/hebrew';
import { malayProfile } from '../src/generators/profiles/ms';

import type { LanguageProfile as SemanticProfile, RoleMarker } from '../src/generators/profiles/types';

// =============================================================================
// Configuration
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const I18N_PROFILES_PATH = path.resolve(
  __dirname,
  '../../i18n/src/grammar/profiles/index.ts'
);

const DRY_RUN = process.argv.includes('--dry-run');

// All semantic profiles in the order they should appear in the output
const SEMANTIC_PROFILES: SemanticProfile[] = [
  englishProfile,
  japaneseProfile,
  koreanProfile,
  chineseProfile,
  arabicProfile,
  turkishProfile,
  spanishProfile,
  germanProfile,
  frenchProfile,
  portugueseProfile,
  indonesianProfile,
  quechuaProfile,
  swahiliProfile,
  bengaliProfile,
  italianProfile,
  russianProfile,
  ukrainianProfile,
  vietnameseProfile,
  hindiProfile,
  tagalogProfile,
  thaiProfile,
  polishProfile,
  hebrewProfile,
  malayProfile,
];

// Variable name for each language code
const PROFILE_VARNAMES: Record<string, string> = {
  en: 'englishProfile',
  ja: 'japaneseProfile',
  ko: 'koreanProfile',
  zh: 'chineseProfile',
  ar: 'arabicProfile',
  tr: 'turkishProfile',
  es: 'spanishProfile',
  de: 'germanProfile',
  fr: 'frenchProfile',
  pt: 'portugueseProfile',
  id: 'indonesianProfile',
  qu: 'quechuaProfile',
  sw: 'swahiliProfile',
  bn: 'bengaliProfile',
  it: 'italianProfile',
  ru: 'russianProfile',
  uk: 'ukrainianProfile',
  vi: 'vietnameseProfile',
  hi: 'hindiProfile',
  tl: 'tagalogProfile',
  th: 'thaiProfile',
  pl: 'polishProfile',
  he: 'hebrewProfile',
  ms: 'malayProfile',
};

// Language display names for section comments
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English (Reference Language)',
  ja: 'Japanese (SOV, Postpositions)',
  ko: 'Korean (SOV, Postpositions - similar to Japanese)',
  zh: 'Chinese (SVO, Topic-Prominent)',
  ar: 'Arabic (VSO, RTL)',
  tr: 'Turkish (SOV, Agglutinative)',
  es: 'Spanish (SVO, Romance)',
  de: 'German (SVO, Germanic)',
  fr: 'French (SVO, Romance)',
  pt: 'Portuguese (SVO, Romance)',
  id: 'Indonesian (SVO, Austronesian)',
  qu: 'Quechua (SOV, Quechuan)',
  sw: 'Swahili (SVO, Bantu)',
  bn: 'Bengali (SOV, Postpositions)',
  it: 'Italian (SVO, Romance)',
  ru: 'Russian (SVO, Slavic)',
  uk: 'Ukrainian (SVO, Slavic)',
  vi: 'Vietnamese (SVO, Isolating)',
  hi: 'Hindi (SOV, Postpositions)',
  tl: 'Tagalog (VSO, Prepositions)',
  th: 'Thai (SVO, Isolating, No Spaces)',
  pl: 'Polish (SVO, Fusional, Imperative)',
  he: 'Hebrew (SVO, RTL)',
  ms: 'Malay (SVO, Austronesian)',
};

// =============================================================================
// Derivation Logic
// =============================================================================

/**
 * Derive i18n adpositionType from semantic markingStrategy.
 */
function deriveAdpositionType(
  strategy: SemanticProfile['markingStrategy']
): 'preposition' | 'postposition' {
  switch (strategy) {
    case 'preposition':
      return 'preposition';
    case 'postposition':
    case 'particle':
    case 'case-suffix':
      return 'postposition';
    default:
      return 'preposition';
  }
}

/**
 * Derive i18n morphology from semantic profile characteristics.
 */
function deriveMorphology(
  profile: SemanticProfile
): 'isolating' | 'agglutinative' | 'fusional' | 'polysynthetic' {
  // Chinese: CJK + no spaces + no particles → isolating
  // Japanese/Korean use particles despite CJK script → agglutinative (handled below)
  if (
    profile.script === 'cjk' &&
    !profile.usesSpaces &&
    profile.markingStrategy === 'preposition'
  ) {
    return 'isolating';
  }
  // Thai (no spaces, isolating)
  if (profile.script === 'thai') {
    return 'isolating';
  }
  // Vietnamese (isolating)
  if (profile.code === 'vi') {
    return 'isolating';
  }
  // Particle or case-suffix → agglutinative
  if (
    profile.markingStrategy === 'particle' ||
    profile.markingStrategy === 'case-suffix'
  ) {
    return 'agglutinative';
  }
  // Arabic script → fusional (root-pattern morphology)
  if (profile.script === 'arabic') {
    return 'fusional';
  }
  // Indonesian, Swahili, Tagalog, Malay — agglutinative (Austronesian / Bantu)
  if (['id', 'sw', 'tl', 'ms'].includes(profile.code)) {
    return 'agglutinative';
  }
  // Default for European languages
  return 'fusional';
}

/**
 * Derive canonical role order from word order.
 */
function deriveCanonicalOrder(wordOrder: SemanticProfile['wordOrder']): string[] {
  switch (wordOrder) {
    case 'SOV':
      return ['patient', 'event', 'action'];
    case 'VSO':
      return ['action', 'agent', 'patient', 'destination', 'source'];
    case 'SVO':
    default:
      return [
        'event',
        'action',
        'patient',
        'source',
        'destination',
        'quantity',
        'duration',
        'method',
        'style',
      ];
  }
}

/**
 * Convert a semantic RoleMarker to an i18n GrammaticalMarker object literal string.
 */
function markerToString(
  roleName: string,
  marker: RoleMarker,
  required: boolean
): string {
  const position =
    marker.position === 'before' ? 'preposition' : 'postposition';

  let s = `    { form: ${JSON.stringify(marker.primary)}, role: ${JSON.stringify(roleName)}, position: '${position}', required: ${required}`;

  if (marker.alternatives && marker.alternatives.length > 0) {
    s += `, alternatives: [${marker.alternatives.map((a) => JSON.stringify(a)).join(', ')}]`;
  }

  s += ' }';
  return s;
}

/**
 * Derive markers from semantic roleMarkers.
 */
function deriveMarkers(profile: SemanticProfile): string[] {
  const lines: string[] = [];

  // Determine which roles are typically "required" based on language patterns
  // For postposition languages, core grammatical particles are required
  // For preposition languages, event marker is required, others optional
  const isPostposition =
    profile.markingStrategy === 'postposition' ||
    profile.markingStrategy === 'particle' ||
    profile.markingStrategy === 'case-suffix';

  for (const [role, marker] of Object.entries(profile.roleMarkers)) {
    if (!marker || !marker.primary) continue;

    // Heuristic: event markers and patient markers (for postposition langs) are required
    let required = false;
    if (role === 'event') {
      required = true;
    } else if (isPostposition && ['patient', 'destination', 'source'].includes(role)) {
      required = true;
    }

    lines.push(markerToString(role, marker, required));
  }

  return lines;
}

// =============================================================================
// Rules Extraction
// =============================================================================

/**
 * Extract existing rules blocks from the i18n profiles file.
 * Returns a map of variable name → rules text (including the `rules:` key).
 */
function extractExistingRules(
  fileContent: string
): Map<string, string> {
  const rulesMap = new Map<string, string>();

  for (const [code, varName] of Object.entries(PROFILE_VARNAMES)) {
    // Find the profile declaration
    const profileStart = fileContent.indexOf(`export const ${varName}`);
    if (profileStart === -1) continue;

    // Find the rules key within this profile
    const rulesStart = fileContent.indexOf('  rules:', profileStart);
    if (rulesStart === -1) continue;

    // Check if this rules belongs to the current profile (not the next one)
    const nextProfileStart = findNextProfileStart(fileContent, profileStart + 1);
    if (nextProfileStart !== -1 && rulesStart > nextProfileStart) continue;

    // Extract the rules array by counting brackets
    const rulesText = extractBracketedBlock(fileContent, rulesStart);
    if (rulesText) {
      rulesMap.set(code, rulesText);
    } else {
      console.warn(`  Warning: Failed to extract rules for ${code} at offset ${rulesStart}`);
    }
  }

  return rulesMap;
}

/**
 * Find the start of the next profile declaration after the given position.
 */
function findNextProfileStart(content: string, fromPos: number): number {
  const pattern = /export const \w+Profile/g;
  pattern.lastIndex = fromPos;
  const match = pattern.exec(content);
  return match ? match.index : -1;
}

/**
 * Extract a bracketed block starting from the given position.
 * Returns the full text from `rules:` through the closing `],`.
 */
function extractBracketedBlock(content: string, startPos: number): string | null {
  // Find the opening bracket
  const bracketStart = content.indexOf('[', startPos);
  if (bracketStart === -1) return null;

  let depth = 0;
  let i = bracketStart;
  let maxIter = 100000; // Safety limit

  while (i < content.length && maxIter-- > 0) {
    const ch = content[i];

    // Skip single-line comments
    if (ch === '/' && content[i + 1] === '/') {
      const eol = content.indexOf('\n', i);
      i = eol === -1 ? content.length : eol + 1;
      continue;
    }

    // Skip string literals to avoid counting brackets inside strings
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\') i++; // skip escaped chars
        i++;
      }
      i++; // skip closing quote
      continue;
    }

    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        // Include the trailing comma if present
        let end = i + 1;
        if (content[end] === ',') end++;

        return content.substring(startPos, end);
      }
    }
    i++;
  }

  return null;
}

// =============================================================================
// Output Generation
// =============================================================================

/**
 * Generate a single profile block.
 */
function generateProfile(
  profile: SemanticProfile,
  existingRules: Map<string, string>
): string {
  const varName = PROFILE_VARNAMES[profile.code];
  const label = LANGUAGE_LABELS[profile.code] || `${profile.nativeName} (${profile.code})`;
  const adpositionType = deriveAdpositionType(profile.markingStrategy);
  const morphology = deriveMorphology(profile);
  const canonicalOrder = deriveCanonicalOrder(profile.wordOrder);
  const markers = deriveMarkers(profile);
  const rules = existingRules.get(profile.code);

  const lines: string[] = [];

  // Section header
  lines.push(`// =============================================================================`);
  lines.push(`// ${label}`);
  lines.push(`// =============================================================================`);
  lines.push('');
  lines.push(`export const ${varName}: LanguageProfile = {`);
  lines.push(`  code: ${JSON.stringify(profile.code)},`);
  lines.push(`  name: ${JSON.stringify(profile.nativeName)},`);
  lines.push('');
  lines.push(`  wordOrder: '${profile.wordOrder}',`);
  lines.push(`  adpositionType: '${adpositionType}',`);
  lines.push(`  morphology: '${morphology}',`);
  lines.push(`  direction: '${profile.direction}',`);
  lines.push('');

  // canonicalOrder
  lines.push(`  canonicalOrder: [${canonicalOrder.map((r) => `'${r}'`).join(', ')}],`);
  lines.push('');

  // markers
  lines.push('  markers: [');
  for (const m of markers) {
    lines.push(`${m},`);
  }
  lines.push('  ],');

  // rules (preserved from existing file)
  if (rules) {
    lines.push('');
    lines.push(`  ${rules}`);
  }

  lines.push('};');

  return lines.join('\n');
}

/**
 * Generate the full file content.
 */
function generateFile(existingRules: Map<string, string>): string {
  const sections: string[] = [];

  // File header
  sections.push(`// @generated from semantic profiles — do not edit type-mappable fields manually (except rules arrays)`);
  sections.push(`// To regenerate: npx tsx packages/semantic/scripts/generate-i18n-grammar-profiles.ts`);
  sections.push('');
  sections.push(`import type { LanguageProfile } from '../types';`);

  // Profile blocks
  for (const profile of SEMANTIC_PROFILES) {
    sections.push('');
    sections.push(generateProfile(profile, existingRules));
  }

  // Profile registry
  sections.push('');
  sections.push(`// =============================================================================`);
  sections.push(`// Profile Registry`);
  sections.push(`// =============================================================================`);
  sections.push('');
  sections.push(`export const profiles: Record<string, LanguageProfile> = {`);
  for (const profile of SEMANTIC_PROFILES) {
    const varName = PROFILE_VARNAMES[profile.code];
    sections.push(`  ${profile.code}: ${varName},`);
  }
  sections.push('};');

  // Utility functions
  sections.push('');
  sections.push(`export function getProfile(locale: string): LanguageProfile | undefined {`);
  sections.push(`  return profiles[locale];`);
  sections.push('}');
  sections.push('');
  sections.push(`export function getSupportedLocales(): string[] {`);
  sections.push(`  return Object.keys(profiles);`);
  sections.push('}');
  sections.push('');

  return sections.join('\n');
}

// =============================================================================
// Summary
// =============================================================================

/**
 * Compare existing and generated profiles, print summary.
 */
function printSummary(
  existingContent: string,
  generatedContent: string,
  existingRules: Map<string, string>
): void {
  // Count existing profiles
  const existingProfileCount = (existingContent.match(/export const \w+Profile/g) || []).length;
  const generatedProfileCount = SEMANTIC_PROFILES.length;

  console.log('\n=== i18n Grammar Profile Generation Summary ===\n');
  console.log(`Semantic profiles read:    ${SEMANTIC_PROFILES.length}`);
  console.log(`Existing i18n profiles:    ${existingProfileCount}`);
  console.log(`Generated i18n profiles:   ${generatedProfileCount}`);
  console.log(`Preserved rules arrays:    ${existingRules.size}`);

  // Show which profiles have rules
  if (existingRules.size > 0) {
    console.log(`\nProfiles with rules (preserved):`);
    for (const code of existingRules.keys()) {
      console.log(`  - ${code} (${LANGUAGE_LABELS[code] || code})`);
    }
  }

  // Show new profiles (in generated but not in existing)
  const newProfiles = SEMANTIC_PROFILES.filter((p) => {
    const varName = PROFILE_VARNAMES[p.code];
    return !existingContent.includes(`export const ${varName}`);
  });
  if (newProfiles.length > 0) {
    console.log(`\nNew profiles (not in existing file):`);
    for (const p of newProfiles) {
      console.log(`  + ${p.code} (${p.nativeName})`);
    }
  }

  // Show removed profiles (in existing but not generated)
  const existingVarNames = existingContent.match(/export const (\w+Profile)/g) || [];
  const generatedVarNames = new Set(Object.values(PROFILE_VARNAMES));
  const removedVarNames = existingVarNames
    .map((m) => m.replace('export const ', ''))
    .filter((v) => !generatedVarNames.has(v));
  if (removedVarNames.length > 0) {
    console.log(`\nProfiles in existing file but not generated (will be removed):`);
    for (const v of removedVarNames) {
      console.log(`  - ${v}`);
    }
  }

  const changed = existingContent !== generatedContent;
  console.log(`\nFile changed: ${changed ? 'YES' : 'NO (identical)'}`);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] No files written.`);
  }
}

// =============================================================================
// Main
// =============================================================================

function main(): void {
  console.log('Reading semantic profiles...');

  // Read existing i18n profiles file
  let existingContent = '';
  if (fs.existsSync(I18N_PROFILES_PATH)) {
    existingContent = fs.readFileSync(I18N_PROFILES_PATH, 'utf-8');
    console.log(`Read existing file: ${I18N_PROFILES_PATH}`);
  } else {
    console.log(`No existing file found at: ${I18N_PROFILES_PATH}`);
  }

  // Extract existing rules
  const existingRules = extractExistingRules(existingContent);
  console.log(`Found ${existingRules.size} existing rules arrays to preserve.`);

  // Generate new content
  const generatedContent = generateFile(existingRules);

  // Print summary
  printSummary(existingContent, generatedContent, existingRules);

  // Write file
  if (!DRY_RUN) {
    fs.writeFileSync(I18N_PROFILES_PATH, generatedContent, 'utf-8');
    console.log(`\nWrote: ${I18N_PROFILES_PATH}`);
  }
}

main();
