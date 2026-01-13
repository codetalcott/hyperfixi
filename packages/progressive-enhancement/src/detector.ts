/**
 * Capability Detection System
 * Detects browser capabilities and assigns enhancement levels
 */

import type {
  CapabilityReport,
  CapabilityLevel,
  Capability,
  DetectorConfig,
  UserPreferences,
} from './types';

/**
 * Default detector configuration
 */
const DEFAULT_CONFIG: DetectorConfig = {
  timeout: 2000,
  enablePerformanceMetrics: true,
  cacheResults: true,
  customTests: {},
};

/**
 * Cached capability report
 */
let cachedReport: CapabilityReport | null = null;

/**
 * Detect browser capabilities and return comprehensive report
 */
export async function detectCapabilities(
  config: Partial<DetectorConfig> = {}
): Promise<CapabilityReport> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Return cached result if available and caching enabled
  if (finalConfig.cacheResults && cachedReport) {
    return cachedReport;
  }

  const startTime = performance.now();

  // Detect individual capabilities
  const capabilities: Record<string, Capability> = {};

  // JavaScript capabilities
  capabilities.javascript = await testCapability('javascript', () => true);
  capabilities.es6 = await testCapability('es6', testES6Support);
  capabilities.modules = await testCapability('modules', testModuleSupport);
  capabilities.promises = await testCapability('promises', testPromiseSupport);
  capabilities.asyncAwait = await testCapability('asyncAwait', testAsyncAwaitSupport);

  // DOM APIs
  capabilities.intersectionObserver = await testCapability(
    'intersectionObserver',
    testIntersectionObserver
  );
  capabilities.mutationObserver = await testCapability('mutationObserver', testMutationObserver);
  capabilities.webComponents = await testCapability('webComponents', testWebComponents);

  // Network APIs
  capabilities.fetchAPI = await testCapability('fetchAPI', testFetchAPI);

  // CSS capabilities
  capabilities.cssGrid = await testCapability('cssGrid', testCSSGrid);
  capabilities.cssCustomProperties = await testCapability(
    'cssCustomProperties',
    testCSSCustomProperties
  );
  capabilities.webAnimations = await testCapability('webAnimations', testWebAnimations);

  // Web APIs
  capabilities.serviceWorker = await testCapability('serviceWorker', testServiceWorker);
  capabilities.webWorkers = await testCapability('webWorkers', testWebWorkers);
  capabilities.localStorage = await testCapability('localStorage', testLocalStorage);
  capabilities.sessionStorage = await testCapability('sessionStorage', testSessionStorage);

  // Run custom tests
  for (const [name, test] of Object.entries(finalConfig.customTests || {})) {
    capabilities[name] = await testCapability(name, test);
  }

  // Calculate capability score and level
  const score = calculateCapabilityScore(capabilities);
  const level = determineCapabilityLevel(score, capabilities);

  // Create feature summary
  const features = {
    javascript: capabilities.javascript?.supported || false,
    es6: capabilities.es6?.supported || false,
    modules: capabilities.modules?.supported || false,
    webComponents: capabilities.webComponents?.supported || false,
    intersectionObserver: capabilities.intersectionObserver?.supported || false,
    mutationObserver: capabilities.mutationObserver?.supported || false,
    fetchAPI: capabilities.fetchAPI?.supported || false,
    promises: capabilities.promises?.supported || false,
    asyncAwait: capabilities.asyncAwait?.supported || false,
    cssGrid: capabilities.cssGrid?.supported || false,
    cssCustomProperties: capabilities.cssCustomProperties?.supported || false,
    webAnimations: capabilities.webAnimations?.supported || false,
    serviceWorker: capabilities.serviceWorker?.supported || false,
    webWorkers: capabilities.webWorkers?.supported || false,
    localStorage: capabilities.localStorage?.supported || false,
    sessionStorage: capabilities.sessionStorage?.supported || false,
  };

  const report: CapabilityReport = {
    level,
    score,
    capabilities,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    features,
  };

  // Cache result if enabled
  if (finalConfig.cacheResults) {
    cachedReport = report;
  }

  return report;
}

/**
 * Test a single capability with error handling and timeout
 */
async function testCapability<T>(name: string, test: () => T | Promise<T>): Promise<Capability> {
  try {
    const result = await Promise.race([
      Promise.resolve(test()),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
    ]);

    return {
      name,
      supported: Boolean(result),
      details: typeof result === 'object' ? (result as Record<string, any>) : undefined,
    };
  } catch (error) {
    return {
      name,
      supported: false,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

/**
 * Individual capability tests
 */
function testES6Support(): boolean {
  try {
    // Test arrow functions, const/let, template literals
    eval('(() => { const x = `test`; let y = 1; return x && y; })()');
    return true;
  } catch {
    return false;
  }
}

function testModuleSupport(): boolean {
  return 'noModule' in document.createElement('script');
}

function testPromiseSupport(): boolean {
  return (
    typeof Promise !== 'undefined' &&
    typeof Promise.resolve === 'function' &&
    typeof Promise.reject === 'function'
  );
}

function testAsyncAwaitSupport(): boolean {
  try {
    eval('(async () => { await Promise.resolve(); })');
    return true;
  } catch {
    return false;
  }
}

function testIntersectionObserver(): boolean {
  return 'IntersectionObserver' in window;
}

function testMutationObserver(): boolean {
  return 'MutationObserver' in window;
}

function testWebComponents(): boolean {
  return (
    'customElements' in window &&
    'attachShadow' in Element.prototype &&
    'getRootNode' in Element.prototype
  );
}

function testFetchAPI(): boolean {
  return 'fetch' in window && 'Request' in window && 'Response' in window;
}

function testCSSGrid(): boolean {
  return CSS.supports('display', 'grid');
}

function testCSSCustomProperties(): boolean {
  return CSS.supports('color', 'var(--test)');
}

function testWebAnimations(): boolean {
  return 'animate' in Element.prototype;
}

function testServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

function testWebWorkers(): boolean {
  return 'Worker' in window;
}

function testLocalStorage(): boolean {
  try {
    const test = 'test';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function testSessionStorage(): boolean {
  try {
    const test = 'test';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate overall capability score (0-100)
 */
function calculateCapabilityScore(capabilities: Record<string, Capability>): number {
  const weights = {
    javascript: 20,
    es6: 15,
    modules: 10,
    promises: 10,
    fetchAPI: 8,
    webComponents: 7,
    intersectionObserver: 5,
    mutationObserver: 5,
    cssGrid: 5,
    cssCustomProperties: 5,
    webAnimations: 3,
    serviceWorker: 3,
    webWorkers: 2,
    localStorage: 1,
    sessionStorage: 1,
  };

  let totalScore = 0;
  let maxScore = 0;

  for (const [name, capability] of Object.entries(capabilities)) {
    const weight = weights[name as keyof typeof weights] || 1;
    if (capability.supported) {
      totalScore += weight;
    }
    maxScore += weight;
  }

  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
}

/**
 * Determine capability level based on score and specific features
 */
function determineCapabilityLevel(
  score: number,
  capabilities: Record<string, Capability>
): CapabilityLevel {
  const hasJS = capabilities.javascript?.supported;
  const hasES6 = capabilities.es6?.supported;
  const hasModules = capabilities.modules?.supported;
  const hasModernAPIs = capabilities.fetchAPI?.supported && capabilities.promises?.supported;

  if (!hasJS) {
    return 'basic';
  }

  if (score >= 85 && hasES6 && hasModules && hasModernAPIs) {
    return 'cutting-edge';
  }

  if (score >= 70 && hasES6 && hasModernAPIs) {
    return 'modern';
  }

  if (score >= 50 && hasJS) {
    return 'enhanced';
  }

  return 'basic';
}

/**
 * Detect user preferences from system settings
 */
export function detectUserPreferences(): UserPreferences {
  const mediaQuery = (query: string) => window.matchMedia(query).matches;

  return {
    reduceMotion: mediaQuery('(prefers-reduced-motion: reduce)'),
    highContrast: mediaQuery('(prefers-contrast: high)'),
    reducedData: mediaQuery('(prefers-reduced-data: reduce)'),
    preferBasic:
      mediaQuery('(prefers-reduced-motion: reduce)') ||
      mediaQuery('(prefers-reduced-data: reduce)'),
    javascriptEnabled: true, // If this runs, JS is enabled
  };
}

/**
 * Clear cached capability results
 */
export function clearCapabilityCache(): void {
  cachedReport = null;
}

/**
 * Get cached capability report if available
 */
export function getCachedCapabilities(): CapabilityReport | null {
  return cachedReport;
}
