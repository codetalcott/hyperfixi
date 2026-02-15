/**
 * Pattern Matcher Tests
 *
 * Tests the core pattern matching algorithm that converts token streams
 * into semantic representations by matching against language patterns.
 *
 * Uses PatternGenerator to create realistic patterns rather than manual construction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher, type PatternMatcherProfile } from './pattern-matcher';
import type { LanguagePattern } from '../types';
import { createMockTokenStream, expectConfidenceRange } from '../../__test__/test-utils';
import { createToken, createPosition, TokenStreamImpl } from '../tokenization';
import {
  generatePattern,
  type PatternGenLanguageProfile,
} from '../../generation/pattern-generator';
import { defineCommand, defineRole } from '../../schema';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('Core Matching Algorithm', () => {
    describe('exact literal matching', () => {
      it('should match a simple command with role', () => {
        const schema = defineCommand({
          action: 'toggle',
          roles: [
            defineRole({
              role: 'patient',
              required: true,
              expectedTypes: ['expression'],
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

        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'toggle', position: createPosition(0, 6) }),
          createToken({ kind: 'identifier', value: 'button', position: createPosition(7, 13) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('patient')).toBe(true);
      });

      it('should fail when keyword does not match', () => {
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

        const pattern = generatePattern(schema, profile);

        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).toBeNull();
      });

      it('should match with role markers', () => {
        const schema = defineCommand({
          action: 'get',
          roles: [
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
            get: { primary: 'get' },
          },
          roleMarkers: {
            source: { primary: 'from', position: 'before' },
          },
        };

        const pattern = generatePattern(schema, profile);

        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'get', position: createPosition(0, 3) }),
          createToken({ kind: 'keyword', value: 'from', position: createPosition(4, 8) }),
          createToken({ kind: 'identifier', value: 'users', position: createPosition(9, 14) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('source')).toBe(true);
      });
    });

    describe('role capture', () => {
      it('should capture multiple roles in SQL-like pattern', () => {
        const schema = defineCommand({
          action: 'select',
          roles: [
            defineRole({
              role: 'columns',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 2,
            }),
            defineRole({
              role: 'source',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 1,
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

        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
          createToken({ kind: 'identifier', value: 'name', position: createPosition(7, 11) }),
          createToken({ kind: 'keyword', value: 'from', position: createPosition(12, 16) }),
          createToken({ kind: 'identifier', value: 'users', position: createPosition(17, 22) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('columns')).toBe(true);
        expect(result?.captured.has('source')).toBe(true);
      });

      it('should match keyword tokens against roles expecting expression type', () => {
        // Regression: keywords produce 'literal' semantic type but 'expression'
        // in expectedTypes should act as a wildcard accepting any type.
        const schema = defineCommand({
          action: 'given',
          roles: [
            defineRole({
              role: 'target',
              required: true,
              expectedTypes: ['expression', 'selector'],
              svoPosition: 2,
            }),
            defineRole({
              role: 'state',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 1,
              markerOverride: { en: 'is' },
            }),
          ],
        });

        const profile: PatternGenLanguageProfile = {
          code: 'en',
          wordOrder: 'SVO',
          keywords: {
            given: { primary: 'given' },
          },
          roleMarkers: {
            state: { primary: 'is', position: 'before' },
          },
        };

        const pattern = generatePattern(schema, profile);

        // 'exists' is a keyword token filling the state role
        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'given', position: createPosition(0, 5) }),
          createToken({ kind: 'selector', value: '#button', position: createPosition(6, 13) }),
          createToken({ kind: 'keyword', value: 'is', position: createPosition(14, 16) }),
          createToken({ kind: 'keyword', value: 'exists', position: createPosition(17, 23) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('target')).toBe(true);
        expect(result?.captured.has('state')).toBe(true);
      });

      it('should apply default values for optional roles', () => {
        const schema = defineCommand({
          action: 'select',
          roles: [
            defineRole({
              role: 'columns',
              required: false,
              expectedTypes: ['expression'],
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

        // Add default value in extraction
        pattern.extraction.columns = {
          ...pattern.extraction.columns,
          default: { type: 'literal', value: '*' },
        };

        const tokens = createMockTokenStream([
          createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        // Default should be applied
        expect(result?.captured.has('columns')).toBe(true);
        const columns = result?.captured.get('columns');
        if (columns && columns.type === 'literal') {
          expect(columns.value).toBe('*');
        }
      });
    });

    describe('SOV word order', () => {
      it('should match Japanese-style SOV pattern', () => {
        const schema = defineCommand({
          action: 'toggle',
          roles: [
            defineRole({
              role: 'patient',
              required: true,
              expectedTypes: ['expression'],
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

        const tokens = createMockTokenStream([
          createToken({ kind: 'identifier', value: 'button', position: createPosition(0, 6) }),
          createToken({ kind: 'keyword', value: 'トグル', position: createPosition(7, 11) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('patient')).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should return null for empty token stream', () => {
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

      const pattern = generatePattern(schema, profile);
      const tokens = createMockTokenStream([]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).toBeNull();
    });

    it('should reset token position on failed match', () => {
      const schema = defineCommand({
        action: 'select',
        roles: [
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
        roleMarkers: {
          source: { primary: 'from', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
        createToken({ kind: 'identifier', value: 'name', position: createPosition(7, 11) }),
        // Missing 'from' marker - should fail
      ]);

      const initialPosition = tokens.position();
      matcher.matchPattern(tokens, pattern);

      // Token position should be reset after failed match
      expect(tokens.position()).toBe(initialPosition);
    });
  });

  describe('matchBest', () => {
    it('should return highest confidence match from multiple patterns', () => {
      const simpleSchema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
          }),
        ],
      });

      const complexSchema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
          }),
          defineRole({
            role: 'source',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
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

      const pattern1 = generatePattern(simpleSchema, profile, { basePriority: 50 });
      const pattern2 = generatePattern(complexSchema, profile, { basePriority: 50 });

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
        createToken({ kind: 'identifier', value: 'name', position: createPosition(7, 11) }),
        createToken({ kind: 'keyword', value: 'from', position: createPosition(12, 16) }),
        createToken({ kind: 'identifier', value: 'users', position: createPosition(17, 22) }),
      ]);

      const result = matcher.matchBest(tokens, [pattern1, pattern2]);

      expect(result).not.toBeNull();
      // More complete pattern should have higher confidence
      expect(result?.captured.has('source')).toBe(true);
    });

    it('should return null when no patterns match', () => {
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

      const pattern = generatePattern(schema, profile);

      const tokens = createMockTokenStream([
        createToken({ kind: 'identifier', value: 'unknown', position: createPosition(0, 7) }),
      ]);

      const result = matcher.matchBest(tokens, [pattern]);

      expect(result).toBeNull();
    });

    it('should handle empty pattern array', () => {
      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
      ]);

      const result = matcher.matchBest(tokens, []);

      expect(result).toBeNull();
    });
  });

  describe('Static Value Extraction', () => {
    it('should apply static value extraction from extraction rules', () => {
      const schema = defineCommand({
        action: 'toggle',
        roles: [
          defineRole({
            role: 'patient',
            required: true,
            expectedTypes: ['expression'],
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

      // Add static value extraction
      pattern.extraction.action = { value: 'toggle' };

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'toggle', position: createPosition(0, 6) }),
        createToken({ kind: 'identifier', value: 'button', position: createPosition(7, 13) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('action')).toBe(true);
      const action = result?.captured.get('action');
      if (action && action.type === 'literal') {
        expect(action.value).toBe('toggle');
      }
    });
  });

  describe('Confidence Scoring', () => {
    it('should return high confidence for complete matches', () => {
      const schema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: true,
            expectedTypes: ['expression'],
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

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'select', position: createPosition(0, 6) }),
        createToken({ kind: 'identifier', value: 'name', position: createPosition(7, 11) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expectConfidenceRange(result, 0.8, 1.0);
    });
  });
});
