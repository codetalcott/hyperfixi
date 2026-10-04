/**
 * @hyperfixi/vite-plugin
 *
 * Zero-config Vite plugin that automatically generates minimal HyperFixi bundles
 * based on detected hyperscript usage in your source files.
 *
 * @example
 * ```javascript
 * // vite.config.js
 * import { hyperfixi } from '@hyperfixi/vite-plugin';
 *
 * export default {
 *   plugins: [hyperfixi()]
 * };
 * ```
 *
 * The plugin automatically:
 * - Scans HTML, Vue, Svelte, JSX/TSX files for `_="..."` attributes
 * - Detects which commands, blocks, and expressions are used
 * - Generates a minimal bundle with only needed features
 * - Re-generates on file changes (HMR)
 *
 * @example
 * ```javascript
 * // With options
 * hyperfixi({
 *   extraCommands: ['fetch', 'put'],  // Always include these commands
 *   htmx: true,                       // Enable htmx integration
 *   debug: true,                      // Enable verbose logging
 * })
 * ```
 *
 */

import type { Plugin, ResolvedConfig, ViteDevServer, HmrContext } from 'vite';
import type { HyperfixiPluginOptions, AggregatedUsage } from './types';
import { Scanner } from './scanner';
import { Aggregator } from './aggregator';
import { Generator } from './generator';
import { loadServerBridge, runServerBridge } from './server-bridge-integration';
import { DomainScanner } from './domain-scanner';
import { DomainAggregator } from './domain-aggregator';

// Re-export types
export type {
  HyperfixiPluginOptions,
  FileUsage,
  AggregatedUsage,
  CustomLanguageKeywords,
  ServerBridgeOptions,
  DomainScanRule,
  DomainFileUsage,
  DomainAggregatedUsage,
} from './types';

// Domain scanning (multi-domain support)
export { DomainScanner, descriptorToScanRule } from './domain-scanner';
export { DomainAggregator } from './domain-aggregator';

// Re-export language keyword utilities for customization
export {
  SUPPORTED_LANGUAGES,
  REGIONS,
  registerCustomKeywords,
  getKeywordsForLanguage,
  isNonLatinLanguage,
  getAllLanguageCodes,
  clearCustomKeywords,
  detectLanguages,
  getOptimalRegion,
} from './language-keywords';
export type { SupportedLanguage } from './language-keywords';

// Virtual module ID
const VIRTUAL_MODULE_ID = 'virtual:hyperfixi';
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

/**
 * Import aliases that resolve to the virtual module.
 *
 * `lokascript` is here for a reason beyond brand symmetry: the docs consistently
 * show `import 'lokascript'` for the plugin flow, and neither `lokascript` nor
 * `hyperfixi` is a published npm package. Because `resolveId` runs BEFORE
 * node_modules resolution, any specifier listed here is intercepted and can
 * never fall through. Any specifier NOT listed here falls through — so an
 * unlisted `lokascript` failed to resolve outright, and would silently resolve
 * to a full ~300 KB package the day someone publishes that name, defeating the
 * entire point of the plugin's generated ~8 KB bundle. Listing it closes both.
 */
const IMPORT_ALIASES = ['hyperfixi', 'lokascript', '@hyperfixi/core', 'virtual:hyperfixi'];

/**
 * Compute a hash of the current usage for dev-server cache invalidation.
 *
 * Every input that influences bundle SELECTION must be part of this hash.
 * The htmx/reactivity flags decide which engine modules are registered; before
 * they were hashed, adding or removing an hx-live/sse-connect/ws-send
 * attribute — without touching any command/block/language — left the cached
 * dev bundle stale. Exported for tests.
 */
export function computeUsageHash(usage: AggregatedUsage): string {
  const commands = [...usage.commands].sort().join(',');
  const blocks = [...usage.blocks].sort().join(',');
  const languages = [...usage.detectedLanguages].sort().join(',');
  const htmx = usage.htmx
    ? [
        usage.htmx.hasHtmxAttributes,
        usage.htmx.hasFixiAttributes,
        usage.htmx.needsHxLive,
        usage.htmx.needsSSE,
        usage.htmx.needsWS,
        usage.htmx.needsBindToProperty,
        usage.htmx.needsReactivity,
      ]
        .map(f => (f ? '1' : '0'))
        .join('')
    : 'none';
  const reactivity = `${usage.needsReactivity ? 1 : 0}${usage.needsBindToProperty ? 1 : 0}`;
  const extras = `${usage.needsConstruct ? 1 : 0}${usage.needsCookies ? 1 : 0}`;
  return `${commands}|${blocks}|${usage.positional}|${languages}|${htmx}|${reactivity}|${extras}`;
}

/**
 * Create the HyperFixi Vite plugin
 *
 * @param options Plugin options
 * @returns Vite plugin
 */
export function hyperfixi(options: HyperfixiPluginOptions = {}): Plugin {
  if (options.mode === 'compile') {
    // Compile mode pre-compiled handlers with @hyperfixi/core's hybrid parser. It was
    // parked with the AOT work (owner decision 2026-10-03) and removed in Phase C4, with
    // core's parser; the engine-module bundle is the product.
    console.warn(
      '[hyperfixi] mode: "compile" was removed in 4.0 (it compiled with @hyperfixi/core\'s ' +
        'parser); building the bundle on @hyperfixi/engine instead.'
    );
  }
  const scanner = new Scanner(options);
  const aggregator = new Aggregator();
  const generator = new Generator(options);

  // Domain scanning (multi-domain support)
  const domainScanner =
    options.domains && options.domains.length > 0 ? new DomainScanner(options.domains) : null;
  const domainAggregator = domainScanner ? new DomainAggregator() : null;

  let server: ViteDevServer | null = null;
  let cachedBundle: string | null = null;
  let lastUsageHash = '';
  let isDev = false;

  /**
   * Invalidate the virtual module in dev server
   */
  function invalidateVirtualModule(): void {
    if (!server) return;

    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });

      if (options.debug) {
        console.log('[hyperfixi] Virtual module invalidated, triggering reload');
      }
    }
  }

  /**
   * Generate the bundle code (interpret mode)
   */
  function generateInterpretBundle(): string {
    const usage = aggregator.getUsage();
    const usageHash = computeUsageHash(usage);

    // Return cached bundle if usage hasn't changed
    if (cachedBundle && usageHash === lastUsageHash) {
      return cachedBundle;
    }

    // In dev mode, optionally use fallback bundle for faster rebuilds
    if (isDev && options.devFallback && options.devFallback !== 'auto') {
      cachedBundle = generator.generateDevFallback(options.devFallback);
    } else {
      cachedBundle = generator.generate(usage, options);
    }

    lastUsageHash = usageHash;

    if (options.debug) {
      const summary = aggregator.getSummary();
      console.log('[hyperfixi] Bundle generated:', summary);
    }

    return cachedBundle;
  }

  /** The bundle: the engine modules the scanned usage needs. */
  function generateBundle(): string {
    return generateInterpretBundle();
  }

  return {
    name: 'vite-plugin-hyperfixi',
    enforce: 'pre' as const,

    /**
     * Configure plugin based on Vite mode
     */
    async configResolved(config: ResolvedConfig) {
      isDev = config.command === 'serve';

      if (options.debug) {
        console.log('[hyperfixi] Plugin initialized, mode:', isDev ? 'development' : 'production');
      }

      // Lazy-load server-bridge if configured
      if (options.serverBridge) {
        await loadServerBridge(options.debug);
      }
    },

    /**
     * Store server reference and pre-scan HTML files for HMR
     */
    async configureServer(_server: ViteDevServer) {
      server = _server;

      // Pre-scan project to detect hyperscript before first request
      const cwd = _server.config.root;
      if (options.debug) {
        console.log('[hyperfixi] Pre-scanning project:', cwd);
      }

      const scannedFiles = await scanner.scanProject(cwd);
      aggregator.loadFromScan(scannedFiles);

      // Domain scanning (if configured)
      if (domainScanner && domainAggregator) {
        for (const [filePath] of scannedFiles) {
          // Re-read file content for domain scanning
          try {
            const fs = await import('fs');
            const content = fs.readFileSync(filePath, 'utf-8');
            if (domainScanner.hasAnyDomainUsage(content)) {
              const domainUsages = domainScanner.scan(content, filePath);
              if (domainUsages.length > 0) {
                domainAggregator.add(filePath, domainUsages);
              }
            }
          } catch {
            // File may have been deleted between scan and domain scan
          }
        }

        if (options.debug) {
          const domainSummary = domainAggregator.getUsage();
          console.log('[hyperfixi] Domain pre-scan:', domainSummary);
        }
      }

      if (options.debug) {
        const summary = aggregator.getSummary();
        console.log('[hyperfixi] Pre-scan complete:', summary);
      }
    },

    /**
     * Resolve virtual module imports
     */
    resolveId(id: string) {
      if (IMPORT_ALIASES.includes(id)) {
        return RESOLVED_VIRTUAL_MODULE_ID;
      }
      return null;
    },

    /**
     * Load the virtual module with generated bundle
     */
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return generateBundle();
      }
      return null;
    },

    /**
     * Scan files during transform for hyperscript usage
     */
    transform(code: string, id: string) {
      if (!scanner.shouldScan(id)) {
        return null;
      }

      // Scan for usage
      const usage = scanner.scan(code, id);
      const changed = aggregator.add(id, usage);

      // Domain scanning (detection only)
      if (domainScanner && domainAggregator && domainScanner.hasAnyDomainUsage(code)) {
        const domainUsages = domainScanner.scan(code, id);
        if (domainUsages.length > 0) {
          domainAggregator.add(id, domainUsages);
        }
      }

      // Invalidate virtual module if usage changed
      if (changed && server) {
        // Debounce invalidation slightly to batch multiple file changes
        setImmediate(() => {
          const currentHash = computeUsageHash(aggregator.getUsage());
          if (currentHash !== lastUsageHash) {
            invalidateVirtualModule();
          }
        });
      }

      return null; // Source files are never modified
    },

    /**
     * Handle file changes in HMR
     */
    async handleHotUpdate(ctx: HmrContext) {
      const { file, read } = ctx;

      // Check if a scanned file was changed
      if (scanner.shouldScan(file)) {
        try {
          // Read the updated file content and re-scan
          const content = await read();
          const usage = scanner.scan(content, file);
          const changed = aggregator.add(file, usage);

          if (options.debug) {
            console.log('[hyperfixi] HMR: Re-scanned', file.split('/').pop(), usage);
          }

          // Invalidate virtual module if usage changed
          if (changed) {
            const currentHash = computeUsageHash(aggregator.getUsage());
            if (currentHash !== lastUsageHash) {
              invalidateVirtualModule();
            }
          }

          // Re-generate server routes on HTML file changes (hash-based skip if unchanged)
          if (options.serverBridge && server) {
            await runServerBridge(server.config.root, options.serverBridge, options.debug);
          }
        } catch {
          // File was deleted, remove from aggregator
          if (aggregator.remove(file)) {
            invalidateVirtualModule();
          }
        }
      }

      return undefined;
    },

    /**
     * Scan entire project before production build
     */
    async buildStart() {
      if (!isDev) {
        // Production build: scan entire project
        const cwd = process.cwd();

        if (options.debug) {
          console.log('[hyperfixi] Scanning project for hyperscript usage...');
        }

        const scannedFiles = await scanner.scanProject(cwd);
        aggregator.loadFromScan(scannedFiles);

        // Domain scanning (if configured)
        if (domainScanner && domainAggregator) {
          for (const [filePath] of scannedFiles) {
            try {
              const fs = await import('fs');
              const content = fs.readFileSync(filePath, 'utf-8');
              if (domainScanner.hasAnyDomainUsage(content)) {
                const domainUsages = domainScanner.scan(content, filePath);
                if (domainUsages.length > 0) {
                  domainAggregator.add(filePath, domainUsages);
                }
              }
            } catch {
              // File may have been deleted
            }
          }

          if (options.debug) {
            const domainSummary = domainAggregator.getUsage();
            console.log('[hyperfixi] Domain build scan:', domainSummary);
          }
        }

        if (options.debug) {
          const summary = aggregator.getSummary();
          console.log(`[hyperfixi] Found ${summary.fileCount} files with hyperscript:`, {
            commands: summary.commands,
            blocks: summary.blocks,
            positional: summary.positional,
            languages: summary.languages,
          });
        }

        // Server-bridge: full scan + generate on production build
        if (options.serverBridge) {
          await runServerBridge(cwd, options.serverBridge, options.debug, true);
        }
      }
    },
  } as Plugin;
}

// Default export for convenience
export default hyperfixi;
