/**
 * Package Metadata Module for HyperFixi
 *
 * Provides programmatic access to package and bundle information for
 * developers, build tools, and LLM agents to make informed decisions.
 *
 * @example
 * ```typescript
 * import { packageInfo, bundleInfo, featureMatrix } from '@hyperfixi/core/metadata';
 *
 * // Get package version
 * console.log(packageInfo.version);
 *
 * // Find smallest bundle for your needs
 * const bundle = bundleInfo.find(b => b.hasBlocks && parseFloat(b.gzipSize) < 10);
 * ```
 */

import { COMMAND_NAMES } from './commands/manifest';
import { VERSION } from './version';

/**
 * The number of commands the default runtime registers — derived, never typed.
 *
 * Sourced from `COMMAND_NAMES` and **not** `COMMAND_MANIFEST.map(...)`: a
 * `.map()` over the entries references the entries, dragging every command's
 * `category`/`tier`/`upstreamOrExtension`/`multiword` into any bundle that
 * reaches this module (Finding 11 in the arc brief — that shape cost
 * `hyperfixi-hx.js` +4.8 KB / +7.5% and failed the ±5% size gate in step 3).
 * `COMMAND_NAMES` is a flat string list, and the audit asserts the two are
 * equal as ordered lists, so this cannot drift from the manifest.
 *
 * Only bundles that register the WHOLE registry may use this. Bundles that
 * hand-pick commands carry their own measured count — see the note on
 * `commandCount` below.
 */
const FULL_RUNTIME_COMMAND_COUNT = COMMAND_NAMES.length;

// =============================================================================
// PACKAGE INFO
// =============================================================================

/**
 * Package information
 */
export const packageInfo = {
  name: '@hyperfixi/core',
  // Derived, never typed — `set-version.cjs` rewrites `src/version.ts` on every
  // release bump. This was hand-maintained until 2026-08-03 and had drifted
  // three minors (2.7.2 vs a published 2.10.0); nothing read it, so nothing
  // caught it.
  version: VERSION,
  description: 'Modern hyperscript engine with fixi/htmx integration',
  compatibility: '~85% official _hyperscript',
  languages: 24,
  commands: FULL_RUNTIME_COMMAND_COUNT,
  repository: 'https://github.com/codetalcott/hyperfixi',
  documentation: 'https://github.com/codetalcott/hyperfixi/tree/main/packages/core#readme',
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
  /**
   * Number of commands the bundle actually registers.
   *
   * Bundles that register the whole registry (`browser`, `hybrid-hx-v4`) use
   * `FULL_RUNTIME_COMMAND_COUNT` so they track the manifest automatically.
   * Every other bundle hand-picks its commands, so its count is a measured
   * literal — and `verify:reference` re-derives each one from the bundle
   * source rather than trusting it.
   *
   * Widening that check in step 4.4 found three that were wrong, all in the
   * ungated set: `minimal` 30→10, `standard` 35→25, `multilingual` 59→52.
   * The two bundles that were already gated (`lite-plus`, `hybrid-complete`)
   * were both correct — the errors were exactly where nothing was looking.
   */
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
    filename: 'hyperfixi-lite.js',
    gzipSize: '2.0 KB',
    rawSize: '5 KB',
    commandCount: 8,
    parser: 'regex',
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    hasFetch: false,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/lite',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-lite.js',
    useCase: 'Minimal interactivity: toggle, show, hide, add, remove, set, put',
  },
  {
    id: 'lite-plus',
    name: 'Lite Plus',
    filename: 'hyperfixi-lite-plus.js',
    gzipSize: '2.7 KB',
    rawSize: '8 KB',
    commandCount: 19,
    parser: 'regex',
    hasBlocks: false,
    hasEventModifiers: false,
    hasPositional: false,
    hasFetch: false,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/lite-plus',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-lite-plus.js',
    useCase: 'Basic interactivity with wait, log, increment, trigger, go',
  },
  {
    id: 'hybrid-complete',
    name: 'Hybrid Complete',
    filename: 'hyperfixi-hybrid-complete.js',
    // Arc E step 4 closed Finding 17: this bundle PARSED 35 commands and
    // EXECUTED 24. Its `executeCommand`/`executeBlock` switches are now
    // generated from `bundle-generator/templates.ts`, so the count is the full
    // advertised list. +2967 B gz, of which 2057 is `morphlex` (the `morph`
    // case's dependency).
    gzipSize: '11.4 KB',
    rawSize: '44 KB',
    commandCount: 38,
    parser: 'hybrid',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/hybrid-complete',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hybrid-complete.js',
    useCase: 'Recommended for most apps - 85% hyperscript coverage',
  },
  {
    id: 'hybrid-hx',
    name: 'Hybrid HX',
    filename: 'hyperfixi-hx.js',
    // Inherits hybrid-complete's runtime wholesale, so it inherits the Arc E
    // step 4 command set and its size move too (+2972 B gz).
    gzipSize: '21.8 KB',
    rawSize: '82 KB',
    commandCount: 38,
    parser: 'hybrid',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: true,
    importPath: '@hyperfixi/core/browser/hybrid-hx',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hx.js',
    useCase: 'htmx/fixi drop-in replacement with hx-get, hx-post, hx-target',
  },
  {
    id: 'hybrid-hx-v4',
    name: 'Hybrid HX v4',
    filename: 'hyperfixi-hx-v4.js',
    gzipSize: '342.4 KB',
    rawSize: '1587 KB',
    // Re-exports `browser-bundle.ts`, so it inherits the full registry.
    commandCount: FULL_RUNTIME_COMMAND_COUNT,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: true,
    importPath: '@hyperfixi/core/browser/hybrid-hx-v4',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-hx-v4.js',
    useCase: 'htmx v4 compat: hx-live reactivity, SSE/WebSocket streaming, full runtime',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    filename: 'hyperfixi-minimal.js',
    gzipSize: '69.0 KB',
    rawSize: '278 KB',
    // Was 30, ungated and wrong by 20. `browser-bundle-minimal-v2.ts`
    // advertises 10 in its own `commands: [...]` array, which is what this
    // mirrors. Note it REGISTERS 11: `createSendCommand` also registers the
    // consolidation alias `trigger`, so `trigger` works there but is not
    // advertised. Left as-is deliberately — changing a shipped bundle's
    // advertised surface is a behavior call, not part of a derivation step.
    commandCount: 10,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/minimal',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-minimal.js',
    useCase: 'Full parser with essential commands',
  },
  {
    id: 'standard',
    name: 'Standard',
    filename: 'hyperfixi-standard.js',
    gzipSize: '75.7 KB',
    rawSize: '306 KB',
    // Was 35, ungated and wrong by 10. `browser-bundle-standard-v2.ts`
    // registers 25, matching its own published `commands: [...]` array exactly.
    commandCount: 25,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/standard',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-standard.js',
    useCase: 'Full parser with common commands',
  },
  {
    id: 'browser',
    name: 'Full Browser',
    filename: 'hyperfixi.js',
    gzipSize: '330.7 KB',
    rawSize: '1550 KB',
    // Constructs `Runtime`, which seeds the whole registry (measured: 59, no
    // gaps and no extras vs the manifest).
    commandCount: FULL_RUNTIME_COMMAND_COUNT,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi.js',
    useCase: 'Complete bundle with all commands and features',
  },
  {
    id: 'multilingual',
    name: 'Multilingual',
    filename: 'hyperfixi-multilingual.js',
    gzipSize: '91.2 KB',
    rawSize: '369 KB',
    // NOT a full-runtime bundle, despite the old 59. It hand-picks 51 via
    // `createTreeShakeableRuntime`; missing vs the manifest are `morph`,
    // `process`, `push`, `replace`, `scroll`, `start`, `swap`. Whether it
    // SHOULD ship all 58 is a behavior question, deliberately left to its own
    // PR — this step only stops the number from lying.
    commandCount: 51,
    parser: 'full',
    hasBlocks: true,
    hasEventModifiers: true,
    hasPositional: true,
    hasFetch: true,
    hasHtmxCompat: false,
    importPath: '@hyperfixi/core/browser/multilingual',
    cdnUrl: 'https://unpkg.com/@hyperfixi/core/dist/hyperfixi-multilingual.js',
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
 * Related packages in the HyperFixi + LokaScript ecosystem
 */
export const ecosystem = {
  core: {
    name: '@hyperfixi/core',
    description: `Main runtime, parser, ${FULL_RUNTIME_COMMAND_COUNT} commands`,
    npm: 'https://www.npmjs.com/package/@hyperfixi/core',
  },
  semantic: {
    name: '@lokascript/semantic',
    description: 'Semantic multilingual parser (24 languages)',
    npm: 'https://www.npmjs.com/package/@lokascript/semantic',
  },
  i18n: {
    name: '@lokascript/i18n',
    description: 'Keyword dictionaries, keyword providers and grammar profiles',
    npm: 'https://www.npmjs.com/package/@lokascript/i18n',
  },
  vitePlugin: {
    name: '@hyperfixi/vite-plugin',
    description: 'Zero-config Vite plugin for automatic minimal bundles',
    npm: 'https://www.npmjs.com/package/@hyperfixi/vite-plugin',
  },
  patternsReference: {
    name: '@hyperfixi/patterns-reference',
    description: 'Pattern database with 212 LLM examples',
    npm: 'https://www.npmjs.com/package/@hyperfixi/patterns-reference',
  },
  mcpServer: {
    name: '@hyperfixi/mcp-server',
    description: 'Model Context Protocol server for AI assistants',
    npm: 'https://www.npmjs.com/package/@hyperfixi/mcp-server',
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
