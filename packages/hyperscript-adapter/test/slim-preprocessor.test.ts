/**
 * Integration test for the slim preprocessor path.
 *
 * This verifies the bug fix: per-language bundles import from
 * @lokascript/semantic/core (not the full package) and must wire up
 * the pattern generator themselves. Without that wiring,
 * getPatternsForLanguage() throws for non-English languages and
 * translation silently fails.
 *
 * We replicate the same import chain as a per-language bundle entry:
 *   1. Import setPatternGenerator + generatePatternsForLanguage from core
 *   2. Wire up the pattern generator
 *   3. Register a single language via side-effect import
 *   4. Use preprocessToEnglish from slim-preprocessor
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  setPatternGenerator,
  generatePatternsForLanguage,
  type LanguageProfile,
} from '@lokascript/semantic/core';

// Register Spanish (side-effect import, same as es.ts bundle entry)
import '@lokascript/semantic/languages/es';

// Import from the slim preprocessor — NOT the full preprocessor
import { preprocessToEnglish } from '../src/slim-preprocessor';

beforeAll(() => {
  // Wire up pattern generator — same as shared.ts does
  setPatternGenerator((profile: LanguageProfile) => generatePatternsForLanguage(profile));
});

describe('slim-preprocessor (per-language bundle path)', () => {
  describe('Spanish translation', () => {
    it('translates toggle command', () => {
      const result = preprocessToEnglish('alternar .active', 'es');
      expect(result).toBe('toggle .active');
    });

    it('translates add command with destination', () => {
      const result = preprocessToEnglish('agregar .highlight en #box', 'es');
      expect(result).toBe('add .highlight to #box');
    });

    it('translates remove command', () => {
      const result = preprocessToEnglish('quitar .hidden de yo', 'es');
      expect(result).toBe('remove .hidden from me');
    });

    it('translates put command', () => {
      const result = preprocessToEnglish('poner "hello" en #msg', 'es');
      expect(result).toBe('put "hello" into #msg');
    });

    it('translates show command', () => {
      const result = preprocessToEnglish('mostrar #modal', 'es');
      expect(result).toBe('show #modal');
    });

    it('translates hide command', () => {
      const result = preprocessToEnglish('ocultar #tooltip', 'es');
      expect(result).toBe('hide #tooltip');
    });
  });

  describe('compound statements', () => {
    it('splits on localized then keyword (Spanish: entonces)', () => {
      const result = preprocessToEnglish('alternar .active entonces poner "ok" en #msg', 'es');
      expect(result).toContain('toggle .active');
      expect(result).toContain('then');
      expect(result).toContain('put');
    });

    it('splits on English then even in non-English context', () => {
      const result = preprocessToEnglish('alternar .active then mostrar #modal', 'es');
      expect(result).toContain('toggle .active');
      expect(result).toContain('then');
      expect(result).toContain('show');
    });
  });

  describe('fallback behavior', () => {
    it('returns original for unsupported language', () => {
      const result = preprocessToEnglish('toggle .active', 'xx');
      expect(result).toBe('toggle .active');
    });

    it('returns original for garbled input with high threshold', () => {
      const result = preprocessToEnglish('xyz abc 123', 'es', {
        confidenceThreshold: 1.0,
      });
      expect(result).toBe('xyz abc 123');
    });
  });
});
