/**
 * Package Metadata Module for LokaScript
 *
 * Provides programmatic access to package and bundle information for
 * developers, build tools, and LLM agents to make informed decisions.
 *
 * @example
 * ```typescript
 * import { packageInfo, bundleInfo, featureMatrix } from '@lokascript/core/metadata';
 *
 * // Get package version
 * console.log(packageInfo.version);
 *
 * // Find smallest bundle for your needs
 * const bundle = bundleInfo.find(b => b.hasBlocks && parseFloat(b.gzipSize) < 10);
 * ```
 */

// =============================================================================
// PACKAGE INFO
// =============================================================================

/**
 * Package information
 */
export const packageInfo = {
  name: '@lokascript/core',
  version: '1.0.0-rc.1',
  description: 'Multilingual, tree-shakeable hyperscript',
  compatibility: '~85% official _hyperscript',
  languages: 24,
  commands: 49,
  repository: 'https://github.com/codetalcott/lokascript',
  documentation: 'https://github.com/codetalcott/lokascript/tree/main/packages/core#readme',
} as const;

// =============================================================================
// BUNDLE INFO
// =============================================================================

export interface BundleInfo {
  /** Bundle identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Filename in dist/ */
  filename: string;
  /** Gzipped size (approximate) */
  gzipSize: string;
  /** Raw size (approximate) */
  rawSize: string;
  /** Number of commands included */
  commandCount: number;
  /** Parser type used */
  parser: 'regex' | 'hybrid' | 'full';
  /** Whether if/else/repeat blocks are supported */
  hasBlocks: boolean;
  /** Whether event modifiers (.debounce, .throttle, .once) are supported */
  hasEventModifiers: boolean;
  /** Whether positional expressions (first, last, next, previous) are supported */
  hasPositional: boolean;
  /** Whether fetch command is included */
  hasFetch: boolean;
  /** Whether htmx/fixi attribute compatibility is included */
  hasHtmxCompat: boolean;
  /** npm import path */
  importPath: string;
  /** CDN URL (unpkg) */
  cdnUrl: string;
  /** Recommended use case */
  useCase: string;
}

/**
 * All available browser bundles with detailed metadata
 */
export const bundleInfo: BundleInfo[] = [
  {
    id: 'lite',
    name: 'Lite',
    filename: 'lokascript-lite.js',
    gzipSize: '1.9 KB',
    rawSize: '5 KB',
    commandCount: 8,
    parser: 'regex',
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    hasFetch: false,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/lite',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-lite.js',
    useCase: 'Minimal interactivity: toggle, show, hide, add, remove, set, put',
  },
  {
    id: 'lite-plus',
    name: 'Lite Plus',
    filename: 'lokascript-lite-plus.js',
    gzipSize: '2.6 KB',
    rawSize: '7 KB',
    commandCount: 14,
    parser: 'regex',
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    hasFetch: false,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/lite-plus',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-lite-plus.js',
    useCase: 'Basic interactivity with wait, log, increment, trigger, go',
  },
  {
    id: 'hybrid-complete',
    name: 'Hybrid Complete',
    filename: 'lokascript-hybrid-complete.js',
    gzipSize: '7.2 KB',
    rawSize: '28 KB',
    commandCount: 21,
    parser: 'hybrid',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/hybrid-complete',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-hybrid-complete.js',
    useCase: 'Recommended for most apps - 85% hyperscript coverage',
  },
  {
    id: 'hybrid-hx',
    name: 'Hybrid HX',
    filename: 'lokascript-hybrid-hx.js',
    gzipSize: '9.7 KB',
    rawSize: '28 KB',
    commandCount: 21,
    parser: 'hybrid',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: true,
    importPath: '@lokascript/core/browser/hybrid-hx',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-hybrid-hx.js',
    useCase: 'htmx/fixi drop-in replacement with hx-get, hx-post, hx-target',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    filename: 'lokascript-browser-minimal.js',
    gzipSize: '63.4 KB',
    rawSize: '271 KB',
    commandCount: 30,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/minimal',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-browser-minimal.js',
    useCase: 'Full parser with essential commands',
  },
  {
    id: 'standard',
    name: 'Standard',
    filename: 'lokascript-browser-standard.js',
    gzipSize: '63 KB',
    rawSize: '195 KB',
    commandCount: 35,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/standard',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-browser-standard.js',
    useCase: 'Full parser with common commands',
  },
  {
    id: 'browser',
    name: 'Full Browser',
    filename: 'lokascript-browser.js',
    gzipSize: '199.6 KB',
    rawSize: '943 KB',
    commandCount: 49,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-browser.js',
    useCase: 'Complete bundle with all commands and features',
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    filename: 'lokascript-multilingual.js',
    gzipSize: '64 KB',
    rawSize: '200 KB',
    commandCount: 49,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@lokascript/core/browser/multilingual',
    cdnUrl: 'https://unpkg.com/@lokascript/core/dist/lokascript-multilingual.js',
    useCase: 'Full features with multilingual API (requires @lokascript/semantic)',
  },
];

// =============================================================================
// FEATURE MATRIX
// =============================================================================

/**
 * Feature availability across bundles
 */
export const featureMatrix = {
  'toggle class': [
    'lite',
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'show/hide': [
    'lite',
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'add/remove class': [
    'lite',
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'set variable': [
    'lite',
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'put content': [
    'lite',
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'wait duration': [
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'increment/decrement': [
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'trigger event': [
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  log: [
    'lite-plus',
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'if/else blocks': [
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'repeat/for loops': [
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  fetch: ['hybrid-complete', 'hybrid-hx', 'minimal', 'standard', 'browser', 'multilingual'],
  'event modifiers': [
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'positional (first/last)': [
    'hybrid-complete',
    'hybrid-hx',
    'minimal',
    'standard',
    'browser',
    'multilingual',
  ],
  'htmx attributes': ['hybrid-hx'],
  behaviors: ['minimal', 'standard', 'browser', 'multilingual'],
  transitions: ['minimal', 'standard', 'browser', 'multilingual'],
  morph: ['standard', 'browser', 'multilingual'],
  'multilingual API': ['multilingual'],
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get bundle by ID
 */
export function getBundleById(id: string): BundleInfo | undefined {
  return bundleInfo.find(b => b.id === id);
}

/**
 * Get smallest bundle that supports required features
 */
export function getSmallestBundle(options: {
  blocks?: boolean;
  fetch?: boolean;
  eventModifiers?: boolean;
  positional?: boolean;
  htmxCompat?: boolean;
}): BundleInfo | undefined {
  const sorted = [...bundleInfo].sort((a, b) => parseFloat(a.gzipSize) - parseFloat(b.gzipSize));

  return sorted.find(bundle => {
    if (options.blocks && !bundle.hasBlocks) return false;
    if (options.fetch && !bundle.hasFetch) return false;
    if (options.eventModifiers && !bundle.hasEventModifiers) return false;
    if (options.positional && !bundle.hasPositional) return false;
    if (options.htmxCompat && !bundle.hasHtmxCompat) return false;
    return true;
  });
}

/**
 * Get bundles that support a specific feature
 */
export function getBundlesWithFeature(feature: keyof typeof featureMatrix): BundleInfo[] {
  const bundleIds = featureMatrix[feature] as readonly string[];
  return bundleInfo.filter(b => bundleIds.includes(b.id));
}

/**
 * Compare bundles side by side
 */
export function compareBundles(bundleIds: string[]): Record<string, BundleInfo> {
  const result: Record<string, BundleInfo> = {};
  for (const id of bundleIds) {
    const bundle = getBundleById(id);
    if (bundle) {
      result[id] = bundle;
    }
  }
  return result;
}

// =============================================================================
// ECOSYSTEM INFO
// =============================================================================

/**
 * Related packages in the @lokascript ecosystem
 */
export const ecosystem = {
  core: {
    name: '@lokascript/core',
    description: 'Main runtime, parser, 43 commands',
    npm: 'https://www.npmjs.com/package/@lokascript/core',
  },
  semantic: {
    name: '@lokascript/semantic',
    description: 'Semantic multilingual parser (24 languages)',
    npm: 'https://www.npmjs.com/package/@lokascript/semantic',
  },
  i18n: {
    name: '@lokascript/i18n',
    description: 'Grammar transformation and keyword translation',
    npm: 'https://www.npmjs.com/package/@lokascript/i18n',
  },
  vitePlugin: {
    name: '@lokascript/vite-plugin',
    description: 'Zero-config Vite plugin for automatic minimal bundles',
    npm: 'https://www.npmjs.com/package/@lokascript/vite-plugin',
  },
  patternsReference: {
    name: '@lokascript/patterns-reference',
    description: 'Pattern database with 212 LLM examples',
    npm: 'https://www.npmjs.com/package/@lokascript/patterns-reference',
  },
  mcpServer: {
    name: '@lokascript/mcp-server',
    description: 'Model Context Protocol server for AI assistants',
    npm: 'https://www.npmjs.com/package/@lokascript/mcp-server',
  },
} as const;

/**
 * Supported languages for multilingual parsing
 */
export const supportedLanguages = [
  { code: 'en', name: 'English', native: 'English', wordOrder: 'SVO' },
  { code: 'es', name: 'Spanish', native: 'Español', wordOrder: 'SVO' },
  { code: 'fr', name: 'French', native: 'Français', wordOrder: 'SVO' },
  { code: 'pt', name: 'Portuguese', native: 'Português', wordOrder: 'SVO' },
  { code: 'de', name: 'German', native: 'Deutsch', wordOrder: 'V2' },
  { code: 'it', name: 'Italian', native: 'Italiano', wordOrder: 'SVO' },
  { code: 'ja', name: 'Japanese', native: '日本語', wordOrder: 'SOV' },
  { code: 'ko', name: 'Korean', native: '한국어', wordOrder: 'SOV' },
  { code: 'zh', name: 'Chinese', native: '中文', wordOrder: 'SVO' },
  { code: 'ar', name: 'Arabic', native: 'العربية', wordOrder: 'VSO' },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', wordOrder: 'SOV' },
  { code: 'ru', name: 'Russian', native: 'Русский', wordOrder: 'SVO' },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', wordOrder: 'SVO' },
  { code: 'pl', name: 'Polish', native: 'Polski', wordOrder: 'SVO' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', wordOrder: 'SVO' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', wordOrder: 'SVO' },
  { code: 'th', name: 'Thai', native: 'ไทย', wordOrder: 'SVO' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', wordOrder: 'SVO' },
  { code: 'tl', name: 'Tagalog', native: 'Tagalog', wordOrder: 'VSO' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', wordOrder: 'SOV' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', wordOrder: 'SOV' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', wordOrder: 'SVO' },
  { code: 'qu', name: 'Quechua', native: 'Runasimi', wordOrder: 'SOV' },
  { code: 'he', name: 'Hebrew', native: 'עברית', wordOrder: 'SVO' },
] as const;
