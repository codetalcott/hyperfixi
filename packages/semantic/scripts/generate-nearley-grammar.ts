#!/usr/bin/env npx tsx
/**
 * Generate Nearley Grammar for Language Detection (Phase 5.1)
 *
 * Reads semantic profiles' keyword translations and generates a compiled
 * Nearley grammar module for automatic language detection.
 *
 * Usage:
 *   npx tsx scripts/generate-nearley-grammar.ts
 *   npx tsx scripts/generate-nearley-grammar.ts --dry-run
 *
 * Output:
 *   src/parser/generated/language-grammar.ts
 *
 * The grammar classifies input tokens as language-specific keywords.
 * Nearley's Earley algorithm handles ambiguity when one token matches
 * keywords in multiple languages.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Import all profiles
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

import type { LanguageProfile } from '../src/generators/profiles/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.resolve(__dirname, '../src/parser/generated/language-grammar.ts');
const DRY_RUN = process.argv.includes('--dry-run');

const ALL_PROFILES: LanguageProfile[] = [
  englishProfile, spanishProfile, portugueseProfile, frenchProfile, germanProfile,
  italianProfile, japaneseProfile, chineseProfile, koreanProfile, arabicProfile,
  turkishProfile, indonesianProfile, russianProfile, hindiProfile, bengaliProfile,
  thaiProfile, vietnameseProfile, polishProfile, ukrainianProfile, swahiliProfile,
  quechuaProfile, hebrewProfile, malayProfile, tagalogProfile,
];

// =============================================================================
// Build keyword → language(s) map
// =============================================================================

interface KeywordEntry {
  keyword: string;
  languages: string[];
}

function buildKeywordMap(): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const profile of ALL_PROFILES) {
    const code = profile.code;

    // Extract keywords from profile
    for (const [, translation] of Object.entries(profile.keywords)) {
      // Add primary keyword
      const primary = translation.primary.toLowerCase();
      if (primary && primary !== 'todo') {
        if (!map.has(primary)) map.set(primary, []);
        if (!map.get(primary)!.includes(code)) map.get(primary)!.push(code);
      }

      // Add alternatives
      if (translation.alternatives) {
        for (const alt of translation.alternatives) {
          const altLower = alt.toLowerCase();
          if (altLower && altLower !== 'todo') {
            if (!map.has(altLower)) map.set(altLower, []);
            if (!map.get(altLower)!.includes(code)) map.get(altLower)!.push(code);
          }
        }
      }
    }

    // Add role markers as keywords
    if (profile.roleMarkers) {
      for (const [, marker] of Object.entries(profile.roleMarkers)) {
        if (marker && marker.primary) {
          const markerLower = marker.primary.toLowerCase();
          if (markerLower && markerLower.length > 0) {
            if (!map.has(markerLower)) map.set(markerLower, []);
            if (!map.get(markerLower)!.includes(code)) map.get(markerLower)!.push(code);
          }
          if (marker.alternatives) {
            for (const alt of marker.alternatives) {
              const altLower = alt.toLowerCase();
              if (altLower && altLower.length > 0) {
                if (!map.has(altLower)) map.set(altLower, []);
                if (!map.get(altLower)!.includes(code)) map.get(altLower)!.push(code);
              }
            }
          }
        }
      }
    }

    // Add event handler keywords
    if (profile.eventHandler) {
      const eh = profile.eventHandler;
      if (eh.keyword?.primary) {
        const kw = eh.keyword.primary.toLowerCase();
        if (!map.has(kw)) map.set(kw, []);
        if (!map.get(kw)!.includes(code)) map.get(kw)!.push(code);
      }
      if (eh.eventMarker?.primary) {
        const em = eh.eventMarker.primary.toLowerCase();
        if (!map.has(em)) map.set(em, []);
        if (!map.get(em)!.includes(code)) map.get(em)!.push(code);
      }
    }
  }

  return map;
}

// =============================================================================
// Generate script detection map
// =============================================================================

interface ScriptRange {
  start: number;
  end: number;
  languages: string[];
}

function getScriptRanges(): ScriptRange[] {
  // Map Unicode script ranges to languages
  return [
    { start: 0x3040, end: 0x309F, languages: ['ja'] },     // Hiragana
    { start: 0x30A0, end: 0x30FF, languages: ['ja'] },     // Katakana
    { start: 0x4E00, end: 0x9FFF, languages: ['ja', 'zh'] }, // CJK Unified
    { start: 0xAC00, end: 0xD7AF, languages: ['ko'] },     // Hangul
    { start: 0x0600, end: 0x06FF, languages: ['ar'] },     // Arabic
    { start: 0x0590, end: 0x05FF, languages: ['he'] },     // Hebrew
    { start: 0x0400, end: 0x04FF, languages: ['ru', 'uk'] }, // Cyrillic
    { start: 0x0900, end: 0x097F, languages: ['hi'] },     // Devanagari
    { start: 0x0980, end: 0x09FF, languages: ['bn'] },     // Bengali
    { start: 0x0E00, end: 0x0E7F, languages: ['th'] },     // Thai
  ];
}

// =============================================================================
// Generate TypeScript module
// =============================================================================

function generateModule(keywordMap: Map<string, string[]>): string {
  const entries: string[] = [];

  // Sort by keyword for deterministic output
  const sorted = [...keywordMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  for (const [keyword, languages] of sorted) {
    // Escape single quotes in keyword
    const escaped = keyword.replace(/'/g, "\\'");
    entries.push(`  '${escaped}': [${languages.map(l => `'${l}'`).join(', ')}]`);
  }

  const scriptRanges = getScriptRanges();
  const scriptRangesCode = scriptRanges
    .map(r => `  { start: 0x${r.start.toString(16).toUpperCase()}, end: 0x${r.end.toString(16).toUpperCase()}, languages: [${r.languages.map(l => `'${l}'`).join(', ')}] }`)
    .join(',\n');

  return `// @generated from semantic profiles — do not edit manually
// Regenerate: npx tsx scripts/generate-nearley-grammar.ts
// Source: packages/semantic/src/generators/profiles/*.ts

/**
 * Keyword → language(s) lookup table for language detection.
 * Generated from ${ALL_PROFILES.length} semantic language profiles.
 *
 * Used by the Nearley-based language detector (Phase 5.1).
 * Each keyword maps to the language(s) that use it as a command keyword.
 */
export const KEYWORD_LANGUAGE_MAP: Record<string, readonly string[]> = {
${entries.join(',\n')},
};

/**
 * Unicode script ranges for non-Latin script detection.
 * Provides instant language identification for CJK, Arabic, Cyrillic, etc.
 */
export const SCRIPT_RANGES: readonly { start: number; end: number; languages: readonly string[] }[] = [
${scriptRangesCode},
];

/**
 * Total keywords: ${keywordMap.size}
 * Total languages: ${ALL_PROFILES.length}
 * Ambiguous keywords (match 2+ languages): ${[...keywordMap.values()].filter(v => v.length > 1).length}
 */
`;
}

// =============================================================================
// Main
// =============================================================================

console.log('=== Generate Nearley Language Grammar ===\n');

const keywordMap = buildKeywordMap();
const ambiguous = [...keywordMap.values()].filter(v => v.length > 1).length;
const unique = keywordMap.size - ambiguous;

console.log(`Keywords: ${keywordMap.size} total (${unique} unique, ${ambiguous} ambiguous)`);
console.log(`Languages: ${ALL_PROFILES.length}`);

const output = generateModule(keywordMap);

if (DRY_RUN) {
  console.log(`\n[DRY RUN] Would write ${output.length} bytes to:`);
  console.log(`  ${OUTPUT_FILE}`);
} else {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`\nWrote ${OUTPUT_FILE}`);
}
