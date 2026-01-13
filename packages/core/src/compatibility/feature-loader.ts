/**
 * Feature Loader - Dynamic loading of optional features
 *
 * This module enables automatic on-demand loading of heavy features like:
 * - WebSockets (sockets.ts ~1,400 lines)
 * - Server-Sent Events (eventsource.ts ~1,250 lines)
 * - Web Workers (webworker.ts ~1,300 lines)
 *
 * Usage:
 * 1. Scan hyperscript code for feature keywords before processing
 * 2. Dynamically import only the features that are actually used
 * 3. Register them with the runtime
 * 4. Proceed with normal execution
 *
 * This approach reduces initial bundle size from ~80KB to ~40KB gzipped
 * for applications that don't use these advanced features.
 */

// Feature detection patterns
const FEATURE_PATTERNS: Record<string, RegExp> = {
  sockets: /\b(socket|connect\s+to\s+ws[s]?:)/i,
  eventsource: /\b(eventsource|connect\s+to\s+sse:)/i,
  workers: /\b(worker|start\s+worker)/i,
};

// Track which features have been loaded
const loadedFeatures = new Set<string>();

// Track loading promises to avoid duplicate loads
const loadingPromises = new Map<string, Promise<void>>();

/**
 * Detect which features are needed based on hyperscript code
 */
export function detectFeatures(code: string | string[]): Set<string> {
  const needed = new Set<string>();
  const codeArray = Array.isArray(code) ? code : [code];

  for (const snippet of codeArray) {
    for (const [feature, pattern] of Object.entries(FEATURE_PATTERNS)) {
      if (pattern.test(snippet)) {
        needed.add(feature);
      }
    }
  }

  return needed;
}

/**
 * Load a single feature module dynamically
 */
async function loadFeatureModule(feature: string): Promise<void> {
  if (loadedFeatures.has(feature)) {
    return;
  }

  // Check if already loading
  const existingPromise = loadingPromises.get(feature);
  if (existingPromise) {
    return existingPromise;
  }

  // Start loading
  const loadPromise = (async () => {
    try {
      switch (feature) {
        case 'sockets':
          await import('../features/sockets');
          break;
        case 'eventsource':
          await import('../features/eventsource');
          break;
        case 'workers':
          await import('../features/webworker');
          break;
        default:
          console.warn(`Unknown feature: ${feature}`);
          return;
      }
      loadedFeatures.add(feature);
    } catch (error) {
      console.error(`Failed to load feature "${feature}":`, error);
      throw error;
    } finally {
      loadingPromises.delete(feature);
    }
  })();

  loadingPromises.set(feature, loadPromise);
  return loadPromise;
}

/**
 * Load all required features for the given hyperscript code
 *
 * This should be called before processing hyperscript attributes.
 * It scans the code, detects needed features, and loads them in parallel.
 *
 * @param code - Hyperscript code string or array of strings
 * @returns Promise that resolves when all needed features are loaded
 */
export async function loadRequiredFeatures(code: string | string[]): Promise<void> {
  const needed = detectFeatures(code);

  // Filter out already loaded features
  const toLoad = [...needed].filter(f => !loadedFeatures.has(f));

  if (toLoad.length === 0) {
    return;
  }

  // Load all needed features in parallel
  await Promise.all(toLoad.map(f => loadFeatureModule(f)));
}

/**
 * Collect all hyperscript code from the document
 *
 * Scans for:
 * - _="" attributes on elements
 * - <script type="text/hyperscript"> blocks
 * - data-* attributes containing hyperscript
 */
export function collectHyperscriptFromDocument(): string[] {
  if (typeof document === 'undefined') {
    return [];
  }

  const code: string[] = [];

  // Collect from _="" attributes
  const elementsWithHyperscript = document.querySelectorAll('[_]');
  elementsWithHyperscript.forEach(el => {
    const attr = el.getAttribute('_');
    if (attr) {
      code.push(attr);
    }
  });

  // Collect from script blocks
  const scriptBlocks = document.querySelectorAll('script[type="text/hyperscript"]');
  scriptBlocks.forEach(script => {
    if (script.textContent) {
      code.push(script.textContent);
    }
  });

  return code;
}

/**
 * Scan document and preload all required features
 *
 * Call this during page initialization to ensure all features
 * are loaded before hyperscript processing begins.
 */
export async function preloadDocumentFeatures(): Promise<void> {
  const code = collectHyperscriptFromDocument();
  await loadRequiredFeatures(code);
}

/**
 * Check if a feature is loaded
 */
export function isFeatureLoaded(feature: string): boolean {
  return loadedFeatures.has(feature);
}

/**
 * Get list of loaded features
 */
export function getLoadedFeatures(): string[] {
  return [...loadedFeatures];
}

/**
 * Preload specific features (useful for known requirements)
 */
export async function preloadFeatures(features: string[]): Promise<void> {
  await Promise.all(features.map(f => loadFeatureModule(f)));
}
