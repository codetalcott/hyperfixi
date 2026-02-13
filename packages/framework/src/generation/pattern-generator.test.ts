/**
 * Pattern Generator Tests
 *
 * Tests the pattern generation system that creates LanguagePattern objects
 * from CommandSchema + LanguageProfile combinations.
 */

import { describe, it, expect } from 'vitest';
import { generatePattern, type PatternGenLanguageProfile } from './pattern-generator';
import { defineCommand, defineRole } from '../schema';

describe('PatternGenerator', () => {
  describe('generatePattern', () => {
    it('should generate a basic SVO pattern', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['selector'],
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          toggle: { primary: 'toggle' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.id).toBe('toggle-en-generated');
      expect(pattern.language).toBe('en');
      expect(pattern.command).toBe('toggle');
      expect(pattern.priority).toBe(100);
      expect(pattern.template.tokens).toHaveLength(2);
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'toggle' });
      expect(pattern.template.tokens[1]).toEqual({ type: 'role', role: 'patient' });
    });

    it('should generate an SOV pattern with verb last', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['selector'],
            sovPosition: 1,
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'ja',
        wordOrder: 'SOV',
        keywords: {
          toggle: { primary: 'トグル' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.template.tokens).toHaveLength(2);
      // In SOV, role comes first, then verb
      expect(pattern.template.tokens[0]).toEqual({ type: 'role', role: 'patient' });
      expect(pattern.template.tokens[1]).toEqual({ type: 'literal', value: 'トグル' });
    });

    it('should generate a VSO pattern with verb first', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['selector'],
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'ar',
        wordOrder: 'VSO',
        keywords: {
          toggle: { primary: 'بدّل' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.template.tokens).toHaveLength(2);
      // VSO is like SVO - verb first
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'بدّل' });
      expect(pattern.template.tokens[1]).toEqual({ type: 'role', role: 'patient' });
    });

    it('should include role markers when specified', () => {
      const schema = defineCommand({
        action: 'get',
        roles: [
          defineRole({
            role: 'target',
            required: true,
            expectedTypes: ['expression'],
            markerOverride: { en: 'from' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          get: { primary: 'get' },
        },
        roleMarkers: {
          target: { primary: 'from', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      // Should have: get, from (marker), target (role)
      expect(pattern.template.tokens).toHaveLength(3);
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'get' });
      expect(pattern.template.tokens[1]).toEqual({ type: 'literal', value: 'from' });
      expect(pattern.template.tokens[2]).toEqual({ type: 'role', role: 'target' });
    });

    it('should handle optional roles with groups', () => {
      const schema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
          }),
          defineRole({
            role: 'source',
            required: false,
            expectedTypes: ['expression'],
            markerOverride: { en: 'from' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          select: { primary: 'select' },
        },
        roleMarkers: {
          source: { primary: 'from', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      // Should have optional group for source
      expect(
        pattern.template.tokens.some(t => t.type === 'group' && 'optional' in t && t.optional)
      ).toBe(true);
    });

    it('should build extraction rules for all roles', () => {
      const schema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
          }),
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            markerOverride: { en: 'from' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          select: { primary: 'select' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.extraction).toHaveProperty('columns');
      expect(pattern.extraction).toHaveProperty('source');
    });

    it('should use marker-based extraction when marker exists', () => {
      const schema = defineCommand({
        action: 'get',
        roles: [
          defineRole({
            role: 'target',
            required: true,
            expectedTypes: ['expression'],
            markerOverride: { en: 'from' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          get: { primary: 'get' },
        },
        roleMarkers: {
          target: { primary: 'from', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.extraction.target).toHaveProperty('marker', 'from');
    });

    it('should throw error for missing keyword translation', () => {
      const schema = defineCommand({
        action: 'unknown',
        roles: [],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          toggle: { primary: 'toggle' },
        },
      };

      expect(() => generatePattern(schema, profile)).toThrow(
        "No keyword translation for 'unknown' in en"
      );
    });

    it('should respect custom priority configuration', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          toggle: { primary: 'toggle' },
        },
      };

      const pattern = generatePattern(schema, profile, { basePriority: 50 });

      expect(pattern.priority).toBe(50);
    });

    it('should handle multiple roles with correct ordering', () => {
      const schema = defineCommand({
        action: 'put',
        roles: [
          defineRole({
            role: 'value',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
          }),
          defineRole({
            role: 'destination',
            required: true,
            expectedTypes: ['selector'],
            svoPosition: 1,
            markerOverride: { en: 'into' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          put: { primary: 'put' },
        },
        roleMarkers: {
          destination: { primary: 'into', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      // Should be: put, value (higher svoPosition = first), into, destination
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'put' });
      expect(pattern.template.tokens[1]).toEqual({ type: 'role', role: 'value' });
      expect(pattern.template.tokens[2]).toEqual({ type: 'literal', value: 'into' });
      expect(pattern.template.tokens[3]).toEqual({ type: 'role', role: 'destination' });
    });

    it('should generate format string for documentation', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['selector'],
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          toggle: { primary: 'toggle' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.template.format).toBeTruthy();
      expect(typeof pattern.template.format).toBe('string');
      expect(pattern.template.format).toContain('toggle');
    });

    it('should handle empty roles array', () => {
      const schema = defineCommand({
        action: 'reload',
        roles: [],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          reload: { primary: 'reload' },
        },
      };

      const pattern = generatePattern(schema, profile);

      expect(pattern.template.tokens).toHaveLength(1);
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'reload' });
    });

    it('should handle alternative keywords', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['selector'],
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          toggle: { primary: 'toggle', alternatives: ['switch'] },
        },
      };

      const pattern = generatePattern(schema, profile);

      // Primary keyword should be used in tokens
      expect(pattern.template.tokens[0]).toEqual({ type: 'literal', value: 'toggle' });
      // Alternatives could be stored in token alternatives field (implementation-dependent)
    });

    it('should use markerOverride from role spec', () => {
      const schema = defineCommand({
        action: 'get',
        roles: [
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            markerOverride: { en: 'from', es: 'de' },
          }),
        ],
      });

      const englishProfile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          get: { primary: 'get' },
        },
      };

      const spanishProfile: PatternGenLanguageProfile = {
        code: 'es',
        wordOrder: 'SVO',
        keywords: {
          get: { primary: 'obtener' },
        },
      };

      const enPattern = generatePattern(schema, englishProfile);
      const esPattern = generatePattern(schema, spanishProfile);

      // English should have 'from' marker
      expect(enPattern.template.tokens.some(t => t.type === 'literal' && t.value === 'from')).toBe(
        true
      );
      // Spanish should have 'de' marker
      expect(esPattern.template.tokens.some(t => t.type === 'literal' && t.value === 'de')).toBe(
        true
      );
    });
  });
});
