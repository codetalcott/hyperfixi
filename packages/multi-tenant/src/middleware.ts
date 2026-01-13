/**
 * Multi-Tenant Middleware
 * Provides middleware integration for Express, Elysia, and other frameworks
 */

import type {
  TenantContext,
  TenantMiddlewareConfig,
  TenantIdentifier,
  TenantInfo,
  TenantRequest,
} from './types';
import { TenantManager } from './tenant-manager';
import { TenantIsolation } from './isolation';
import { TenantCustomizationEngine } from './customization';

/**
 * Tenant middleware result
 */
interface TenantMiddlewareResult {
  context: TenantContext | null;
  error?: Error;
  statusCode?: number;
  message?: string;
}

/**
 * Express-compatible middleware
 */
export function createExpressMiddleware(config: TenantMiddlewareConfig) {
  const tenantManager = config.tenantManager as TenantManager;
  const isolation = config.enableIsolation
    ? new TenantIsolation({
        enableDataIsolation: true,
        enableStyleIsolation: true,
        enableScriptIsolation: true,
        enableEventIsolation: true,
        enableStorageIsolation: true,
        sandboxLevel: 'basic',
        namespacePrefix: 'tenant',
        allowCrossTenantAccess: false,
      })
    : null;
  const customizationEngine = new TenantCustomizationEngine();

  return async function tenantMiddleware(req: any, res: any, next: any) {
    try {
      const result = await resolveTenantContext(
        req,
        config,
        tenantManager,
        isolation,
        customizationEngine
      );

      if (result.error) {
        if (config.onTenantError) {
          config.onTenantError(result.error, req);
        }

        if (config.requireTenant) {
          return res.status(result.statusCode || 400).json({
            error: result.message || 'Tenant resolution failed',
          });
        }
      }

      // Attach tenant context to request
      req.tenant = result.context?.tenant;
      req.tenantContext = result.context;
      req.tenantCustomization = result.context?.customization;

      // Apply tenant-specific middleware if context exists
      if (result.context && isolation) {
        await applyTenantIsolation(req, res, result.context, isolation);
      }

      next();
    } catch (error) {
      if (config.onTenantError) {
        config.onTenantError(error instanceof Error ? error : new Error(String(error)), req);
      }

      if (config.requireTenant) {
        res.status(500).json({
          error: 'Internal tenant resolution error',
        });
      } else {
        next();
      }
    }
  };
}

/**
 * Elysia-compatible plugin
 */
export function createElysiaPlugin(config: TenantMiddlewareConfig) {
  const tenantManager = config.tenantManager as TenantManager;
  const isolation = config.enableIsolation
    ? new TenantIsolation({
        enableDataIsolation: true,
        enableStyleIsolation: true,
        enableScriptIsolation: true,
        enableEventIsolation: true,
        enableStorageIsolation: true,
        sandboxLevel: 'basic',
        namespacePrefix: 'tenant',
        allowCrossTenantAccess: false,
      })
    : null;
  const customizationEngine = new TenantCustomizationEngine();

  return function tenantPlugin(app: any) {
    return app
      .derive(async ({ request, headers }: any) => {
        const result = await resolveTenantContext(
          { request, headers },
          config,
          tenantManager,
          isolation,
          customizationEngine
        );

        if (result.error && config.requireTenant) {
          throw new Error(result.message || 'Tenant resolution failed');
        }

        return {
          tenant: result.context?.tenant,
          tenantContext: result.context,
          tenantCustomization: result.context?.customization,
          tenantIsolation: isolation,
        };
      })
      .onAfterHandle(async (context: any) => {
        if (context.tenantContext && isolation) {
          await applyTenantResponseProcessing(context, isolation);
        }
      });
  };
}

/**
 * Generic middleware factory
 */
export function createTenantMiddleware(config: TenantMiddlewareConfig) {
  const tenantManager = config.tenantManager as TenantManager;
  const isolation = config.enableIsolation
    ? new TenantIsolation({
        enableDataIsolation: true,
        enableStyleIsolation: true,
        enableScriptIsolation: true,
        enableEventIsolation: true,
        enableStorageIsolation: true,
        sandboxLevel: 'basic',
        namespacePrefix: 'tenant',
        allowCrossTenantAccess: false,
      })
    : null;
  const customizationEngine = new TenantCustomizationEngine();

  return {
    async process(request: any): Promise<TenantMiddlewareResult> {
      return resolveTenantContext(request, config, tenantManager, isolation, customizationEngine);
    },
  };
}

/**
 * Resolve tenant context from request
 */
async function resolveTenantContext(
  request: any,
  config: TenantMiddlewareConfig,
  tenantManager: TenantManager,
  isolation: TenantIsolation | null,
  customizationEngine: TenantCustomizationEngine
): Promise<TenantMiddlewareResult> {
  try {
    // Extract tenant identifier from request
    const identifier = await extractTenantIdentifier(request, config.tenantIdentifier);

    if (!identifier) {
      if (config.defaultTenant) {
        // Use default tenant
        const tenant = await tenantManager.resolveTenant(
          {
            type: 'id',
            value: config.defaultTenant,
          },
          request
        );

        if (!tenant) {
          return {
            context: null,
            error: new Error('Default tenant not found'),
            statusCode: 404,
            message: 'Default tenant not found',
          };
        }

        return {
          context: await createTenantContext(tenant, request, tenantManager, customizationEngine),
        };
      }

      if (config.onTenantNotFound) {
        config.onTenantNotFound('unknown', request);
      }

      return {
        context: null,
        error: new Error('Tenant identifier not found'),
        statusCode: 400,
        message: 'Tenant identifier not found',
      };
    }

    // Resolve tenant
    const tenant = await tenantManager.resolveTenant(
      {
        type: 'id',
        value: identifier,
      },
      request
    );

    if (!tenant) {
      if (config.onTenantNotFound) {
        config.onTenantNotFound(identifier, request);
      }

      return {
        context: null,
        error: new Error(`Tenant not found: ${identifier}`),
        statusCode: 404,
        message: `Tenant not found: ${identifier}`,
      };
    }

    // Check tenant status
    if (tenant.status !== 'active') {
      return {
        context: null,
        error: new Error(`Tenant is ${tenant.status}`),
        statusCode: 403,
        message: `Tenant is ${tenant.status}`,
      };
    }

    // Create full tenant context
    const context = await createTenantContext(tenant, request, tenantManager, customizationEngine);

    return { context };
  } catch (error) {
    return {
      context: null,
      error: error instanceof Error ? error : new Error(String(error)),
      statusCode: 500,
      message: 'Tenant resolution failed',
    };
  }
}

/**
 * Extract tenant identifier from request
 */
async function extractTenantIdentifier(
  request: any,
  identifier?: TenantIdentifier
): Promise<string | null> {
  // Default to subdomain extraction if no identifier specified
  if (!identifier) {
    return extractSubdomain(request);
  }

  switch (identifier.type) {
    case 'domain':
      return extractDomain(request);
    case 'subdomain':
      return extractSubdomain(request);
    case 'id':
      return identifier.value;
    case 'header':
      return extractFromHeader(request, identifier.value);
    case 'custom':
      return identifier.resolver(request);
    default:
      return null;
  }
}

/**
 * Extract domain from request
 */
function extractDomain(request: any): string | null {
  const host = request.headers?.host || request.request?.headers?.get('host');
  if (!host) return null;

  // Remove port if present
  return host.split(':')[0];
}

/**
 * Extract subdomain from request
 */
function extractSubdomain(request: any): string | null {
  const host = request.headers?.host || request.request?.headers?.get('host');
  if (!host) return null;

  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0]; // Return first part as subdomain
  }

  return null;
}

/**
 * Extract identifier from header
 */
function extractFromHeader(request: any, headerName: string): string | null {
  return request.headers?.[headerName] || request.request?.headers?.get(headerName) || null;
}

/**
 * Create tenant context from resolved tenant
 */
async function createTenantContext(
  tenant: TenantInfo,
  request: any,
  tenantManager: TenantManager,
  customizationEngine: TenantCustomizationEngine
): Promise<TenantContext> {
  // Create tenant request object
  const tenantRequest: TenantRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    tenantId: tenant.id,
    ip: request.ip || request.request?.ip || 'unknown',
    userAgent:
      request.headers?.['user-agent'] || request.request?.headers?.get('user-agent') || 'unknown',
    path: request.path || request.url || request.request?.url || '/',
    method: request.method || request.request?.method || 'GET',
    headers: request.headers || Object.fromEntries(request.request?.headers?.entries() || []),
    query:
      request.query ||
      Object.fromEntries(
        new URL(request.url || 'http://localhost/', 'http://localhost').searchParams
      ),
    timestamp: new Date(),
  };

  // Create context
  const context = await tenantManager.createContext(
    tenant,
    tenantRequest,
    undefined, // User would be resolved separately
    undefined // Session would be resolved separately
  );

  return context;
}

/**
 * Apply tenant isolation to request
 */
async function applyTenantIsolation(
  request: any,
  response: any,
  context: TenantContext,
  isolation: TenantIsolation
): Promise<void> {
  // Add tenant isolation headers
  response.setHeader('X-Tenant-ID', context.tenant.id);
  response.setHeader('X-Tenant-Namespace', isolation.getNamespace(context.tenant.id));

  // Set up content isolation if response is HTML
  const originalSend = response.send;
  response.send = function (body: any) {
    if (typeof body === 'string' && body.includes('<html')) {
      // Apply tenant isolation to HTML content
      const isolatedBody = applyHTMLIsolation(body, context, isolation);
      return originalSend.call(this, isolatedBody);
    }
    return originalSend.call(this, body);
  };
}

/**
 * Apply tenant response processing for Elysia
 */
async function applyTenantResponseProcessing(
  context: any,
  isolation: TenantIsolation
): Promise<void> {
  if (typeof context.response === 'string' && context.response.includes('<html')) {
    // Apply tenant isolation to HTML response
    context.response = applyHTMLIsolation(context.response, context.tenantContext, isolation);
  }

  // Add tenant headers
  if (context.set && context.set.headers) {
    context.set.headers['X-Tenant-ID'] = context.tenantContext.tenant.id;
    context.set.headers['X-Tenant-Namespace'] = isolation.getNamespace(
      context.tenantContext.tenant.id
    );
  }
}

/**
 * Apply HTML isolation for tenant
 */
function applyHTMLIsolation(
  html: string,
  context: TenantContext,
  isolation: TenantIsolation
): string {
  // Add tenant attributes to body element
  let isolatedHTML = html.replace(
    /<body([^>]*)>/i,
    `<body$1 data-tenant="${context.tenant.id}" data-tenant-namespace="${isolation.getNamespace(context.tenant.id)}">`
  );

  // Add tenant isolation script
  const isolationScript = `
    <script>
      window.TENANT_ID = '${context.tenant.id}';
      window.TENANT_NAMESPACE = '${isolation.getNamespace(context.tenant.id)}';
      window.TenantIsolation = {
        getStorageItem: function(type, key) {
          return TenantIsolation.getStorageItem('${context.tenant.id}', type, key);
        },
        setStorageItem: function(type, key, value) {
          return TenantIsolation.setStorageItem('${context.tenant.id}', type, key, value);
        },
        removeStorageItem: function(type, key) {
          return TenantIsolation.removeStorageItem('${context.tenant.id}', type, key);
        },
        clearStorage: function(type) {
          return TenantIsolation.clearStorage('${context.tenant.id}', type);
        }
      };
    </script>
  `;

  isolatedHTML = isolatedHTML.replace('</head>', `${isolationScript}</head>`);

  return isolatedHTML;
}

/**
 * Tenant context extractor utility
 */
export function extractTenantContext(request: any): TenantContext | null {
  return request.tenantContext || null;
}

/**
 * Tenant info extractor utility
 */
export function extractTenantInfo(request: any): TenantInfo | null {
  return request.tenant || null;
}

/**
 * Check if request has valid tenant
 */
export function hasValidTenant(request: any): boolean {
  const tenant = extractTenantInfo(request);
  return tenant !== null && tenant.status === 'active';
}

/**
 * Require tenant middleware (throws if no tenant)
 */
export function requireTenant() {
  return function (req: any, res: any, next: any) {
    if (!hasValidTenant(req)) {
      return res.status(403).json({
        error: 'Valid tenant required',
      });
    }
    next();
  };
}

/**
 * Tenant feature guard middleware
 */
export function requireFeature(feature: string) {
  return function (req: any, res: any, next: any) {
    const context = extractTenantContext(req);
    if (!context || !context.features.has(feature)) {
      return res.status(403).json({
        error: `Feature '${feature}' not available for this tenant`,
      });
    }
    next();
  };
}

/**
 * Tenant permission guard middleware
 */
export function requirePermission(permission: string) {
  return function (req: any, res: any, next: any) {
    const context = extractTenantContext(req);
    if (!context || !context.permissions.has(permission)) {
      return res.status(403).json({
        error: `Permission '${permission}' required`,
      });
    }
    next();
  };
}
