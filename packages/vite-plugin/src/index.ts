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
 * @example
 * ```javascript
 * // Compile mode for smallest bundles (~500 bytes)
 * hyperfixi({
 *   mode: 'compile',  // Pre-compile hyperscript to JS
 *   debug: true,
 * })
 * ```
 */

import type { Plugin, ViteDevServer, HmrContext } from 'vite';
import type { HyperfixiPluginOptions, AggregatedUsage } from './types';
import { Scanner } from './scanner';
import { Aggregator } from './aggregator';
import { Generator } from './generator';
import { compile, resetCompiler, setMultilingualAliases, type CompiledHandler } from './compiler';
import { generateCompiledBundle } from './compiled-generator';
import { transformHTML, extractScripts } from './html-transformer';
import { getMultilingualCommandAliases } from './semantic-integration';
import type { SupportedLanguage } from './language-keywords';

// Re-export types
export type { HyperfixiPluginOptions, FileUsage, AggregatedUsage, CustomLanguageKeywords } from './types';
export type { CompiledHandler, CompileOptions } from './compiler';

// Re-export semantic parser integration functions for multilingual compile mode
export { setSemanticParser, clearSemanticParser, hasSemanticParser } from './compiler';

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

// Import aliases that resolve to the virtual module
const IMPORT_ALIASES = ['hyperfixi', '@hyperfixi/core', 'virtual:hyperfixi'];

/**
 * Create the HyperFixi Vite plugin
 *
 * @param options Plugin options
 * @returns Vite plugin
 */
export function hyperfixi(options: HyperfixiPluginOptions = {}): Plugin {
  const mode = options.mode ?? 'interpret';
  const scanner = new Scanner(options);
  const aggregator = new Aggregator();
  const generator = new Generator(options);

  let server: ViteDevServer | null = null;
  let cachedBundle: string | null = null;
  let lastUsageHash = '';
  let isDev = false;

  // Compile mode state
  const compiledHandlers: CompiledHandler[] = [];
  const handlerMap = new Map<string, string>(); // script -> handlerId
  const fallbackScripts = new Set<string>(); // Scripts that couldn't be compiled
  let needsLocals = false;
  let needsGlobals = false;

  /**
   * Compute a hash of the current usage for cache invalidation
   */
  function computeUsageHash(usage: AggregatedUsage): string {
    const commands = [...usage.commands].sort().join(',');
    const blocks = [...usage.blocks].sort().join(',');
    const languages = [...usage.detectedLanguages].sort().join(',');
    return `${commands}|${blocks}|${usage.positional}|${languages}`;
  }

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
   * Compile a hyperscript snippet and add to handlers
   */
  function compileScript(script: string): string | null {
    // Check if already compiled
    if (handlerMap.has(script)) {
      return handlerMap.get(script)!;
    }

    // Check if known fallback
    if (fallbackScripts.has(script)) {
      return null;
    }

    // Try to compile
    const handler = compile(script);

    if (handler) {
      compiledHandlers.push(handler);
      handlerMap.set(script, handler.id);

      if (handler.needsEvaluator) {
        // Check if needs locals/globals based on code
        if (handler.code.includes('L.')) needsLocals = true;
        if (handler.code.includes('G.')) needsGlobals = true;
      }

      if (options.debug) {
        console.log(`[hyperfixi] Compiled: "${script}" -> ${handler.id}`);
      }

      return handler.id;
    }

    // Couldn't compile - mark as fallback
    fallbackScripts.add(script);

    if (options.debug) {
      console.log(`[hyperfixi] Fallback (not compilable): "${script}"`);
    }

    return null;
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

  /**
   * Generate the bundle code (compile mode)
   */
  function generateCompiledBundleCode(): string {
    // Check if we have fallbacks that need the interpreter
    if (fallbackScripts.size > 0) {
      if (options.debug) {
        console.log(`[hyperfixi] ${fallbackScripts.size} scripts need interpreter fallback`);
      }
      // Fall back to interpret mode for this build
      return generateInterpretBundle();
    }

    const bundle = generateCompiledBundle({
      handlers: compiledHandlers,
      needsLocals,
      needsGlobals,
      globalName: options.globalName,
      htmx: options.htmx,
      debug: options.debug,
    });

    if (options.debug) {
      console.log(`[hyperfixi] Compiled bundle: ${compiledHandlers.length} handlers`);
    }

    return bundle;
  }

  /**
   * Generate the bundle code (dispatches to correct mode)
   */
  function generateBundle(): string {
    if (mode === 'compile') {
      return generateCompiledBundleCode();
    }
    return generateInterpretBundle();
  }

  return {
    name: 'vite-plugin-hyperfixi',
    enforce: 'pre' as const,

    /**
     * Configure plugin based on Vite mode
     */
    configResolved(config) {
      isDev = config.command === 'serve';

      if (options.debug) {
        console.log('[hyperfixi] Plugin initialized, mode:', isDev ? 'development' : 'production');
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

      // In compile mode, we compile scripts and transform HTML
      if (mode === 'compile' && !isDev) {
        // Extract and compile all scripts from this file
        const scripts = extractScripts(code);

        for (const script of scripts) {
          compileScript(script);
        }

        // Transform HTML to use data-h attributes
        const result = transformHTML(code, handlerMap, fallbackScripts);

        if (result.modified) {
          if (options.debug) {
            console.log(`[hyperfixi] Transformed: ${id.split('/').pop()}`);
          }
          return { code: result.code, map: null };
        }

        return null;
      }

      // Interpret mode: just scan for usage
      const usage = scanner.scan(code, id);
      const changed = aggregator.add(id, usage);

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

      return null; // Don't modify source files in interpret mode
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
        // Reset compile mode state
        if (mode === 'compile') {
          resetCompiler();
          compiledHandlers.length = 0;
          handlerMap.clear();
          fallbackScripts.clear();
          needsLocals = false;
          needsGlobals = false;

          if (options.debug) {
            console.log('[hyperfixi] Compile mode: ready for build');
          }
        }

        // Production build: scan entire project
        const cwd = process.cwd();

        if (options.debug) {
          console.log('[hyperfixi] Scanning project for hyperscript usage...');
        }

        const scannedFiles = await scanner.scanProject(cwd);
        aggregator.loadFromScan(scannedFiles);

        // Configure multilingual aliases for compile mode
        if (mode === 'compile') {
          const usage = aggregator.getUsage();
          if (usage.detectedLanguages.size > 0) {
            const aliases = getMultilingualCommandAliases(
              usage.detectedLanguages as Set<SupportedLanguage>
            );
            if (Object.keys(aliases).length > 0) {
              setMultilingualAliases(aliases);
              if (options.debug) {
                console.log(
                  `[hyperfixi] Compile mode: configured ${Object.keys(aliases).length} multilingual aliases`
                );
              }
            }
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
      }
    },
  };
}

// Default export for convenience
export default hyperfixi;
