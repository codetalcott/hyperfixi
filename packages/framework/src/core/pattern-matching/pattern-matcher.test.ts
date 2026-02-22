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

      it('should stop greedy role inside group at parent verb keyword (SOV WHERE)', () => {
        // SOV pattern: [source] から [columns] [GROUP: 条件 condition(greedy)] 選択
        // Input: users から name 条件 age > 18 選択
        // The greedy condition role must stop at 選択 (the verb keyword outside the group)
        const schema = defineCommand({
          action: 'select',
          roles: [
            defineRole({
              role: 'columns',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 2,
              sovPosition: 1,
            }),
            defineRole({
              role: 'source',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 1,
              sovPosition: 2,
              markerOverride: { ja: 'から' },
            }),
            defineRole({
              role: 'condition',
              required: false,
              expectedTypes: ['expression'],
              greedy: true,
              svoPosition: 0,
              sovPosition: 0,
              markerOverride: { ja: '条件' },
            }),
          ],
        });

        const profile: PatternGenLanguageProfile = {
          code: 'ja',
          wordOrder: 'SOV',
          keywords: {
            select: { primary: '選択' },
          },
          roleMarkers: {
            condition: { primary: '条件', position: 'before' },
          },
        };

        const pattern = generatePattern(schema, profile);

        // Input: users から name 条件 age > 18 選択
        const tokens = createMockTokenStream([
          createToken({ kind: 'identifier', value: 'users', position: createPosition(0, 5) }),
          createToken({ kind: 'keyword', value: 'から', position: createPosition(6, 8) }),
          createToken({ kind: 'identifier', value: 'name', position: createPosition(9, 13) }),
          createToken({ kind: 'keyword', value: '条件', position: createPosition(14, 16) }),
          createToken({ kind: 'identifier', value: 'age', position: createPosition(17, 20) }),
          createToken({ kind: 'operator', value: '>', position: createPosition(21, 22) }),
          createToken({ kind: 'literal', value: '18', position: createPosition(23, 25) }),
          createToken({ kind: 'keyword', value: '選択', position: createPosition(26, 28) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('source')).toBe(true);
        expect(result?.captured.get('source')).toMatchObject({ raw: 'users' });
        expect(result?.captured.has('columns')).toBe(true);
        expect(result?.captured.get('columns')).toMatchObject({ raw: 'name' });
        expect(result?.captured.has('condition')).toBe(true);
        expect(result?.captured.get('condition')).toMatchObject({ raw: 'age > 18' });
      });

      it('should match SOV pattern without optional greedy group', () => {
        // Same schema but input has no WHERE clause
        // Input: users から name 選択
        const schema = defineCommand({
          action: 'select',
          roles: [
            defineRole({
              role: 'columns',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 2,
              sovPosition: 1,
            }),
            defineRole({
              role: 'source',
              required: true,
              expectedTypes: ['expression'],
              svoPosition: 1,
              sovPosition: 2,
              markerOverride: { ja: 'から' },
            }),
            defineRole({
              role: 'condition',
              required: false,
              expectedTypes: ['expression'],
              greedy: true,
              svoPosition: 0,
              sovPosition: 0,
              markerOverride: { ja: '条件' },
            }),
          ],
        });

        const profile: PatternGenLanguageProfile = {
          code: 'ja',
          wordOrder: 'SOV',
          keywords: {
            select: { primary: '選択' },
          },
          roleMarkers: {
            condition: { primary: '条件', position: 'before' },
          },
        };

        const pattern = generatePattern(schema, profile);

        const tokens = createMockTokenStream([
          createToken({ kind: 'identifier', value: 'users', position: createPosition(0, 5) }),
          createToken({ kind: 'keyword', value: 'から', position: createPosition(6, 8) }),
          createToken({ kind: 'identifier', value: 'name', position: createPosition(9, 13) }),
          createToken({ kind: 'keyword', value: '選択', position: createPosition(14, 16) }),
        ]);

        const result = matcher.matchPattern(tokens, pattern);

        expect(result).not.toBeNull();
        expect(result?.captured.has('source')).toBe(true);
        expect(result?.captured.has('columns')).toBe(true);
        expect(result?.captured.has('condition')).toBe(false);
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

  describe('Backtracking', () => {
    it('should skip optional unmarked role when next literal needs the token', () => {
      // Pattern: select [columns? (expression)] 'from' [source (expression)]
      // Input: "select from users"
      // Without backtracking: columns="from", then literal 'from' fails
      // With backtracking: columns skipped, from matches literal, source="users"
      const schema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: false,
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
        createToken({ kind: 'keyword', value: 'from', position: createPosition(7, 11) }),
        createToken({ kind: 'identifier', value: 'users', position: createPosition(12, 17) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('columns')).toBe(false);
      expect(result?.captured.has('source')).toBe(true);
    });

    it('should still capture optional role when token is not the next literal', () => {
      // Pattern: select [columns? (expression)] 'from' [source (expression)]
      // Input: "select name from users"
      // columns="name" (not a literal match), from matches, source="users"
      const schema = defineCommand({
        action: 'select',
        roles: [
          defineRole({
            role: 'columns',
            required: false,
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

    it('should backtrack optional role when keyword was consumed as identifier', () => {
      // Pattern: command [target? (expression)] 'to' [destination (expression)]
      // Input: "command to output"
      // "to" is keyword, optional target consumes it, then literal 'to' fails
      // Backtrack: skip target, 'to' matches literal, destination="output"
      const schema = defineCommand({
        action: 'send',
        roles: [
          defineRole({
            role: 'target',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 2,
          }),
          defineRole({
            role: 'destination',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 1,
            markerOverride: { en: 'to' },
          }),
        ],
      });

      const profile: PatternGenLanguageProfile = {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          send: { primary: 'send' },
        },
        roleMarkers: {
          destination: { primary: 'to', position: 'before' },
        },
      };

      const pattern = generatePattern(schema, profile);

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'send', position: createPosition(0, 4) }),
        createToken({ kind: 'keyword', value: 'to', position: createPosition(5, 7) }),
        createToken({ kind: 'identifier', value: 'output', position: createPosition(8, 14) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('target')).toBe(false);
      expect(result?.captured.has('destination')).toBe(true);
    });

    it('should not backtrack when optional role has a marker (group)', () => {
      // When optional roles have markers, they form groups that already
      // handle backtracking via matchGroupToken. Verify this still works.
      // Pattern: command ['with' target?] 'from' [source]
      // Input: "command from users"
      // The optional group [with target] is skipped (no 'with' found)
      const schema = defineCommand({
        action: 'get',
        roles: [
          defineRole({
            role: 'target',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 2,
            markerOverride: { en: 'with' },
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
          get: { primary: 'get' },
        },
        roleMarkers: {
          target: { primary: 'with', position: 'before' },
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
      expect(result?.captured.has('target')).toBe(false);
      expect(result?.captured.has('source')).toBe(true);
    });
  });

  describe('Marker scan for optional groups', () => {
    // Schema: command [actor?] action ['on' target?] ['into' destination?]
    function createScanSchema() {
      return defineCommand({
        action: 'do',
        roles: [
          defineRole({
            role: 'actor',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 3,
          }),
          defineRole({
            role: 'verb',
            required: true,
            expectedTypes: ['expression'],
            svoPosition: 2,
          }),
          defineRole({
            role: 'target',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 1,
            markerOverride: { en: 'on' },
          }),
          defineRole({
            role: 'destination',
            required: false,
            expectedTypes: ['expression'],
            svoPosition: 0,
            markerOverride: { en: 'into' },
          }),
        ],
      });
    }

    function createScanProfile(): PatternGenLanguageProfile {
      return {
        code: 'en',
        wordOrder: 'SVO',
        keywords: {
          do: { primary: 'do' },
        },
        roleMarkers: {
          target: { primary: 'on', position: 'before' },
          destination: { primary: 'into', position: 'before' },
        },
      };
    }

    it('should find marker past one intervening token', () => {
      const pattern = generatePattern(createScanSchema(), createScanProfile());

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'do', position: createPosition(0, 2) }),
        createToken({ kind: 'identifier', value: 'user', position: createPosition(3, 7) }),
        createToken({ kind: 'identifier', value: 'types', position: createPosition(8, 13) }),
        createToken({ kind: 'identifier', value: 'hello', position: createPosition(14, 19) }),
        createToken({ kind: 'keyword', value: 'into', position: createPosition(20, 24) }),
        createToken({ kind: 'identifier', value: 'output', position: createPosition(25, 31) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('actor')).toBe(true);
      expect(result?.captured.has('verb')).toBe(true);
      expect(result?.captured.has('destination')).toBe(true);
      expect(result?.captured.get('destination')).toMatchObject({ raw: 'output' });
    });

    it('should find marker past two intervening tokens', () => {
      const pattern = generatePattern(createScanSchema(), createScanProfile());

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'do', position: createPosition(0, 2) }),
        createToken({ kind: 'identifier', value: 'user', position: createPosition(3, 7) }),
        createToken({ kind: 'identifier', value: 'types', position: createPosition(8, 13) }),
        createToken({ kind: 'identifier', value: 'hello', position: createPosition(14, 19) }),
        createToken({ kind: 'identifier', value: 'world', position: createPosition(20, 25) }),
        createToken({ kind: 'keyword', value: 'into', position: createPosition(26, 30) }),
        createToken({ kind: 'identifier', value: 'output', position: createPosition(31, 37) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('destination')).toBe(true);
      expect(result?.captured.get('destination')).toMatchObject({ raw: 'output' });
    });

    it('should not scan when group matches immediately', () => {
      const pattern = generatePattern(createScanSchema(), createScanProfile());

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'do', position: createPosition(0, 2) }),
        createToken({ kind: 'identifier', value: 'user', position: createPosition(3, 7) }),
        createToken({ kind: 'identifier', value: 'types', position: createPosition(8, 13) }),
        createToken({ kind: 'keyword', value: 'on', position: createPosition(14, 16) }),
        createToken({ kind: 'identifier', value: 'button', position: createPosition(17, 23) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('target')).toBe(true);
      expect(result?.captured.get('target')).toMatchObject({ raw: 'button' });
    });

    it('should not exceed MAX_MARKER_SCAN (3 tokens)', () => {
      const pattern = generatePattern(createScanSchema(), createScanProfile());

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'do', position: createPosition(0, 2) }),
        createToken({ kind: 'identifier', value: 'user', position: createPosition(3, 7) }),
        createToken({ kind: 'identifier', value: 'types', position: createPosition(8, 13) }),
        createToken({ kind: 'identifier', value: 'a', position: createPosition(14, 15) }),
        createToken({ kind: 'identifier', value: 'b', position: createPosition(16, 17) }),
        createToken({ kind: 'identifier', value: 'c', position: createPosition(18, 19) }),
        createToken({ kind: 'identifier', value: 'd', position: createPosition(20, 21) }),
        createToken({ kind: 'keyword', value: 'into', position: createPosition(22, 26) }),
        createToken({ kind: 'identifier', value: 'output', position: createPosition(27, 33) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      // Match succeeds (all required roles match) but destination not captured
      // because 'into' is 4 tokens away (> MAX_MARKER_SCAN of 3)
      expect(result).not.toBeNull();
      expect(result?.captured.has('destination')).toBe(false);
    });

    it('should match both groups when both markers present', () => {
      const pattern = generatePattern(createScanSchema(), createScanProfile());

      const tokens = createMockTokenStream([
        createToken({ kind: 'keyword', value: 'do', position: createPosition(0, 2) }),
        createToken({ kind: 'identifier', value: 'user', position: createPosition(3, 7) }),
        createToken({ kind: 'identifier', value: 'types', position: createPosition(8, 13) }),
        createToken({ kind: 'keyword', value: 'on', position: createPosition(14, 16) }),
        createToken({ kind: 'identifier', value: 'button', position: createPosition(17, 23) }),
        createToken({ kind: 'keyword', value: 'into', position: createPosition(24, 28) }),
        createToken({ kind: 'identifier', value: 'output', position: createPosition(29, 35) }),
      ]);

      const result = matcher.matchPattern(tokens, pattern);

      expect(result).not.toBeNull();
      expect(result?.captured.has('target')).toBe(true);
      expect(result?.captured.get('target')).toMatchObject({ raw: 'button' });
      expect(result?.captured.has('destination')).toBe(true);
      expect(result?.captured.get('destination')).toMatchObject({ raw: 'output' });
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
