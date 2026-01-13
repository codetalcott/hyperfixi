/**
 * Types for Progressive Enhancement System
 */

/**
 * Browser capability levels
 */
export type CapabilityLevel = 'basic' | 'enhanced' | 'modern' | 'cutting-edge';

/**
 * Individual capability detection result
 */
export interface Capability {
  name: string;
  supported: boolean;
  version?: string | undefined;
  details?: Record<string, any> | undefined;
}

/**
 * Complete capability detection results
 */
export interface CapabilityReport {
  level: CapabilityLevel;
  score: number;
  capabilities: Record<string, Capability>;
  userAgent: string;
  timestamp: number;
  features: {
    javascript: boolean;
    es6: boolean;
    modules: boolean;
    webComponents: boolean;
    intersectionObserver: boolean;
    mutationObserver: boolean;
    fetchAPI: boolean;
    promises: boolean;
    asyncAwait: boolean;
    cssGrid: boolean;
    cssCustomProperties: boolean;
    webAnimations: boolean;
    serviceWorker: boolean;
    webWorkers: boolean;
    localStorage: boolean;
    sessionStorage: boolean;
  };
}

/**
 * Enhancement definition for different capability levels
 */
export interface Enhancement {
  id: string;
  name: string;
  level: CapabilityLevel;
  requires: string[];
  fallback?: string;
  script?: string;
  styles?: string;
  priority: number;
  conditions?: CapabilityCondition[];
}

/**
 * Condition for enhancement activation
 */
export interface CapabilityCondition {
  feature: string;
  operator: 'exists' | 'equals' | 'greaterThan' | 'lessThan' | 'matches';
  value?: any;
}

/**
 * Enhancement strategy configuration
 */
export interface EnhancementStrategy {
  aggressive: boolean;
  fallbackTimeout: number;
  lazyLoad: boolean;
  progressivelyEnhance: boolean;
  respectUserPreferences: boolean;
}

/**
 * Progressive enhancement context
 */
export interface EnhancementContext {
  element: Element;
  capabilities: CapabilityReport;
  strategy: EnhancementStrategy;
  templateVars?: Record<string, any> | undefined;
  userPreferences?: UserPreferences | undefined;
}

/**
 * User preferences for progressive enhancement
 */
export interface UserPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  reducedData: boolean;
  preferBasic: boolean;
  javascriptEnabled: boolean;
}

/**
 * Enhancement result
 */
export interface EnhancementResult {
  level: CapabilityLevel;
  enhancements: Enhancement[];
  fallbacks: Enhancement[];
  scripts: string[];
  styles: string[];
  warnings: string[];
  performance: {
    detectionTime: number;
    enhancementTime: number;
    totalTime: number;
  };
}

/**
 * Detector configuration
 */
export interface DetectorConfig {
  timeout: number;
  enablePerformanceMetrics: boolean;
  cacheResults: boolean;
  customTests?: Record<string, () => boolean | Promise<boolean>>;
}

/**
 * Enhancer configuration
 */
export interface EnhancerConfig {
  detector?: DetectorConfig;
  strategy?: Partial<EnhancementStrategy>;
  customEnhancements?: Enhancement[];
  globalFallbacks?: Record<CapabilityLevel, Enhancement[]>;
}
