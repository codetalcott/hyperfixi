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
   * Bundles that register the whole registry (`browser`) use
   * `FULL_RUNTIME_COMMAND_COUNT` so they track the manifest automatically.
   * The hand-picked bundles (lite, minimal, standard, the hybrids,
   * multilingual) carried measured literals that `verify:reference` re-derived
   * from their sources; widening that check in step 4.4 found three wrong, all
   * where nothing had looked (`minimal` 30→10, `standard` 35→25,
   * `multilingual` 59→52). All of them retired by Phase C3 (C-R3).
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
  // hybrid-complete and hybrid-hx (hyperfixi-hx.js) retired in Phase C3 (C-R2),
  // hybrid-hx-v4 in C-R1, multilingual (hyperfixi-multilingual.js) in C-R3: the
  // engine's hyperfixi-hs.js (@hyperfixi/engine) is the script-tag bundle, and
  // @lokascript/hyperscript-adapter runs non-English hyperscript on it.
  {
    id: 'browser',
    name: 'Full Browser',
    filename: 'hyperfixi.js',
    gzipSize: '351.7 KB',
    rawSize: '1619 KB',
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
];

// =============================================================================
// FEATURE MATRIX
// =============================================================================

/**
 * Feature availability across bundles
 */
export const featureMatrix = {
  'toggle class': ['lite', 'lite-plus', 'minimal', 'standard', 'browser'],
  'show/hide': ['lite', 'lite-plus', 'minimal', 'standard', 'browser'],
  'add/remove class': ['lite', 'lite-plus', 'minimal', 'standard', 'browser'],
  'set variable': ['lite', 'lite-plus', 'minimal', 'standard', 'browser'],
  'put content': ['lite', 'lite-plus', 'minimal', 'standard', 'browser'],
  'wait duration': ['lite-plus', 'minimal', 'standard', 'browser'],
  'increment/decrement': ['lite-plus', 'minimal', 'standard', 'browser'],
  'trigger event': ['lite-plus', 'minimal', 'standard', 'browser'],
  log: ['lite-plus', 'minimal', 'standard', 'browser'],
  'if/else blocks': ['minimal', 'standard', 'browser'],
  'repeat/for loops': ['minimal', 'standard', 'browser'],
  fetch: ['minimal', 'standard', 'browser'],
  'event modifiers': ['minimal', 'standard', 'browser'],
  'positional (first/last)': ['minimal', 'standard', 'browser'],
  // hyperfixi-hx.js was the one bundle with htmx attributes; it retired in
  // Phase C3. htmx 4 + @lokascript/htmx-adapter is the replacement.
  'htmx attributes': [],
  behaviors: ['minimal', 'standard', 'browser'],
  transitions: ['minimal', 'standard', 'browser'],
  morph: ['standard', 'browser'],
  // hyperfixi-multilingual.js retired in Phase C3 (C-R3); the multilingual
  // API is @hyperfixi/core/multilingual (functions) and, on a page,
  // @lokascript/hyperscript-adapter beside the engine.
  'multilingual API': [],
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
