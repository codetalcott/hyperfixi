/**
 * Types for Multi-Tenant System
 */

/**
 * Tenant identification and metadata
 */
export interface TenantInfo {
  id: string;
  name: string;
  domain?: string;
  subdomain?: string;
  customDomain?: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'suspended' | 'pending' | 'inactive';
  features: string[];
  limits: TenantLimits;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant resource limits and quotas
 */
export interface TenantLimits {
  maxScripts: number;
  maxElements: number;
  maxRequestsPerMinute: number;
  maxStorageSize: number;
  maxCustomizations: number;
  allowedFeatures: string[];
  restrictedFeatures: string[];
}

/**
 * Tenant-specific behavior customization
 */
export interface TenantCustomization {
  tenantId: string;
  scripts: Record<string, TenantScript>;
  styles: Record<string, TenantStyle>;
  components: Record<string, TenantComponent>;
  features: Record<string, TenantFeature>;
  branding: TenantBranding;
  localization: TenantLocalization;
  permissions: TenantPermissions;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant-specific script behavior
 */
export interface TenantScript {
  id: string;
  name: string;
  content: string;
  conditions: TenantCondition[];
  priority: number;
  enabled: boolean;
  metadata: Record<string, any>;
}

/**
 * Tenant-specific styling
 */
export interface TenantStyle {
  id: string;
  name: string;
  css: string;
  selectors: string[];
  mediaQueries?: string[];
  priority: number;
  enabled: boolean;
}

/**
 * Tenant-specific component configuration
 */
export interface TenantComponent {
  id: string;
  name: string;
  template: string;
  behavior: string;
  styles: string;
  props: Record<string, any>;
  enabled: boolean;
}

/**
 * Tenant-specific feature configuration
 */
export interface TenantFeature {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  conditions: TenantCondition[];
}

/**
 * Tenant branding customization
 */
export interface TenantBranding {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    lineHeight: string;
  };
  logos: {
    main: string;
    icon: string;
    favicon: string;
  };
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Tenant localization settings
 */
export interface TenantLocalization {
  defaultLocale: string;
  supportedLocales: string[];
  translations: Record<string, Record<string, string>>;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
  currency: string;
  numberFormat: string;
}

/**
 * Tenant permissions and access control
 */
export interface TenantPermissions {
  allowedActions: string[];
  restrictedActions: string[];
  roleBasedAccess: Record<string, string[]>;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  userLimits: {
    maxUsers: number;
    maxAdmins: number;
    maxGuests: number;
  };
}

/**
 * Condition for tenant-specific behavior
 */
export interface TenantCondition {
  type: 'user' | 'time' | 'location' | 'device' | 'feature' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'greaterThan' | 'lessThan' | 'between';
  field: string;
  value: any;
  values?: any[];
}

/**
 * Tenant context for request processing
 */
export interface TenantContext {
  tenant: TenantInfo;
  customization: TenantCustomization;
  user?: TenantUser | undefined;
  request: TenantRequest;
  session: TenantSession;
  features: Set<string>;
  permissions: Set<string>;
}

/**
 * Tenant user information
 */
export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  permissions: string[];
  preferences: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Tenant request context
 */
export interface TenantRequest {
  id: string;
  tenantId: string;
  userId?: string;
  ip: string;
  userAgent: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  timestamp: Date;
}

/**
 * Tenant session data
 */
export interface TenantSession {
  id: string;
  tenantId: string;
  userId?: string | undefined;
  data: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant isolation configuration
 */
export interface TenantIsolationConfig {
  enableDataIsolation: boolean;
  enableStyleIsolation: boolean;
  enableScriptIsolation: boolean;
  enableEventIsolation: boolean;
  enableStorageIsolation: boolean;
  sandboxLevel: 'none' | 'basic' | 'strict' | 'complete';
  namespacePrefix: string;
  allowCrossTenantAccess: boolean;
}

/**
 * Tenant manager configuration
 */
export interface TenantManagerConfig {
  tenantResolver: TenantResolver;
  customizationProvider: CustomizationProvider;
  isolation: TenantIsolationConfig;
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  monitoring: {
    enabled: boolean;
    metricsCollector?: (metrics: TenantMetrics) => void;
  };
}

/**
 * Tenant resolver interface
 */
export interface TenantResolver {
  resolveTenant(identifier: TenantIdentifier): Promise<TenantInfo | null>;
  resolveTenantByDomain(domain: string): Promise<TenantInfo | null>;
  resolveTenantBySubdomain(subdomain: string): Promise<TenantInfo | null>;
  resolveTenantById(id: string): Promise<TenantInfo | null>;
}

/**
 * Customization provider interface
 */
export interface CustomizationProvider {
  getCustomization(tenantId: string): Promise<TenantCustomization | null>;
  updateCustomization(tenantId: string, customization: Partial<TenantCustomization>): Promise<void>;
  deleteCustomization(tenantId: string): Promise<void>;
}

/**
 * Tenant identification methods
 */
export type TenantIdentifier =
  | {
      type: 'domain';
      value: string;
    }
  | {
      type: 'subdomain';
      value: string;
    }
  | {
      type: 'id';
      value: string;
    }
  | {
      type: 'header';
      value: string;
    }
  | {
      type: 'custom';
      resolver: (request: any) => Promise<string | null>;
    };

/**
 * Tenant metrics for monitoring
 */
export interface TenantMetrics {
  tenantId: string;
  timestamp: Date;
  requests: number;
  scriptsExecuted: number;
  errors: number;
  responseTime: number;
  memoryUsage: number;
  customizations: number;
}

/**
 * Tenant middleware configuration
 */
export interface TenantMiddlewareConfig {
  tenantManager: any; // Will be the TenantManager instance
  tenantIdentifier?: TenantIdentifier; // Optional - can be resolved from request
  enableIsolation: boolean;
  requireTenant: boolean;
  defaultTenant?: string;
  onTenantNotFound?: (identifier: string, request: any) => void;
  onTenantError?: (error: Error, request: any) => void;
}

/**
 * Tenant event types
 */
export interface TenantEvents {
  'tenant:resolved': { tenant: TenantInfo; context: TenantContext };
  'tenant:customization:loaded': { tenantId: string; customization: TenantCustomization };
  'tenant:customization:updated': { tenantId: string; changes: Partial<TenantCustomization> };
  'tenant:isolation:violation': { tenantId: string; violation: string; details: any };
  'tenant:limit:exceeded': { tenantId: string; limit: string; current: number; max: number };
  'tenant:error': { tenantId: string; error: Error; context: any };
}
