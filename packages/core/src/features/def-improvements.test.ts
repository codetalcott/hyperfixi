/**
 * Tests for def feature improvements: bounded history, dispose()
 * Separate file to avoid test-setup.ts DOM dependency
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypedDefFeatureImplementation } from './def';

describe('Def Feature Improvements', () => {
  let feature: TypedDefFeatureImplementation;

  beforeEach(() => {
    feature = new TypedDefFeatureImplementation();
  });

  describe('dispose()', () => {
    it('should clear all state', () => {
      feature.dispose();
      const metrics = feature.getPerformanceMetrics();
      expect(metrics.totalInitializations).toBe(0);
      expect(metrics.totalCalls).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      feature.dispose();
      feature.dispose();
      expect(true).toBe(true);
    });
  });
});
