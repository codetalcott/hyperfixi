/**
 * Tenant Manager
 * Core system for managing multi-tenant contexts and customizations
 */

import type {
  TenantInfo,
  TenantContext,
  TenantCustomization,
  TenantManagerConfig,
  TenantResolver,
  CustomizationProvider,
  TenantIdentifier,
  TenantMetrics,
  TenantUser,
  TenantRequest,
  TenantSession,
  TenantEvents,
} from './types';

/**
 * Event emitter for tenant events
 */
class TenantEventEmitter {
  private listeners: Map<keyof TenantEvents, Set<Function>> = new Map();

  on<K extends keyof TenantEvents>(event: K, listener: (data: TenantEvents[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off<K extends keyof TenantEvents>(event: K, listener: (data: TenantEvents[K]) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  emit<K extends keyof TenantEvents>(event: K, data: TenantEvents[K]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in tenant event listener for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Tenant cache for performance optimization
 */
class TenantCache {
  private tenantCache = new Map<string, { tenant: TenantInfo; timestamp: number }>();
  private customizationCache = new Map<
    string,
    { customization: TenantCustomization; timestamp: number }
  >();
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(ttl: number = 300000, maxSize: number = 1000) {
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  getTenant(key: string): TenantInfo | null {
    const cached = this.tenantCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.tenant;
    }
    this.tenantCache.delete(key);
    return null;
  }

  setTenant(key: string, tenant: TenantInfo): void {
    if (this.tenantCache.size >= this.maxSize) {
      const firstKey = this.tenantCache.keys().next().value;
      if (firstKey !== undefined) {
        this.tenantCache.delete(firstKey);
      }
    }
    this.tenantCache.set(key, { tenant, timestamp: Date.now() });
  }

  getCustomization(tenantId: string): TenantCustomization | null {
    const cached = this.customizationCache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.customization;
    }
    this.customizationCache.delete(tenantId);
    return null;
  }

  setCustomization(tenantId: string, customization: TenantCustomization): void {
    if (this.customizationCache.size >= this.maxSize) {
      const firstKey = this.customizationCache.keys().next().value;
      if (firstKey !== undefined) {
        this.customizationCache.delete(firstKey);
      }
    }
    this.customizationCache.set(tenantId, { customization, timestamp: Date.now() });
  }

  clear(): void {
    this.tenantCache.clear();
    this.customizationCache.clear();
  }

  clearTenant(key: string): void {
    this.tenantCache.delete(key);
  }

  clearCustomization(tenantId: string): void {
    this.customizationCache.delete(tenantId);
  }
}

/**
 * Main tenant manager class
 */
export class TenantManager {
  private config: TenantManagerConfig;
  private cache: TenantCache;
  private events: TenantEventEmitter;
  private metrics: Map<string, TenantMetrics> = new Map();

  constructor(config: TenantManagerConfig) {
    this.config = config;
    this.cache = new TenantCache(config.caching.ttl, config.caching.maxSize);
    this.events = new TenantEventEmitter();

    if (config.caching.enabled === false) {
      this.cache = new TenantCache(0, 0); // Disable caching
    }
  }

  /**
   * Resolve tenant from request context
   */
  async resolveTenant(identifier: TenantIdentifier, request?: any): Promise<TenantInfo | null> {
    const cacheKey = this.getCacheKey(identifier);

    // Try cache first
    if (this.config.caching.enabled) {
      const cached = this.cache.getTenant(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      let tenant: TenantInfo | null = null;

      switch (identifier.type) {
        case 'domain':
          tenant = await this.config.tenantResolver.resolveTenantByDomain(identifier.value);
          break;
        case 'subdomain':
          tenant = await this.config.tenantResolver.resolveTenantBySubdomain(identifier.value);
          break;
        case 'id':
          tenant = await this.config.tenantResolver.resolveTenantById(identifier.value);
          break;
        case 'header':
          if (request?.headers) {
            const headerValue = request.headers[identifier.value];
            if (headerValue) {
              tenant = await this.config.tenantResolver.resolveTenantById(headerValue);
            }
          }
          break;
        case 'custom':
          const customId = await identifier.resolver(request);
          if (customId) {
            tenant = await this.config.tenantResolver.resolveTenantById(customId);
          }
          break;
      }

      // Cache result if found
      if (tenant && this.config.caching.enabled) {
        this.cache.setTenant(cacheKey, tenant);
      }

      return tenant;
    } catch (error) {
      this.events.emit('tenant:error', {
        tenantId: 'unknown',
        error: error instanceof Error ? error : new Error(String(error)),
        context: { identifier, request },
      });
      return null;
    }
  }

  /**
   * Get tenant customization
   */
  async getCustomization(tenantId: string): Promise<TenantCustomization | null> {
    // Try cache first
    if (this.config.caching.enabled) {
      const cached = this.cache.getCustomization(tenantId);
      if (cached) {
        return cached;
      }
    }

    try {
      const customization = await this.config.customizationProvider.getCustomization(tenantId);

      if (customization && this.config.caching.enabled) {
        this.cache.setCustomization(tenantId, customization);
      }

      if (customization) {
        this.events.emit('tenant:customization:loaded', {
          tenantId,
          customization,
        });
      }

      return customization;
    } catch (error) {
      this.events.emit('tenant:error', {
        tenantId,
        error: error instanceof Error ? error : new Error(String(error)),
        context: { operation: 'getCustomization' },
      });
      return null;
    }
  }

  /**
   * Create full tenant context
   */
  async createContext(
    tenant: TenantInfo,
    request: TenantRequest,
    user?: TenantUser,
    session?: TenantSession
  ): Promise<TenantContext> {
    const customization = await this.getCustomization(tenant.id);

    const context: TenantContext = {
      tenant,
      customization: customization || this.getDefaultCustomization(tenant.id),
      user,
      request,
      session: session || this.createDefaultSession(tenant.id, user?.id),
      features: new Set(tenant.features),
      permissions: new Set(user?.permissions || []),
    };

    this.events.emit('tenant:resolved', { tenant, context });

    // Update metrics
    this.updateMetrics(tenant.id, {
      requests: 1,
      timestamp: new Date(),
    });

    return context;
  }

  /**
   * Update tenant customization
   */
  async updateCustomization(
    tenantId: string,
    changes: Partial<TenantCustomization>
  ): Promise<void> {
    try {
      await this.config.customizationProvider.updateCustomization(tenantId, changes);

      // Clear cache
      if (this.config.caching.enabled) {
        this.cache.clearCustomization(tenantId);
      }

      this.events.emit('tenant:customization:updated', {
        tenantId,
        changes,
      });
    } catch (error) {
      this.events.emit('tenant:error', {
        tenantId,
        error: error instanceof Error ? error : new Error(String(error)),
        context: { operation: 'updateCustomization', changes },
      });
      throw error;
    }
  }

  /**
   * Check tenant limits
   */
  checkLimits(tenant: TenantInfo, resource: string, current: number): boolean {
    const limits = tenant.limits;
    let max: number;

    switch (resource) {
      case 'scripts':
        max = limits.maxScripts;
        break;
      case 'elements':
        max = limits.maxElements;
        break;
      case 'requests':
        max = limits.maxRequestsPerMinute;
        break;
      case 'storage':
        max = limits.maxStorageSize;
        break;
      case 'customizations':
        max = limits.maxCustomizations;
        break;
      default:
        return true; // Unknown resource, allow by default
    }

    if (current >= max) {
      this.events.emit('tenant:limit:exceeded', {
        tenantId: tenant.id,
        limit: resource,
        current,
        max,
      });
      return false;
    }

    return true;
  }

  /**
   * Check if feature is allowed for tenant
   */
  isFeatureAllowed(tenant: TenantInfo, feature: string): boolean {
    const { allowedFeatures, restrictedFeatures } = tenant.limits;

    // If explicitly restricted, deny
    if (restrictedFeatures.includes(feature)) {
      return false;
    }

    // If allowed features list exists and feature is not in it, deny
    if (allowedFeatures.length > 0 && !allowedFeatures.includes(feature)) {
      return false;
    }

    // If feature is in tenant features, allow
    if (tenant.features.includes(feature)) {
      return true;
    }

    // Default based on plan
    switch (tenant.plan) {
      case 'free':
        return ['basic-forms', 'basic-toggles'].includes(feature);
      case 'basic':
        return !['premium-features', 'enterprise-features'].includes(feature);
      case 'premium':
        return feature !== 'enterprise-features';
      case 'enterprise':
        return true;
      default:
        return false;
    }
  }

  /**
   * Event subscription methods
   */
  on<K extends keyof TenantEvents>(event: K, listener: (data: TenantEvents[K]) => void): void {
    this.events.on(event, listener);
  }

  off<K extends keyof TenantEvents>(event: K, listener: (data: TenantEvents[K]) => void): void {
    this.events.off(event, listener);
  }

  /**
   * Get tenant metrics
   */
  getMetrics(tenantId: string): TenantMetrics | null {
    return this.metrics.get(tenantId) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, TenantMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear tenant cache
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.cache.clearTenant(tenantId);
      this.cache.clearCustomization(tenantId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Private helper methods
   */
  private getCacheKey(identifier: TenantIdentifier): string {
    if (identifier.type === 'custom') {
      // Custom identifiers use resolver function, generate unique key per call
      return `custom:${Date.now()}`;
    }
    return `${identifier.type}:${identifier.value}`;
  }

  private getDefaultCustomization(tenantId: string): TenantCustomization {
    return {
      tenantId,
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
          main: '',
          icon: '',
          favicon: '',
        },
        theme: 'light',
      },
      localization: {
        defaultLocale: 'en-US',
        supportedLocales: ['en-US'],
        translations: {},
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'HH:mm',
        timezone: 'UTC',
        currency: 'USD',
        numberFormat: 'en-US',
      },
      permissions: {
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
  }

  private createDefaultSession(tenantId: string, userId?: string): TenantSession {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      tenantId,
      userId,
      data: {},
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private updateMetrics(tenantId: string, updates: Partial<TenantMetrics>): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    const existing = this.metrics.get(tenantId) || {
      tenantId,
      timestamp: new Date(),
      requests: 0,
      scriptsExecuted: 0,
      errors: 0,
      responseTime: 0,
      memoryUsage: 0,
      customizations: 0,
    };

    const updated = { ...existing, ...updates };
    this.metrics.set(tenantId, updated);

    // Call metrics collector if provided
    if (this.config.monitoring.metricsCollector) {
      try {
        this.config.monitoring.metricsCollector(updated);
      } catch (error) {
        console.error('Error in metrics collector:', error);
      }
    }
  }
}

/**
 * Create a tenant manager with default configuration
 */
export function createTenantManager(
  tenantResolver: TenantResolver,
  customizationProvider: CustomizationProvider,
  config: Partial<TenantManagerConfig> = {}
): TenantManager {
  const defaultConfig: TenantManagerConfig = {
    tenantResolver,
    customizationProvider,
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
      ttl: 300000, // 5 minutes
      maxSize: 1000,
    },
    monitoring: {
      enabled: true,
    },
  };

  return new TenantManager({ ...defaultConfig, ...config });
}
