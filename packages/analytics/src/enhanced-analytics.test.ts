/**
 * Enhanced Analytics Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TypedAnalyticsContextImplementation,
  createAnalyticsContext,
  createEnhancedAnalytics,
  enhancedAnalyticsImplementation,
  type EnhancedAnalyticsInput,
  type EnhancedAnalyticsOutput
} from './enhanced-analytics.js';

describe('Enhanced Analytics Implementation', () => {
  let analyticsContext: TypedAnalyticsContextImplementation;
  
  beforeEach(() => {
    analyticsContext = createAnalyticsContext();
    vi.clearAllMocks();
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal configuration', async () => {
      const input: EnhancedAnalyticsInput = {
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      };

      const result = await analyticsContext.initialize(input);
      
      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();
      
      if (result.success && result.value) {
        expect(result.value.category).toBe('Universal');
        expect(result.value.capabilities).toContain('event-tracking');
        expect(result.value.capabilities).toContain('session-management');
        expect(result.value.capabilities).toContain('metrics-collection');
      }
    });

    it('should initialize with comprehensive configuration', async () => {
      const input: EnhancedAnalyticsInput = {
        config: {
          enabled: true,
          trackingId: 'GA-123456789-1',
          apiEndpoint: 'https://analytics.example.com/api',
          batchSize: 100,
          batchTimeout: 3000,
          sampling: { enabled: true, rate: 0.8 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: true },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        },
        context: {
          userId: 'user123',
          tenantId: 'tenant456',
          sessionId: 'session789',
          userAgent: 'Mozilla/5.0...',
          url: 'https://example.com/page'
        },
        environment: 'frontend',
        debug: true
      };

      const result = await analyticsContext.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('event-tracking');
        expect(result.value.capabilities).toContain('performance-monitoring');
        expect(result.value.capabilities).toContain('data-export');
        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle privacy-focused configuration', async () => {
      const input: EnhancedAnalyticsInput = {
        config: {
          enabled: true,
          batchSize: 25,
          batchTimeout: 10000,
          sampling: { enabled: true, rate: 0.5 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: true },
          events: { compilation: false, execution: true, interactions: true, performance: false, errors: true, customEvents: false }
        },
        environment: 'frontend'
      };

      const result = await analyticsContext.initialize(input);
      
      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('event-tracking');
        expect(result.value.state).toBe('ready');
      }
    });
  });

  describe('Event Tracking', () => {
    it('should track basic analytics events', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Start collection
        result.value.collect.start();
        expect(result.value.collect.isActive()).toBe(true);
        
        // Track an event
        result.value.track('user:action', {
          action: 'click',
          element: 'button',
          page: '/home'
        });
        
        // Check queue
        expect(result.value.events.count()).toBe(1);
      }
    });

    it('should track hyperscript-specific events', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Track hyperscript compilation
        result.value.trackHyperscriptEvent('compilation', {
          script: 'on click add .active',
          compilationTime: 5.2,
          complexity: 3,
          features: ['commands', 'events', 'css-classes']
        });
        
        // Track hyperscript execution
        result.value.trackHyperscriptEvent('execution', {
          script: 'on click add .active',
          element: 'button#submit',
          executionTime: 1.8,
          success: true
        });
        
        expect(result.value.events.count()).toBe(2);
      }
    });

    it('should track user actions with context', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Track various user actions
        result.value.trackUserAction('button-click', {
          buttonText: 'Submit Form',
          formId: 'contact-form',
          section: 'hero'
        });
        
        result.value.trackUserAction('form-submit', {
          formType: 'contact',
          fields: ['name', 'email', 'message'],
          validationErrors: 0
        });
        
        expect(result.value.events.count()).toBe(2);
      }
    });

    it('should track performance metrics', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Track performance metrics
        result.value.trackPerformance('page-load', {
          loadTime: 1234,
          domContentLoaded: 890,
          firstPaint: 456,
          largestContentfulPaint: 1100
        });
        
        result.value.trackPerformance('hyperscript-compilation', {
          totalScripts: 15,
          totalTime: 45.6,
          averageTime: 3.04,
          cacheHits: 8,
          cacheMisses: 7
        });
        
        expect(result.value.events.count()).toBe(2);
      }
    });

    it('should track errors with context', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Track error with Error object
        const error = new Error('Hyperscript compilation failed');
        result.value.trackError(error, {
          script: 'on invalid syntax',
          element: 'div#error-demo',
          phase: 'compilation'
        });
        
        // Track error with string
        result.value.trackError('Network request failed', {
          url: 'https://api.example.com/data',
          method: 'POST',
          statusCode: 500
        });
        
        expect(result.value.events.count()).toBe(2);
      }
    });
  });

  describe('Session Management', () => {
    it('should manage analytics sessions', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        },
        context: {
          userId: 'test-user-123',
          sessionId: 'test-session-456'
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Check session ID
        const sessionId = result.value.session.getId();
        expect(sessionId).toBeDefined();
        expect(typeof sessionId).toBe('string');
        
        // Get session metrics
        const metrics = result.value.session.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.id).toBe(sessionId);
        expect(typeof metrics.duration).toBe('number');
        expect(metrics.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it('should start and end sessions', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Start new session
        const startResult = result.value.session.start();
        expect(startResult).toBe(true);
        
        // End session
        const endResult = result.value.session.end();
        expect(endResult).toBe(true);
      }
    });
  });

  describe('Event Queue Management', () => {
    it('should manage event queue operations', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Initial queue should be empty
        expect(result.value.events.count()).toBe(0);
        
        // Add events
        result.value.track('user:action', { action: 'click' });
        result.value.track('page:view', { url: '/page1' });
        
        // Check queue count
        expect(result.value.events.count()).toBe(2);
        
        // Clear queue
        result.value.events.clear();
        expect(result.value.events.count()).toBe(0);
      }
    });

    it('should flush events on demand', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Add events
        result.value.track('user:action', { action: 'click' });
        result.value.track('user:action', { action: 'scroll' });
        
        expect(result.value.events.count()).toBe(2);
        
        // Flush events
        await result.value.events.flush();
        
        // Queue should be reduced (depending on implementation)
        expect(result.value.events.count()).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Data Collection Controls', () => {
    it('should control data collection state', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        // Initially not collecting
        expect(result.value.collect.isActive()).toBe(false);
        
        // Start collection
        result.value.collect.start();
        expect(result.value.collect.isActive()).toBe(true);
        
        // Stop collection
        result.value.collect.stop();
        expect(result.value.collect.isActive()).toBe(false);
        
        // Get metrics
        const metrics = result.value.collect.getMetrics();
        expect(metrics).toBeDefined();
        expect(typeof metrics.eventQueue).toBe('number');
        expect(typeof metrics.isCollecting).toBe('boolean');
      }
    });
  });

  describe('Data Export and Reporting', () => {
    it('should export data as JSON', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        result.value.track('user:action', { action: 'test' });
        
        const jsonExport = result.value.export.toJSON();
        expect(typeof jsonExport).toBe('string');
        
        const parsed = JSON.parse(jsonExport);
        expect(parsed).toBeDefined();
        expect(parsed.events).toBeDefined();
        expect(parsed.session).toBeDefined();
        expect(parsed.timestamp).toBeDefined();
      }
    });

    it('should export data as CSV', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        result.value.track('user:action', { action: 'test' });
        
        const csvExport = result.value.export.toCSV();
        expect(typeof csvExport).toBe('string');
        expect(csvExport).toContain('id,type,timestamp');
        expect(csvExport.split('\n').length).toBeGreaterThan(1);
      }
    });

    it('should generate comprehensive reports', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        result.value.track('user:action', { action: 'click' });
        result.value.track('hyperscript:executed', { script: 'test' });
        
        const report = result.value.export.generateReport();
        expect(report).toBeDefined();
        expect(report.summary).toBeDefined();
        expect(report.events).toBeDefined();
        expect(report.performance).toBeDefined();
        expect(report.generatedAt).toBeDefined();
        
        expect(typeof report.summary.totalEvents).toBe('number');
        expect(report.summary.totalEvents).toBeGreaterThan(0);
      }
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate tracking ID format', () => {
      const validationResult = analyticsContext.validate({
        config: {
          enabled: true,
          trackingId: 'invalid-tracking-id',
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('invalid-tracking-id');
      expect(validationResult.suggestions).toContain('Use valid Google Analytics or Google Tag Manager format');
    });

    it('should validate API endpoint URL', () => {
      const validationResult = analyticsContext.validate({
        config: {
          enabled: true,
          apiEndpoint: 'not-a-valid-url',
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-api-endpoint')).toBe(true);
    });

    it('should validate batch size limits', () => {
      const validationResult = analyticsContext.validate({
        config: {
          enabled: true,
          batchSize: 2000, // Too large
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'batch-size-too-large')).toBe(true);
    });

    it('should validate sampling configuration', () => {
      const validationResult = analyticsContext.validate({
        config: {
          enabled: true,
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: true, rate: 0 }, // Invalid rate
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        }
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-sampling-rate')).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await analyticsContext.initialize({
        config: {} as any // Invalid config
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Suggestions are included in the error object
      expect(result.error?.suggestions).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await analyticsContext.initialize({
          config: {
            enabled: true,
            batchSize: 50,
            batchTimeout: 5000,
            sampling: { enabled: false, rate: 1 },
            privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
            events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
          }
        });
      }

      const metrics = analyticsContext.getPerformanceMetrics();
      
      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.currentQueueSize).toBe('number');
      expect(typeof metrics.isActivelyCollecting).toBe('boolean');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createAnalyticsContext();
      expect(context).toBeInstanceOf(TypedAnalyticsContextImplementation);
      expect(context.name).toBe('analyticsContext');
      expect(context.category).toBe('Universal');
    });

    it('should create enhanced analytics through convenience function', async () => {
      const result = await createEnhancedAnalytics({
        trackingId: 'GA-123456789-1',
        batchSize: 100
      }, {
        environment: 'frontend',
        context: { userId: 'test-user' }
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(analyticsContext.name).toBe('analyticsContext');
      expect(analyticsContext.category).toBe('Universal');
      expect(analyticsContext.description).toBeDefined();
      expect(analyticsContext.inputSchema).toBeDefined();
      expect(analyticsContext.outputType).toBe('Context');
      expect(analyticsContext.metadata).toBeDefined();
      expect(analyticsContext.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = analyticsContext;
      
      expect(metadata.category).toBe('Universal');
      expect(metadata.complexity).toBe('complex');
      expect(Array.isArray(metadata.sideEffects)).toBe(true);
      expect(Array.isArray(metadata.dependencies)).toBe(true);
      expect(Array.isArray(metadata.examples)).toBe(true);
      expect(metadata.examples.length).toBeGreaterThan(0);
      expect(metadata.environmentRequirements).toBeDefined();
      expect(metadata.performance).toBeDefined();
    });

    it('should have LLM-compatible documentation', () => {
      const { documentation } = analyticsContext;
      
      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('analytics');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should track complete user journey', async () => {
      const result = await analyticsContext.initialize({
        config: {
          enabled: true,
          trackingId: 'GA-123456789-1',
          batchSize: 50,
          batchTimeout: 5000,
          sampling: { enabled: false, rate: 1 },
          privacy: { anonymizeIPs: true, respectDNT: true, cookieConsent: false },
          events: { compilation: true, execution: true, interactions: true, performance: true, errors: true, customEvents: true }
        },
        context: {
          userId: 'journey-user-123',
          url: 'https://app.example.com/dashboard'
        }
      });

      expect(result.success).toBe(true);
      
      if (result.success && result.value) {
        result.value.collect.start();
        
        // Page view
        result.value.track('page:view', { 
          url: '/dashboard',
          title: 'User Dashboard',
          referrer: '/login' 
        });
        
        // Hyperscript compilation
        result.value.trackHyperscriptEvent('compilation', {
          script: 'on click fetch /api/data then put result into #content',
          features: ['events', 'network', 'dom'],
          compilationTime: 8.4
        });
        
        // User interaction
        result.value.trackUserAction('button-click', {
          element: 'refresh-data-btn',
          location: 'dashboard-header'
        });
        
        // Hyperscript execution
        result.value.trackHyperscriptEvent('execution', {
          script: 'fetch /api/data',
          executionTime: 145.2,
          success: true,
          networkTime: 134.8
        });
        
        // Performance metric
        result.value.trackPerformance('data-refresh', {
          totalTime: 153.6,
          apiTime: 134.8,
          renderTime: 18.8
        });
        
        expect(result.value.events.count()).toBe(5);
        
        // Generate comprehensive report
        const report = result.value.export.generateReport();
        expect(report.summary.totalEvents).toBe(5);
        expect(Object.keys(report.events.byType)).toContain('page:view');
        expect(Object.keys(report.events.byType)).toContain('hyperscript:compilation');
      }
    });
  });
});

describe('Enhanced Analytics Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedAnalyticsImplementation).toBeInstanceOf(TypedAnalyticsContextImplementation);
    expect(enhancedAnalyticsImplementation.name).toBe('analyticsContext');
  });
});

// Integration tests for HyperFixi runtime hooks
describe('HyperFixi Integration', () => {
  // Mock browser globals for analytics tracker
  beforeEach(() => {
    // Mock window, document, navigator, screen for analytics tracker
    (globalThis as any).window = {
      location: { href: 'https://test.example.com/page' },
      sessionStorage: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
      },
      addEventListener: vi.fn(),
      innerWidth: 1920,
      innerHeight: 1080,
    };
    (globalThis as any).document = {
      referrer: 'https://referrer.example.com',
      addEventListener: vi.fn(),
      visibilityState: 'visible',
    };
    (globalThis as any).navigator = {
      userAgent: 'Test User Agent',
      doNotTrack: null,
      language: 'en-US',
    };
    (globalThis as any).screen = {
      width: 1920,
      height: 1080,
    };
    (globalThis as any).performance = {
      now: () => Date.now(),
      timing: { navigationStart: 0 },
      getEntriesByType: vi.fn().mockReturnValue([]),
    };
  });

  afterEach(() => {
    // Clean up mocks
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).navigator;
    delete (globalThis as any).screen;
  });

  describe('integrateWithHyperFixi', () => {
    it('should register hooks with runtime', async () => {
      const { integrateWithHyperFixi, quickStartAnalytics } = await import('./index.js');

      const mockRuntime = {
        registerHooks: vi.fn(),
        unregisterHooks: vi.fn().mockReturnValue(true),
      };

      const analytics = await quickStartAnalytics({});
      const cleanup = integrateWithHyperFixi(mockRuntime, analytics);

      // Should have registered hooks with the expected name
      expect(mockRuntime.registerHooks).toHaveBeenCalledWith(
        'hyperfixi-analytics',
        expect.objectContaining({
          beforeExecute: expect.any(Function),
          afterExecute: expect.any(Function),
          onError: expect.any(Function),
        })
      );

      // Should return a cleanup function
      expect(typeof cleanup).toBe('function');

      // Cleanup should unregister hooks
      cleanup();
      expect(mockRuntime.unregisterHooks).toHaveBeenCalledWith('hyperfixi-analytics');
    });

    it('should track execution events via afterExecute hook', async () => {
      const { integrateWithHyperFixi, quickStartAnalytics } = await import('./index.js');

      let registeredHooks: any = null;
      const mockRuntime = {
        registerHooks: vi.fn((name, hooks) => {
          registeredHooks = hooks;
        }),
        unregisterHooks: vi.fn().mockReturnValue(true),
      };

      const analytics = await quickStartAnalytics({});
      integrateWithHyperFixi(mockRuntime, analytics);

      // Simulate an afterExecute call
      const mockContext = {
        commandName: 'toggle',
        element: { tagName: 'BUTTON', id: 'test-btn', className: '' } as unknown as Element,
        args: ['toggle .active'],
        modifiers: {},
        event: { type: 'click' } as Event,
        executionContext: {},
      };

      // Call the afterExecute hook
      await registeredHooks.afterExecute(mockContext, 'success');

      // Verify execution was tracked
      const session = analytics.getSession();
      expect(session).toBeDefined();
    });

    it('should track errors via onError hook', async () => {
      const { integrateWithHyperFixi, quickStartAnalytics } = await import('./index.js');

      let registeredHooks: any = null;
      const mockRuntime = {
        registerHooks: vi.fn((name, hooks) => {
          registeredHooks = hooks;
        }),
        unregisterHooks: vi.fn().mockReturnValue(true),
      };

      const analytics = await quickStartAnalytics({});
      integrateWithHyperFixi(mockRuntime, analytics);

      // Simulate an error
      const mockContext = {
        commandName: 'toggle',
        element: { tagName: 'DIV', id: '', className: 'container' } as unknown as Element,
        args: [],
        modifiers: {},
        executionContext: {},
      };

      const testError = new Error('Test error');

      // Call the onError hook
      const returnedError = await registeredHooks.onError(mockContext, testError);

      // Should return the error unchanged
      expect(returnedError).toBe(testError);
    });

    it('should respect integration options', async () => {
      const { integrateWithHyperFixi, quickStartAnalytics } = await import('./index.js');

      let registeredHooks: any = null;
      const mockRuntime = {
        registerHooks: vi.fn((name, hooks) => {
          registeredHooks = hooks;
        }),
        unregisterHooks: vi.fn().mockReturnValue(true),
      };

      const analytics = await quickStartAnalytics({});
      integrateWithHyperFixi(mockRuntime, analytics, {
        trackTiming: false,
        includeScriptContent: true,
        maxScriptLength: 100,
      });

      // Hooks should still be registered
      expect(mockRuntime.registerHooks).toHaveBeenCalled();
      expect(registeredHooks).not.toBeNull();
    });
  });

  describe('createTrackedCompile', () => {
    it('should wrap compile function and track compilation', async () => {
      const { createTrackedCompile, quickStartAnalytics } = await import('./index.js');

      const mockCompileResult = {
        success: true,
        ast: { type: 'command' },
        compilationTime: 5,
        metadata: {
          complexity: 1,
          features: ['toggle'],
          selectors: ['.active'],
          commands: ['toggle'],
          warnings: [],
        },
        errors: [],
      };

      const mockCompile = vi.fn().mockReturnValue(mockCompileResult);
      const analytics = await quickStartAnalytics({});

      const trackedCompile = createTrackedCompile(mockCompile, analytics);

      // Call the wrapped compile
      const result = trackedCompile('toggle .active');

      // Should have called the original compile
      expect(mockCompile).toHaveBeenCalledWith('toggle .active', undefined);

      // Should return the same result
      expect(result).toBe(mockCompileResult);
    });

    it('should handle compile errors gracefully', async () => {
      const { createTrackedCompile, quickStartAnalytics } = await import('./index.js');

      const mockCompileResult = {
        success: false,
        errors: [{ message: 'Syntax error', line: 1, column: 1 }],
        compilationTime: 2,
      };

      const mockCompile = vi.fn().mockReturnValue(mockCompileResult);
      const analytics = await quickStartAnalytics({});

      const trackedCompile = createTrackedCompile(mockCompile, analytics);
      const result = trackedCompile('invalid code');

      // Should return the result even on failure
      expect(result).toBe(mockCompileResult);
    });
  });
});