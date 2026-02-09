/**
 * Tests for init feature improvements: bounded history, dispose()
 * Separate file to avoid test-setup.ts DOM dependency
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedInitFeatureImplementation } from './init';

describe('Init Feature Improvements', () => {
  let feature: TypedInitFeatureImplementation;

  beforeEach(() => {
    feature = new TypedInitFeatureImplementation();
  });

  describe('bounded history', () => {
    it('should cap evaluationHistory at MAX_HISTORY_SIZE', async () => {
      for (let i = 0; i < 1010; i++) {
        try {
          await feature.initialize({
            initialization: { target: 'nonexistent', commands: [{ name: 'test' }] },
            options: {},
          });
        } catch {
          // Expected — target not found
        }
      }
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBeLessThanOrEqual(1000);
    });
  });

  describe('dispose()', () => {
    it('should clear all state', async () => {
      try {
        await feature.initialize({
          initialization: { target: 'nonexistent', commands: [{ name: 'test' }] },
          options: {},
        });
      } catch {
        // Expected
      }

      feature.dispose();

      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBe(0);
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.totalErrors).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      feature.dispose();
      feature.dispose();
      expect(true).toBe(true);
    });
  });
});
