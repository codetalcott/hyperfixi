/**
 * Scanner
 *
 * Detects hyperscript usage in source files by scanning for _="..." attributes.
 * Also detects non-English language keywords for multilingual semantic support.
 */

import type { FileUsage, HyperfixiPluginOptions, HtmxUsage } from './types';
import { detectLanguages } from './language-keywords';

// htmx/fixi attribute patterns
const HTMX_REQUEST_PATTERN =
  /\b(hx-get|hx-post|hx-put|hx-patch|hx-delete)\s*=\s*["']([^"']+)["']/gi;
const FIXI_ACTION_PATTERN = /\bfx-action\s*=\s*["']([^"']+)["']/gi;
const FIXI_METHOD_PATTERN = /\bfx-method\s*=\s*["'](GET|POST|PUT|PATCH|DELETE)["']/gi;
const HTMX_SWAP_PATTERN = /\b(hx-swap|fx-swap)\s*=\s*["']([^"']+)["']/gi;
const HTMX_TARGET_PATTERN = /\b(hx-target|fx-target)\s*=\s*["']([^"']+)["']/gi;
const HTMX_TRIGGER_PATTERN = /\b(hx-trigger|fx-trigger)\s*=\s*["']([^"']+)["']/gi;
const HTMX_URL_PATTERN = /\b(hx-push-url|hx-replace-url)\s*=\s*["'][^"']+["']/gi;
const HTMX_CONFIRM_PATTERN = /\bhx-confirm\s*=\s*["']/gi;
const HTMX_ON_PATTERN = /\bhx-on:(\w+)\s*=\s*["']([^"']+)["']/g;

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

    // Scan for htmx/fixi attributes
    const htmxUsage = this.scanHtmxAttributes(code);

    if (htmxUsage.hasHtmxAttributes) {
      usage.htmx = htmxUsage;
      this.inferCommandsFromHtmx(htmxUsage, usage);

      // Scan hx-on:* handler values as hyperscript
      for (const handlerCode of htmxUsage.onHandlers) {
        this.analyzeScript(handlerCode, usage);
      }

      // Check hx-target for positional patterns
      if (/hx-target\s*=\s*["'](closest|next|previous|find)\s/i.test(code)) {
        usage.positional = true;
      }
    }

    if (
      this.debug &&
      (usage.commands.size > 0 ||
        usage.blocks.size > 0 ||
        usage.detectedLanguages.size > 0 ||
        usage.htmx?.hasHtmxAttributes)
    ) {
      console.log(`[hyperfixi] Scanned ${id}:`, {
        commands: [...usage.commands],
        blocks: [...usage.blocks],
        positional: usage.positional,
        languages: [...usage.detectedLanguages],
        htmx: usage.htmx
          ? {
              hasHtmxAttributes: usage.htmx.hasHtmxAttributes,
              hasFixiAttributes: usage.htmx.hasFixiAttributes,
              httpMethods: [...usage.htmx.httpMethods],
              swapStrategies: [...usage.htmx.swapStrategies],
            }
          : undefined,
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
   * Scan for htmx/fixi attributes
   */
  private scanHtmxAttributes(code: string): HtmxUsage {
    const usage: HtmxUsage = {
      hasHtmxAttributes: false,
      hasFixiAttributes: false,
      httpMethods: new Set(),
      swapStrategies: new Set(),
      onHandlers: [],
      triggerModifiers: new Set(),
      urlManagement: new Set(),
      usesConfirm: false,
    };

    // Detect hx-get/post/put/patch/delete
    let match;
    const requestPattern = new RegExp(HTMX_REQUEST_PATTERN.source, 'gi');
    while ((match = requestPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
      usage.httpMethods.add(match[1].replace('hx-', '').toUpperCase());
    }

    // Detect fx-action
    if (new RegExp(FIXI_ACTION_PATTERN.source, 'gi').test(code)) {
      usage.hasHtmxAttributes = true;
      usage.hasFixiAttributes = true;
    }

    // Detect fx-method
    const fixiMethodPattern = new RegExp(FIXI_METHOD_PATTERN.source, 'gi');
    while ((match = fixiMethodPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
      usage.hasFixiAttributes = true;
      usage.httpMethods.add(match[1].toUpperCase());
    }

    // Detect swap strategies
    const swapPattern = new RegExp(HTMX_SWAP_PATTERN.source, 'gi');
    while ((match = swapPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
      usage.swapStrategies.add(match[2].split(/\s+/)[0]);
    }

    // Detect trigger modifiers
    const triggerPattern = new RegExp(HTMX_TRIGGER_PATTERN.source, 'gi');
    while ((match = triggerPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
      const trigger = match[2];
      if (/delay:/i.test(trigger)) usage.triggerModifiers.add('debounce');
      if (/throttle:/i.test(trigger)) usage.triggerModifiers.add('throttle');
      if (/\bonce\b/i.test(trigger)) usage.triggerModifiers.add('once');
    }

    // Detect URL management
    if (new RegExp(HTMX_URL_PATTERN.source, 'gi').test(code)) {
      usage.hasHtmxAttributes = true;
      if (/hx-push-url/i.test(code)) usage.urlManagement.add('push-url');
      if (/hx-replace-url/i.test(code)) usage.urlManagement.add('replace-url');
    }

    // Detect hx-confirm
    if (new RegExp(HTMX_CONFIRM_PATTERN.source, 'gi').test(code)) {
      usage.hasHtmxAttributes = true;
      usage.usesConfirm = true;
    }

    // Detect hx-on:* handlers
    const onPattern = new RegExp(HTMX_ON_PATTERN.source, 'g');
    while ((match = onPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
      usage.onHandlers.push(match[2]);
    }

    // Check hx-target for positional patterns
    const targetPattern = new RegExp(HTMX_TARGET_PATTERN.source, 'gi');
    while ((match = targetPattern.exec(code))) {
      usage.hasHtmxAttributes = true;
    }

    return usage;
  }

  /**
   * Infer commands from htmx usage
   */
  private inferCommandsFromHtmx(htmx: HtmxUsage, usage: FileUsage): void {
    // HTTP requests need fetch block
    if (htmx.httpMethods.size > 0) {
      usage.blocks.add('fetch');
      usage.commands.add('put'); // Default swap uses put
    }

    // Swap strategy inference
    for (const swap of htmx.swapStrategies) {
      switch (swap.toLowerCase()) {
        case 'morph':
          usage.commands.add('morph');
          break;
        case 'delete':
          usage.commands.add('remove');
          break;
        default:
          usage.commands.add('put');
      }
    }

    // hx-confirm needs if block
    if (htmx.usesConfirm) {
      usage.blocks.add('if');
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
