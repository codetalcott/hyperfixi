/**
 * Tenant Isolation System
 * Provides data, style, script, and event isolation between tenants
 */

import type { TenantContext, TenantIsolationConfig, TenantInfo } from './types';

/**
 * Isolation violation error
 */
export class IsolationViolationError extends Error {
  constructor(
    public tenantId: string,
    public violation: string,
    public details: any
  ) {
    super(`Isolation violation for tenant ${tenantId}: ${violation}`);
    this.name = 'IsolationViolationError';
  }
}

/**
 * Tenant isolation manager
 */
export class TenantIsolation {
  private config: TenantIsolationConfig;
  private tenantNamespaces = new Map<string, string>();
  private isolatedElements = new WeakMap<Element, string>();
  private isolatedScripts = new Map<string, Set<string>>();
  private isolatedStorage = new Map<string, Map<string, any>>();

  constructor(config: TenantIsolationConfig) {
    this.config = config;
    this.setupGlobalIsolation();
  }

  /**
   * Create isolated namespace for tenant
   */
  createNamespace(tenantId: string): string {
    if (this.tenantNamespaces.has(tenantId)) {
      return this.tenantNamespaces.get(tenantId)!;
    }

    const namespace = `${this.config.namespacePrefix}_${tenantId}_${Date.now()}`;
    this.tenantNamespaces.set(tenantId, namespace);
    return namespace;
  }

  /**
   * Get tenant namespace
   */
  getNamespace(tenantId: string): string {
    return this.tenantNamespaces.get(tenantId) || this.createNamespace(tenantId);
  }

  /**
   * Isolate DOM element for tenant
   */
  isolateElement(element: Element, tenantId: string): void {
    if (!this.config.enableDataIsolation) {
      return;
    }

    const namespace = this.getNamespace(tenantId);

    // Add tenant namespace to element
    element.setAttribute('data-tenant', tenantId);
    element.setAttribute('data-tenant-namespace', namespace);

    // Track isolated element
    this.isolatedElements.set(element, tenantId);

    // Isolate styles if enabled
    if (this.config.enableStyleIsolation) {
      this.isolateElementStyles(element, namespace);
    }

    // Isolate events if enabled
    if (this.config.enableEventIsolation) {
      this.isolateElementEvents(element, tenantId);
    }
  }

  /**
   * Isolate styles for element
   */
  private isolateElementStyles(element: Element, namespace: string): void {
    // Add namespace class to element
    element.classList.add(`${namespace}-scope`);

    // Create isolated style context
    const existingStyles = element.getAttribute('style');
    if (existingStyles) {
      // Prefix CSS custom properties with namespace
      const isolatedStyles = existingStyles.replace(/--([a-zA-Z-]+)/g, `--${namespace}-$1`);
      element.setAttribute('style', isolatedStyles);
    }
  }

  /**
   * Isolate events for element
   */
  private isolateElementEvents(element: Element, tenantId: string): void {
    const originalAddEventListener = element.addEventListener;
    const originalRemoveEventListener = element.removeEventListener;

    // Override addEventListener to add tenant context
    element.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      const wrappedListener = (event: Event) => {
        // Add tenant context to event
        (event as any).tenantId = tenantId;
        (event as any).tenantIsolated = true;

        // Call original listener
        if (typeof listener === 'function') {
          listener.call(this, event);
        } else {
          listener.handleEvent(event);
        }
      };

      return originalAddEventListener.call(this, type, wrappedListener, options);
    };

    // Override removeEventListener (basic implementation)
    element.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Isolate script execution for tenant
   */
  isolateScript(script: string, tenantId: string): string {
    if (!this.config.enableScriptIsolation) {
      return script;
    }

    const namespace = this.getNamespace(tenantId);

    // Track script for tenant
    if (!this.isolatedScripts.has(tenantId)) {
      this.isolatedScripts.set(tenantId, new Set());
    }
    this.isolatedScripts.get(tenantId)!.add(script);

    // Wrap script in isolated context
    const isolatedScript = this.wrapScriptInIsolation(script, tenantId, namespace);

    return isolatedScript;
  }

  /**
   * Wrap script in isolation context
   */
  private wrapScriptInIsolation(script: string, tenantId: string, namespace: string): string {
    let isolatedScript = script;

    // Replace global variables with namespaced versions
    isolatedScript = isolatedScript.replace(/\b(localStorage|sessionStorage)\b/g, `${namespace}$1`);

    // Replace document queries with tenant-scoped versions
    isolatedScript = isolatedScript.replace(
      /document\.querySelector\((.*?)\)/g,
      `document.querySelector('[data-tenant="${tenantId}"] ' + $1)`
    );

    isolatedScript = isolatedScript.replace(
      /document\.querySelectorAll\((.*?)\)/g,
      `document.querySelectorAll('[data-tenant="${tenantId}"] ' + $1)`
    );

    // Wrap in namespace
    const wrappedScript = `
      (function() {
        const TENANT_ID = '${tenantId}';
        const TENANT_NAMESPACE = '${namespace}';
        
        // Tenant-scoped storage
        const ${namespace}localStorage = {
          getItem: function(key) {
            return TenantIsolation.getStorageItem('${tenantId}', 'local', key);
          },
          setItem: function(key, value) {
            return TenantIsolation.setStorageItem('${tenantId}', 'local', key, value);
          },
          removeItem: function(key) {
            return TenantIsolation.removeStorageItem('${tenantId}', 'local', key);
          },
          clear: function() {
            return TenantIsolation.clearStorage('${tenantId}', 'local');
          }
        };
        
        const ${namespace}sessionStorage = {
          getItem: function(key) {
            return TenantIsolation.getStorageItem('${tenantId}', 'session', key);
          },
          setItem: function(key, value) {
            return TenantIsolation.setStorageItem('${tenantId}', 'session', key, value);
          },
          removeItem: function(key) {
            return TenantIsolation.removeStorageItem('${tenantId}', 'session', key);
          },
          clear: function() {
            return TenantIsolation.clearStorage('${tenantId}', 'session');
          }
        };
        
        // Execute tenant script
        ${isolatedScript}
      })();
    `;

    return wrappedScript;
  }

  /**
   * Get isolated storage item
   */
  static getStorageItem(tenantId: string, type: 'local' | 'session', key: string): string | null {
    const storageKey = `${type}_${tenantId}_${key}`;

    try {
      if (type === 'local') {
        return localStorage.getItem(storageKey);
      } else {
        return sessionStorage.getItem(storageKey);
      }
    } catch (error) {
      console.warn(`Failed to get ${type} storage item for tenant ${tenantId}:`, error);
      return null;
    }
  }

  /**
   * Set isolated storage item
   */
  static setStorageItem(
    tenantId: string,
    type: 'local' | 'session',
    key: string,
    value: string
  ): void {
    const storageKey = `${type}_${tenantId}_${key}`;

    try {
      if (type === 'local') {
        localStorage.setItem(storageKey, value);
      } else {
        sessionStorage.setItem(storageKey, value);
      }
    } catch (error) {
      console.warn(`Failed to set ${type} storage item for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Remove isolated storage item
   */
  static removeStorageItem(tenantId: string, type: 'local' | 'session', key: string): void {
    const storageKey = `${type}_${tenantId}_${key}`;

    try {
      if (type === 'local') {
        localStorage.removeItem(storageKey);
      } else {
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn(`Failed to remove ${type} storage item for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Clear isolated storage
   */
  static clearStorage(tenantId: string, type: 'local' | 'session'): void {
    const prefix = `${type}_${tenantId}_`;
    const storage = type === 'local' ? localStorage : sessionStorage;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.warn(`Failed to clear ${type} storage for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Check if cross-tenant access is allowed
   */
  checkCrossTenantAccess(fromTenantId: string, toTenantId: string, resource: string): boolean {
    if (!this.config.allowCrossTenantAccess) {
      return fromTenantId === toTenantId;
    }

    // Custom cross-tenant access logic could be implemented here
    return true;
  }

  /**
   * Validate tenant access to element
   */
  validateElementAccess(element: Element, tenantId: string): boolean {
    const elementTenantId = this.isolatedElements.get(element);

    if (!elementTenantId) {
      // Element is not isolated, allow access
      return true;
    }

    if (elementTenantId === tenantId) {
      // Same tenant, allow access
      return true;
    }

    if (this.checkCrossTenantAccess(tenantId, elementTenantId, 'element')) {
      // Cross-tenant access allowed
      return true;
    }

    // Access denied
    throw new IsolationViolationError(tenantId, 'unauthorized_element_access', {
      targetTenant: elementTenantId,
      element: element.tagName,
    });
  }

  /**
   * Create isolated CSS rules for tenant
   */
  createIsolatedCSS(css: string, tenantId: string): string {
    if (!this.config.enableStyleIsolation) {
      return css;
    }

    const namespace = this.getNamespace(tenantId);

    // Prefix all CSS rules with tenant namespace
    const isolatedCSS = css.replace(/([^{}]+)\s*{/g, (match, selector) => {
      const trimmedSelector = selector.trim();

      // Skip @rules and already namespaced selectors
      if (
        trimmedSelector.startsWith('@') ||
        trimmedSelector.includes(`[data-tenant="${tenantId}"]`)
      ) {
        return match;
      }

      // Add tenant attribute selector
      const namespacedSelector = `[data-tenant="${tenantId}"] ${trimmedSelector}`;
      return `${namespacedSelector} {`;
    });

    return isolatedCSS;
  }

  /**
   * Setup global isolation mechanisms
   */
  private setupGlobalIsolation(): void {
    if (typeof window === 'undefined') {
      return; // Server-side, skip DOM setup
    }

    // Set up global storage isolation if needed
    if (this.config.enableStorageIsolation) {
      this.setupStorageIsolation();
    }

    // Set up global event isolation if needed
    if (this.config.enableEventIsolation) {
      this.setupEventIsolation();
    }
  }

  /**
   * Setup storage isolation
   */
  private setupStorageIsolation(): void {
    // Storage isolation is handled per-tenant via static methods
    // Global setup might include cleanup or monitoring
  }

  /**
   * Setup event isolation
   */
  private setupEventIsolation(): void {
    // Global event isolation setup
    // Could include event delegation and filtering
  }

  /**
   * Cleanup tenant isolation
   */
  cleanup(tenantId: string): void {
    // Clear namespace
    this.tenantNamespaces.delete(tenantId);

    // Clear scripts
    this.isolatedScripts.delete(tenantId);

    // Clear storage
    TenantIsolation.clearStorage(tenantId, 'local');
    TenantIsolation.clearStorage(tenantId, 'session');

    // Remove isolated elements (WeakMap will handle cleanup automatically)
  }

  /**
   * Get isolation status for tenant
   */
  getIsolationStatus(tenantId: string): {
    namespace: string;
    scriptsCount: number;
    hasStorage: boolean;
    elementsCount: number;
  } {
    return {
      namespace: this.getNamespace(tenantId),
      scriptsCount: this.isolatedScripts.get(tenantId)?.size || 0,
      hasStorage: this.hasIsolatedStorage(tenantId),
      elementsCount: this.getIsolatedElementsCount(tenantId),
    };
  }

  /**
   * Check if tenant has isolated storage
   */
  private hasIsolatedStorage(tenantId: string): boolean {
    const localPrefix = `local_${tenantId}_`;
    const sessionPrefix = `session_${tenantId}_`;

    try {
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(localPrefix)) {
          return true;
        }
      }

      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(sessionPrefix)) {
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to check isolated storage:', error);
    }

    return false;
  }

  /**
   * Get count of isolated elements for tenant
   */
  private getIsolatedElementsCount(tenantId: string): number {
    let count = 0;

    try {
      const elements = document.querySelectorAll(`[data-tenant="${tenantId}"]`);
      count = elements.length;
    } catch (error) {
      console.warn('Failed to count isolated elements:', error);
    }

    return count;
  }
}

/**
 * Create tenant isolation with default configuration
 */
export function createTenantIsolation(
  config: Partial<TenantIsolationConfig> = {}
): TenantIsolation {
  const defaultConfig: TenantIsolationConfig = {
    enableDataIsolation: true,
    enableStyleIsolation: true,
    enableScriptIsolation: true,
    enableEventIsolation: true,
    enableStorageIsolation: true,
    sandboxLevel: 'basic',
    namespacePrefix: 'tenant',
    allowCrossTenantAccess: false,
  };

  return new TenantIsolation({ ...defaultConfig, ...config });
}
