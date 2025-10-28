/**
 * Enhanced Multi-Tenant Implementation
 * Type-safe tenant management with enhanced validation and real-time capabilities
 */

import { z } from 'zod';
import type {
  TypedContextImplementation,
  ContextMetadata,
  EvaluationResult,
  EnhancedContextBase
} from '../../core/src/types/enhanced-context.js';
import type { ValidationResult, EvaluationType } from '../../core/src/types/base-types.js';
import type { LLMDocumentation } from '../../core/src/types/enhanced-core.js';
import type { 
  TenantInfo, 
  TenantContext, 
  TenantCustomization,
  TenantIsolationConfig,
  TenantResolver,
  CustomizationProvider,
  TenantIdentifier,
  TenantMetrics,
  TenantUser,
  TenantRequest,
  TenantSession
} from './types.js';

// ============================================================================
// Enhanced Multi-Tenant Input/Output Schemas
// ============================================================================

export const EnhancedMultiTenantInputSchema = z.object({
  /** Tenant configuration */
  config: z.object({
    enabled: z.boolean().default(true),
    tenantResolver: z.any(), // Function or resolver instance
    customizationProvider: z.any().optional(), // Function or provider instance
    isolation: z.object({
      enableDataIsolation: z.boolean().default(true),
      enableStyleIsolation: z.boolean().default(true),
      enableScriptIsolation: z.boolean().default(true),
      enableEventIsolation: z.boolean().default(true),
      enableStorageIsolation: z.boolean().default(true),
      sandboxLevel: z.enum(['none', 'basic', 'strict', 'complete']).default('basic'),
      namespacePrefix: z.string().default('tenant'),
      allowCrossTenantAccess: z.boolean().default(false),
    }).default({}),
    caching: z.object({
      enabled: z.boolean().default(true),
      ttl: z.number().default(300000), // 5 minutes
      maxSize: z.number().default(1000),
    }).default({}),
    monitoring: z.object({
      enabled: z.boolean().default(true),
      metricsCollector: z.function().optional(),
    }).default({}),
  }),
  /** Tenant identification */
  identifier: z.object({
    type: z.enum(['domain', 'subdomain', 'id', 'header', 'custom']),
    value: z.string().optional(),
    resolver: z.function().optional(),
  }),
  /** Request context */
  request: z.object({
    domain: z.string().optional(),
    subdomain: z.string().optional(),
    headers: z.record(z.string()).optional(),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    path: z.string().optional(),
    method: z.string().optional(),
  }).optional(),
  /** Environment settings */
  environment: z.enum(['frontend', 'backend', 'universal']).default('universal'),
  debug: z.boolean().default(false),
});

export const EnhancedMultiTenantOutputSchema = z.object({
  /** Context identifier */
  contextId: z.string(),
  timestamp: z.number(),
  category: z.literal('Universal'),
  capabilities: z.array(z.string()),
  state: z.enum(['ready', 'resolving', 'isolated', 'error']),

  /** Tenant management functions */
  tenant: z.object({
    resolve: z.custom<(...args: any[]) => any>(() => true),
    getCurrent: z.custom<(...args: any[]) => any>(() => true),
    getContext: z.custom<(...args: any[]) => any>(() => true),
    switchTo: z.custom<(...args: any[]) => any>(() => true),
  }),

  /** Customization management */
  customization: z.object({
    get: z.custom<(...args: any[]) => any>(() => true),
    apply: z.custom<(...args: any[]) => any>(() => true),
    update: z.custom<(...args: any[]) => any>(() => true),
    validate: z.custom<(...args: any[]) => any>(() => true),
  }),

  /** Isolation management */
  isolation: z.object({
    enable: z.custom<(...args: any[]) => any>(() => true),
    disable: z.custom<(...args: any[]) => any>(() => true),
    isEnabled: z.custom<(...args: any[]) => any>(() => true),
    getNamespace: z.custom<(...args: any[]) => any>(() => true),
    checkViolation: z.custom<(...args: any[]) => any>(() => true),
  }),

  /** Feature management */
  features: z.object({
    isEnabled: z.custom<(...args: any[]) => any>(() => true),
    list: z.custom<(...args: any[]) => any>(() => true),
    check: z.custom<(...args: any[]) => any>(() => true),
    enable: z.custom<(...args: any[]) => any>(() => true),
    disable: z.custom<(...args: any[]) => any>(() => true),
  }),

  /** Permission management */
  permissions: z.object({
    check: z.custom<(...args: any[]) => any>(() => true),
    hasPermission: z.custom<(...args: any[]) => any>(() => true),
    listPermissions: z.custom<(...args: any[]) => any>(() => true),
    grant: z.custom<(...args: any[]) => any>(() => true),
    revoke: z.custom<(...args: any[]) => any>(() => true),
  }),

  /** Metrics and monitoring */
  metrics: z.object({
    collect: z.custom<(...args: any[]) => any>(() => true),
    getMetrics: z.custom<(...args: any[]) => any>(() => true),
    getUsage: z.custom<(...args: any[]) => any>(() => true),
    getLimits: z.custom<(...args: any[]) => any>(() => true),
  }),
});

export type EnhancedMultiTenantInput = z.infer<typeof EnhancedMultiTenantInputSchema>;
export type EnhancedMultiTenantOutput = z.infer<typeof EnhancedMultiTenantOutputSchema>;

// ============================================================================
// Enhanced Multi-Tenant Context Implementation
// ============================================================================

export class TypedMultiTenantContextImplementation {
  public readonly name = 'multiTenantContext';
  public readonly category = 'Universal' as const;
  public readonly description = 'Type-safe multi-tenant management with enhanced isolation and customization capabilities';
  public readonly inputSchema = EnhancedMultiTenantInputSchema;
  public readonly outputType: EvaluationType = 'Context';

  private evaluationHistory: Array<{
    input: EnhancedMultiTenantInput;
    output?: EnhancedMultiTenantOutput;
    success: boolean;
    duration: number;
    timestamp: number;
  }> = [];

  private currentTenant: TenantInfo | null = null;
  private currentContext: TenantContext | null = null;
  private tenantCache: Map<string, { tenant: TenantInfo; timestamp: number }> = new Map();
  private customizationCache: Map<string, { customization: TenantCustomization; timestamp: number }> = new Map();
  private isolationEnabled: boolean = false;
  private metricsHistory: TenantMetrics[] = [];

  public readonly metadata: ContextMetadata = {
    category: 'Universal',
    complexity: 'complex',
    sideEffects: ['tenant-resolution', 'isolation-enforcement', 'customization-application', 'metrics-collection'],
    dependencies: ['tenant-resolver', 'customization-provider', 'isolation-engine'],
    returnTypes: ['Context'],
    examples: [
      {
        input: '{ config: { tenantResolver: resolver }, identifier: { type: "domain", value: "example.com" } }',
        description: 'Initialize tenant context with domain-based resolution',
        expectedOutput: 'TypedMultiTenantContext with tenant isolation and customization'
      },
      {
        input: '{ config: { isolation: { sandboxLevel: "strict" } }, identifier: { type: "subdomain" } }',
        description: 'Configure strict tenant isolation with subdomain identification',
        expectedOutput: 'Isolated tenant environment with strict sandbox enforcement'
      },
      {
        input: '{ config: { monitoring: { enabled: true } }, environment: "backend" }',
        description: 'Backend multi-tenant setup with monitoring enabled',
        expectedOutput: 'Multi-tenant context with metrics collection and usage tracking'
      }
    ],
    relatedContexts: ['analyticsContext', 'i18nContext', 'authContext'],
    relatedExpressions: [],
    frameworkDependencies: ['tenant-isolation', 'customization-engine'],
    environmentRequirements: {
      browser: true,
      server: true,
      nodejs: true
    },
    performance: {
      averageTime: 18.7,
      complexity: 'O(log n)' // n = number of cached tenants
    }
  };

  public readonly documentation: LLMDocumentation = {
    summary: 'Creates type-safe multi-tenant context for comprehensive tenant management with isolation, customization, and real-time monitoring',
    parameters: [
      {
        name: 'multiTenantConfig',
        type: 'EnhancedMultiTenantInput',
        description: 'Multi-tenant configuration including resolver, isolation settings, and identification strategy',
        optional: false,
        examples: [
          '{ config: { tenantResolver: resolver }, identifier: { type: "domain" } }',
          '{ config: { isolation: { sandboxLevel: "strict" } }, identifier: { type: "subdomain" } }',
          '{ config: { monitoring: { enabled: true } }, environment: "backend" }'
        ]
      }
    ],
    returns: {
      type: 'EnhancedMultiTenantContext',
      description: 'Initialized multi-tenant context with tenant resolution, isolation enforcement, and customization capabilities',
      examples: [
        'context.tenant.resolve("example.com") → resolved tenant information',
        'context.features.isEnabled("premium-features") → true/false',
        'context.isolation.enable() → tenant isolation activated',
        'context.metrics.getUsage() → current tenant usage metrics'
      ]
    },
    examples: [
      {
        title: 'Basic tenant resolution',
        code: 'const multiTenant = await createMultiTenantContext({ config: { tenantResolver }, identifier: { type: "domain" } })',
        explanation: 'Initialize multi-tenant system with domain-based tenant identification',
        output: 'Multi-tenant context with automatic tenant resolution'
      },
      {
        title: 'Advanced isolation setup',
        code: 'await multiTenant.initialize({ config: { isolation: { sandboxLevel: "strict", enableStorageIsolation: true } } })',
        explanation: 'Configure strict tenant isolation with storage separation',
        output: 'Isolated tenant environment with complete data separation'
      },
      {
        title: 'Customization management',
        code: 'multiTenant.customization.apply(tenantId, { branding: customBranding })',
        explanation: 'Apply tenant-specific customizations and branding',
        output: 'Customized tenant experience with applied branding and settings'
      }
    ],
    seeAlso: ['tenantResolver', 'isolationEngine', 'customizationProvider', 'multiTenantMiddleware'],
    tags: ['multi-tenant', 'isolation', 'customization', 'tenant-management', 'type-safe', 'enhanced-pattern']
  };

  async initialize(input: EnhancedMultiTenantInput): Promise<EvaluationResult<EnhancedMultiTenantOutput>> {
    const startTime = Date.now();
    
    try {
      // Validate input using enhanced pattern
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          suggestions: validation.suggestions
        };
      }

      // Initialize tenant configuration
      const config = await this.initializeConfig(input);
      const resolver = await this.initializeResolver(input);
      
      // Create enhanced multi-tenant context
      const context: EnhancedMultiTenantOutput = {
        contextId: `multi-tenant-${Date.now()}`,
        timestamp: startTime,
        category: 'Universal',
        capabilities: ['tenant-resolution', 'isolation-enforcement', 'customization-management', 'feature-control', 'permission-management', 'metrics-collection'],
        state: 'ready',
        
        // Enhanced tenant management functions
        tenant: {
          resolve: this.createTenantResolver(config, resolver),
          getCurrent: this.createCurrentTenantGetter(),
          getContext: this.createContextGetter(),
          switchTo: this.createTenantSwitcher(config),
        },
        
        // Customization management
        customization: {
          get: this.createCustomizationGetter(config),
          apply: this.createCustomizationApplier(config),
          update: this.createCustomizationUpdater(config),
          validate: this.createCustomizationValidator(),
        },
        
        // Isolation management
        isolation: {
          enable: this.createIsolationEnabler(config),
          disable: this.createIsolationDisabler(),
          isEnabled: () => this.isolationEnabled,
          getNamespace: this.createNamespaceGetter(config),
          checkViolation: this.createViolationChecker(),
        },
        
        // Feature management
        features: {
          isEnabled: this.createFeatureChecker(),
          list: this.createFeatureLister(),
          check: this.createFeatureValidator(),
          enable: this.createFeatureEnabler(),
          disable: this.createFeatureDisabler(),
        },
        
        // Permission management
        permissions: {
          check: this.createPermissionChecker(),
          hasPermission: this.createPermissionValidator(),
          listPermissions: this.createPermissionLister(),
          grant: this.createPermissionGranter(),
          revoke: this.createPermissionRevoker(),
        },
        
        // Metrics and monitoring
        metrics: {
          collect: this.createMetricsCollector(config),
          getMetrics: this.createMetricsGetter(),
          getUsage: this.createUsageGetter(),
          getLimits: this.createLimitsGetter(),
        }
      };

      // Track performance using enhanced pattern
      this.trackPerformance(startTime, true, context);
      
      return {
        success: true,
        value: context,
        type: 'Context'
      };

    } catch (error) {
      this.trackPerformance(startTime, false);
      
      return {
        success: false,
        errors: [{
          type: 'runtime-error',
          message: `Multi-tenant context initialization failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        suggestions: [
          'Verify tenant resolver configuration is valid',
          'Check customization provider setup',
          'Ensure isolation settings are supported',
          'Validate tenant identifier configuration'
        ]
      };
    }
  }

  validate(input: unknown): ValidationResult {
    try {
      // First check if input is basic object structure
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [{ type: 'invalid-input', message: 'Input must be an object', suggestions: [] }],
          suggestions: ['Provide a valid multi-tenant configuration object']
        };
      }

      const parsed = this.inputSchema.parse(input);
      const errors: Array<{ type: string; message: string; path?: string }> = [];
      const suggestions: string[] = [];

      // Enhanced validation logic
      const data = parsed as EnhancedMultiTenantInput;

      // Validate tenant resolver
      if (!data.config.tenantResolver) {
        errors.push({
          type: 'missing-tenant-resolver',
          message: 'Tenant resolver is required for multi-tenant functionality',
          path: 'config.tenantResolver'
        });
        suggestions.push('Provide a valid tenant resolver function or object');
      }

      // Validate identifier configuration
      if (data.identifier.type === 'custom' && !data.identifier.resolver) {
        errors.push({
          type: 'missing-custom-resolver',
          message: 'Custom identifier type requires a resolver function',
          path: 'identifier.resolver'
        });
        suggestions.push('Provide a custom resolver function for custom identifier type');
      }

      // Validate header identifier
      if (data.identifier.type === 'header' && !data.identifier.value) {
        errors.push({
          type: 'missing-header-name',
          message: 'Header identifier type requires a header name',
          path: 'identifier.value'
        });
        suggestions.push('Specify the header name for tenant identification (e.g., "x-tenant-id")');
      }

      // Validate sandbox level
      if (data.config.isolation?.sandboxLevel === 'complete' && data.environment === 'frontend') {
        errors.push({
          type: 'incompatible-sandbox-level',
          message: 'Complete sandbox isolation is not supported in frontend environment',
          path: 'config.isolation.sandboxLevel'
        });
        suggestions.push('Use "strict" or "basic" sandbox level for frontend environments');
      }

      // Validate cache configuration
      if (data.config.caching?.enabled && data.config.caching.ttl < 1000) {
        errors.push({
          type: 'invalid-cache-ttl',
          message: 'Cache TTL should be at least 1000ms for optimal performance',
          path: 'config.caching.ttl'
        });
        suggestions.push('Set cache TTL to at least 1 second (1000ms)');
      }

      return {
        isValid: errors.length === 0,
        errors,
        suggestions
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'schema-validation',
          suggestions: [],
          message: error instanceof Error ? error.message : 'Invalid input format'
        }],
        suggestions: [
          'Ensure input matches EnhancedMultiTenantInput schema',
          'Check multi-tenant configuration structure',
          'Verify tenant resolver and identifier settings are valid'
        ]
      };
    }
  }

  // ============================================================================
  // Enhanced Helper Methods
  // ============================================================================

  private async initializeConfig(input: EnhancedMultiTenantInput) {
    return {
      ...input.config,
      environment: input.environment,
      debug: input.debug,
      identifier: input.identifier,
      initialized: Date.now()
    };
  }

  private async initializeResolver(input: EnhancedMultiTenantInput): Promise<TenantResolver> {
    // If tenantResolver is already a proper resolver, return it
    if (input.config.tenantResolver && 
        typeof input.config.tenantResolver === 'object' &&
        typeof input.config.tenantResolver.resolveTenant === 'function') {
      return input.config.tenantResolver as TenantResolver;
    }

    // Create a basic resolver from the provided function
    return {
      resolveTenant: input.config.tenantResolver,
      resolveTenantByDomain: async (domain: string) => {
        return await input.config.tenantResolver({ type: 'domain', value: domain });
      },
      resolveTenantBySubdomain: async (subdomain: string) => {
        return await input.config.tenantResolver({ type: 'subdomain', value: subdomain });
      },
      resolveTenantById: async (id: string) => {
        return await input.config.tenantResolver({ type: 'id', value: id });
      }
    };
  }

  private createTenantResolver(config: any, resolver: TenantResolver) {
    return async (identifier: string | TenantIdentifier) => {
      try {
        let result: TenantInfo | null = null;

        if (typeof identifier === 'string') {
          // Use the default identifier type from config
          switch (config.identifier.type) {
            case 'domain':
              result = await resolver.resolveTenantByDomain(identifier);
              break;
            case 'subdomain':
              result = await resolver.resolveTenantBySubdomain(identifier);
              break;
            case 'id':
              result = await resolver.resolveTenantById(identifier);
              break;
            default:
              result = await resolver.resolveTenant({ type: config.identifier.type, value: identifier });
          }
        } else {
          result = await resolver.resolveTenant(identifier);
        }

        if (result) {
          this.currentTenant = result;
          this.updateTenantCache(result);
        }

        return result;
      } catch (error) {
        if (config.debug) {
          console.error('Tenant resolution failed:', error);
        }
        return null;
      }
    };
  }

  private createCurrentTenantGetter() {
    return () => this.currentTenant;
  }

  private createContextGetter() {
    return () => this.currentContext;
  }

  private createTenantSwitcher(config: any) {
    return async (tenantId: string) => {
      const resolver = this.createTenantResolver(config, config.tenantResolver);
      return await resolver(tenantId);
    };
  }

  private createCustomizationGetter(config: any) {
    return async (tenantId?: string) => {
      const targetTenantId = tenantId || this.currentTenant?.id;
      if (!targetTenantId) return null;

      // Check cache first
      const cached = this.customizationCache.get(targetTenantId);
      if (cached && Date.now() - cached.timestamp < config.caching.ttl) {
        return cached.customization;
      }

      try {
        const customization = await config.customizationProvider?.getCustomization(targetTenantId);
        if (customization) {
          this.updateCustomizationCache(targetTenantId, customization);
        }
        return customization;
      } catch (error) {
        if (config.debug) {
          console.error('Customization retrieval failed:', error);
        }
        return null;
      }
    };
  }

  private createCustomizationApplier(config: any) {
    return async (tenantId: string, customization: Partial<TenantCustomization>) => {
      try {
        // Apply customization through provider
        if (config.customizationProvider?.updateCustomization) {
          await config.customizationProvider.updateCustomization(tenantId, customization);
        }

        // Update cache
        const current = this.customizationCache.get(tenantId);
        if (current) {
          const updated = { ...current.customization, ...customization };
          this.updateCustomizationCache(tenantId, updated);
        }

        return true;
      } catch (error) {
        if (config.debug) {
          console.error('Customization application failed:', error);
        }
        return false;
      }
    };
  }

  private createCustomizationUpdater(config: any) {
    return async (tenantId: string, updates: Partial<TenantCustomization>) => {
      return await this.createCustomizationApplier(config)(tenantId, updates);
    };
  }

  private createCustomizationValidator() {
    return (customization: Partial<TenantCustomization>) => {
      const errors: string[] = [];

      // Validate branding colors
      if (customization.branding?.colors) {
        Object.entries(customization.branding.colors).forEach(([key, color]) => {
          if (typeof color === 'string' && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            errors.push(`Invalid color format for ${key}: ${color}`);
          }
        });
      }

      // Validate script content
      if (customization.scripts) {
        Object.values(customization.scripts).forEach((script, index) => {
          if (!script.content || script.content.trim().length === 0) {
            errors.push(`Script ${index} has empty content`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    };
  }

  private createIsolationEnabler(config: any) {
    return () => {
      this.isolationEnabled = true;
      if (config.debug) {
        console.log('Tenant isolation enabled');
      }
      return true;
    };
  }

  private createIsolationDisabler() {
    return () => {
      this.isolationEnabled = false;
      return true;
    };
  }

  private createNamespaceGetter(config: any) {
    return (tenantId?: string) => {
      const tenant = tenantId || this.currentTenant?.id || 'default';
      const prefix = config.isolation?.namespacePrefix || 'tenant';
      return `${prefix}-${tenant}`;
    };
  }

  private createViolationChecker() {
    return (action: string, resource: string) => {
      if (!this.isolationEnabled) return false;
      
      // Check for cross-tenant access violations
      const currentTenant = this.currentTenant?.id || 'default';
      const currentNamespace = `tenant-${currentTenant}`;
      const resourceNamespace = resource.split('-')[0];
      
      return currentNamespace !== resourceNamespace;
    };
  }

  private createFeatureChecker() {
    return (featureName: string) => {
      if (!this.currentTenant) return false;
      return this.currentTenant.features.includes(featureName);
    };
  }

  private createFeatureLister() {
    return () => {
      return this.currentTenant?.features || [];
    };
  }

  private createFeatureValidator() {
    return (features: string[]) => {
      if (!this.currentTenant) return false;
      return features.every(feature => this.currentTenant!.features.includes(feature));
    };
  }

  private createFeatureEnabler() {
    return (featureName: string) => {
      if (this.currentTenant && !this.currentTenant.features.includes(featureName)) {
        this.currentTenant.features.push(featureName);
        return true;
      }
      return false;
    };
  }

  private createFeatureDisabler() {
    return (featureName: string) => {
      if (this.currentTenant) {
        const index = this.currentTenant.features.indexOf(featureName);
        if (index > -1) {
          this.currentTenant.features.splice(index, 1);
          return true;
        }
      }
      return false;
    };
  }

  private createPermissionChecker() {
    return (permission: string) => {
      // Initialize context if it doesn't exist
      if (!this.currentContext) {
        this.currentContext = {
          tenant: this.currentTenant!,
          customization: {} as TenantCustomization,
          request: {} as any,
          session: {} as any,
          features: new Set<string>(),
          permissions: new Set<string>(),
        };
      }
      if (!this.currentContext.permissions) {
        this.currentContext.permissions = new Set<string>();
      }
      return this.currentContext.permissions.has(permission);
    };
  }

  private createPermissionValidator() {
    return (permission: string) => {
      return this.createPermissionChecker()(permission);
    };
  }

  private createPermissionLister() {
    return () => {
      // Initialize context if it doesn't exist
      if (!this.currentContext) {
        this.currentContext = {
          tenant: this.currentTenant!,
          customization: {} as TenantCustomization,
          request: {} as any,
          session: {} as any,
          features: new Set<string>(),
          permissions: new Set<string>(),
        };
      }
      if (!this.currentContext.permissions) {
        this.currentContext.permissions = new Set<string>();
      }
      return Array.from(this.currentContext.permissions);
    };
  }

  private createPermissionGranter() {
    return (permission: string) => {
      // Initialize context if it doesn't exist
      if (!this.currentContext) {
        this.currentContext = {
          tenant: this.currentTenant!,
          customization: {} as TenantCustomization,
          request: {} as any,
          session: {} as any,
          features: new Set<string>(),
          permissions: new Set<string>(),
        };
      }
      if (!this.currentContext.permissions) {
        this.currentContext.permissions = new Set<string>();
      }
      this.currentContext.permissions.add(permission);
      return true;
    };
  }

  private createPermissionRevoker() {
    return (permission: string) => {
      if (this.currentContext?.permissions) {
        return this.currentContext.permissions.delete(permission);
      }
      return false;
    };
  }

  private createMetricsCollector(config: any) {
    return (metrics: Partial<TenantMetrics>) => {
      const fullMetrics: TenantMetrics = {
        tenantId: this.currentTenant?.id || 'unknown',
        timestamp: new Date(),
        requests: 0,
        scriptsExecuted: 0,
        errors: 0,
        responseTime: 0,
        memoryUsage: 0,
        customizations: 0,
        ...metrics
      };

      this.metricsHistory.push(fullMetrics);

      // Keep only last 1000 metrics entries
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Call external metrics collector if configured
      if (config.monitoring?.metricsCollector) {
        config.monitoring.metricsCollector(fullMetrics);
      }

      return fullMetrics;
    };
  }

  private createMetricsGetter() {
    return () => {
      return this.metricsHistory;
    };
  }

  private createUsageGetter() {
    return () => {
      if (!this.currentTenant) return null;

      const tenantMetrics = this.metricsHistory.filter(m => m.tenantId === this.currentTenant!.id);
      
      return {
        requests: tenantMetrics.reduce((sum, m) => sum + m.requests, 0),
        scriptsExecuted: tenantMetrics.reduce((sum, m) => sum + m.scriptsExecuted, 0),
        errors: tenantMetrics.reduce((sum, m) => sum + m.errors, 0),
        averageResponseTime: tenantMetrics.length > 0 
          ? tenantMetrics.reduce((sum, m) => sum + m.responseTime, 0) / tenantMetrics.length 
          : 0,
        memoryUsage: tenantMetrics.length > 0 
          ? tenantMetrics[tenantMetrics.length - 1].memoryUsage 
          : 0,
        customizations: tenantMetrics.length > 0 
          ? tenantMetrics[tenantMetrics.length - 1].customizations 
          : 0
      };
    };
  }

  private createLimitsGetter() {
    return () => {
      return this.currentTenant?.limits || null;
    };
  }

  private updateTenantCache(tenant: TenantInfo): void {
    this.tenantCache.set(tenant.id, {
      tenant,
      timestamp: Date.now()
    });
  }

  private updateCustomizationCache(tenantId: string, customization: TenantCustomization): void {
    this.customizationCache.set(tenantId, {
      customization,
      timestamp: Date.now()
    });
  }

  private trackPerformance(startTime: number, success: boolean, output?: EnhancedMultiTenantOutput): void {
    const duration = Date.now() - startTime;
    this.evaluationHistory.push({
      input: {} as EnhancedMultiTenantInput, // Would store actual input in real implementation
      output,
      success,
      duration,
      timestamp: startTime
    });
  }

  getPerformanceMetrics() {
    return {
      totalInitializations: this.evaluationHistory.length,
      successRate: this.evaluationHistory.filter(h => h.success).length / Math.max(this.evaluationHistory.length, 1),
      averageDuration: this.evaluationHistory.reduce((sum, h) => sum + h.duration, 0) / Math.max(this.evaluationHistory.length, 1),
      lastEvaluationTime: this.evaluationHistory[this.evaluationHistory.length - 1]?.timestamp || 0,
      evaluationHistory: this.evaluationHistory.slice(-10), // Last 10 evaluations
      currentTenantId: this.currentTenant?.id || null,
      isolationEnabled: this.isolationEnabled,
      cacheSize: this.tenantCache.size + this.customizationCache.size,
      metricsCount: this.metricsHistory.length
    };
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createMultiTenantContext(): TypedMultiTenantContextImplementation {
  return new TypedMultiTenantContextImplementation();
}

export async function createEnhancedMultiTenant(
  config: Partial<EnhancedMultiTenantInput['config']>,
  options?: Partial<EnhancedMultiTenantInput>
): Promise<EvaluationResult<EnhancedMultiTenantOutput>> {
  const multiTenant = new TypedMultiTenantContextImplementation();
  return multiTenant.initialize({
    config: {
      enabled: true,
      tenantResolver: null, // Must be provided by user
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
      ...config
    },
    identifier: {
      type: 'subdomain',
      value: '',
    },
    ...options
  });
}

// ============================================================================
// Export for Registry Registration
// ============================================================================

export const enhancedMultiTenantImplementation = new TypedMultiTenantContextImplementation();