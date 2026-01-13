import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ProgressiveEnhancer,
  getEnhancer,
  initProgressiveEnhancement,
  enhance,
  enhanceElement,
} from './enhancer';
import type { CapabilityReport, UserPreferences } from './types';

// Mock the detector module
vi.mock('./detector', () => ({
  detectCapabilities: vi.fn(),
  detectUserPreferences: vi.fn(),
}));

// Mock the levels module
vi.mock('./levels', () => ({
  getEnhancementsForLevel: vi.fn(),
  getFallbackEnhancements: vi.fn(),
  filterEnhancementsByConditions: vi.fn(),
}));

import { detectCapabilities, detectUserPreferences } from './detector';
import {
  getEnhancementsForLevel,
  getFallbackEnhancements,
  filterEnhancementsByConditions,
} from './levels';

// Mock DOM globals
const mockDocument = {
  querySelectorAll: vi.fn(),
  documentElement: document.createElement('html'),
  createElement: vi.fn(),
  head: {
    appendChild: vi.fn(),
  },
  getElementById: vi.fn(),
};

const mockWindow = {
  requestIdleCallback: vi.fn(),
  requestAnimationFrame: vi.fn(),
  performance: {
    now: vi.fn(() => Date.now()),
  },
};

Object.assign(global, { document: mockDocument, window: mockWindow });

describe('Progressive Enhancer', () => {
  let mockCapabilityReport: CapabilityReport;
  let mockUserPreferences: UserPreferences;
  let mockElement: Element;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCapabilityReport = {
      level: 'modern',
      score: 85,
      capabilities: {
        javascript: { name: 'javascript', supported: true },
        es6: { name: 'es6', supported: true },
        fetchAPI: { name: 'fetchAPI', supported: true },
      },
      userAgent: 'Test Browser',
      timestamp: Date.now(),
      features: {
        javascript: true,
        es6: true,
        modules: true,
        webComponents: true,
        intersectionObserver: true,
        mutationObserver: true,
        fetchAPI: true,
        promises: true,
        asyncAwait: true,
        cssGrid: true,
        cssCustomProperties: true,
        webAnimations: true,
        serviceWorker: true,
        webWorkers: true,
        localStorage: true,
        sessionStorage: true,
      },
    };

    mockUserPreferences = {
      reduceMotion: false,
      highContrast: false,
      reducedData: false,
      preferBasic: false,
      javascriptEnabled: true,
    };

    mockElement = document.createElement('div');
    mockElement.setAttribute('data-enhance', 'true');

    vi.mocked(detectCapabilities).mockResolvedValue(mockCapabilityReport);
    vi.mocked(detectUserPreferences).mockReturnValue(mockUserPreferences);
    vi.mocked(getEnhancementsForLevel).mockReturnValue([
      {
        id: 'test-enhancement',
        name: 'Test Enhancement',
        level: 'modern',
        requires: ['javascript'],
        script: 'console.log("Enhanced!");',
        priority: 1,
      },
    ]);
    vi.mocked(getFallbackEnhancements).mockReturnValue([]);
    vi.mocked(filterEnhancementsByConditions).mockImplementation(enhancements => enhancements);

    vi.mocked(mockDocument.querySelectorAll).mockReturnValue([mockElement]);
    vi.mocked(mockDocument.createElement).mockReturnValue(document.createElement('style'));
    vi.mocked(mockDocument.getElementById).mockReturnValue(null);

    vi.mocked(mockWindow.requestIdleCallback).mockImplementation(callback => {
      setTimeout(callback, 0);
      return 1;
    });
  });

  afterEach(() => {
    // Reset global enhancer
    (getEnhancer as any).globalEnhancer = null;
  });

  describe('ProgressiveEnhancer', () => {
    it('should initialize with default configuration', () => {
      const enhancer = new ProgressiveEnhancer();
      expect(enhancer).toBeInstanceOf(ProgressiveEnhancer);
    });

    it('should initialize with custom configuration', () => {
      const config = {
        strategy: {
          aggressive: true,
          fallbackTimeout: 1000,
        },
      };

      const enhancer = new ProgressiveEnhancer(config);
      expect(enhancer).toBeInstanceOf(ProgressiveEnhancer);
    });

    it('should initialize capabilities and preferences', async () => {
      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      expect(detectCapabilities).toHaveBeenCalled();
      expect(detectUserPreferences).toHaveBeenCalled();
      expect(enhancer.getCapabilities()).toBe(mockCapabilityReport);
      expect(enhancer.getUserPreferences()).toBe(mockUserPreferences);
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(detectCapabilities).mockRejectedValue(new Error('Detection failed'));

      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const capabilities = enhancer.getCapabilities();
      expect(capabilities?.level).toBe('basic');
      expect(capabilities?.score).toBe(0);
    });

    it('should enhance a single element', async () => {
      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const result = await enhancer.enhanceElement(mockElement);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('enhancements');
      expect(result).toHaveProperty('scripts');
      expect(result).toHaveProperty('styles');
      expect(result).toHaveProperty('performance');
      expect(result.level).toBe('modern');
    });

    it('should enhance multiple elements', async () => {
      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const results = await enhancer.enhanceElements('[data-enhance]');

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('level');
      expect(results[0].level).toBe('modern');
    });

    it('should enhance the entire document', async () => {
      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const result = await enhancer.enhanceDocument();

      expect(result).toHaveProperty('level');
      expect(result.level).toBe('modern');
    });

    it('should respect user preferences for basic level', async () => {
      mockUserPreferences.preferBasic = true;
      vi.mocked(detectUserPreferences).mockReturnValue(mockUserPreferences);

      const enhancer = new ProgressiveEnhancer({
        strategy: { respectUserPreferences: true },
      });
      await enhancer.initialize();

      const result = await enhancer.enhanceElement(mockElement);

      expect(result.level).toBe('basic');
      expect(result.warnings).toContain('Using basic level due to user preferences');
    });

    it('should process template variables in enhancements', async () => {
      const enhancementWithTemplate = {
        id: 'template-test',
        name: 'Template Test',
        level: 'modern' as const,
        requires: ['javascript'],
        script: 'console.log("User: {{userId}}");',
        priority: 1,
      };

      vi.mocked(getEnhancementsForLevel).mockReturnValue([enhancementWithTemplate]);

      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const result = await enhancer.enhanceElement(mockElement, { userId: '123' });

      expect(result.scripts[0]).toContain('User: 123');
    });

    it('should inject styles for enhancements', async () => {
      const enhancementWithStyles = {
        id: 'style-test',
        name: 'Style Test',
        level: 'modern' as const,
        requires: ['javascript'],
        styles: '.enhanced { color: red; }',
        priority: 1,
      };

      vi.mocked(getEnhancementsForLevel).mockReturnValue([enhancementWithStyles]);

      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      await enhancer.enhanceElement(mockElement);

      expect(mockDocument.createElement).toHaveBeenCalledWith('style');
      expect(mockDocument.head.appendChild).toHaveBeenCalled();
    });

    it('should load scripts lazily when configured', async () => {
      const enhancer = new ProgressiveEnhancer({
        strategy: { lazyLoad: true },
      });
      await enhancer.initialize();

      await enhancer.enhanceElement(mockElement);

      expect(mockWindow.requestIdleCallback).toHaveBeenCalled();
    });

    it('should execute scripts immediately when lazy loading is disabled', async () => {
      const enhancer = new ProgressiveEnhancer({
        strategy: { lazyLoad: false },
      });
      await enhancer.initialize();

      await enhancer.enhanceElement(mockElement);

      expect(mockWindow.requestIdleCallback).not.toHaveBeenCalled();
    });

    it('should update strategy after creation', () => {
      const enhancer = new ProgressiveEnhancer();

      enhancer.updateStrategy({ aggressive: true });

      // Strategy is private, but we can test through behavior
      expect(enhancer).toBeInstanceOf(ProgressiveEnhancer);
    });
  });

  describe('global functions', () => {
    it('should get or create global enhancer', () => {
      const enhancer1 = getEnhancer();
      const enhancer2 = getEnhancer();

      expect(enhancer1).toBe(enhancer2);
    });

    it('should initialize progressive enhancement', async () => {
      const result = await initProgressiveEnhancement();

      expect(result).toHaveProperty('level');
      expect(detectCapabilities).toHaveBeenCalled();
    });

    it('should enhance elements with global function', async () => {
      const results = await enhance('[data-enhance]');

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('level');
    });

    it('should enhance single element with global function', async () => {
      const result = await enhanceElement(mockElement);

      expect(result).toHaveProperty('level');
      expect(result.level).toBe('modern');
    });
  });

  describe('error handling', () => {
    it('should handle script execution errors gracefully', async () => {
      const enhancementWithError = {
        id: 'error-test',
        name: 'Error Test',
        level: 'modern' as const,
        requires: ['javascript'],
        script: 'throw new Error("Script error");',
        priority: 1,
      };

      vi.mocked(getEnhancementsForLevel).mockReturnValue([enhancementWithError]);

      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      // Should not throw
      const result = await enhancer.enhanceElement(mockElement);

      expect(result).toHaveProperty('level');
    });

    it('should handle missing capabilities', async () => {
      const enhancementWithMissingReq = {
        id: 'missing-test',
        name: 'Missing Test',
        level: 'modern' as const,
        requires: ['nonexistent-capability'],
        script: 'console.log("Should not run");',
        priority: 1,
      };

      vi.mocked(getEnhancementsForLevel).mockReturnValue([enhancementWithMissingReq]);
      vi.mocked(getFallbackEnhancements).mockReturnValue([
        {
          id: 'fallback',
          name: 'Fallback',
          level: 'basic',
          requires: ['javascript'],
          script: 'console.log("Fallback");',
          priority: 1,
        },
      ]);

      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const result = await enhancer.enhanceElement(mockElement);

      expect(result.fallbacks).toHaveLength(1);
      expect(result.fallbacks[0].id).toBe('fallback');
    });
  });

  describe('performance metrics', () => {
    it('should include performance timing in results', async () => {
      const enhancer = new ProgressiveEnhancer();
      await enhancer.initialize();

      const result = await enhancer.enhanceElement(mockElement);

      expect(result.performance).toHaveProperty('detectionTime');
      expect(result.performance).toHaveProperty('enhancementTime');
      expect(result.performance).toHaveProperty('totalTime');
      expect(typeof result.performance.enhancementTime).toBe('number');
    });
  });
});
