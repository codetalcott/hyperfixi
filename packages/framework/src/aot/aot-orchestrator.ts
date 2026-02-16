/**
 * Generalized AOT Orchestrator
 *
 * Coordinates scan → parse → compile → collect for any domain.
 * Each domain provides a DomainCompilationBackend (DSL + CodeGenerator + scan config),
 * and the orchestrator handles the rest.
 *
 * @example
 * ```typescript
 * import { AOTOrchestrator } from '@lokascript/framework';
 *
 * const orchestrator = new AOTOrchestrator();
 *
 * orchestrator.registerBackend({
 *   domain: 'sql',
 *   dsl: createSQLDSL(),
 *   codeGenerator: sqlCodeGenerator,
 *   scanConfig: {
 *     domain: 'sql',
 *     attributes: ['data-sql'],
 *     scriptTypes: ['text/sql-dsl'],
 *   },
 * });
 *
 * const result = await orchestrator.compileFiles(
 *   ['index.html', 'about.html'],
 *   (path) => fs.promises.readFile(path, 'utf-8')
 * );
 * ```
 */

import type { MultilingualDSL, CodeGenerator } from '../api/create-dsl';
import type {
  DomainScanConfig,
  ExtractedSnippet,
  CompiledSnippet,
  AOTBatchResult,
  GeneralizedAOTOptions,
  OutputOptions,
} from './types';
import { DomainAwareScanner } from './domain-scanner';

// =============================================================================
// Types
// =============================================================================

/**
 * Per-domain compilation backend.
 * Provides everything needed to scan, parse, and compile a domain's syntax.
 */
export interface DomainCompilationBackend {
  /** Domain name (must match scanConfig.domain) */
  readonly domain: string;
  /** The DSL instance for parsing and compilation */
  readonly dsl: MultilingualDSL;
  /** Code generator for producing target code from semantic nodes */
  readonly codeGenerator: CodeGenerator;
  /** Scan configuration declaring HTML attribute patterns */
  readonly scanConfig: DomainScanConfig;
}

// =============================================================================
// AOTOrchestrator
// =============================================================================

/**
 * Generalized AOT orchestrator for any domain.
 */
export class AOTOrchestrator {
  private backends = new Map<string, DomainCompilationBackend>();
  private options: Required<GeneralizedAOTOptions>;

  constructor(options?: GeneralizedAOTOptions) {
    this.options = {
      confidenceThreshold: options?.confidenceThreshold ?? 0.7,
      continueOnError: options?.continueOnError ?? true,
      debug: options?.debug ?? false,
    };
  }

  /**
   * Register a domain compilation backend.
   * @throws if a backend with the same domain name is already registered
   */
  registerBackend(backend: DomainCompilationBackend): void {
    if (this.backends.has(backend.domain)) {
      throw new Error(`Backend already registered for domain: ${backend.domain}`);
    }
    this.backends.set(backend.domain, backend);
  }

  /**
   * Scan source files and compile all domain snippets.
   */
  async compileFiles(
    files: string[],
    readFile: (path: string) => Promise<string>
  ): Promise<AOTBatchResult> {
    // Build scanner from all backends' scan configs
    const configs = Array.from(this.backends.values()).map(b => b.scanConfig);
    const scanner = new DomainAwareScanner(configs);

    // Extract all snippets
    const snippets = await scanner.extractFromFiles(files, readFile);

    if (this.options.debug) {
      console.log(`[aot] Extracted ${snippets.length} snippets from ${files.length} files`);
    }

    // Compile each snippet
    const compiled: CompiledSnippet[] = [];
    const errors: AOTBatchResult['errors'][number][] = [];
    const domainBreakdown: Record<string, number> = {};

    for (const snippet of snippets) {
      domainBreakdown[snippet.domain] = (domainBreakdown[snippet.domain] ?? 0) + 1;

      const result = this.compileSnippet(snippet);
      if ('error' in result) {
        errors.push({
          domain: snippet.domain,
          source: snippet.code,
          file: snippet.file,
          line: snippet.line,
          message: result.error,
        });
        if (!this.options.continueOnError) break;
      } else {
        compiled.push(result);
      }
    }

    return {
      compiled,
      errors,
      stats: {
        totalSnippets: snippets.length,
        compiledCount: compiled.length,
        errorCount: errors.length,
        domainBreakdown,
      },
    };
  }

  /**
   * Compile a single extracted snippet.
   * Returns the compiled result or an error object.
   */
  compileSnippet(snippet: ExtractedSnippet): CompiledSnippet | { error: string } {
    const backend = this.backends.get(snippet.domain);
    if (!backend) {
      return { error: `No backend registered for domain: ${snippet.domain}` };
    }

    try {
      const result = backend.dsl.compile(snippet.code, snippet.language);
      if (!result.ok || !result.code) {
        return { error: result.errors?.join('; ') ?? 'Compilation failed' };
      }

      return {
        domain: snippet.domain,
        source: snippet.code,
        compiled: result.code,
        language: snippet.language,
        file: snippet.file,
        line: snippet.line,
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Generate combined output from compilation results.
   */
  generateOutput(result: AOTBatchResult, options?: OutputOptions): string {
    const format = options?.format ?? 'esm';
    const includeComments = options?.includeComments ?? true;
    const groupByDomain = options?.groupByDomain ?? true;

    const sections: string[] = [];

    if (includeComments) {
      sections.push(`// Generated by @lokascript/framework AOT compiler`);
      sections.push(
        `// ${result.stats.compiledCount} snippets compiled, ${result.stats.errorCount} errors`
      );
      sections.push('');
    }

    if (groupByDomain) {
      // Group by domain
      const grouped = new Map<string, CompiledSnippet[]>();
      for (const snippet of result.compiled) {
        const list = grouped.get(snippet.domain) ?? [];
        list.push(snippet);
        grouped.set(snippet.domain, list);
      }

      for (const [domain, snippets] of grouped) {
        if (includeComments) {
          sections.push(`// === Domain: ${domain} ===`);
          sections.push('');
        }

        for (const snippet of snippets) {
          if (includeComments) {
            sections.push(`// Source: ${snippet.file}:${snippet.line}`);
            sections.push(`// Language: ${snippet.language}`);
          }
          sections.push(snippet.compiled);
          sections.push('');
        }
      }
    } else {
      for (const snippet of result.compiled) {
        if (includeComments) {
          sections.push(`// [${snippet.domain}] ${snippet.file}:${snippet.line}`);
        }
        sections.push(snippet.compiled);
        sections.push('');
      }
    }

    const body = sections.join('\n').trimEnd();

    switch (format) {
      case 'cjs':
        return `'use strict';\n\n${body}\n`;
      case 'iife':
        return `(function() {\n${body}\n})();\n`;
      case 'esm':
      default:
        return `${body}\n`;
    }
  }
}
