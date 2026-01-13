import { describe, it, expect } from 'vitest';
import {
  ENHANCEMENT_LEVELS,
  getEnhancementsForLevel,
  getFallbackEnhancements,
  filterEnhancementsByConditions,
} from './levels';
import type { CapabilityLevel, Enhancement } from './types';

describe('Enhancement Levels', () => {
  describe('ENHANCEMENT_LEVELS', () => {
    it('should contain all capability levels', () => {
      const expectedLevels: CapabilityLevel[] = ['basic', 'enhanced', 'modern', 'cutting-edge'];

      for (const level of expectedLevels) {
        expect(ENHANCEMENT_LEVELS).toHaveProperty(level);
        expect(Array.isArray(ENHANCEMENT_LEVELS[level])).toBe(true);
      }
    });

    it('should have enhancements with required properties', () => {
      for (const [level, enhancements] of Object.entries(ENHANCEMENT_LEVELS)) {
        for (const enhancement of enhancements) {
          expect(enhancement).toHaveProperty('id');
          expect(enhancement).toHaveProperty('name');
          expect(enhancement).toHaveProperty('level');
          expect(enhancement).toHaveProperty('requires');
          expect(enhancement).toHaveProperty('priority');

          expect(typeof enhancement.id).toBe('string');
          expect(typeof enhancement.name).toBe('string');
          expect(enhancement.level).toBe(level);
          expect(Array.isArray(enhancement.requires)).toBe(true);
          expect(typeof enhancement.priority).toBe('number');
        }
      }
    });

    it('should have unique enhancement IDs within each level', () => {
      for (const [level, enhancements] of Object.entries(ENHANCEMENT_LEVELS)) {
        const ids = enhancements.map(e => e.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('should have priorities that allow proper sorting', () => {
      for (const [level, enhancements] of Object.entries(ENHANCEMENT_LEVELS)) {
        const priorities = enhancements.map(e => e.priority);

        for (const priority of priorities) {
          expect(priority).toBeGreaterThan(0);
          expect(Number.isInteger(priority)).toBe(true);
        }
      }
    });
  });

  describe('getEnhancementsForLevel', () => {
    it('should return enhancements for basic level', () => {
      const enhancements = getEnhancementsForLevel('basic');

      expect(enhancements.length).toBeGreaterThan(0);

      // Should only include basic level enhancements
      for (const enhancement of enhancements) {
        expect(enhancement.level).toBe('basic');
      }
    });

    it('should return enhancements up to enhanced level', () => {
      const enhancements = getEnhancementsForLevel('enhanced');

      expect(enhancements.length).toBeGreaterThan(0);

      // Should include basic and enhanced level enhancements
      const levels = new Set(enhancements.map(e => e.level));
      expect(levels.has('basic')).toBe(true);
      expect(levels.has('enhanced')).toBe(true);
      expect(levels.has('modern')).toBe(false);
      expect(levels.has('cutting-edge')).toBe(false);
    });

    it('should return enhancements up to modern level', () => {
      const enhancements = getEnhancementsForLevel('modern');

      expect(enhancements.length).toBeGreaterThan(0);

      // Should include basic, enhanced, and modern level enhancements
      const levels = new Set(enhancements.map(e => e.level));
      expect(levels.has('basic')).toBe(true);
      expect(levels.has('enhanced')).toBe(true);
      expect(levels.has('modern')).toBe(true);
      expect(levels.has('cutting-edge')).toBe(false);
    });

    it('should return all enhancements for cutting-edge level', () => {
      const enhancements = getEnhancementsForLevel('cutting-edge');

      expect(enhancements.length).toBeGreaterThan(0);

      // Should include all level enhancements
      const levels = new Set(enhancements.map(e => e.level));
      expect(levels.has('basic')).toBe(true);
      expect(levels.has('enhanced')).toBe(true);
      expect(levels.has('modern')).toBe(true);
      expect(levels.has('cutting-edge')).toBe(true);
    });

    it('should sort enhancements by priority', () => {
      const enhancements = getEnhancementsForLevel('modern');

      for (let i = 1; i < enhancements.length; i++) {
        expect(enhancements[i].priority).toBeGreaterThanOrEqual(enhancements[i - 1].priority);
      }
    });
  });

  describe('getFallbackEnhancements', () => {
    it('should return enhancements that dont require missing capabilities', () => {
      const missingCapabilities = ['webComponents', 'serviceWorker'];
      const fallbacks = getFallbackEnhancements('modern', missingCapabilities);

      for (const fallback of fallbacks) {
        const hasRequiredMissing = fallback.requires.some(req => missingCapabilities.includes(req));
        expect(hasRequiredMissing).toBe(false);
      }
    });

    it('should return empty array when all capabilities are missing', () => {
      const allBasicCapabilities = ['javascript'];
      const fallbacks = getFallbackEnhancements('basic', allBasicCapabilities);

      expect(fallbacks).toHaveLength(0);
    });

    it('should return fallbacks for partial capability loss', () => {
      const missingCapabilities = ['webComponents']; // Keep javascript
      const fallbacks = getFallbackEnhancements('modern', missingCapabilities);

      expect(fallbacks.length).toBeGreaterThan(0);

      // Should include enhancements that only require javascript
      const jsOnlyEnhancements = fallbacks.filter(
        e => e.requires.length === 1 && e.requires[0] === 'javascript'
      );
      expect(jsOnlyEnhancements.length).toBeGreaterThan(0);
    });
  });

  describe('filterEnhancementsByConditions', () => {
    const testEnhancements: Enhancement[] = [
      {
        id: 'no-conditions',
        name: 'No Conditions',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
      },
      {
        id: 'with-conditions',
        name: 'With Conditions',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
        conditions: [
          { feature: 'testFeature', operator: 'exists' },
          { feature: 'version', operator: 'greaterThan', value: 2 },
        ],
      },
      {
        id: 'string-match',
        name: 'String Match',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
        conditions: [{ feature: 'userAgent', operator: 'matches', value: 'Chrome' }],
      },
    ];

    it('should include enhancements without conditions', () => {
      const capabilities = {};
      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      const noConditions = filtered.find(e => e.id === 'no-conditions');
      expect(noConditions).toBeDefined();
    });

    it('should filter by exists condition', () => {
      const capabilities = {
        testFeature: true,
        version: 3,
      };

      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      const withConditions = filtered.find(e => e.id === 'with-conditions');
      expect(withConditions).toBeDefined();
    });

    it('should filter out enhancements with unmet conditions', () => {
      const capabilities = {
        testFeature: true,
        version: 1, // Less than required 2
      };

      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      const withConditions = filtered.find(e => e.id === 'with-conditions');
      expect(withConditions).toBeUndefined();
    });

    it('should handle equals condition', () => {
      const enhancementWithEquals: Enhancement = {
        id: 'equals-test',
        name: 'Equals Test',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
        conditions: [{ feature: 'exact', operator: 'equals', value: 'match' }],
      };

      const capabilities = { exact: 'match' };
      const filtered = filterEnhancementsByConditions([enhancementWithEquals], capabilities);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('equals-test');
    });

    it('should handle lessThan condition', () => {
      const enhancementWithLessThan: Enhancement = {
        id: 'less-than-test',
        name: 'Less Than Test',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
        conditions: [{ feature: 'count', operator: 'lessThan', value: 10 }],
      };

      const capabilities = { count: 5 };
      const filtered = filterEnhancementsByConditions([enhancementWithLessThan], capabilities);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('less-than-test');
    });

    it('should handle matches condition with regex', () => {
      const capabilities = {
        userAgent: 'Mozilla/5.0 (Chrome/91.0)',
      };

      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      const stringMatch = filtered.find(e => e.id === 'string-match');
      expect(stringMatch).toBeDefined();
    });

    it('should handle non-matching regex', () => {
      const capabilities = {
        userAgent: 'Mozilla/5.0 (Firefox/91.0)',
      };

      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      const stringMatch = filtered.find(e => e.id === 'string-match');
      expect(stringMatch).toBeUndefined();
    });

    it('should handle missing capability values', () => {
      const capabilities = {}; // Empty capabilities

      const filtered = filterEnhancementsByConditions(testEnhancements, capabilities);

      // Should only include enhancements without conditions
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('no-conditions');
    });

    it('should handle unknown operators gracefully', () => {
      const enhancementWithUnknownOp: Enhancement = {
        id: 'unknown-op',
        name: 'Unknown Operator',
        level: 'basic',
        requires: ['javascript'],
        priority: 1,
        conditions: [{ feature: 'test', operator: 'unknownOperator' as any, value: 'test' }],
      };

      const capabilities = { test: 'test' };
      const filtered = filterEnhancementsByConditions([enhancementWithUnknownOp], capabilities);

      // Should default to true for unknown operators
      expect(filtered).toHaveLength(1);
    });
  });

  describe('specific enhancement levels', () => {
    it('should have appropriate basic enhancements', () => {
      const basicEnhancements = ENHANCEMENT_LEVELS.basic;

      // Basic level should have form, toggle, and navigation enhancements
      const enhancementIds = basicEnhancements.map(e => e.id);
      expect(enhancementIds).toContain('basic-forms');
      expect(enhancementIds).toContain('basic-toggles');
      expect(enhancementIds).toContain('basic-navigation');
    });

    it('should have appropriate enhanced enhancements', () => {
      const enhancedEnhancements = ENHANCEMENT_LEVELS.enhanced;

      // Enhanced level should have animations and better forms
      const enhancementIds = enhancedEnhancements.map(e => e.id);
      expect(enhancementIds).toContain('enhanced-animations');
      expect(enhancementIds).toContain('enhanced-forms');
    });

    it('should have appropriate modern enhancements', () => {
      const modernEnhancements = ENHANCEMENT_LEVELS.modern;

      // Modern level should have web components and lazy loading
      const enhancementIds = modernEnhancements.map(e => e.id);
      expect(enhancementIds).toContain('modern-components');
      expect(enhancementIds).toContain('modern-lazy-loading');
    });

    it('should have appropriate cutting-edge enhancements', () => {
      const cuttingEdgeEnhancements = ENHANCEMENT_LEVELS['cutting-edge'];

      // Cutting-edge should have performance optimizations and advanced interactions
      const enhancementIds = cuttingEdgeEnhancements.map(e => e.id);
      expect(enhancementIds).toContain('cutting-edge-performance');
      expect(enhancementIds).toContain('cutting-edge-interactive');
    });
  });
});
