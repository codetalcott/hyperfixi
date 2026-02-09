/**
 * Tests for on feature improvements: bounded history, dispose()
 * Separate file to avoid test-setup.ts DOM dependency
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OnFeature } from './on';

describe('On Feature Improvements', () => {
  let feature: OnFeature;

  beforeEach(() => {
    feature = new OnFeature();
  });

  describe('bounded history', () => {
    it('should cap evaluationHistory at MAX_HISTORY_SIZE', async () => {
      for (let i = 0; i < 1010; i++) {
        try {
          await feature.initialize({
            event: { type: 'click', target: '#nonexistent' },
            commands: [{ name: 'test' }],
            options: {},
          });
        } catch {
          // Expected
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
          event: { type: 'click' },
          commands: [{ name: 'test' }],
          options: {},
        });
      } catch {
        // Expected
      }
      feature.dispose();
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      feature.dispose();
      feature.dispose();
      expect(true).toBe(true);
    });
  });
});
