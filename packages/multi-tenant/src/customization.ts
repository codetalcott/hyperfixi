/**
 * Tenant Customization Engine
 * Handles tenant-specific behavior, styling, and feature customization
 */

import type {
  TenantContext,
  TenantCustomization,
  TenantScript,
  TenantStyle,
  TenantComponent,
  TenantFeature,
  TenantCondition,
  TenantBranding,
} from './types';

/**
 * Customization evaluation context
 */
interface EvaluationContext {
  tenant: TenantContext['tenant'];
  user?: TenantContext['user'];
  request: TenantContext['request'];
  session: TenantContext['session'];
  timestamp: Date;
  userAgent: string;
  locale: string;
  timezone: string;
}

/**
 * Customization result
 */
interface CustomizationResult {
  scripts: string[];
  styles: string[];
  components: Record<string, any>;
  features: Record<string, any>;
  branding: TenantBranding;
  variables: Record<string, any>;
  metadata: {
    appliedScripts: string[];
    appliedStyles: string[];
    enabledFeatures: string[];
    conditionsEvaluated: number;
    executionTime: number;
  };
}

/**
 * Tenant customization engine
 */
export class TenantCustomizationEngine {
  private cache = new Map<string, { result: CustomizationResult; timestamp: number }>();
  private readonly cacheTTL = 300000; // 5 minutes

  /**
   * Apply tenant customization to context
   */
  async applyCustomization(context: TenantContext): Promise<CustomizationResult> {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(context);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    const evaluationContext = this.createEvaluationContext(context);
    const customization = context.customization;

    // Apply scripts
    const scripts = await this.applyScripts(customization.scripts, evaluationContext);

    // Apply styles
    const styles = await this.applyStyles(customization.styles, evaluationContext);

    // Apply components
    const components = await this.applyComponents(customization.components, evaluationContext);

    // Apply features
    const features = await this.applyFeatures(customization.features, evaluationContext);

    // Process branding
    const branding = this.processBranding(customization.branding, evaluationContext);

    // Create template variables
    const variables = this.createTemplateVariables(context, evaluationContext);

    const executionTime = performance.now() - startTime;

    const result: CustomizationResult = {
      scripts: scripts.content,
      styles: styles.content,
      components,
      features,
      branding,
      variables,
      metadata: {
        appliedScripts: scripts.applied,
        appliedStyles: styles.applied,
        enabledFeatures: Object.keys(features).filter(key => features[key].enabled),
        conditionsEvaluated: scripts.conditionsEvaluated + styles.conditionsEvaluated,
        executionTime,
      },
    };

    // Cache result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Apply tenant scripts
   */
  private async applyScripts(
    scripts: Record<string, TenantScript>,
    context: EvaluationContext
  ): Promise<{ content: string[]; applied: string[]; conditionsEvaluated: number }> {
    const content: string[] = [];
    const applied: string[] = [];
    let conditionsEvaluated = 0;

    // Sort scripts by priority
    const sortedScripts = Object.values(scripts).sort((a, b) => a.priority - b.priority);

    for (const script of sortedScripts) {
      if (!script.enabled) {
        continue;
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(script.conditions, context);
      conditionsEvaluated += script.conditions.length;

      if (conditionsMet) {
        // Process template variables in script
        const processedScript = this.processTemplateVariables(script.content, context);
        content.push(processedScript);
        applied.push(script.id);
      }
    }

    return { content, applied, conditionsEvaluated };
  }

  /**
   * Apply tenant styles
   */
  private async applyStyles(
    styles: Record<string, TenantStyle>,
    context: EvaluationContext
  ): Promise<{ content: string[]; applied: string[]; conditionsEvaluated: number }> {
    const content: string[] = [];
    const applied: string[] = [];
    let conditionsEvaluated = 0;

    // Sort styles by priority
    const sortedStyles = Object.values(styles).sort((a, b) => a.priority - b.priority);

    for (const style of sortedStyles) {
      if (!style.enabled) {
        continue;
      }

      // Check media queries
      const mediaQueryMet = await this.evaluateMediaQueries(style.mediaQueries, context);
      if (!mediaQueryMet) {
        continue;
      }

      // Process CSS with tenant-specific variables
      const processedCSS = this.processCSSVariables(style.css, context);
      content.push(processedCSS);
      applied.push(style.id);
    }

    return { content, applied, conditionsEvaluated };
  }

  /**
   * Apply tenant components
   */
  private async applyComponents(
    components: Record<string, TenantComponent>,
    context: EvaluationContext
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, component] of Object.entries(components)) {
      if (!component.enabled) {
        continue;
      }

      result[key] = {
        template: this.processTemplateVariables(component.template, context),
        behavior: this.processTemplateVariables(component.behavior, context),
        styles: this.processCSSVariables(component.styles, context),
        props: { ...component.props },
      };
    }

    return result;
  }

  /**
   * Apply tenant features
   */
  private async applyFeatures(
    features: Record<string, TenantFeature>,
    context: EvaluationContext
  ): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    for (const [key, feature] of Object.entries(features)) {
      if (!feature.enabled) {
        result[key] = { enabled: false };
        continue;
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(feature.conditions, context);

      result[key] = {
        enabled: conditionsMet,
        config: { ...feature.config },
      };
    }

    return result;
  }

  /**
   * Process tenant branding
   */
  private processBranding(branding: TenantBranding, context: EvaluationContext): TenantBranding {
    // Process branding with context-specific adjustments
    const processedBranding = { ...branding };

    // Adjust theme based on user preferences
    if (context.user?.preferences?.theme) {
      processedBranding.theme = context.user.preferences.theme;
    }

    // Process color variables
    Object.keys(processedBranding.colors).forEach(key => {
      const color = processedBranding.colors[key as keyof typeof processedBranding.colors];
      processedBranding.colors[key as keyof typeof processedBranding.colors] =
        this.processTemplateVariables(color, context);
    });

    return processedBranding;
  }

  /**
   * Create template variables for tenant context
   */
  private createTemplateVariables(
    context: TenantContext,
    evaluationContext: EvaluationContext
  ): Record<string, any> {
    return {
      // Tenant variables
      tenantId: context.tenant.id,
      tenantName: context.tenant.name,
      tenantPlan: context.tenant.plan,
      tenantDomain: context.tenant.domain,

      // User variables
      userId: context.user?.id,
      userEmail: context.user?.email,
      userRole: context.user?.role,

      // Request variables
      requestId: context.request.id,
      requestPath: context.request.path,
      requestMethod: context.request.method,

      // Branding variables
      primaryColor: context.customization.branding.colors.primary,
      secondaryColor: context.customization.branding.colors.secondary,
      fontFamily: context.customization.branding.typography.fontFamily,

      // Localization variables
      locale: context.customization.localization.defaultLocale,
      timezone: context.customization.localization.timezone,
      currency: context.customization.localization.currency,

      // Computed variables
      timestamp: evaluationContext.timestamp.toISOString(),
      year: evaluationContext.timestamp.getFullYear(),
      month: evaluationContext.timestamp.getMonth() + 1,
      day: evaluationContext.timestamp.getDate(),

      // Feature flags
      features: Array.from(context.features),
      permissions: Array.from(context.permissions),
    };
  }

  /**
   * Evaluate tenant conditions
   */
  private async evaluateConditions(
    conditions: TenantCondition[],
    context: EvaluationContext
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, context);
      if (!result) {
        return false; // All conditions must be true
      }
    }

    return true;
  }

  /**
   * Evaluate single condition
   */
  private async evaluateCondition(
    condition: TenantCondition,
    context: EvaluationContext
  ): Promise<boolean> {
    let value: any;

    // Get value based on condition type
    switch (condition.type) {
      case 'user':
        value = this.getUserValue(condition.field, context);
        break;
      case 'time':
        value = this.getTimeValue(condition.field, context);
        break;
      case 'location':
        value = this.getLocationValue(condition.field, context);
        break;
      case 'device':
        value = this.getDeviceValue(condition.field, context);
        break;
      case 'feature':
        value = this.getFeatureValue(condition.field, context);
        break;
      case 'custom':
        value = this.getCustomValue(condition.field, context);
        break;
      default:
        return false;
    }

    // Apply operator
    return this.applyOperator(value, condition.operator, condition.value, condition.values);
  }

  /**
   * Get user-related value
   */
  private getUserValue(field: string, context: EvaluationContext): any {
    const user = context.user;
    switch (field) {
      case 'id':
        return user?.id;
      case 'email':
        return user?.email;
      case 'role':
        return user?.role;
      case 'permissions':
        return user?.permissions;
      case 'authenticated':
        return !!user;
      default:
        return user?.metadata?.[field];
    }
  }

  /**
   * Get time-related value
   */
  private getTimeValue(field: string, context: EvaluationContext): any {
    const timestamp = context.timestamp;
    switch (field) {
      case 'hour':
        return timestamp.getHours();
      case 'day':
        return timestamp.getDay();
      case 'date':
        return timestamp.getDate();
      case 'month':
        return timestamp.getMonth() + 1;
      case 'year':
        return timestamp.getFullYear();
      case 'timestamp':
        return timestamp.getTime();
      case 'timezone':
        return context.timezone;
      default:
        return null;
    }
  }

  /**
   * Get location-related value
   */
  private getLocationValue(field: string, context: EvaluationContext): any {
    // Location detection would require additional services
    switch (field) {
      case 'country':
        return context.request.headers['cf-ipcountry'] || 'unknown';
      case 'region':
        return context.request.headers['cf-region'] || 'unknown';
      case 'city':
        return context.request.headers['cf-city'] || 'unknown';
      case 'ip':
        return context.request.ip;
      default:
        return null;
    }
  }

  /**
   * Get device-related value
   */
  private getDeviceValue(field: string, context: EvaluationContext): any {
    const userAgent = context.userAgent;
    switch (field) {
      case 'mobile':
        return /Mobile|Android|iPhone|iPad/.test(userAgent);
      case 'tablet':
        return /iPad|Tablet/.test(userAgent);
      case 'desktop':
        return !/Mobile|Android|iPhone|iPad/.test(userAgent);
      case 'browser':
        return this.detectBrowser(userAgent);
      case 'os':
        return this.detectOS(userAgent);
      case 'userAgent':
        return userAgent;
      default:
        return null;
    }
  }

  /**
   * Get feature-related value
   */
  private getFeatureValue(field: string, context: EvaluationContext): any {
    return context.tenant.features.includes(field);
  }

  /**
   * Get custom value
   */
  private getCustomValue(field: string, context: EvaluationContext): any {
    // Custom field evaluation could be extended
    return context.tenant.metadata?.[field];
  }

  /**
   * Apply condition operator
   */
  private applyOperator(
    value: any,
    operator: TenantCondition['operator'],
    compareValue: any,
    compareValues?: any[]
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === compareValue;
      case 'contains':
        return Array.isArray(value)
          ? value.includes(compareValue)
          : typeof value === 'string'
            ? value.includes(compareValue)
            : false;
      case 'matches':
        return typeof value === 'string' && new RegExp(compareValue).test(value);
      case 'greaterThan':
        return typeof value === 'number' && value > compareValue;
      case 'lessThan':
        return typeof value === 'number' && value < compareValue;
      case 'between':
        if (!compareValues || compareValues.length < 2) {
          return false;
        }
        return typeof value === 'number' && value >= compareValues[0] && value <= compareValues[1];
      default:
        return false;
    }
  }

  /**
   * Evaluate media queries
   */
  private async evaluateMediaQueries(
    mediaQueries: string[] | undefined,
    context: EvaluationContext
  ): Promise<boolean> {
    if (!mediaQueries || mediaQueries.length === 0) {
      return true;
    }

    // In server-side context, assume all media queries match
    if (typeof window === 'undefined') {
      return true;
    }

    for (const query of mediaQueries) {
      if (window.matchMedia(query).matches) {
        return true;
      }
    }

    return false;
  }

  /**
   * Process template variables in text
   */
  private processTemplateVariables(text: string, context: EvaluationContext): string {
    const variables = {
      tenantId: context.tenant.id,
      tenantName: context.tenant.name,
      userId: context.user?.id || '',
      userEmail: context.user?.email || '',
      userRole: context.user?.role || '',
      timestamp: context.timestamp.toISOString(),
      locale: context.locale,
      timezone: context.timezone,
    };

    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName as keyof typeof variables] || match;
    });
  }

  /**
   * Process CSS variables
   */
  private processCSSVariables(css: string, context: EvaluationContext): string {
    const variables = {
      'tenant-id': context.tenant.id,
      'primary-color': '#3b82f6',
      'secondary-color': '#6b7280',
      'text-color': '#1f2937',
      'background-color': '#ffffff',
    };

    return css.replace(/var\(--(\w+(?:-\w+)*)\)/g, (match, varName) => {
      return variables[varName as keyof typeof variables] || match;
    });
  }

  /**
   * Create evaluation context
   */
  private createEvaluationContext(context: TenantContext): EvaluationContext {
    return {
      tenant: context.tenant,
      user: context.user,
      request: context.request,
      session: context.session,
      timestamp: new Date(),
      userAgent: context.request.userAgent,
      locale: context.customization.localization.defaultLocale,
      timezone: context.customization.localization.timezone,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(context: TenantContext): string {
    const key = [
      context.tenant.id,
      context.user?.id || 'anonymous',
      context.customization.version,
      Math.floor(Date.now() / this.cacheTTL), // Time bucket for cache invalidation
    ].join(':');

    return key;
  }

  /**
   * Detect browser from user agent
   */
  private detectBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  }

  /**
   * Detect OS from user agent
   */
  private detectOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'windows';
    if (userAgent.includes('Mac')) return 'macos';
    if (userAgent.includes('Linux')) return 'linux';
    if (userAgent.includes('Android')) return 'android';
    if (userAgent.includes('iOS')) return 'ios';
    return 'unknown';
  }

  /**
   * Clear customization cache
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      // Clear specific tenant cache
      for (const [key, _] of this.cache) {
        if (key.startsWith(`${tenantId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Create tenant customization engine
 */
export function createCustomizationEngine(): TenantCustomizationEngine {
  return new TenantCustomizationEngine();
}
