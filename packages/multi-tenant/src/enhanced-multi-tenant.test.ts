/**
 * Enhanced Multi-Tenant Implementation Tests
 * Comprehensive testing following enhanced pattern validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TypedMultiTenantContextImplementation,
  createMultiTenantContext,
  createEnhancedMultiTenant,
  enhancedMultiTenantImplementation,
  type EnhancedMultiTenantInput,
  type EnhancedMultiTenantOutput,
} from './enhanced-multi-tenant.js';
import type {
  TenantInfo,
  TenantCustomization,
  TenantResolver,
  CustomizationProvider,
} from './types.js';

describe('Enhanced Multi-Tenant Implementation', () => {
  let multiTenantContext: TypedMultiTenantContextImplementation;
  let mockTenantResolver: TenantResolver;
  let mockCustomizationProvider: CustomizationProvider;

  beforeEach(() => {
    multiTenantContext = createMultiTenantContext();
    vi.clearAllMocks();

    // Mock tenant resolver
    mockTenantResolver = {
      resolveTenant: vi.fn(),
      resolveTenantByDomain: vi.fn(),
      resolveTenantBySubdomain: vi.fn(),
      resolveTenantById: vi.fn(),
    };

    // Mock customization provider
    mockCustomizationProvider = {
      getCustomization: vi.fn(),
      updateCustomization: vi.fn(),
      deleteCustomization: vi.fn(),
    };
  });

  describe('Context Initialization', () => {
    it('should initialize with minimal configuration', async () => {
      const input: EnhancedMultiTenantInput = {
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          isolation: {
            enableDataIsolation: true,
            enableStyleIsolation: true,
            enableScriptIsolation: true,
            enableEventIsolation: true,
            enableStorageIsolation: true,
            sandboxLevel: 'basic',
            namespacePrefix: 'tenant',
            allowCrossTenantAccess: false,
          },
          caching: {
            enabled: true,
            ttl: 300000,
            maxSize: 1000,
          },
          monitoring: {
            enabled: true,
          },
        },
        identifier: {
          type: 'subdomain',
          value: 'test-tenant',
        },
      };

      const result = await multiTenantContext.initialize(input);

      expect(result.success).toBe(true);
      expect(result.value).toBeDefined();

      if (result.success && result.value) {
        expect(result.value.category).toBe('Universal');
        expect(result.value.capabilities).toContain('tenant-resolution');
        expect(result.value.capabilities).toContain('isolation-enforcement');
        expect(result.value.capabilities).toContain('customization-management');
      }
    });

    it('should initialize with comprehensive configuration', async () => {
      const input: EnhancedMultiTenantInput = {
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          customizationProvider: mockCustomizationProvider,
          isolation: {
            enableDataIsolation: true,
            enableStyleIsolation: true,
            enableScriptIsolation: true,
            enableEventIsolation: true,
            enableStorageIsolation: true,
            sandboxLevel: 'strict',
            namespacePrefix: 'tenant',
            allowCrossTenantAccess: false,
          },
          caching: {
            enabled: true,
            ttl: 300000,
            maxSize: 1000,
          },
          monitoring: {
            enabled: true,
            metricsCollector: vi.fn(),
          },
        },
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
        request: {
          domain: 'example.com',
          ip: '127.0.0.1',
          userAgent: 'Test Agent',
          path: '/dashboard',
          method: 'GET',
        },
        environment: 'backend',
        debug: true,
      };

      const result = await multiTenantContext.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('tenant-resolution');
        expect(result.value.capabilities).toContain('feature-control');
        expect(result.value.capabilities).toContain('permission-management');
        expect(result.value.state).toBe('ready');
      }
    });

    it('should handle frontend environment configuration', async () => {
      const input: EnhancedMultiTenantInput = {
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          isolation: {
            enableDataIsolation: true,
            enableStyleIsolation: true,
            enableScriptIsolation: true,
            enableEventIsolation: false,
            enableStorageIsolation: true,
            sandboxLevel: 'basic',
            namespacePrefix: 'tenant',
            allowCrossTenantAccess: false,
          },
        },
        identifier: {
          type: 'header',
          value: 'x-tenant-id',
        },
        environment: 'frontend',
      };

      const result = await multiTenantContext.initialize(input);

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        expect(result.value.capabilities).toContain('isolation-enforcement');
        expect(result.value.state).toBe('ready');
      }
    });
  });

  describe('Tenant Resolution', () => {
    it('should resolve tenant by domain', async () => {
      const mockTenant: TenantInfo = {
        id: 'tenant-1',
        name: 'Test Tenant',
        domain: 'example.com',
        plan: 'premium',
        status: 'active',
        features: ['feature-a', 'feature-b'],
        limits: {
          maxScripts: 100,
          maxElements: 1000,
          maxRequestsPerMinute: 1000,
          maxStorageSize: 10000000,
          maxCustomizations: 50,
          allowedFeatures: ['feature-a', 'feature-b'],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantByDomain.mockResolvedValue(mockTenant);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const resolvedTenant = await result.value.tenant.resolve('example.com');
        expect(resolvedTenant).toEqual(mockTenant);
        expect(mockTenantResolver.resolveTenantByDomain).toHaveBeenCalledWith('example.com');
      }
    });

    it('should resolve tenant by subdomain', async () => {
      const mockTenant: TenantInfo = {
        id: 'tenant-2',
        name: 'Subdomain Tenant',
        subdomain: 'app',
        plan: 'basic',
        status: 'active',
        features: ['basic-feature'],
        limits: {
          maxScripts: 50,
          maxElements: 500,
          maxRequestsPerMinute: 500,
          maxStorageSize: 5000000,
          maxCustomizations: 25,
          allowedFeatures: ['basic-feature'],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantBySubdomain.mockResolvedValue(mockTenant);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'subdomain',
          value: 'app',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const resolvedTenant = await result.value.tenant.resolve('app');
        expect(resolvedTenant).toEqual(mockTenant);
        expect(mockTenantResolver.resolveTenantBySubdomain).toHaveBeenCalledWith('app');
      }
    });

    it('should handle tenant resolution failures gracefully', async () => {
      mockTenantResolver.resolveTenantById.mockResolvedValue(null);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'non-existent-tenant',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const resolvedTenant = await result.value.tenant.resolve('non-existent-tenant');
        expect(resolvedTenant).toBeNull();
        expect(mockTenantResolver.resolveTenantById).toHaveBeenCalledWith('non-existent-tenant');
      }
    });

    it('should switch between tenants', async () => {
      const tenant1: TenantInfo = {
        id: 'tenant-1',
        name: 'First Tenant',
        plan: 'basic',
        status: 'active',
        features: ['feature-1'],
        limits: {} as any,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tenant2: TenantInfo = {
        id: 'tenant-2',
        name: 'Second Tenant',
        plan: 'premium',
        status: 'active',
        features: ['feature-1', 'feature-2'],
        limits: {} as any,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantById
        .mockResolvedValueOnce(tenant1)
        .mockResolvedValueOnce(tenant2);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Switch to first tenant
        await result.value.tenant.switchTo('tenant-1');
        let currentTenant = result.value.tenant.getCurrent();
        expect(currentTenant?.id).toBe('tenant-1');

        // Switch to second tenant
        await result.value.tenant.switchTo('tenant-2');
        currentTenant = result.value.tenant.getCurrent();
        expect(currentTenant?.id).toBe('tenant-2');
      }
    });
  });

  describe('Customization Management', () => {
    it('should retrieve tenant customizations', async () => {
      const mockCustomization: TenantCustomization = {
        tenantId: 'tenant-1',
        scripts: {},
        styles: {},
        components: {},
        features: {},
        branding: {
          colors: {
            primary: '#3b82f6',
            secondary: '#6b7280',
            accent: '#10b981',
            background: '#ffffff',
            text: '#1f2937',
            border: '#e5e7eb',
          },
          typography: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: '400',
            lineHeight: '1.5',
          },
          logos: {
            main: 'logo.png',
            icon: 'icon.png',
            favicon: 'favicon.ico',
          },
          theme: 'light',
        },
        localization: {
          defaultLocale: 'en-US',
          supportedLocales: ['en-US', 'es-ES'],
          translations: {},
          dateFormat: 'MM/dd/yyyy',
          timeFormat: 'HH:mm',
          timezone: 'UTC',
          currency: 'USD',
          numberFormat: 'en-US',
        },
        permissions: {
          allowedActions: ['read', 'write'],
          restrictedActions: [],
          roleBasedAccess: {},
          userLimits: {
            maxUsers: 100,
            maxAdmins: 5,
            maxGuests: 50,
          },
        },
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCustomizationProvider.getCustomization.mockResolvedValue(mockCustomization);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          customizationProvider: mockCustomizationProvider,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const customization = await result.value.customization.get('tenant-1');
        expect(customization).toEqual(mockCustomization);
        expect(mockCustomizationProvider.getCustomization).toHaveBeenCalledWith('tenant-1');
      }
    });

    it('should apply tenant customizations', async () => {
      const customizationUpdate = {
        branding: {
          colors: {
            primary: '#ff0000',
            secondary: '#00ff00',
            accent: '#0000ff',
            background: '#ffffff',
            text: '#000000',
            border: '#cccccc',
          },
        },
      };

      mockCustomizationProvider.updateCustomization.mockResolvedValue();

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          customizationProvider: mockCustomizationProvider,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const applied = await result.value.customization.apply('tenant-1', customizationUpdate);
        expect(applied).toBe(true);
        expect(mockCustomizationProvider.updateCustomization).toHaveBeenCalledWith(
          'tenant-1',
          customizationUpdate
        );
      }
    });

    it('should validate customizations', async () => {
      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Valid customization
        const validCustomization = {
          branding: {
            colors: {
              primary: '#3b82f6',
              secondary: '#6b7280',
            },
          },
        };

        const validResult = result.value.customization.validate(validCustomization);
        expect(validResult.isValid).toBe(true);
        expect(validResult.errors).toHaveLength(0);

        // Invalid customization
        const invalidCustomization = {
          branding: {
            colors: {
              primary: 'invalid-color',
            },
          },
        };

        const invalidResult = result.value.customization.validate(invalidCustomization);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Isolation Management', () => {
    it('should enable and disable tenant isolation', async () => {
      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          isolation: {
            enableDataIsolation: true,
            enableStyleIsolation: true,
            enableScriptIsolation: true,
            enableEventIsolation: true,
            enableStorageIsolation: true,
            sandboxLevel: 'basic',
            namespacePrefix: 'tenant',
            allowCrossTenantAccess: false,
          },
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Initially not enabled
        expect(result.value.isolation.isEnabled()).toBe(false);

        // Enable isolation
        result.value.isolation.enable();
        expect(result.value.isolation.isEnabled()).toBe(true);

        // Disable isolation
        result.value.isolation.disable();
        expect(result.value.isolation.isEnabled()).toBe(false);
      }
    });

    it('should generate tenant namespaces', async () => {
      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          isolation: {
            namespacePrefix: 'app',
          },
        },
        identifier: {
          type: 'id',
          value: 'tenant-123',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        const namespace = result.value.isolation.getNamespace('tenant-123');
        expect(namespace).toBe('app-tenant-123');
      }
    });

    it('should check for isolation violations', async () => {
      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Enable isolation
        result.value.isolation.enable();

        // Check violation
        const violation = result.value.isolation.checkViolation('read', 'other-tenant-resource');
        expect(typeof violation).toBe('boolean');
      }
    });
  });

  describe('Feature Management', () => {
    it('should check feature availability', async () => {
      const mockTenant: TenantInfo = {
        id: 'tenant-1',
        name: 'Test Tenant',
        plan: 'premium',
        status: 'active',
        features: ['premium-feature', 'analytics', 'custom-branding'],
        limits: {} as any,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantById.mockResolvedValue(mockTenant);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Resolve tenant first
        await result.value.tenant.resolve('tenant-1');

        // Check individual features
        expect(result.value.features.isEnabled('premium-feature')).toBe(true);
        expect(result.value.features.isEnabled('analytics')).toBe(true);
        expect(result.value.features.isEnabled('non-existent-feature')).toBe(false);

        // List all features
        const features = result.value.features.list();
        expect(features).toEqual(['premium-feature', 'analytics', 'custom-branding']);

        // Check multiple features
        expect(result.value.features.check(['premium-feature', 'analytics'])).toBe(true);
        expect(result.value.features.check(['premium-feature', 'non-existent'])).toBe(false);
      }
    });

    it('should enable and disable features dynamically', async () => {
      const mockTenant: TenantInfo = {
        id: 'tenant-1',
        name: 'Test Tenant',
        plan: 'basic',
        status: 'active',
        features: ['basic-feature'],
        limits: {} as any,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantById.mockResolvedValue(mockTenant);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Resolve tenant first
        await result.value.tenant.resolve('tenant-1');

        // Initially only has basic feature
        expect(result.value.features.isEnabled('premium-feature')).toBe(false);

        // Enable premium feature
        result.value.features.enable('premium-feature');
        expect(result.value.features.isEnabled('premium-feature')).toBe(true);

        // Disable basic feature
        result.value.features.disable('basic-feature');
        expect(result.value.features.isEnabled('basic-feature')).toBe(false);
      }
    });
  });

  describe('Permission Management', () => {
    it('should manage tenant permissions', async () => {
      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Initially no permissions
        expect(result.value.permissions.check('read')).toBe(false);

        // Grant permission
        result.value.permissions.grant('read');
        expect(result.value.permissions.check('read')).toBe(true);
        expect(result.value.permissions.hasPermission('read')).toBe(true);

        // Grant more permissions
        result.value.permissions.grant('write');
        result.value.permissions.grant('admin');

        // List permissions
        const permissions = result.value.permissions.listPermissions();
        expect(permissions).toContain('read');
        expect(permissions).toContain('write');
        expect(permissions).toContain('admin');

        // Revoke permission
        result.value.permissions.revoke('admin');
        expect(result.value.permissions.check('admin')).toBe(false);
      }
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should collect and track tenant metrics', async () => {
      const metricsCollector = vi.fn();

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          monitoring: {
            enabled: true,
            metricsCollector,
          },
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Collect metrics
        const metrics = result.value.metrics.collect({
          requests: 10,
          scriptsExecuted: 5,
          errors: 1,
          responseTime: 120,
          memoryUsage: 1024,
          customizations: 3,
        });

        expect(metrics.tenantId).toBe('unknown'); // No tenant resolved yet
        expect(metrics.requests).toBe(10);
        expect(metricsCollector).toHaveBeenCalledWith(metrics);

        // Get metrics history
        const history = result.value.metrics.getMetrics();
        expect(history).toHaveLength(1);
        expect(history[0]).toEqual(metrics);
      }
    });

    it('should track tenant usage and limits', async () => {
      const mockTenant: TenantInfo = {
        id: 'tenant-1',
        name: 'Test Tenant',
        plan: 'premium',
        status: 'active',
        features: [],
        limits: {
          maxScripts: 100,
          maxElements: 1000,
          maxRequestsPerMinute: 1000,
          maxStorageSize: 10000000,
          maxCustomizations: 50,
          allowedFeatures: [],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantById.mockResolvedValue(mockTenant);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'id',
          value: 'tenant-1',
        },
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Resolve tenant first
        await result.value.tenant.resolve('tenant-1');

        // Get tenant limits
        const limits = result.value.metrics.getLimits();
        expect(limits).toEqual(mockTenant.limits);

        // Collect some usage metrics
        result.value.metrics.collect({
          requests: 50,
          scriptsExecuted: 10,
          errors: 2,
        });

        result.value.metrics.collect({
          requests: 30,
          scriptsExecuted: 5,
          errors: 1,
        });

        // Get usage summary
        const usage = result.value.metrics.getUsage();
        expect(usage?.requests).toBe(80); // 50 + 30
        expect(usage?.scriptsExecuted).toBe(15); // 10 + 5
        expect(usage?.errors).toBe(3); // 2 + 1
      }
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate tenant resolver requirement', () => {
      const validationResult = multiTenantContext.validate({
        config: {
          enabled: true,
          // Missing tenantResolver
        },
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(1);
      expect(validationResult.errors[0].type).toBe('missing-tenant-resolver');
      expect(validationResult.suggestions).toContain(
        'Provide a valid tenant resolver function or object'
      );
    });

    it('should validate custom identifier configuration', () => {
      const validationResult = multiTenantContext.validate({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'custom',
          // Missing resolver function
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'missing-custom-resolver')).toBe(true);
    });

    it('should validate header identifier configuration', () => {
      const validationResult = multiTenantContext.validate({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
        },
        identifier: {
          type: 'header',
          // Missing header name
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'missing-header-name')).toBe(true);
    });

    it('should validate sandbox level compatibility', () => {
      const validationResult = multiTenantContext.validate({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          isolation: {
            sandboxLevel: 'complete',
          },
        },
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
        environment: 'frontend',
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'incompatible-sandbox-level')).toBe(true);
    });

    it('should validate cache TTL', () => {
      const validationResult = multiTenantContext.validate({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          caching: {
            enabled: true,
            ttl: 500, // Too low
          },
        },
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'invalid-cache-ttl')).toBe(true);
    });

    it('should handle initialization failures gracefully', async () => {
      const result = await multiTenantContext.initialize({
        config: {} as any, // Invalid config
        identifier: {
          type: 'domain',
          value: 'example.com',
        },
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track performance metrics', async () => {
      // Initialize multiple times to build performance history
      for (let i = 0; i < 3; i++) {
        await multiTenantContext.initialize({
          config: {
            enabled: true,
            tenantResolver: mockTenantResolver,
          },
          identifier: {
            type: 'id',
            value: `tenant-${i}`,
          },
        });
      }

      const metrics = multiTenantContext.getPerformanceMetrics();

      expect(metrics.totalInitializations).toBeGreaterThanOrEqual(3);
      expect(typeof metrics.successRate).toBe('number');
      expect(typeof metrics.averageDuration).toBe('number');
      expect(metrics.evaluationHistory).toBeDefined();
      expect(typeof metrics.isolationEnabled).toBe('boolean');
      expect(typeof metrics.cacheSize).toBe('number');
      expect(typeof metrics.metricsCount).toBe('number');
    });
  });

  describe('Factory Functions', () => {
    it('should create context through factory function', () => {
      const context = createMultiTenantContext();
      expect(context).toBeInstanceOf(TypedMultiTenantContextImplementation);
      expect(context.name).toBe('multiTenantContext');
      expect(context.category).toBe('Universal');
    });

    it('should create enhanced multi-tenant through convenience function', async () => {
      const result = await createEnhancedMultiTenant(
        {
          tenantResolver: mockTenantResolver,
          isolation: {
            sandboxLevel: 'strict',
          },
        },
        {
          environment: 'backend',
          identifier: { type: 'domain', value: 'test.com' },
        }
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Enhanced Pattern Compliance', () => {
    it('should have required enhanced pattern properties', () => {
      expect(multiTenantContext.name).toBe('multiTenantContext');
      expect(multiTenantContext.category).toBe('Universal');
      expect(multiTenantContext.description).toBeDefined();
      expect(multiTenantContext.inputSchema).toBeDefined();
      expect(multiTenantContext.outputType).toBe('Context');
      expect(multiTenantContext.metadata).toBeDefined();
      expect(multiTenantContext.documentation).toBeDefined();
    });

    it('should have comprehensive metadata', () => {
      const { metadata } = multiTenantContext;

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
      const { documentation } = multiTenantContext;

      expect(documentation.summary).toBeDefined();
      expect(Array.isArray(documentation.parameters)).toBe(true);
      expect(documentation.returns).toBeDefined();
      expect(Array.isArray(documentation.examples)).toBe(true);
      expect(documentation.examples.length).toBeGreaterThan(0);
      expect(Array.isArray(documentation.tags)).toBe(true);
      expect(documentation.tags).toContain('multi-tenant');
      expect(documentation.tags).toContain('enhanced-pattern');
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle complete multi-tenant workflow', async () => {
      const mockTenant: TenantInfo = {
        id: 'enterprise-client',
        name: 'Enterprise Client Corp',
        domain: 'enterprise.example.com',
        plan: 'enterprise',
        status: 'active',
        features: ['premium-features', 'analytics', 'custom-branding', 'api-access'],
        limits: {
          maxScripts: 1000,
          maxElements: 10000,
          maxRequestsPerMinute: 10000,
          maxStorageSize: 100000000,
          maxCustomizations: 100,
          allowedFeatures: ['premium-features', 'analytics', 'custom-branding', 'api-access'],
          restrictedFeatures: [],
        },
        metadata: {
          region: 'us-east-1',
          tier: 'enterprise',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCustomization: TenantCustomization = {
        tenantId: 'enterprise-client',
        scripts: {},
        styles: {},
        components: {},
        features: {},
        branding: {
          colors: {
            primary: '#1a365d',
            secondary: '#2d3748',
            accent: '#ed8936',
            background: '#f7fafc',
            text: '#1a202c',
            border: '#e2e8f0',
          },
          typography: {
            fontFamily: 'Corporate Sans, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.6',
          },
          logos: {
            main: 'enterprise-logo.svg',
            icon: 'enterprise-icon.svg',
            favicon: 'enterprise-favicon.ico',
          },
          theme: 'light',
        },
        localization: {
          defaultLocale: 'en-US',
          supportedLocales: ['en-US', 'es-ES', 'fr-FR'],
          translations: {},
          dateFormat: 'MM/dd/yyyy',
          timeFormat: 'HH:mm',
          timezone: 'America/New_York',
          currency: 'USD',
          numberFormat: 'en-US',
        },
        permissions: {
          allowedActions: ['read', 'write', 'admin', 'api-access'],
          restrictedActions: [],
          roleBasedAccess: {
            admin: ['read', 'write', 'admin', 'api-access'],
            user: ['read', 'write'],
            guest: ['read'],
          },
          userLimits: {
            maxUsers: 1000,
            maxAdmins: 20,
            maxGuests: 100,
          },
        },
        version: '2.1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantResolver.resolveTenantByDomain.mockResolvedValue(mockTenant);
      mockCustomizationProvider.getCustomization.mockResolvedValue(mockCustomization);

      const result = await multiTenantContext.initialize({
        config: {
          enabled: true,
          tenantResolver: mockTenantResolver,
          customizationProvider: mockCustomizationProvider,
          isolation: {
            enableDataIsolation: true,
            enableStyleIsolation: true,
            enableScriptIsolation: true,
            enableEventIsolation: true,
            enableStorageIsolation: true,
            sandboxLevel: 'strict',
            namespacePrefix: 'enterprise',
            allowCrossTenantAccess: false,
          },
          monitoring: {
            enabled: true,
            metricsCollector: vi.fn(),
          },
        },
        identifier: {
          type: 'domain',
          value: 'enterprise.example.com',
        },
        request: {
          domain: 'enterprise.example.com',
          ip: '10.0.1.100',
          userAgent: 'Enterprise Browser 1.0',
          path: '/dashboard',
          method: 'GET',
        },
        environment: 'backend',
        debug: true,
      });

      expect(result.success).toBe(true);

      if (result.success && result.value) {
        // Resolve tenant
        const tenant = await result.value.tenant.resolve('enterprise.example.com');
        expect(tenant?.id).toBe('enterprise-client');
        expect(tenant?.plan).toBe('enterprise');

        // Enable isolation
        result.value.isolation.enable();
        expect(result.value.isolation.isEnabled()).toBe(true);

        // Check features
        expect(result.value.features.isEnabled('premium-features')).toBe(true);
        expect(result.value.features.isEnabled('analytics')).toBe(true);
        expect(result.value.features.check(['api-access', 'custom-branding'])).toBe(true);

        // Set up permissions
        result.value.permissions.grant('admin');
        result.value.permissions.grant('api-access');
        expect(result.value.permissions.check('admin')).toBe(true);

        // Get customization
        const customization = await result.value.customization.get('enterprise-client');
        expect(customization?.branding.colors.primary).toBe('#1a365d');

        // Collect metrics
        result.value.metrics.collect({
          requests: 1000,
          scriptsExecuted: 250,
          errors: 5,
          responseTime: 85,
          memoryUsage: 2048,
          customizations: 15,
        });

        // Get usage stats
        const usage = result.value.metrics.getUsage();
        expect(usage?.requests).toBe(1000);
        expect(usage?.scriptsExecuted).toBe(250);

        // Get limits
        const limits = result.value.metrics.getLimits();
        expect(limits?.maxScripts).toBe(1000);
        expect(limits?.maxRequestsPerMinute).toBe(10000);
      }
    });
  });
});

describe('Enhanced Multi-Tenant Export', () => {
  it('should export singleton implementation', () => {
    expect(enhancedMultiTenantImplementation).toBeInstanceOf(TypedMultiTenantContextImplementation);
    expect(enhancedMultiTenantImplementation.name).toBe('multiTenantContext');
  });
});
