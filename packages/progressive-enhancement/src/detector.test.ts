import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  detectCapabilities,
  detectUserPreferences,
  clearCapabilityCache,
  getCachedCapabilities,
} from './detector';

// Mock global objects
const mockWindow = {
  matchMedia: vi.fn(),
  performance: {
    now: vi.fn(() => Date.now()),
  },
  navigator: {
    userAgent: 'Mozilla/5.0 (Test Browser)',
  },
  CSS: {
    supports: vi.fn(),
  },
  localStorage: {
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  sessionStorage: {
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  Promise: Promise,
  IntersectionObserver: vi.fn(),
  MutationObserver: vi.fn(),
  fetch: vi.fn(),
  Worker: vi.fn(),
};

// Setup global mocks
Object.assign(global, mockWindow);

describe('Capability Detector', () => {
  beforeEach(() => {
    clearCapabilityCache();
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(mockWindow.matchMedia).mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any);

    vi.mocked(mockWindow.CSS.supports).mockReturnValue(true);
    vi.mocked(mockWindow.localStorage.setItem).mockImplementation(() => {});
    vi.mocked(mockWindow.localStorage.removeItem).mockImplementation(() => {});
    vi.mocked(mockWindow.sessionStorage.setItem).mockImplementation(() => {});
    vi.mocked(mockWindow.sessionStorage.removeItem).mockImplementation(() => {});
  });

  afterEach(() => {
    clearCapabilityCache();
  });

  describe('detectCapabilities', () => {
    it('should detect basic capabilities', async () => {
      const report = await detectCapabilities();

      expect(report).toHaveProperty('level');
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('capabilities');
      expect(report).toHaveProperty('userAgent');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('features');

      expect(report.capabilities).toHaveProperty('javascript');
      expect(report.capabilities.javascript.supported).toBe(true);
    });

    it('should cache results when caching is enabled', async () => {
      const config = { cacheResults: true };

      const report1 = await detectCapabilities(config);
      const report2 = await detectCapabilities(config);

      expect(report1).toBe(report2);
    });

    it('should not cache results when caching is disabled', async () => {
      const config = { cacheResults: false };

      const report1 = await detectCapabilities(config);
      const report2 = await detectCapabilities(config);

      expect(report1).not.toBe(report2);
      expect(report1.timestamp).not.toBe(report2.timestamp);
    });

    it('should run custom tests', async () => {
      const customTest = vi.fn().mockReturnValue(true);
      const config = {
        customTests: {
          customFeature: customTest,
        },
      };

      const report = await detectCapabilities(config);

      expect(customTest).toHaveBeenCalled();
      expect(report.capabilities).toHaveProperty('customFeature');
      expect(report.capabilities.customFeature.supported).toBe(true);
    });

    it('should handle test failures gracefully', async () => {
      const failingTest = vi.fn().mockImplementation(() => {
        throw new Error('Test failed');
      });

      const config = {
        customTests: {
          failingFeature: failingTest,
        },
      };

      const report = await detectCapabilities(config);

      expect(report.capabilities.failingFeature.supported).toBe(false);
      expect(report.capabilities.failingFeature.details).toHaveProperty('error');
    });

    it('should determine capability levels correctly', async () => {
      // Mock modern browser capabilities
      vi.mocked(mockWindow.CSS.supports).mockReturnValue(true);
      global.Promise = Promise;
      global.fetch = vi.fn();
      global.IntersectionObserver = vi.fn();

      const report = await detectCapabilities();

      expect(['basic', 'enhanced', 'modern', 'cutting-edge']).toContain(report.level);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should assign basic level for minimal capabilities', async () => {
      // Mock minimal capabilities
      vi.mocked(mockWindow.CSS.supports).mockReturnValue(false);
      delete (global as any).Promise;
      delete (global as any).fetch;
      delete (global as any).IntersectionObserver;

      const report = await detectCapabilities();

      expect(report.level).toBe('basic');
    });
  });

  describe('detectUserPreferences', () => {
    it('should detect reduced motion preference', () => {
      vi.mocked(mockWindow.matchMedia).mockImplementation(
        query =>
          ({
            matches: query.includes('prefers-reduced-motion'),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as any
      );

      const preferences = detectUserPreferences();

      expect(preferences.reduceMotion).toBe(true);
      expect(preferences.javascriptEnabled).toBe(true);
    });

    it('should detect high contrast preference', () => {
      vi.mocked(mockWindow.matchMedia).mockImplementation(
        query =>
          ({
            matches: query.includes('prefers-contrast'),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as any
      );

      const preferences = detectUserPreferences();

      expect(preferences.highContrast).toBe(true);
    });

    it('should detect reduced data preference', () => {
      vi.mocked(mockWindow.matchMedia).mockImplementation(
        query =>
          ({
            matches: query.includes('prefers-reduced-data'),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as any
      );

      const preferences = detectUserPreferences();

      expect(preferences.reducedData).toBe(true);
    });

    it('should set preferBasic when motion or data is reduced', () => {
      vi.mocked(mockWindow.matchMedia).mockImplementation(
        query =>
          ({
            matches:
              query.includes('prefers-reduced-motion') || query.includes('prefers-reduced-data'),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          }) as any
      );

      const preferences = detectUserPreferences();

      expect(preferences.preferBasic).toBe(true);
    });
  });

  describe('cache management', () => {
    it('should clear cached capabilities', async () => {
      await detectCapabilities({ cacheResults: true });
      expect(getCachedCapabilities()).not.toBeNull();

      clearCapabilityCache();
      expect(getCachedCapabilities()).toBeNull();
    });

    it('should return cached capabilities when available', async () => {
      const report = await detectCapabilities({ cacheResults: true });
      const cached = getCachedCapabilities();

      expect(cached).toBe(report);
    });

    it('should return null when no cached capabilities', () => {
      clearCapabilityCache();
      const cached = getCachedCapabilities();

      expect(cached).toBeNull();
    });
  });

  describe('individual capability tests', () => {
    it('should test localStorage availability', async () => {
      vi.mocked(mockWindow.localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const report = await detectCapabilities();

      expect(report.capabilities.localStorage.supported).toBe(false);
    });

    it('should test sessionStorage availability', async () => {
      vi.mocked(mockWindow.sessionStorage.setItem).mockImplementation(() => {
        throw new Error('Storage not available');
      });

      const report = await detectCapabilities();

      expect(report.capabilities.sessionStorage.supported).toBe(false);
    });

    it('should test CSS Grid support', async () => {
      vi.mocked(mockWindow.CSS.supports).mockImplementation((property, value) => {
        return property === 'display' && value === 'grid';
      });

      const report = await detectCapabilities();

      expect(report.capabilities.cssGrid.supported).toBe(true);
    });

    it('should test CSS Custom Properties support', async () => {
      vi.mocked(mockWindow.CSS.supports).mockImplementation((property, value) => {
        return property === 'color' && value === 'var(--test)';
      });

      const report = await detectCapabilities();

      expect(report.capabilities.cssCustomProperties.supported).toBe(true);
    });
  });

  describe('performance and timing', () => {
    it('should include timing information', async () => {
      const startTime = Date.now();
      const report = await detectCapabilities({ enablePerformanceMetrics: true });

      expect(report.timestamp).toBeGreaterThanOrEqual(startTime);
    });

    it('should handle timeout in capability tests', async () => {
      const slowTest = vi
        .fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));

      const config = {
        timeout: 100,
        customTests: {
          slowFeature: slowTest,
        },
      };

      const report = await detectCapabilities(config);

      expect(report.capabilities.slowFeature.supported).toBe(false);
    });
  });
});
