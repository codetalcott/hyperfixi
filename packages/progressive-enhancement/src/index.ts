/**
 * Progressive Enhancement for HyperFixi Applications
 *
 * Provides capability detection and progressive enhancement system
 * that adapts behavior based on browser capabilities and user preferences.
 */

// Import for internal use
import { enhance as enhanceInternal } from './enhancer';

// Core exports
export { ProgressiveEnhancer, getEnhancer, initProgressiveEnhancement, enhance, enhanceElement } from './enhancer';
export { detectCapabilities, detectUserPreferences, clearCapabilityCache, getCachedCapabilities } from './detector';
export { getEnhancementsForLevel, getFallbackEnhancements, filterEnhancementsByConditions, ENHANCEMENT_LEVELS } from './levels';

// Type exports
export type {
  CapabilityLevel,
  Capability,
  CapabilityReport,
  Enhancement,
  CapabilityCondition,
  EnhancementStrategy,
  EnhancementContext,
  UserPreferences,
  EnhancementResult,
  DetectorConfig,
  EnhancerConfig,
} from './types';

/**
 * Quick start function for basic progressive enhancement
 */
export async function quickStart(options: {
  selector?: string;
  templateVars?: Record<string, any>;
  strategy?: 'conservative' | 'balanced' | 'aggressive';
} = {}): Promise<void> {
  const { selector = '[data-enhance]', templateVars, strategy = 'balanced' } = options;
  
  // Configure strategy based on preset
  let enhancementStrategy;
  switch (strategy) {
    case 'conservative':
      enhancementStrategy = {
        aggressive: false,
        fallbackTimeout: 5000,
        lazyLoad: true,
        progressivelyEnhance: true,
        respectUserPreferences: true,
      };
      break;
    case 'aggressive':
      enhancementStrategy = {
        aggressive: true,
        fallbackTimeout: 1000,
        lazyLoad: false,
        progressivelyEnhance: true,
        respectUserPreferences: false,
      };
      break;
    default: // balanced
      enhancementStrategy = {
        aggressive: false,
        fallbackTimeout: 3000,
        lazyLoad: true,
        progressivelyEnhance: true,
        respectUserPreferences: true,
      };
  }
  
  const config = {
    strategy: enhancementStrategy,
    detector: {
      timeout: 2000,
      enablePerformanceMetrics: true,
      cacheResults: true,
    },
  };
  
  try {
    await enhanceInternal(selector, templateVars, config);
    console.log(`Progressive enhancement applied to elements matching "${selector}"`);
  } catch (error) {
    console.warn('Progressive enhancement failed:', error);
  }
}

/**
 * Auto-enhance function that runs on DOM ready
 */
export function autoEnhance(options: {
  selector?: string;
  templateVars?: Record<string, any>;
  strategy?: 'conservative' | 'balanced' | 'aggressive';
} = {}): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => quickStart(options));
  } else {
    quickStart(options);
  }
}

/**
 * Version information
 */
export const VERSION = '0.1.0';

/**
 * Default configuration
 */
export const DEFAULT_CONFIG = {
  detector: {
    timeout: 2000,
    enablePerformanceMetrics: true,
    cacheResults: true,
  },
  strategy: {
    aggressive: false,
    fallbackTimeout: 3000,
    lazyLoad: true,
    progressivelyEnhance: true,
    respectUserPreferences: true,
  },
};