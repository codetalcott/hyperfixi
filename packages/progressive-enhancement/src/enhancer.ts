/**
 * Progressive Enhancement Engine
 * Core system for applying enhancements based on capabilities
 */

import type { 
  EnhancementContext,
  EnhancementResult,
  EnhancerConfig,
  Enhancement,
  CapabilityReport,
  EnhancementStrategy,
  UserPreferences
} from './types';
import { detectCapabilities, detectUserPreferences } from './detector';
import { 
  getEnhancementsForLevel, 
  getFallbackEnhancements, 
  filterEnhancementsByConditions 
} from './levels';

/**
 * Default enhancement strategy
 */
const DEFAULT_STRATEGY: EnhancementStrategy = {
  aggressive: false,
  fallbackTimeout: 3000,
  lazyLoad: true,
  progressivelyEnhance: true,
  respectUserPreferences: true,
};

/**
 * Main progressive enhancement class
 */
export class ProgressiveEnhancer {
  private config: EnhancerConfig;
  private strategy: EnhancementStrategy;
  private capabilityReport: CapabilityReport | null = null;
  private userPreferences: UserPreferences | null = null;

  constructor(config: EnhancerConfig = {}) {
    this.config = config;
    this.strategy = { ...DEFAULT_STRATEGY, ...config.strategy };
  }

  /**
   * Initialize the enhancer and detect capabilities
   */
  async initialize(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Detect capabilities and user preferences in parallel
      const [capabilities, preferences] = await Promise.all([
        detectCapabilities(this.config.detector),
        Promise.resolve(detectUserPreferences()),
      ]);
      
      this.capabilityReport = capabilities;
      this.userPreferences = preferences;
      
      if (this.config.detector?.enablePerformanceMetrics) {
        console.log(`Progressive enhancement initialized in ${performance.now() - startTime}ms`);
        console.log('Capability level:', capabilities.level);
        console.log('Capability score:', capabilities.score);
      }
    } catch (error) {
      console.warn('Failed to initialize progressive enhancement:', error);
      // Fallback to basic level
      this.capabilityReport = {
        level: 'basic',
        score: 0,
        capabilities: {},
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        features: {
          javascript: true,
          es6: false,
          modules: false,
          webComponents: false,
          intersectionObserver: false,
          mutationObserver: false,
          fetchAPI: false,
          promises: false,
          asyncAwait: false,
          cssGrid: false,
          cssCustomProperties: false,
          webAnimations: false,
          serviceWorker: false,
          webWorkers: false,
          localStorage: false,
          sessionStorage: false,
        },
      };
      this.userPreferences = {
        reduceMotion: false,
        highContrast: false,
        reducedData: false,
        preferBasic: false,
        javascriptEnabled: true,
      };
    }
  }

  /**
   * Enhance a single element with appropriate enhancements
   */
  async enhanceElement(element: Element, templateVars?: Record<string, any>): Promise<EnhancementResult> {
    if (!this.capabilityReport || !this.userPreferences) {
      await this.initialize();
    }

    const context: EnhancementContext = {
      element,
      capabilities: this.capabilityReport!,
      strategy: this.strategy,
      templateVars,
      userPreferences: this.userPreferences!,
    };

    return this.applyEnhancements(context);
  }

  /**
   * Enhance all elements matching a selector
   */
  async enhanceElements(
    selector: string, 
    templateVars?: Record<string, any>
  ): Promise<EnhancementResult[]> {
    const elements = document.querySelectorAll(selector);
    const results: EnhancementResult[] = [];

    for (const element of elements) {
      const result = await this.enhanceElement(element, templateVars);
      results.push(result);
    }

    return results;
  }

  /**
   * Enhance the entire document
   */
  async enhanceDocument(templateVars?: Record<string, any>): Promise<EnhancementResult> {
    return this.enhanceElement(document.documentElement, templateVars);
  }

  /**
   * Apply enhancements based on context
   */
  private async applyEnhancements(context: EnhancementContext): Promise<EnhancementResult> {
    const startTime = performance.now();
    const detectionTime = 0; // Already detected during initialization
    
    const warnings: string[] = [];
    let level = context.capabilities.level;

    // Respect user preferences
    if (this.strategy.respectUserPreferences && context.userPreferences) {
      if (context.userPreferences.preferBasic) {
        level = 'basic';
        warnings.push('Using basic level due to user preferences');
      }
    }

    // Get available enhancements for the capability level
    let availableEnhancements = getEnhancementsForLevel(level);
    
    // Add custom enhancements if provided
    if (this.config.customEnhancements) {
      availableEnhancements.push(...this.config.customEnhancements);
    }

    // Filter enhancements based on capability conditions
    availableEnhancements = filterEnhancementsByConditions(
      availableEnhancements, 
      context.capabilities.capabilities
    );

    // Get fallbacks for missing capabilities
    const missingCapabilities = this.getMissingCapabilities(availableEnhancements, context.capabilities);
    const fallbackEnhancements = getFallbackEnhancements(level, missingCapabilities);

    // Apply enhancements
    const { scripts, styles } = await this.processEnhancements(
      availableEnhancements, 
      context
    );

    const enhancementTime = performance.now() - startTime;

    return {
      level,
      enhancements: availableEnhancements,
      fallbacks: fallbackEnhancements,
      scripts,
      styles,
      warnings,
      performance: {
        detectionTime,
        enhancementTime,
        totalTime: detectionTime + enhancementTime,
      },
    };
  }

  /**
   * Process and apply enhancements
   */
  private async processEnhancements(
    enhancements: Enhancement[], 
    context: EnhancementContext
  ): Promise<{ scripts: string[]; styles: string[] }> {
    const scripts: string[] = [];
    const styles: string[] = [];

    for (const enhancement of enhancements) {
      try {
        // Process template variables in scripts and styles
        let processedScript = enhancement.script || '';
        let processedStyles = enhancement.styles || '';

        if (context.templateVars) {
          processedScript = this.processTemplateVariables(processedScript, context.templateVars);
          processedStyles = this.processTemplateVariables(processedStyles, context.templateVars);
        }

        // Apply script if present
        if (processedScript) {
          if (this.strategy.lazyLoad) {
            await this.loadScriptLazily(processedScript, enhancement.id);
          } else {
            this.executeScript(processedScript, enhancement.id);
          }
          scripts.push(processedScript);
        }

        // Apply styles if present
        if (processedStyles) {
          this.injectStyles(processedStyles, enhancement.id);
          styles.push(processedStyles);
        }
      } catch (error) {
        console.warn(`Failed to apply enhancement "${enhancement.id}":`, error);
      }
    }

    return { scripts, styles };
  }

  /**
   * Get missing capabilities for given enhancements
   */
  private getMissingCapabilities(
    enhancements: Enhancement[],
    capabilities: CapabilityReport
  ): string[] {
    const missing: string[] = [];
    const available = Object.keys(capabilities.capabilities).filter(
      key => capabilities.capabilities[key]?.supported
    );

    for (const enhancement of enhancements) {
      for (const requirement of enhancement.requires) {
        if (!available.includes(requirement) && !missing.includes(requirement)) {
          missing.push(requirement);
        }
      }
    }

    return missing;
  }

  /**
   * Process template variables in text
   */
  private processTemplateVariables(text: string, vars: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return vars[varName] !== undefined ? String(vars[varName]) : match;
    });
  }

  /**
   * Execute script code safely
   */
  private executeScript(script: string, enhancementId: string): void {
    try {
      // Wrap in IIFE to avoid global scope pollution
      const wrappedScript = `
        (function() {
          // Enhancement: ${enhancementId}
          ${script}
        })();
      `;
      
      // Use Function constructor for better CSP compatibility
      new Function(wrappedScript)();
    } catch (error) {
      console.warn(`Failed to execute script for enhancement "${enhancementId}":`, error);
    }
  }

  /**
   * Load script lazily with timeout
   */
  private async loadScriptLazily(script: string, enhancementId: string): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn(`Script loading timeout for enhancement "${enhancementId}"`);
        resolve();
      }, this.strategy.fallbackTimeout);

      try {
        requestIdleCallback(() => {
          clearTimeout(timeout);
          this.executeScript(script, enhancementId);
          resolve();
        }, { timeout: this.strategy.fallbackTimeout });
      } catch {
        // Fallback if requestIdleCallback is not available
        setTimeout(() => {
          clearTimeout(timeout);
          this.executeScript(script, enhancementId);
          resolve();
        }, 0);
      }
    });
  }

  /**
   * Inject CSS styles into document
   */
  private injectStyles(styles: string, enhancementId: string): void {
    const styleId = `progressive-enhancement-${enhancementId}`;
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      /* Progressive Enhancement: ${enhancementId} */
      ${styles}
    `;
    
    document.head.appendChild(styleElement);
  }

  /**
   * Get current capability report
   */
  getCapabilities(): CapabilityReport | null {
    return this.capabilityReport;
  }

  /**
   * Get current user preferences
   */
  getUserPreferences(): UserPreferences | null {
    return this.userPreferences;
  }

  /**
   * Update enhancement strategy
   */
  updateStrategy(newStrategy: Partial<EnhancementStrategy>): void {
    this.strategy = { ...this.strategy, ...newStrategy };
  }
}

/**
 * Global enhancer instance
 */
let globalEnhancer: ProgressiveEnhancer | null = null;

/**
 * Get or create global enhancer instance
 */
export function getEnhancer(config?: EnhancerConfig): ProgressiveEnhancer {
  if (!globalEnhancer) {
    globalEnhancer = new ProgressiveEnhancer(config);
  }
  return globalEnhancer;
}

/**
 * Initialize progressive enhancement for the document
 */
export async function initProgressiveEnhancement(
  config?: EnhancerConfig
): Promise<EnhancementResult> {
  const enhancer = getEnhancer(config);
  await enhancer.initialize();
  return enhancer.enhanceDocument();
}

/**
 * Enhance elements with progressive enhancement
 */
export async function enhance(
  selector: string, 
  templateVars?: Record<string, any>,
  config?: EnhancerConfig
): Promise<EnhancementResult[]> {
  const enhancer = getEnhancer(config);
  return enhancer.enhanceElements(selector, templateVars);
}

/**
 * Enhance a single element
 */
export async function enhanceElement(
  element: Element,
  templateVars?: Record<string, any>,
  config?: EnhancerConfig
): Promise<EnhancementResult> {
  const enhancer = getEnhancer(config);
  return enhancer.enhanceElement(element, templateVars);
}