/**
 * Bundle Builder - Manages language bundle generation and selection
 */

import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import type { LanguageCode, BundleInfo, BundleBuildOptions } from './types';

const execAsync = promisify(exec);

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Predefined bundle mappings
const PREDEFINED_BUNDLES = new Map<string, LanguageCode[]>([
  // All 23 languages
  [
    'browser',
    [
      'en',
      'es',
      'ja',
      'ar',
      'ko',
      'zh',
      'tr',
      'pt',
      'fr',
      'de',
      'id',
      'qu',
      'sw',
      'bn',
      'hi',
      'it',
      'ms',
      'pl',
      'ru',
      'th',
      'tl',
      'uk',
      'vi',
    ],
  ],
  ['browser-priority', ['en', 'es', 'pt', 'fr', 'de', 'ja', 'zh', 'ko', 'ar', 'tr', 'id']], // 11 priority
  ['browser-western', ['en', 'es', 'pt', 'fr', 'de']], // Western languages
  ['browser-east-asian', ['ja', 'zh', 'ko']], // East Asian languages
  // Individual language bundles
  ['browser-ar', ['ar']],
  ['browser-bn', ['bn']],
  ['browser-de', ['de']],
  ['browser-en', ['en']],
  ['browser-es', ['es']],
  ['browser-fr', ['fr']],
  ['browser-hi', ['hi']],
  ['browser-id', ['id']],
  ['browser-it', ['it']],
  ['browser-ja', ['ja']],
  ['browser-ko', ['ko']],
  ['browser-ms', ['ms']],
  ['browser-pl', ['pl']],
  ['browser-pt', ['pt']],
  ['browser-qu', ['qu']],
  ['browser-ru', ['ru']],
  ['browser-sw', ['sw']],
  ['browser-th', ['th']],
  ['browser-tl', ['tl']],
  ['browser-tr', ['tr']],
  ['browser-uk', ['uk']],
  ['browser-vi', ['vi']],
  ['browser-zh', ['zh']],
  // Utility bundles
  ['browser-core', []], // Core bundle (language-agnostic)
  ['browser-lazy', []], // Lazy-loading bundle
  ['browser-en-tr', ['en', 'tr']], // English + Turkish
  ['browser-es-en', ['es', 'en']], // Spanish + English
]);

/**
 * Get bundle path in semantic package
 */
function getBundlePath(bundleName: string): string {
  // Resolve from this file's location: testing-framework/src/multilingual
  // __dirname = /path/to/hyperfixi/packages/testing-framework/src/multilingual
  // Go up 3 levels to project root, then into packages/semantic
  const projectRoot = join(__dirname, '../../..');
  const semanticRoot = join(projectRoot, 'semantic');
  // Bundle naming: browser-{group}.{group}.global.js
  const group = bundleName.replace('browser-', '');
  return join(semanticRoot, 'dist', `${bundleName}.${group}.global.js`);
}

/**
 * Find existing bundle for languages
 */
export async function findBundleForLanguages(
  languages: LanguageCode[]
): Promise<BundleInfo | null> {
  const langSet = new Set(languages);

  // Find the smallest predefined bundle that contains all required languages
  let bestBundle: { name: string; langs: LanguageCode[] } | null = null;
  let minSize = Infinity;

  for (const [bundleName, bundleLangs] of PREDEFINED_BUNDLES.entries()) {
    const bundleSet = new Set(bundleLangs);

    // Check if bundle contains all required languages
    const containsAll = languages.every(lang => bundleSet.has(lang));
    if (!containsAll) continue;

    // Prefer smaller bundles
    if (bundleLangs.length < minSize) {
      minSize = bundleLangs.length;
      bestBundle = { name: bundleName, langs: bundleLangs };
    }
  }

  if (!bestBundle) {
    return null;
  }

  const bundlePath = getBundlePath(bestBundle.name);
  const exists = existsSync(bundlePath);

  return {
    name: bestBundle.name,
    path: bundlePath,
    languages: bestBundle.langs,
    size: exists ? statSync(bundlePath).size : 0,
    exists,
  };
}

/**
 * Get bundle info by name
 */
export async function getBundleInfo(bundleName: string): Promise<BundleInfo | null> {
  const languages = PREDEFINED_BUNDLES.get(bundleName);
  if (!languages) {
    return null;
  }

  const bundlePath = getBundlePath(bundleName);
  const exists = existsSync(bundlePath);

  return {
    name: bundleName,
    path: bundlePath,
    languages,
    size: exists ? statSync(bundlePath).size : 0,
    exists,
  };
}

/**
 * Build bundle for languages
 */
export async function buildBundle(options: BundleBuildOptions): Promise<BundleInfo> {
  const { languages, groupName } = options;

  // Generate bundle using the generate-bundle.mjs script
  const semanticRoot = join(process.cwd(), 'packages/semantic');
  const scriptPath = join(semanticRoot, 'scripts/generate-bundle.mjs');

  let bundleName: string;

  try {
    if (groupName) {
      // Use predefined group
      const cmd = `node ${scriptPath} --group ${groupName} ${options.updateConfig ? '--auto' : ''}`;
      await execAsync(cmd, { cwd: semanticRoot });
      bundleName = `browser-${groupName}`;
    } else {
      // Use specific languages
      const langCodes = languages.join(' ');
      const cmd = `node ${scriptPath} ${langCodes} ${options.updateConfig ? '--auto' : ''}`;
      await execAsync(cmd, { cwd: semanticRoot });
      bundleName = `browser-${languages.join('-')}`;
    }

    // Build the bundle
    await execAsync('npm run build', { cwd: semanticRoot });

    const bundlePath = options.outputPath || getBundlePath(bundleName);
    const exists = existsSync(bundlePath);

    return {
      name: bundleName,
      path: bundlePath,
      languages,
      size: exists ? statSync(bundlePath).size : 0,
      exists,
    };
  } catch (error) {
    throw new Error(
      `Failed to build bundle: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Select or build bundle for testing
 */
export async function selectBundle(
  languages: LanguageCode[],
  build: boolean = false
): Promise<BundleInfo> {
  // First, try to find existing bundle
  let bundle = await findBundleForLanguages(languages);

  // If bundle exists and we don't need to build, use it
  if (bundle && bundle.exists && !build) {
    return bundle;
  }

  // If build is requested or no bundle exists, build it
  if (build || !bundle || !bundle.exists) {
    // Determine if we can use a predefined group
    const groupName = findGroupForLanguages(languages);

    bundle = await buildBundle({
      languages,
      groupName: groupName !== null ? groupName : undefined,
      outputPath: undefined,
      updateConfig: false, // Don't modify configs during testing
    });
  }

  if (!bundle.exists) {
    throw new Error(`Bundle not found: ${bundle.path}`);
  }

  return bundle;
}

/**
 * Find predefined group name for languages
 */
function findGroupForLanguages(languages: LanguageCode[]): string | null {
  const langSet = new Set(languages);

  for (const [bundleName, bundleLangs] of PREDEFINED_BUNDLES.entries()) {
    const bundleSet = new Set(bundleLangs);

    // Exact match
    if (bundleLangs.length === languages.length && languages.every(lang => bundleSet.has(lang))) {
      return bundleName.replace('browser-', '');
    }
  }

  return null;
}

/**
 * List all available bundles
 */
export async function listAvailableBundles(): Promise<BundleInfo[]> {
  const bundles: BundleInfo[] = [];

  for (const [bundleName, languages] of PREDEFINED_BUNDLES.entries()) {
    const bundlePath = getBundlePath(bundleName);
    const exists = existsSync(bundlePath);

    bundles.push({
      name: bundleName,
      path: bundlePath,
      languages,
      size: exists ? statSync(bundlePath).size : 0,
      exists,
    });
  }

  return bundles;
}

/**
 * Check if bundle exists
 */
export async function bundleExists(bundleName: string): Promise<boolean> {
  const bundlePath = getBundlePath(bundleName);
  return existsSync(bundlePath);
}

/**
 * Get bundle size in bytes
 */
export async function getBundleSize(bundleName: string): Promise<number> {
  const bundlePath = getBundlePath(bundleName);
  if (!existsSync(bundlePath)) {
    return 0;
  }
  return statSync(bundlePath).size;
}

/**
 * Estimate bundle size for languages (without building)
 */
export function estimateBundleSize(languages: LanguageCode[]): {
  estimatedSize: number;
  estimatedGzipSize: number;
} {
  const SIZES: Record<string, number> = {
    en: 25,
    es: 22,
    ja: 28,
    ar: 24,
    ko: 22,
    zh: 20,
    tr: 20,
    pt: 22,
    fr: 22,
    de: 24,
    id: 18,
    qu: 16,
    sw: 18,
    bn: 20,
    hi: 20,
    it: 22,
    ms: 18,
    pl: 20,
    ru: 22,
    th: 20,
    tl: 18,
    uk: 22,
    vi: 20,
    base: 45,
  };

  const GZIP_RATIO = 0.35;

  let totalSize = SIZES['base'] || 45; // Base infrastructure
  for (const lang of languages) {
    totalSize += SIZES[lang] || 20; // Default to 20 KB if unknown
  }

  return {
    estimatedSize: totalSize * 1024, // Convert to bytes
    estimatedGzipSize: Math.round(totalSize * 1024 * GZIP_RATIO),
  };
}
