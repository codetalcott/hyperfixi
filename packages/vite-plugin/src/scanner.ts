/**
 * Scanner
 *
 * Detects hyperscript usage in source files by scanning for _="..." attributes.
 * Also detects non-English language keywords for multilingual semantic support.
 */

import type { FileUsage, HyperfixiPluginOptions } from './types';
import { detectLanguages } from './language-keywords';

/**
 * Converts include/exclude options to RegExp
 */
function toRegex(pattern: RegExp | string[] | undefined, defaultPattern: RegExp): RegExp {
  if (!pattern) return defaultPattern;
  if (pattern instanceof RegExp) return pattern;
  if (Array.isArray(pattern)) {
    const escaped = pattern.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(${escaped.join('|')})`);
  }
  return defaultPattern;
}

/**
 * Scanner class for detecting hyperscript usage in files
 */
export class Scanner {
  private include: RegExp;
  private exclude: RegExp;
  private debug: boolean;

  constructor(options: Pick<HyperfixiPluginOptions, 'include' | 'exclude' | 'debug'>) {
    this.include = toRegex(
      options.include,
      /\.(html?|vue|svelte|jsx?|tsx?|astro|php|erb|ejs|hbs|handlebars)$/
    );
    this.exclude = toRegex(options.exclude, /node_modules|\.git/);
    this.debug = options.debug ?? false;
  }

  /**
   * Check if a file should be scanned
   */
  shouldScan(id: string): boolean {
    return this.include.test(id) && !this.exclude.test(id);
  }

  /**
   * Scan code for hyperscript usage
   */
  scan(code: string, id: string): FileUsage {
    const usage: FileUsage = {
      commands: new Set(),
      blocks: new Set(),
      positional: false,
      detectedLanguages: new Set(),
    };

    // Find all hyperscript in _="..." attributes (single, double, backtick quotes)
    const attrPatterns = [
      /_\s*=\s*"([^"]+)"/g, // _="..."
      /_\s*=\s*'([^']+)'/g, // _='...'
      /_\s*=\s*`([^`]+)`/g, // _=`...`
      /_=\{`([^`]+)`\}/g, // _={`...`} (JSX)
      /_=\{['"]([^'"]+)['"]\}/g, // _={"..."} or _={'...'} (JSX)
    ];

    for (const pattern of attrPatterns) {
      let match;
      while ((match = pattern.exec(code))) {
        this.analyzeScript(match[1], usage);
      }
    }

    // Also check for hyperscript in script tags
    const scriptPattern = /<script[^>]*type=["']?text\/hyperscript["']?[^>]*>([^<]+)<\/script>/gi;
    let match;
    while ((match = scriptPattern.exec(code))) {
      this.analyzeScript(match[1], usage);
    }

    if (
      this.debug &&
      (usage.commands.size > 0 || usage.blocks.size > 0 || usage.detectedLanguages.size > 0)
    ) {
      console.log(`[hyperfixi] Scanned ${id}:`, {
        commands: [...usage.commands],
        blocks: [...usage.blocks],
        positional: usage.positional,
        languages: [...usage.detectedLanguages],
      });
    }

    return usage;
  }

  /**
   * Analyze a hyperscript snippet for commands, blocks, and expressions
   */
  private analyzeScript(script: string, usage: FileUsage): void {
    // Detect commands
    const commandPattern =
      /\b(toggle|add|remove|removeClass|show|hide|set|get|put|append|take|increment|decrement|log|send|trigger|wait|transition|go|call|focus|blur|return)\b/g;
    let match;
    while ((match = commandPattern.exec(script))) {
      usage.commands.add(match[1]);
    }

    // Detect blocks
    if (/\bif\b/.test(script)) usage.blocks.add('if');
    if (/\bunless\b/.test(script)) usage.blocks.add('if'); // unless uses same block as if
    // repeat pattern: handles literals, :localVars, $globalVars, and identifiers
    if (/\brepeat\s+(\d+|:\w+|\$\w+|[\w.]+)\s+times?\b/i.test(script)) usage.blocks.add('repeat');
    if (/\bfor\s+(each|every)\b/i.test(script)) usage.blocks.add('for');
    if (/\bwhile\b/.test(script)) usage.blocks.add('while');
    if (/\bfetch\b/.test(script)) usage.blocks.add('fetch');

    // Detect positional expressions
    if (/\b(first|last|next|previous|closest|parent)\b/.test(script)) {
      usage.positional = true;
    }

    // Detect non-English languages for multilingual semantic support
    const languages = detectLanguages(script);
    for (const lang of languages) {
      usage.detectedLanguages.add(lang);
    }
  }

  /**
   * Scan all files in a project directory
   * Used during production build to scan the entire codebase
   */
  async scanProject(dir: string): Promise<Map<string, FileUsage>> {
    const results = new Map<string, FileUsage>();

    try {
      const { glob } = await import('glob');
      const fs = await import('fs');

      const files = await glob('**/*.{html,htm,vue,svelte,js,jsx,ts,tsx,astro,php,erb,ejs,hbs}', {
        cwd: dir,
        ignore: ['node_modules/**', 'dist/**', '.git/**'],
        absolute: true,
      });

      for (const file of files) {
        if (this.shouldScan(file)) {
          try {
            const code = fs.readFileSync(file, 'utf-8');
            const usage = this.scan(code, file);
            if (
              usage.commands.size > 0 ||
              usage.blocks.size > 0 ||
              usage.positional ||
              usage.detectedLanguages.size > 0
            ) {
              results.set(file, usage);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch (error) {
      console.warn('[hyperfixi] Error scanning project:', error);
    }

    return results;
  }
}
