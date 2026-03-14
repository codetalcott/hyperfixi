#!/usr/bin/env npx tsx
/**
 * Generate i18n Dictionary Files from Semantic Language Profiles
 *
 * Reads all semantic profiles from packages/semantic/src/generators/profiles/,
 * extracts keyword translations, and writes i18n dictionary files to
 * packages/i18n/src/dictionaries/.
 *
 * The semantic profile is the single source of truth for keyword translations.
 * Categories not derivable from profiles (events, temporal, attributes, etc.)
 * are preserved from existing dictionary files.
 *
 * Usage:
 *   npx tsx scripts/generate-i18n-dictionaries.ts
 *   npx tsx scripts/generate-i18n-dictionaries.ts --dry-run
 *   npx tsx scripts/generate-i18n-dictionaries.ts --language=ja
 *
 * @generated This script generates files — do not edit generated output manually.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Import all semantic profiles
// ---------------------------------------------------------------------------

import { arabicProfile } from '../src/generators/profiles/arabic';
import { bengaliProfile } from '../src/generators/profiles/bengali';
import { chineseProfile } from '../src/generators/profiles/chinese';
import { englishProfile } from '../src/generators/profiles/english';
import { frenchProfile } from '../src/generators/profiles/french';
import { germanProfile } from '../src/generators/profiles/german';
import { hebrewProfile } from '../src/generators/profiles/hebrew';
import { hindiProfile } from '../src/generators/profiles/hindi';
import { indonesianProfile } from '../src/generators/profiles/indonesian';
import { italianProfile } from '../src/generators/profiles/italian';
import { japaneseProfile } from '../src/generators/profiles/japanese';
import { koreanProfile } from '../src/generators/profiles/korean';
import { malayProfile } from '../src/generators/profiles/ms';
import { polishProfile } from '../src/generators/profiles/polish';
import { portugueseProfile } from '../src/generators/profiles/portuguese';
import { quechuaProfile } from '../src/generators/profiles/quechua';
import { russianProfile } from '../src/generators/profiles/russian';
import { spanishProfile } from '../src/generators/profiles/spanish';
import { swahiliProfile } from '../src/generators/profiles/swahili';
import { tagalogProfile } from '../src/generators/profiles/tl';
import { thaiProfile } from '../src/generators/profiles/thai';
import { turkishProfile } from '../src/generators/profiles/turkish';
import { ukrainianProfile } from '../src/generators/profiles/ukrainian';
import { vietnameseProfile } from '../src/generators/profiles/vietnamese';

import type { LanguageProfile, KeywordTranslation } from '../src/generators/profiles/types';

// Import the English i18n dictionary for canonical category mapping
import { en as englishDictionary } from '../../i18n/src/dictionaries/en';
import type { Dictionary, DictionaryCategory } from '../../i18n/src/types';
import { DICTIONARY_CATEGORIES } from '../../i18n/src/types';

// ---------------------------------------------------------------------------
// All profiles indexed by language code
// ---------------------------------------------------------------------------

const ALL_PROFILES: Record<string, LanguageProfile> = {
  ar: arabicProfile,
  bn: bengaliProfile,
  zh: chineseProfile,
  en: englishProfile,
  fr: frenchProfile,
  de: germanProfile,
  he: hebrewProfile,
  hi: hindiProfile,
  id: indonesianProfile,
  it: italianProfile,
  ja: japaneseProfile,
  ko: koreanProfile,
  ms: malayProfile,
  pl: polishProfile,
  pt: portugueseProfile,
  qu: quechuaProfile,
  ru: russianProfile,
  es: spanishProfile,
  sw: swahiliProfile,
  tl: tagalogProfile,
  th: thaiProfile,
  tr: turkishProfile,
  uk: ukrainianProfile,
  vi: vietnameseProfile,
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const I18N_DICT_DIR = path.resolve(__dirname, '../../i18n/src/dictionaries');

// ---------------------------------------------------------------------------
// Step 1: Build category lookup from English dictionary
//
// Maps each English keyword to the category it belongs to.
// e.g. { 'toggle': 'commands', 'to': 'modifiers', 'click': 'events', ... }
// ---------------------------------------------------------------------------

function buildCategoryMap(dict: Dictionary): Map<string, DictionaryCategory> {
  const map = new Map<string, DictionaryCategory>();
  for (const category of DICTIONARY_CATEGORIES) {
    for (const key of Object.keys(dict[category])) {
      map.set(key, category);
    }
  }
  return map;
}

const categoryMap = buildCategoryMap(englishDictionary);

// ---------------------------------------------------------------------------
// Step 2: Map roleMarker semantic roles → English modifier keywords
//
// The English profile's roleMarkers define the canonical mapping:
//   destination.primary = 'on' → but in the i18n dictionary 'to' is a modifier
// We need a fixed map from role names to the modifier keyword(s) they correspond to.
// ---------------------------------------------------------------------------

const ROLE_TO_MODIFIER: Record<string, string[]> = {
  destination: ['to'],
  source: ['from'],
  style: ['with'],
  responseType: ['as'],
  method: ['by'],
};

// ---------------------------------------------------------------------------
// Step 3: Map possessive keywords → values category keys
//
// Profile possessive.keywords: { my: 'me', your: 'you', its: 'it' }
// Dictionary values: { my: 'translated', your: 'translated', its: 'translated' }
// The possessive keywords map directly to values entries.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Categories that are NOT derivable from the semantic profile
// and must be preserved from existing dictionary files.
// ---------------------------------------------------------------------------

const NON_DERIVABLE_CATEGORIES: Set<DictionaryCategory> = new Set([
  'events',
  'temporal',
  'attributes',
]);

// Partially derivable: we derive some entries but preserve others
// - 'values': we derive references + possessives, but preserve true/false/null/etc.
// - 'logical': we derive some from profile keywords, but preserve has/have/otherwise
// - 'expressions': we derive positional from profile keywords, but preserve 'starts with' etc.
// - 'modifiers': we derive some from profile keywords + roleMarkers, but preserve others

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const languageArg = args.find(a => a.startsWith('--language='));
const targetLanguage = languageArg ? languageArg.split('=')[1] : undefined;

// ---------------------------------------------------------------------------
// Utility: read existing dictionary file and parse out category data
// ---------------------------------------------------------------------------

function readExistingDictionary(code: string): Dictionary | null {
  const filePath = path.join(I18N_DICT_DIR, `${code}.ts`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  // We can't dynamically import .ts files easily in all environments,
  // so we parse the TypeScript source to extract the dictionary object.
  // However, since we're running under tsx, we can use dynamic import.
  // But dynamic import in a sync context is tricky. Instead, let's use
  // a simpler approach: import all dictionaries statically below.
  return null; // Placeholder - we use the EXISTING_DICTS map instead
}

// Import existing dictionaries for preserving non-derivable categories
import { ar } from '../../i18n/src/dictionaries/ar';
import { bengaliDictionary as bnDict } from '../../i18n/src/dictionaries/bn';
import { de } from '../../i18n/src/dictionaries/de';
import { es } from '../../i18n/src/dictionaries/es';
import { fr } from '../../i18n/src/dictionaries/fr';
import { hindiDictionary as hiDict } from '../../i18n/src/dictionaries/hi';
import { id } from '../../i18n/src/dictionaries/id';
import { it } from '../../i18n/src/dictionaries/it';
import { ja } from '../../i18n/src/dictionaries/ja';
import { ko } from '../../i18n/src/dictionaries/ko';
import { malayDictionary as msDict } from '../../i18n/src/dictionaries/ms';
import { pl } from '../../i18n/src/dictionaries/pl';
import { pt } from '../../i18n/src/dictionaries/pt';
import { qu } from '../../i18n/src/dictionaries/qu';
import { russianDictionary as ruDict } from '../../i18n/src/dictionaries/ru';
import { sw } from '../../i18n/src/dictionaries/sw';
import { thaiDictionary as thDict } from '../../i18n/src/dictionaries/th';
import { tagalogDictionary as tlDict } from '../../i18n/src/dictionaries/tl';
import { tr } from '../../i18n/src/dictionaries/tr';
import { ukrainianDictionary as ukDict } from '../../i18n/src/dictionaries/uk';
import { vi } from '../../i18n/src/dictionaries/vi';
import { zh } from '../../i18n/src/dictionaries/zh';

const EXISTING_DICTS: Record<string, Dictionary> = {
  ar, bn: bnDict, de, es, fr, hi: hiDict, id, it, ja, ko,
  ms: msDict, pl, pt, qu, ru: ruDict, sw, th: thDict, tl: tlDict,
  tr, uk: ukDict, vi, zh,
};

// ---------------------------------------------------------------------------
// Export name mapping: some dictionaries use different export names
// ---------------------------------------------------------------------------

const EXPORT_NAMES: Record<string, { varName: string; useAlias: boolean }> = {
  ar: { varName: 'ar', useAlias: false },
  bn: { varName: 'bengaliDictionary', useAlias: true },
  de: { varName: 'de', useAlias: false },
  es: { varName: 'es', useAlias: false },
  fr: { varName: 'fr', useAlias: false },
  hi: { varName: 'hindiDictionary', useAlias: true },
  id: { varName: 'id', useAlias: false },
  it: { varName: 'it', useAlias: false },
  ja: { varName: 'ja', useAlias: false },
  ko: { varName: 'ko', useAlias: false },
  ms: { varName: 'malayDictionary', useAlias: true },
  pl: { varName: 'pl', useAlias: false },
  pt: { varName: 'pt', useAlias: false },
  qu: { varName: 'qu', useAlias: false },
  ru: { varName: 'russianDictionary', useAlias: true },
  sw: { varName: 'sw', useAlias: false },
  th: { varName: 'thaiDictionary', useAlias: true },
  tl: { varName: 'tagalogDictionary', useAlias: true },
  tr: { varName: 'tr', useAlias: false },
  uk: { varName: 'ukrainianDictionary', useAlias: true },
  vi: { varName: 'vi', useAlias: false },
  zh: { varName: 'zh', useAlias: false },
};

// ---------------------------------------------------------------------------
// Core: derive dictionary from a semantic profile
// ---------------------------------------------------------------------------

function deriveFromProfile(
  profile: LanguageProfile,
  existing: Dictionary | null
): Dictionary {
  const result: Dictionary = {
    commands: {},
    modifiers: {},
    events: {},
    logical: {},
    temporal: {},
    values: {},
    attributes: {},
    expressions: {},
  };

  // 1. Map profile.keywords → categories using the English dictionary category map
  for (const [englishKey, translation] of Object.entries(profile.keywords)) {
    const category = categoryMap.get(englishKey);
    if (category) {
      result[category][englishKey] = translation.primary;
    }
    // If the keyword isn't in the English dictionary at all, it may be a
    // profile-only keyword (e.g., 'click', 'hover' in Spanish profile).
    // We can still place it if its normalized form is in the category map.
    else if (translation.normalized) {
      const normCategory = categoryMap.get(translation.normalized);
      if (normCategory) {
        result[normCategory][translation.normalized] = translation.primary;
      }
    }
  }

  // 2. Map profile.references → values category
  //    references: { me: 'translated', it: 'translated', you: 'translated', ... }
  if (profile.references) {
    for (const [refKey, refValue] of Object.entries(profile.references)) {
      // Only add if this key exists in the English values category
      if (englishDictionary.values[refKey] !== undefined) {
        result.values[refKey] = refValue;
      }
    }
  }

  // 3. Map profile.possessive.keywords → values category
  //    possessive.keywords: { my: 'me', your: 'you', its: 'it' }
  //    In the profile, the KEY is the possessive form, VALUE is the reference.
  //    In the dictionary, we need: { my: translatedPossessiveForm }
  //    We get the translated form from possessive.specialForms (reference → possessive)
  if (profile.possessive) {
    // specialForms maps reference → possessive form: { me: 'my_translated', it: 'its_translated' }
    if (profile.possessive.specialForms) {
      for (const [refKey, possessiveForm] of Object.entries(profile.possessive.specialForms)) {
        // Find the English possessive word for this reference
        // English: me → my, it → its, you → your
        const englishPossessiveMap: Record<string, string> = { me: 'my', it: 'its', you: 'your' };
        const englishPossessiveKey = englishPossessiveMap[refKey];
        if (englishPossessiveKey && englishDictionary.values[englishPossessiveKey] !== undefined) {
          result.values[englishPossessiveKey] = possessiveForm;
        }
      }
    }
    // Also handle possessive.keywords which has { translatedPossessive: referenceKey }
    // These give us the native possessive forms directly
    if (profile.possessive.keywords) {
      for (const [nativePossessive, referenceKey] of Object.entries(profile.possessive.keywords)) {
        // Map reference → English possessive keyword
        const englishPossessiveMap: Record<string, string> = { me: 'my', it: 'its', you: 'your' };
        const englishPossessiveKey = englishPossessiveMap[referenceKey];
        if (englishPossessiveKey && englishDictionary.values[englishPossessiveKey] !== undefined) {
          // Only set if we haven't already set it from specialForms
          if (!result.values[englishPossessiveKey]) {
            result.values[englishPossessiveKey] = nativePossessive;
          }
        }
      }
    }
  }

  // 4. Map profile.roleMarkers → modifiers category
  //    roleMarkers: { destination: { primary: 'に' }, source: { primary: 'から' } }
  //    We map role names to modifier keywords using ROLE_TO_MODIFIER
  if (profile.roleMarkers) {
    for (const [role, marker] of Object.entries(profile.roleMarkers)) {
      if (!marker || !marker.primary) continue;
      const modifierKeys = ROLE_TO_MODIFIER[role];
      if (modifierKeys) {
        for (const modKey of modifierKeys) {
          // Only set if not already derived from profile.keywords
          if (!result.modifiers[modKey]) {
            result.modifiers[modKey] = marker.primary;
          }
        }
      }
    }
  }

  // 5. Merge with existing dictionary for non-derivable categories
  //    Events, temporal, attributes are fully preserved from existing files.
  //    For partially derivable categories, we merge: derived values take priority,
  //    then existing values fill in the gaps.
  if (existing) {
    for (const category of DICTIONARY_CATEGORIES) {
      if (NON_DERIVABLE_CATEGORIES.has(category)) {
        // Fully preserve from existing
        result[category] = { ...existing[category] };
      } else {
        // Merge: existing fills gaps, derived takes priority
        const merged: Record<string, string> = {};
        // Start with existing entries
        for (const [key, value] of Object.entries(existing[category])) {
          merged[key] = value;
        }
        // Override with derived entries
        for (const [key, value] of Object.entries(result[category])) {
          merged[key] = value;
        }
        result[category] = merged;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Sort object keys alphabetically for consistent output
// ---------------------------------------------------------------------------

function sortKeys(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ---------------------------------------------------------------------------
// Generate file content
// ---------------------------------------------------------------------------

function generateFileContent(code: string, dict: Dictionary): string {
  const exportInfo = EXPORT_NAMES[code] || { varName: code, useAlias: false };
  const { varName, useAlias } = exportInfo;

  const lines: string[] = [];

  lines.push('// @generated from semantic profiles — do not edit manually');
  lines.push('// To modify, update the semantic profile and run: npm run generate:language-assets');
  lines.push('');
  lines.push("import { Dictionary } from '../types';");
  lines.push('');
  lines.push(`export const ${varName}: Dictionary = {`);

  for (const category of DICTIONARY_CATEGORIES) {
    const entries = sortKeys(dict[category]);
    const entryKeys = Object.keys(entries);

    lines.push(`  ${category}: {`);
    for (const key of entryKeys) {
      const value = entries[key];
      // Escape single quotes in values
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      // Handle keys with spaces (e.g., 'starts with')
      const keyStr = key.includes(' ') ? `'${key}'` : key;
      lines.push(`    ${keyStr}: '${escaped}',`);
    }
    lines.push('  },');
    if (category !== DICTIONARY_CATEGORIES[DICTIONARY_CATEGORIES.length - 1]) {
      lines.push('');
    }
  }

  lines.push('};');

  // Add alias export if needed (e.g., export const bn = bengaliDictionary)
  if (useAlias) {
    lines.push('');
    lines.push(`export const ${code} = ${varName};`);
  }

  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('=== Generate i18n Dictionaries from Semantic Profiles ===');
  if (dryRun) {
    console.log('(dry run — no files will be written)\n');
  }
  if (targetLanguage) {
    console.log(`Target language: ${targetLanguage}\n`);
  }

  const profileCodes = Object.keys(ALL_PROFILES).sort();
  let generated = 0;
  let skipped = 0;
  let warnings = 0;

  for (const code of profileCodes) {
    // Skip English — it's the canonical identity dictionary, not generated
    if (code === 'en') {
      continue;
    }

    // Filter by target language if specified
    if (targetLanguage && code !== targetLanguage) {
      continue;
    }

    const profile = ALL_PROFILES[code];
    const existing = EXISTING_DICTS[code] || null;
    const dictFilePath = path.join(I18N_DICT_DIR, `${code}.ts`);

    // Check if there's an existing dictionary file
    const fileExists = fs.existsSync(dictFilePath);

    if (!existing && !fileExists) {
      // No existing dictionary — check if we should create a new one
      // Only create if the profile has a reasonable number of keywords
      const keywordCount = Object.keys(profile.keywords).length;
      if (keywordCount < 5) {
        console.log(`  SKIP ${code} (${profile.name}) — profile has only ${keywordCount} keywords, no existing dictionary`);
        skipped++;
        warnings++;
        continue;
      }
      console.log(`  NEW  ${code} (${profile.name}) — creating dictionary from profile (${keywordCount} keywords)`);
    }

    // Derive the dictionary
    const derived = deriveFromProfile(profile, existing);

    // Count changes
    let changedEntries = 0;
    let newEntries = 0;
    if (existing) {
      for (const category of DICTIONARY_CATEGORIES) {
        for (const [key, value] of Object.entries(derived[category])) {
          if (existing[category][key] === undefined) {
            newEntries++;
          } else if (existing[category][key] !== value) {
            changedEntries++;
          }
        }
      }
    }

    // Generate file content
    const content = generateFileContent(code, derived);

    if (dryRun) {
      const status = !fileExists ? 'CREATE' : changedEntries > 0 || newEntries > 0 ? 'UPDATE' : 'OK';
      const details: string[] = [];
      if (changedEntries > 0) details.push(`${changedEntries} changed`);
      if (newEntries > 0) details.push(`${newEntries} new`);
      const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      console.log(`  ${status.padEnd(6)} ${code} (${profile.name})${detailStr}`);
    } else {
      fs.writeFileSync(dictFilePath, content, 'utf-8');
      const status = !fileExists ? 'CREATE' : 'UPDATE';
      const details: string[] = [];
      if (changedEntries > 0) details.push(`${changedEntries} changed`);
      if (newEntries > 0) details.push(`${newEntries} new`);
      const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
      console.log(`  ${status.padEnd(6)} ${code} (${profile.name})${detailStr}`);
    }

    generated++;
  }

  console.log('');
  console.log(`Summary: ${generated} generated, ${skipped} skipped, ${warnings} warnings`);

  if (dryRun) {
    console.log('\nRe-run without --dry-run to write files.');
  }
}

main();
