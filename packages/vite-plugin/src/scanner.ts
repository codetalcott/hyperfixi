/**
 * Scanner
 *
 * Detects hyperscript usage in source files by scanning for _="..." attributes.
 * Also detects non-English language keywords for multilingual semantic support.
 */

import { AVAILABLE_COMMANDS, FULL_RUNTIME_ONLY_COMMANDS } from '@hyperfixi/core/bundle-generator';
import type { FileUsage, HyperfixiPluginOptions, HtmxUsage } from './types';
import { detectLanguages } from './language-keywords';
import { buildLocalizedHxLivePattern, SSE_NS_PATTERN, WS_NS_PATTERN } from './htmx-localized-attrs';

/**
 * Command-detection pattern, derived from core's bundle-generator capability
 * lists instead of a hand-maintained duplicate (which had silently drifted:
 * `empty` was added to core without ever reaching the old hardcoded regex, so
 * projects using it got bundles without it). Hyphenated names (push-url,
 * replace-url, process-partials) are excluded: their hyperscript surface forms
 * are the space-separated `push url …` / `replace url …`, whose heads `push` /
 * `replace` are already in the list. Full-runtime-only names are included so
 * their use routes bundle selection to a tier that actually supports them; a
 * false positive only costs bundle size, never correctness.
 */
const SCANNABLE_COMMANDS = [
  ...new Set<string>([...AVAILABLE_COMMANDS, ...FULL_RUNTIME_ONLY_COMMANDS]),
].filter(
  cmd =>
    /^[A-Za-z]+$/.test(cmd) &&
    // `unless` is handled by the block detection below (it compiles to the
    // lite-capable `if` block — flagging it as a full-runtime-only COMMAND
    // would needlessly bump every unless-user to a full-runtime bundle).
    // `bind` is handled by the dedicated reactivity detection below, which
    // routes to the hx-v4 bundle (the tier that actually ships reactivity).
    cmd !== 'unless' &&
    cmd !== 'bind'
);

const COMMAND_PATTERN_SOURCE = `\\b(${SCANNABLE_COMMANDS.join('|')})\\b`;

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

// htmx v4 reactive/streaming surface (English-form attributes).
const HX_LIVE_PATTERN = /\bhx-live\s*=\s*["']/i;
const SSE_CONNECT_PATTERN = /\bsse-connect\s*=\s*["']/i;
const SSE_SWAP_PATTERN = /\bsse-swap\s*=\s*["']/i;
const WS_CONNECT_PATTERN = /\bws-connect\s*=\s*["']/i;
const WS_SEND_PATTERN = /\bws-send(\s*=\s*["']|\b)/i;

// Localized v4 attribute patterns (see ./htmx-localized-attrs.ts).
// Built once at module load so the regex's literal-set is fixed.
const HX_LIVE_LOCALIZED_PATTERN = buildLocalizedHxLivePattern();

/**
 * Phase 8: localized htmx-compat attribute names. Vocab modules under
 * `packages/core/vocab/htmx/` emit per-language maps like
 *   `hx-obtener` (es) → `hx-get`
 *   `hx-取得`     (ja) → `hx-get`
 *   `sse-conectar`(es) → `sse-connect`
 *
 * The scanner needs to recognize these so projects authoring in
 * Spanish/Japanese/etc. still get the htmx-compat bundle. The pattern
 * matches `hx-`/`sse-`/`ws-` followed by any identifier characters
 * (including Unicode), which covers both English and localized forms.
 * Bare `hx-` / `sse-` / `ws-` (with no suffix) and English forms
 * already matched by the named patterns above contribute too — the
 * generic match is a superset.
 */
const LOCALIZED_HX_PATTERN = /\b(hx|sse|ws)-[\w\-\p{L}]+\s*=\s*["']/u;

/**
 * `bind <var> to <expr>.<property>` inside `_=` bodies. Matches both the
 * default `$var` form and possessive (`me's value`) syntax. The trailing
 * `.<ident>` is what makes this "explicit property" bind — it's also
 * possible to write `bind $x to <element>` without a property, but that
 * path is the auto-detect form and doesn't itself signal "needs the
 * Phase 1 bind-to-property addition" beyond what plain reactivity needs.
 */
const BIND_TO_PROPERTY_PATTERN = /\bbind\s+\S+\s+to\s+\S+\.\w+/i;

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
      needsReactivity: false,
      needsBindToProperty: false,
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

      // Roll htmx-attribute-driven reactivity flags up to the top level so
      // the aggregator and generator only have to consult one place.
      if (htmxUsage.needsReactivity) usage.needsReactivity = true;
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
    // Detect commands (list derived from core — see SCANNABLE_COMMANDS above)
    const commandPattern = new RegExp(COMMAND_PATTERN_SOURCE, 'g');
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

    // Reactivity features inside `_=` bodies. `live`, `when`, and `bind` are
    // top-level features from `@hyperfixi/reactivity`. Their `^var` form
    // (DOM-scoped inherited globals) also implies reactivity.
    if (
      /\blive\b/.test(script) ||
      /\bwhen\s+\S+\s+changes\b/i.test(script) ||
      /\bbind\b/.test(script) ||
      /\^\w/.test(script)
    ) {
      usage.needsReactivity = true;
    }
    // Explicit-property bind specifically: `bind <var> to <expr>.<prop>`.
    // Implies reactivity too — the auto-detect form already set it above.
    if (BIND_TO_PROPERTY_PATTERN.test(script)) {
      usage.needsBindToProperty = true;
      usage.needsReactivity = true;
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
      needsSwapTiming: false,
      needsHxLive: false,
      needsSSE: false,
      needsWS: false,
      needsBindToProperty: false,
      needsReactivity: false,
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

    // Detect swap strategies. `hx-swap` is a head style token followed by HCON
    // modifiers, so the first token is only a style when it isn't a `key:value`
    // pair — otherwise `hx-swap="swap:200ms"` would register `swap:200ms` as a
    // strategy. `morph:innerHTML` is the exception: a style that looks like a pair.
    const swapPattern = new RegExp(HTMX_SWAP_PATTERN.source, 'gi');
    while ((match = swapPattern.exec(code))) {
      usage.hasHtmxAttributes = true;

      const spec = match[2].trim();
      const head = spec.split(/\s+/)[0];
      if (head.startsWith('morph') || !/^\S*:/.test(spec)) {
        usage.swapStrategies.add(head);
      }

      // `swap:`/`settle:` timings compile to `wait <n>ms`.
      if (/\b(swap|settle):/.test(spec)) {
        usage.needsSwapTiming = true;
      }
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

    // htmx v4 reactive / streaming surface — English-form attributes.
    if (HX_LIVE_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsHxLive = true;
      usage.needsReactivity = true;
    }
    if (SSE_CONNECT_PATTERN.test(code) || SSE_SWAP_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsSSE = true;
    }
    if (WS_CONNECT_PATTERN.test(code) || WS_SEND_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsWS = true;
    }

    // Phase 8: localized v4 attribute names. Authors writing Spanish
    // (`hx-en-vivo`, `sse-conectar`, `ws-conectar`), Japanese
    // (`hx-ライブ`, `sse-接続`), etc. need the same feature flags so
    // the generator routes them to the hx-v4 bundle (which ships the
    // orchestrator + vocab discovery path the slim bundles lack).
    //
    // SSE/WS use namespace-only matching: any `sse-*` or `ws-*` localized
    // form means the project needs that feature. The htmx-compat layer
    // scopes those features to their namespace, so any localized name
    // inside the namespace is unambiguous.
    //
    // hx-live needs an explicit set of translated suffixes because the
    // `hx-*` namespace also covers non-reactive attributes (hx-get,
    // hx-target, etc.) that don't require v4 routing.
    if (HX_LIVE_LOCALIZED_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsHxLive = true;
      usage.needsReactivity = true;
    }
    if (!usage.needsSSE && SSE_NS_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsSSE = true;
    }
    if (!usage.needsWS && WS_NS_PATTERN.test(code)) {
      usage.hasHtmxAttributes = true;
      usage.needsWS = true;
    }

    // Final catch-all: pages authored with any other localized htmx
    // attribute name (`hx-obtener`, `hx-取得`, etc. — non-v4 features)
    // still need the htmx-compat bundle even if no English-form or v4
    // attribute matched. LOCALIZED_HX_PATTERN matches any hx-/sse-/ws-
    // attribute including Unicode suffixes.
    if (!usage.hasHtmxAttributes && LOCALIZED_HX_PATTERN.test(code)) {
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
      const strategy = swap.toLowerCase();
      // `morph`, `morph:innerHTML` and `morph:outerHTML` all emit `morph`.
      if (strategy.startsWith('morph')) {
        usage.commands.add('morph');
        if (strategy === 'morph:innerhtml') usage.commands.add('put');
      } else if (strategy === 'delete') {
        usage.commands.add('remove');
      } else {
        usage.commands.add('put');
      }
    }

    // `hx-swap="... swap:200ms settle:100ms"` compiles to `wait <n>ms`.
    if (htmx.needsSwapTiming) {
      usage.commands.add('wait');
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
