// packages/i18n/src/parser/analyze-conflicts.test.ts
/**
 * Analyzes dictionaries for parsing conflicts.
 *
 * A conflict occurs when the same locale word maps to different English words
 * across different categories (e.g., 'de' in Spanish maps to both 'from' and 'of').
 *
 * The priority system in create-provider.ts handles these by giving priority to:
 * commands > logical > events > values > temporal > modifiers > attributes
 */

import { describe, it, expect } from 'vitest';
import { es } from '../dictionaries/es';
import { ja } from '../dictionaries/ja';
import { fr } from '../dictionaries/fr';
import { de } from '../dictionaries/de';
import { ar } from '../dictionaries/ar';
import { ko } from '../dictionaries/ko';
import { zh } from '../dictionaries/zh';
import { tr } from '../dictionaries/tr';
import type { Dictionary } from '../types';

interface Conflict {
  localeWord: string;
  mappings: Array<{ english: string; category: string }>;
}

function analyzeConflicts(dictionary: Dictionary, localeName: string): Conflict[] {
  const conflicts: Conflict[] = [];
  const wordMap = new Map<string, Array<{ english: string; category: string }>>();

  const categories = [
    { name: 'commands', data: dictionary.commands },
    { name: 'modifiers', data: dictionary.modifiers },
    { name: 'events', data: dictionary.events },
    { name: 'logical', data: dictionary.logical },
    { name: 'temporal', data: dictionary.temporal },
    { name: 'values', data: dictionary.values },
    { name: 'attributes', data: dictionary.attributes },
  ];

  for (const { name, data } of categories) {
    if (!data) continue;
    for (const [english, locale] of Object.entries(data)) {
      const normalized = locale.toLowerCase();
      if (!wordMap.has(normalized)) {
        wordMap.set(normalized, []);
      }
      wordMap.get(normalized)!.push({ english: english.toLowerCase(), category: name });
    }
  }

  // Find words with multiple mappings
  for (const [localeWord, mappings] of wordMap) {
    if (mappings.length > 1) {
      // Check if they map to different English words
      const uniqueEnglish = new Set(mappings.map(m => m.english));
      if (uniqueEnglish.size > 1) {
        conflicts.push({ localeWord, mappings });
      }
    }
  }

  return conflicts;
}

describe('Dictionary Conflict Analysis', () => {
  describe('Spanish (es)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(es, 'es');
      console.log('\n=== Spanish Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Known conflicts: 'en' (on/in/into), 'de' (from/of)
      // These are handled by priority - commands win
      expect(conflicts.length).toBeGreaterThan(0);

      // Verify 'en' conflict exists
      const enConflict = conflicts.find(c => c.localeWord === 'en');
      expect(enConflict).toBeDefined();
    });
  });

  describe('Japanese (ja)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(ja, 'ja');
      console.log('\n=== Japanese Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Document any conflicts found
      if (conflicts.length === 0) {
        console.log('  No conflicts found!');
      }
    });
  });

  describe('French (fr)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(fr, 'fr');
      console.log('\n=== French Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // 'à' maps to both 'to' and 'at', 'de' maps to 'from' and 'of'
      const aConflict = conflicts.find(c => c.localeWord === 'à');
      expect(aConflict).toBeDefined();
    });
  });

  describe('German (de)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(de, 'de');
      console.log('\n=== German Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Document any conflicts
      if (conflicts.length === 0) {
        console.log('  No conflicts found!');
      }
    });
  });

  describe('Arabic (ar)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(ar, 'ar');
      console.log('\n=== Arabic Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Document any conflicts
      if (conflicts.length === 0) {
        console.log('  No conflicts found!');
      }
    });
  });

  describe('Korean (ko)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(ko, 'ko');
      console.log('\n=== Korean Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Korean has notable conflicts: '에' (on/to/at), '동안' (for/while), '아니면' (unless/else)
      const aeConflict = conflicts.find(c => c.localeWord === '에');
      expect(aeConflict).toBeDefined();
    });
  });

  describe('Chinese (zh)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(zh, 'zh');
      console.log('\n=== Chinese Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Chinese has notable conflicts: '当' (on/while), '获取' (take/get/fetch)
      const dangConflict = conflicts.find(c => c.localeWord === '当');
      expect(dangConflict).toBeDefined();
    });
  });

  describe('Turkish (tr)', () => {
    it('should identify conflicts', () => {
      const conflicts = analyzeConflicts(tr, 'tr');
      console.log('\n=== Turkish Conflicts ===');
      for (const c of conflicts) {
        console.log(`  '${c.localeWord}' maps to:`);
        for (const m of c.mappings) {
          console.log(`    - '${m.english}' (${m.category})`);
        }
      }

      // Document any conflicts
      if (conflicts.length === 0) {
        console.log('  No conflicts found!');
      }
    });
  });

  describe('Priority Resolution', () => {
    it('should explain how conflicts are resolved', () => {
      // This test documents the priority system
      console.log('\n=== Conflict Resolution Strategy ===');
      console.log('Priority order (highest to lowest):');
      console.log('  1. commands - core actions like toggle, put, set');
      console.log('  2. logical - operators like and, or, then, else');
      console.log('  3. events - DOM events like click, focus');
      console.log('  4. values - literals like true, false, me, it');
      console.log('  5. temporal - time units like seconds, ms');
      console.log('  6. modifiers - prepositions like to, from, with');
      console.log('  7. attributes - DOM properties like class, style');
      console.log('\nExample: Spanish "en" maps to both "on" (command) and "in" (modifier)');
      console.log('  → Resolution: "en" resolves to "on" because commands have priority');
      expect(true).toBe(true);
    });
  });
});
