/**
 * Multi-Tenant System for HyperFixi Applications
 *
 * Provides comprehensive multi-tenant support including:
 * - Tenant resolution and context management
 * - Behavior customization and isolation
 * - Framework middleware integration
 * - Permission and feature management
 */

// Core imports (for internal use and re-export)
import { TenantManager, createTenantManager } from './tenant-manager.js';
import { TenantIsolation, IsolationViolationError, createTenantIsolation } from './isolation.js';
import { TenantCustomizationEngine, createCustomizationEngine } from './customization.js';
import {
  createExpressMiddleware,
  createElysiaPlugin,
  createTenantMiddleware,
  extractTenantContext,
  extractTenantInfo,
  hasValidTenant,
  requireTenant,
  requireFeature,
  requirePermission,
} from './middleware.js';

// Core exports
export { TenantManager, createTenantManager };
export { TenantIsolation, IsolationViolationError, createTenantIsolation };
export { TenantCustomizationEngine, createCustomizationEngine };

// Enhanced Pattern exports
export {
  TypedMultiTenantContextImplementation,
  createMultiTenantContext,
  createEnhancedMultiTenant,
  enhancedMultiTenantImplementation,
  EnhancedMultiTenantInputSchema,
  EnhancedMultiTenantOutputSchema,
  type EnhancedMultiTenantInput,
  type EnhancedMultiTenantOutput,
} from './enhanced-multi-tenant.js';

// Middleware exports
export {
  createExpressMiddleware,
  createElysiaPlugin,
  createTenantMiddleware,
  extractTenantContext,
  extractTenantInfo,
  hasValidTenant,
  requireTenant,
  requireFeature,
  requirePermission,
};

// Type exports
export type {
  // Core types
  TenantInfo,
  TenantContext,
  TenantCustomization,
  TenantUser,
  TenantRequest,
  TenantSession,

  // Configuration types
  TenantManagerConfig,
  TenantIsolationConfig,
  TenantMiddlewareConfig,

  // Customization types
  TenantScript,
  TenantStyle,
  TenantComponent,
  TenantFeature,
  TenantBranding,
  TenantLocalization,
  TenantPermissions,
  TenantCondition,

  // Infrastructure types
  TenantResolver,
  CustomizationProvider,
  TenantIdentifier,
  TenantMetrics,
  TenantEvents,
  TenantLimits,
} from './types';

/**
 * Create a complete multi-tenant system with all components
 */
export function createMultiTenantSystem(options: {
  tenantResolver: import('./types').TenantResolver;
  customizationProvider: import('./types').CustomizationProvider;
  isolation?: Partial<import('./types').TenantIsolationConfig>;
  caching?: {
    enabled?: boolean;
    ttl?: number;
    maxSize?: number;
  };
  monitoring?: {
    enabled?: boolean;
    metricsCollector?: (metrics: import('./types').TenantMetrics) => void;
  };
}) {
  const tenantManager = createTenantManager(options.tenantResolver, options.customizationProvider, {
    isolation: {
      enableDataIsolation: true,
      enableStyleIsolation: true,
      enableScriptIsolation: true,
      enableEventIsolation: true,
      enableStorageIsolation: true,
      sandboxLevel: 'basic',
      namespacePrefix: 'tenant',
      allowCrossTenantAccess: false,
      ...options.isolation,
    },
    caching: {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      ...options.caching,
    },
    monitoring: {
      enabled: true,
      ...options.monitoring,
    },
  });

  const isolation = createTenantIsolation({
    enableDataIsolation: true,
    enableStyleIsolation: true,
    enableScriptIsolation: true,
    enableEventIsolation: true,
    enableStorageIsolation: true,
    sandboxLevel: 'basic',
    namespacePrefix: 'tenant',
    allowCrossTenantAccess: false,
    ...options.isolation,
  });

  const customizationEngine = createCustomizationEngine();

  return {
    tenantManager,
    isolation,
    customizationEngine,

    // Convenience methods
    createExpressMiddleware: (config: Partial<import('./types').TenantMiddlewareConfig>) =>
      createExpressMiddleware({
        tenantManager,
        enableIsolation: true,
        requireTenant: false,
        ...config,
      }),

    createElysiaPlugin: (config: Partial<import('./types').TenantMiddlewareConfig>) =>
      createElysiaPlugin({
        tenantManager,
        enableIsolation: true,
        requireTenant: false,
        ...config,
      }),
  };
}

/**
 * Quick start function for basic multi-tenant setup
 */
export async function quickStartMultiTenant(options: {
  tenants: Array<{
    id: string;
    name: string;
    domain?: string;
    plan?: 'free' | 'basic' | 'premium' | 'enterprise';
    features?: string[];
  }>;
  customizations?: Record<string, any>;
  identifier?: 'domain' | 'subdomain' | 'header';
  headerName?: string;
}) {
  // Create simple in-memory tenant resolver
  const tenantResolver: import('./types').TenantResolver = {
    async resolveTenant(identifier) {
      return null; // Will use specific methods below
    },

    async resolveTenantByDomain(domain) {
      const tenant = options.tenants.find(t => t.domain === domain);
      if (!tenant) return null;

      return {
        id: tenant.id,
        name: tenant.name,
        ...(tenant.domain !== undefined && { domain: tenant.domain }),
        plan: tenant.plan || 'free',
        status: 'active' as const,
        features: tenant.features || [],
        limits: {
          maxScripts: 100,
          maxElements: 1000,
          maxRequestsPerMinute: 1000,
          maxStorageSize: 10000000, // 10MB
          maxCustomizations: 50,
          allowedFeatures: tenant.features || [],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    async resolveTenantBySubdomain(subdomain) {
      const tenant = options.tenants.find(t => t.id === subdomain);
      if (!tenant) return null;

      return {
        id: tenant.id,
        name: tenant.name,
        subdomain,
        plan: tenant.plan || 'free',
        status: 'active' as const,
        features: tenant.features || [],
        limits: {
          maxScripts: 100,
          maxElements: 1000,
          maxRequestsPerMinute: 1000,
          maxStorageSize: 10000000, // 10MB
          maxCustomizations: 50,
          allowedFeatures: tenant.features || [],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    async resolveTenantById(id) {
      const tenant = options.tenants.find(t => t.id === id);
      if (!tenant) return null;

      return {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan || 'free',
        status: 'active' as const,
        features: tenant.features || [],
        limits: {
          maxScripts: 100,
          maxElements: 1000,
          maxRequestsPerMinute: 1000,
          maxStorageSize: 10000000, // 10MB
          maxCustomizations: 50,
          allowedFeatures: tenant.features || [],
          restrictedFeatures: [],
        },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  };

  // Create simple in-memory customization provider
  const customizationProvider: import('./types').CustomizationProvider = {
    async getCustomization(tenantId) {
      const customization = options.customizations?.[tenantId];
      if (!customization) return null;

      return {
        tenantId,
        scripts: customization.scripts || {},
        styles: customization.styles || {},
        components: customization.components || {},
        features: customization.features || {},
        branding: customization.branding || {
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
            main: '',
            icon: '',
            favicon: '',
          },
          theme: 'light',
        },
        localization: customization.localization || {
          defaultLocale: 'en-US',
          supportedLocales: ['en-US'],
          translations: {},
          dateFormat: 'MM/dd/yyyy',
          timeFormat: 'HH:mm',
          timezone: 'UTC',
          currency: 'USD',
          numberFormat: 'en-US',
        },
        permissions: customization.permissions || {
          allowedActions: ['read'],
          restrictedActions: [],
          roleBasedAccess: {},
          userLimits: {
            maxUsers: 10,
            maxAdmins: 1,
            maxGuests: 50,
          },
        },
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    async updateCustomization(tenantId, customization) {
      // Simple in-memory update (would be database in real implementation)
      if (!options.customizations) {
        options.customizations = {};
      }
      options.customizations[tenantId] = {
        ...options.customizations[tenantId],
        ...customization,
      };
    },

    async deleteCustomization(tenantId) {
      if (options.customizations) {
        delete options.customizations[tenantId];
      }
    },
  };

  // Create tenant identifier
  let tenantIdentifier: import('./types').TenantIdentifier;
  switch (options.identifier || 'subdomain') {
    case 'domain':
      tenantIdentifier = { type: 'domain', value: '' };
      break;
    case 'header':
      tenantIdentifier = { type: 'header', value: options.headerName || 'x-tenant-id' };
      break;
    default:
      tenantIdentifier = { type: 'subdomain', value: '' };
  }

  return createMultiTenantSystem({
    tenantResolver,
    customizationProvider,
  });
}

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Default configurations
 */
export const DEFAULT_TENANT_CONFIG = {
  isolation: {
    enableDataIsolation: true,
    enableStyleIsolation: true,
    enableScriptIsolation: true,
    enableEventIsolation: true,
    enableStorageIsolation: true,
    sandboxLevel: 'basic' as const,
    namespacePrefix: 'tenant',
    allowCrossTenantAccess: false,
  },
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
  },
  monitoring: {
    enabled: true,
  },
};
