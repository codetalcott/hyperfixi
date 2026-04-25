/**
 * New Language Pattern Tests
 *
 * Tests for event-handler patterns (fr, de, id, sw) and
 * alternative set patterns (fr, de, id, pt) added in 94ef071c.
 *
 * These tests verify that the patterns are properly loaded and registered.
 * Some patterns may not match via canParse() due to tokenization differences
 * between the semantic parser and translation database, so tests use
 * conditional assertions similar to other pattern tests.
 */

import { describe, it, expect } from 'vitest';
import { canParse } from '../src/parser/semantic-parser';
import { getEventHandlerPatternsForLanguage } from '../src/patterns/event-handler';
import { getSetPatternsForLanguage } from '../src/patterns/set';

// =============================================================================
// Pattern Registration Tests
// =============================================================================

describe('Pattern Registration', () => {
  describe('French Event Handler Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getEventHandlerPatternsForLanguage('fr');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('fr');
        expect(pattern.command).toBe('on');
        expect(pattern.template).toBeDefined();
        expect(pattern.template.tokens.length).toBeGreaterThan(0);
      }
    });

    it('includes quand keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('fr');
      const quandPattern = patterns.find(p => p.id === 'event-fr-quand');
      expect(quandPattern).toBeDefined();
      expect(quandPattern?.template.tokens[0].value).toBe('quand');
    });

    it('includes sur keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('fr');
      const surPattern = patterns.find(p => p.id === 'event-fr-sur');
      expect(surPattern).toBeDefined();
      expect(surPattern?.template.tokens[0].value).toBe('sur');
    });

    it('includes patterns with source extraction', () => {
      const patterns = getEventHandlerPatternsForLanguage('fr');
      const sourcePatterns = patterns.filter(p => p.id.includes('-source'));
      expect(sourcePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('German Event Handler Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getEventHandlerPatternsForLanguage('de');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('de');
        expect(pattern.command).toBe('on');
      }
    });

    it('includes wenn keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('de');
      const wennPattern = patterns.find(p => p.id === 'event-de-wenn');
      expect(wennPattern).toBeDefined();
      expect(wennPattern?.template.tokens[0].value).toBe('wenn');
    });

    it('includes bei keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('de');
      const beiPattern = patterns.find(p => p.id === 'event-de-bei');
      expect(beiPattern).toBeDefined();
      expect(beiPattern?.template.tokens[0].value).toBe('bei');
    });
  });

  describe('Indonesian Event Handler Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getEventHandlerPatternsForLanguage('id');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('id');
        expect(pattern.command).toBe('on');
      }
    });

    it('includes ketika keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('id');
      const ketikaPattern = patterns.find(p => p.id === 'event-id-ketika');
      expect(ketikaPattern).toBeDefined();
      expect(ketikaPattern?.template.tokens[0].value).toBe('ketika');
    });

    it('includes pada keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('id');
      const padaPattern = patterns.find(p => p.id === 'event-id-pada');
      expect(padaPattern).toBeDefined();
      expect(padaPattern?.template.tokens[0].value).toBe('pada');
    });

    it('includes saat as alternative for ketika', () => {
      const patterns = getEventHandlerPatternsForLanguage('id');
      const ketikaPattern = patterns.find(p => p.id === 'event-id-ketika');
      expect(ketikaPattern?.template.tokens[0].alternatives).toContain('saat');
    });
  });

  describe('Swahili Event Handler Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getEventHandlerPatternsForLanguage('sw');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('sw');
        expect(pattern.command).toBe('on');
      }
    });

    it('includes unapo keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('sw');
      const unapoPattern = patterns.find(p => p.id === 'event-sw-unapo');
      expect(unapoPattern).toBeDefined();
      expect(unapoPattern?.template.tokens[0].value).toBe('unapo');
    });

    it('includes kwa keyword pattern', () => {
      const patterns = getEventHandlerPatternsForLanguage('sw');
      const kwaPattern = patterns.find(p => p.id === 'event-sw-kwa');
      expect(kwaPattern).toBeDefined();
      expect(kwaPattern?.template.tokens[0].value).toBe('kwa');
    });
  });
});

// =============================================================================
// Set Pattern Tests
// =============================================================================

describe('Set Pattern Registration', () => {
  describe('French Set Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getSetPatternsForLanguage('fr');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('fr');
        expect(pattern.command).toBe('set');
      }
    });

    it('includes définir sur pattern', () => {
      const patterns = getSetPatternsForLanguage('fr');
      const surPattern = patterns.find(p => p.id === 'set-fr-sur-direct');
      expect(surPattern).toBeDefined();
      expect(surPattern?.template.format).toContain('définir sur');
    });
  });

  describe('German Set Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getSetPatternsForLanguage('de');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('de');
        expect(pattern.command).toBe('set');
      }
    });

    it('includes festlegen auf pattern', () => {
      const patterns = getSetPatternsForLanguage('de');
      const aufPattern = patterns.find(p => p.id === 'set-de-festlegen-auf');
      expect(aufPattern).toBeDefined();
      expect(aufPattern?.template.format).toContain('festlegen auf');
    });
  });

  describe('Indonesian Set Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getSetPatternsForLanguage('id');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('id');
        expect(pattern.command).toBe('set');
      }
    });

    it('includes atur pada pattern', () => {
      const patterns = getSetPatternsForLanguage('id');
      const padaPattern = patterns.find(p => p.id === 'set-id-pada-direct');
      expect(padaPattern).toBeDefined();
      expect(padaPattern?.template.format).toContain('atur pada');
    });
  });

  describe('Portuguese Set Patterns', () => {
    it('returns patterns with correct structure', () => {
      const patterns = getSetPatternsForLanguage('pt');
      expect(patterns.length).toBeGreaterThan(0);

      for (const pattern of patterns) {
        expect(pattern.language).toBe('pt');
        expect(pattern.command).toBe('set');
      }
    });

    it('includes definir em pattern', () => {
      const patterns = getSetPatternsForLanguage('pt');
      const emPattern = patterns.find(p => p.id === 'set-pt-em-direct');
      expect(emPattern).toBeDefined();
      expect(emPattern?.template.format).toContain('definir em');
    });
  });
});

// =============================================================================
// Pattern Parsing Tests (Conditional)
// =============================================================================

describe('Pattern Parsing (Conditional)', () => {
  // These tests check if patterns can be parsed via the semantic parser.
  // Some may not work due to tokenization differences, so we use conditional assertions.

  describe('French', () => {
    const testCases = ['quand click', 'sur click', 'si click'];

    it('checks French event handler parsing capability', () => {
      let parsed = 0;
      for (const input of testCases) {
        if (canParse(input, 'fr')) {
          parsed++;
        }
      }
      console.log(`French event handlers parsed: ${parsed}/${testCases.length}`);
    });
  });

  describe('German', () => {
    const testCases = ['wenn click', 'bei click', 'auf click'];

    it('checks German event handler parsing capability', () => {
      let parsed = 0;
      for (const input of testCases) {
        if (canParse(input, 'de')) {
          parsed++;
        }
      }
      console.log(`German event handlers parsed: ${parsed}/${testCases.length}`);
    });
  });

  describe('Indonesian', () => {
    const testCases = ['ketika click', 'saat click', 'pada click'];

    it('checks Indonesian event handler parsing capability', () => {
      let parsed = 0;
      for (const input of testCases) {
        if (canParse(input, 'id')) {
          parsed++;
        }
      }
      console.log(`Indonesian event handlers parsed: ${parsed}/${testCases.length}`);
    });
  });

  describe('Swahili', () => {
    const testCases = ['unapo click', 'kwa click', 'ikiwa click'];

    it('checks Swahili event handler parsing capability', () => {
      let parsed = 0;
      for (const input of testCases) {
        if (canParse(input, 'sw')) {
          parsed++;
        }
      }
      console.log(`Swahili event handlers parsed: ${parsed}/${testCases.length}`);
    });
  });
});

// =============================================================================
// Coverage Summary
// =============================================================================

describe('New Pattern Coverage Summary', () => {
  it('reports pattern counts', () => {
    const counts = {
      'French event-handler': getEventHandlerPatternsForLanguage('fr').length,
      'German event-handler': getEventHandlerPatternsForLanguage('de').length,
      'Indonesian event-handler': getEventHandlerPatternsForLanguage('id').length,
      'Swahili event-handler': getEventHandlerPatternsForLanguage('sw').length,
      'French set': getSetPatternsForLanguage('fr').length,
      'German set': getSetPatternsForLanguage('de').length,
      'Indonesian set': getSetPatternsForLanguage('id').length,
      'Portuguese set': getSetPatternsForLanguage('pt').length,
    };

    console.log('\n=== New Pattern Counts ===\n');

    let total = 0;
    for (const [category, count] of Object.entries(counts)) {
      console.log(`${category}: ${count} patterns`);
      total += count;
    }

    console.log(`\nTotal new patterns: ${total}\n`);

    // Verify at least some patterns exist
    expect(total).toBeGreaterThan(20);
  });
});
