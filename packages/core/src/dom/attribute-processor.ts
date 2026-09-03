/**
 * HTML Attribute Processor for Hyperscript
 * Automatically detects and processes _="" attributes on elements
 */

import { createContext } from '../core/context';
import { debug } from '../utils/debug';
import type { EventHandlerNode } from '../ast/nodes';
import { toLegacyNode, type AnyNode } from '../ast/legacy';
import type { ASTNode, ExecutionContext } from '../types/base-types';

// =============================================================================
// Host contract — what the processor needs from the API, by injection
// =============================================================================

/** One compile diagnostic. Structurally the API's `CompileError`. */
export interface CompileFailure {
  message: string;
  line: number;
  column: number;
  suggestion?: string;
}

/** What the processor reads of a compile result. Structurally the API's `CompileResult`. */
export interface ProcessorCompileResult {
  ok: boolean;
  ast?: ASTNode;
  errors?: CompileFailure[];
}

/** The `config.onCompileError` payload. */
export interface CompileErrorReport {
  source: 'attribute' | 'script';
  code: string;
  errors: CompileFailure[];
  element: Element | null;
}

/**
 * The compiler and runtime the processor runs on. `api/hyperscript-api.ts`
 * injects its own `compileSync` / `compile` / `execute` / `config` at module
 * load, so this module sits UNDER the API it used to import — the layering
 * edge `dom -> api` is gone, and both `hyperscript.process()` and every
 * browser bundle compile through the API's one AST cache.
 */
export interface ProcessorHost {
  compileSync(code: string): ProcessorCompileResult;
  compile(code: string, options: { language: string }): Promise<ProcessorCompileResult>;
  execute(ast: ASTNode, context: ExecutionContext): Promise<unknown>;
  config: { onCompileError: ((report: CompileErrorReport) => void) | null };
}

let injectedHost: ProcessorHost | null = null;

/** Called once by `api/hyperscript-api.ts` when it loads. */
export function initializeAttributeProcessor(host: ProcessorHost): void {
  injectedHost = host;
}

function host(): ProcessorHost {
  if (!injectedHost) {
    throw new Error(
      '[LokaScript] The attribute processor has no compiler: import @hyperfixi/core (its API injects one) before processing elements.'
    );
  }
  return injectedHost;
}

// Type declarations for window extensions used by external packages
declare global {
  interface Window {
    __hyperfixi_behaviors_ready?: Promise<void>;
  }
}

export interface AttributeProcessorOptions {
  attributeName?: string;
  autoScan?: boolean;
  processOnlyNewElements?: boolean;
  /** Enable lazy parsing for event-driven attributes. Defers compilation until first event dispatch. (default: false) */
  lazyParsing?: boolean;
  /** Process elements in batches, yielding to the browser between batches. (default: false) */
  chunkedProcessing?: boolean;
  /** Number of elements to process per batch when chunkedProcessing is enabled. (default: 16) */
  chunkSize?: number;
}

// =============================================================================
// Lazy Parsing Constants
// =============================================================================

/**
 * The ONLY handler shape the lazy stub may take: `on <event> <command…>` —
 * one event name, then whitespace, then something that is not part of the
 * event header. The stub listens for exactly one event on exactly one target
 * and runs the body for the first event WITHOUT evaluating the header, so any
 * header feature makes it wrong for that first event (measured 2026-09-03,
 * `processor-parity.test.ts`): a filter `[…]` fired on a plain click, an
 * `or` list lost the first event of its second name, `from <target>` never
 * fired, and `(args)` would have left the destructured locals unbound.
 * Those shapes fall back to eager processing, which compiles the header.
 */
const LAZY_HEADER =
  /^on\s+(\w+)\s+(?![[(]|or\b|from\b|elsewhere\b|queue\b|debounced\b|throttled\b|in\b)/;

/** Events that must be processed immediately (cannot be deferred).
 * Note: `init` is a standalone block keyword, not an event name, so it's not listed here.
 * Non-event code (no "on" prefix) is always processed eagerly via a separate check. */
const IMMEDIATE_EVENTS = new Set([
  'load', // Fires at registration time
  'mutation', // MutationObserver setup needed immediately
  'intersection', // IntersectionObserver setup needed immediately
  'appear', // Visibility observer
  'every', // Interval setup
]);

// =============================================================================
// Element lifecycle (upstream _hyperscript 0.9.90)
// =============================================================================

const DEFAULT_LANGUAGE = 'en';
const POWERED_ATTRIBUTE = 'data-hyperscript-powered';
const SCRIPT_SELECTOR = 'script[type="text/hyperscript"]';

/**
 * Detect the language of an element's hyperscript: `data-lang` on the element,
 * else the closest `lang` attribute (`en-US` → `en`), else the document's.
 */
export function detectLanguage(element: Element): string {
  const dataLang = element.getAttribute('data-lang');
  if (dataLang) return dataLang;

  const langAttr = element.closest('[lang]')?.getAttribute('lang');
  if (langAttr) return langAttr.split('-')[0];

  if (typeof document !== 'undefined') {
    const docLang = document.documentElement?.lang;
    if (docLang) return docLang.split('-')[0];
  }

  return DEFAULT_LANGUAGE;
}

/** The compile result's `ast` is the legacy `ASTNode`; the handler shape lives in `ast/nodes`. */
function isEventHandler(node: AnyNode): node is EventHandlerNode {
  return node.type === 'eventHandler';
}

/**
 * Dispatch a lifecycle event on an element. A cancelable event returns false
 * when a listener called `preventDefault()`, and the caller skips the work.
 */
function dispatchLifecycle(
  element: Element,
  name: string,
  cancelable: boolean,
  detail: Record<string, unknown>
): boolean {
  return element.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable, detail }));
}

/**
 * Mark an element as hyperscript-powered. Morph engines (idiomorph, htmx 4)
 * read it to find elements that need re-processing after a swap;
 * `hyperscript.cleanup()` removes it.
 */
function markPowered(element: Element): void {
  if (!element.hasAttribute(POWERED_ATTRIBUTE)) {
    element.setAttribute(POWERED_ATTRIBUTE, '');
  }
}

// =============================================================================
// Chunked Processing Utilities
// =============================================================================

/**
 * Yield to the browser event loop so rendering and input can be processed.
 * Uses scheduler.yield() when available (modern browsers), else setTimeout(0).
 */
function yieldToBrowser(): Promise<void> {
  const { scheduler } = globalThis as { scheduler?: { yield?: () => Promise<void> } };
  if (typeof scheduler?.yield === 'function') {
    return scheduler.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

// =============================================================================
// Processed state — a property of the ELEMENT, shared by every processor
// =============================================================================

/**
 * Elements that have been initialized (or lazily stubbed). Module-level, not
 * per instance: the DOM is one, so `hyperscript.process(el)` followed by a
 * bundle scan must not initialize `el` twice, and `hyperscript.cleanup()` —
 * which only knows the default instance — must be able to forget an element
 * whichever instance processed it. Marked BEFORE the async compile, so the
 * MutationObserver and an explicit process() racing on a freshly appended
 * element cannot both pass the check and register the handler twice.
 */
const processedElements = new WeakSet<HTMLElement>();

/** The pending stub per lazily-registered element, so `forget()` can remove it. */
const lazyStubs = new WeakMap<HTMLElement, { eventType: string; listener: EventListener }>();

export class AttributeProcessor {
  private processedElements = processedElements;
  private lazyStubs = lazyStubs;
  private options: Required<AttributeProcessorOptions>;
  private observer: MutationObserver | null = null;
  private processedCount = 0;
  private readyEventDispatched = false;
  private initialized = false;

  constructor(options: AttributeProcessorOptions = {}) {
    this.options = {
      attributeName: '_',
      autoScan: true,
      processOnlyNewElements: true,
      lazyParsing: false,
      chunkedProcessing: false,
      chunkSize: 16,
      ...options,
    };
  }

  /**
   * Initialize the attribute processor
   * This sets up automatic scanning and processing of hyperscript attributes
   */
  async init(): Promise<void> {
    debug.parse('ATTR: init() called');
    if (typeof document === 'undefined') {
      return; // Skip in non-browser environments
    }

    // Prevent double initialization
    if (this.initialized) {
      debug.parse('ATTR: Already initialized, skipping duplicate init()');
      return;
    }
    this.initialized = true;
    debug.parse('ATTR: Starting initialization...');

    // Process existing elements
    if (this.options.autoScan) {
      // Must await to ensure behaviors are defined before elements are processed
      await this.scanAndProcessAll();

      // Dispatch hyperscript:ready event after initial page processing
      this.dispatchReadyEvent();
    }

    // Set up mutation observer for new elements
    this.setupMutationObserver();
  }

  /**
   * Scan and process all elements with hyperscript attributes in the document
   */
  async scanAndProcessAll(): Promise<void> {
    // Wait for external behaviors package to register (if loaded)
    // This ensures behaviors are available before elements try to install them
    if (typeof window !== 'undefined' && window.__hyperfixi_behaviors_ready) {
      debug.parse('ATTR: Waiting for external behaviors...');
      await window.__hyperfixi_behaviors_ready;
      debug.parse('ATTR: External behaviors registered');
    }

    // Process <script type="text/hyperscript"> tags FIRST
    // This ensures behaviors are defined before elements try to install them
    const scriptTags = document.querySelectorAll(SCRIPT_SELECTOR);
    debug.parse(`ATTR: Found ${scriptTags.length} script tags`);
    for (const script of scriptTags) {
      if (script instanceof HTMLScriptElement) {
        debug.parse('ATTR: Processing script tag:', script.textContent?.substring(0, 50));
        await this.processHyperscriptTag(script);
      }
    }

    // Process elements with _ attributes AFTER behaviors are defined
    const elements = document.querySelectorAll(`[${this.options.attributeName}]`);
    debug.parse(`ATTR: Found ${elements.length} elements to process`);

    await this.processElements(elements);
    debug.parse('ATTR: All elements processed');

    // Dispatch completion event for testing
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lokascript:initialized', {
          detail: { scriptsProcessed: scriptTags.length, elementsProcessed: elements.length },
        })
      );
    }
  }

  /**
   * Process a set of elements in the configured mode: lazy stubs, chunked
   * batches, or all at once. Every mode STARTS every element synchronously —
   * an `eventHandler` attribute's listener is installed before the first
   * await — and resolves when all of them have finished.
   */
  private async processElements(elements: Iterable<Element>): Promise<void> {
    const htmlElements: HTMLElement[] = [];
    for (const el of elements) {
      if (el instanceof HTMLElement) htmlElements.push(el);
    }

    if (this.options.lazyParsing) {
      // Lazy path: register lightweight stubs for event-driven attributes.
      // Elements that need eager processing (on init, on load, non-event, multi-handler)
      // return promises that we collect and await.
      debug.parse('ATTR: Using lazy parsing mode');
      const eagerPromises: Promise<void>[] = [];
      for (const element of htmlElements) {
        const promise = this.processElementLazy(element);
        if (promise) eagerPromises.push(promise);
      }
      if (eagerPromises.length > 0) {
        await Promise.all(eagerPromises);
      }
    } else if (this.options.chunkedProcessing) {
      // Chunked path: process in batches, yielding to browser between chunks
      debug.parse(`ATTR: Using chunked processing (chunkSize=${this.options.chunkSize})`);
      await this.processElementsChunked(htmlElements);
    } else {
      // Default eager path: process all elements in parallel
      await Promise.all(htmlElements.map(element => this.processElementAsync(element)));
    }
  }

  /**
   * Process one element and everything under it: its `<script
   * type="text/hyperscript">` tags first (so a behavior they define is
   * registered before an element below installs it), then the element itself
   * if it carries the attribute, then every descendant that does — all in the
   * configured mode. This is what `hyperscript.process(element)` calls.
   * Elements already processed are skipped; `forget()` un-marks a tree.
   *
   * When the tree holds no script tags nothing is awaited before the
   * elements start, so a handler attribute's listener is installed before
   * this returns its promise.
   */
  async processTree(root: Element): Promise<void> {
    const scriptTags: Element[] = root.matches(SCRIPT_SELECTOR) ? [root] : [];
    root.querySelectorAll(SCRIPT_SELECTOR).forEach(script => scriptTags.push(script));
    for (const script of scriptTags) {
      if (script instanceof HTMLScriptElement) {
        await this.processHyperscriptTag(script);
      }
    }

    const elements: Element[] = [];
    if (root.hasAttribute(this.options.attributeName)) elements.push(root);
    root.querySelectorAll(`[${this.options.attributeName}]`).forEach(el => elements.push(el));
    await this.processElements(elements);
  }

  /**
   * Un-mark an element and its descendants so they can be processed again —
   * the internal record and the `data-hyperscript-powered` marker both — and
   * drop any lazy stub still waiting on them. `hyperscript.cleanup()` calls
   * this after removing the tree's listeners: cleanup-then-process is how a
   * morph/swap re-initializes an element whose `_=` changed.
   */
  forget(root: Element): void {
    const targets: Element[] = [root];
    root
      .querySelectorAll(`[${this.options.attributeName}], [${POWERED_ATTRIBUTE}]`)
      .forEach(el => targets.push(el));
    for (const el of targets) {
      if (!(el instanceof HTMLElement)) continue;
      this.processedElements.delete(el);
      el.removeAttribute(POWERED_ATTRIBUTE);
      const stub = this.lazyStubs.get(el);
      if (stub) {
        el.removeEventListener(stub.eventType, stub.listener);
        this.lazyStubs.delete(el);
      }
    }
  }

  /**
   * Report a compile failure for hyperscript sourced from markup.
   * Always logs via console.error with the originating element, dispatches a
   * bubbling `hyperfixi:compile-error` CustomEvent on the element, and invokes
   * the `config.onCompileError` hook when set. Never throws.
   */
  private reportCompileError(
    source: 'attribute' | 'script',
    code: string,
    errors: CompileFailure[] | undefined,
    element: Element | null
  ): void {
    const errs = errors ?? [];
    const label =
      source === 'attribute'
        ? '[LokaScript] Compilation failed for _= attribute:'
        : '[LokaScript] Compilation failed for hyperscript script tag:';
    console.error(label, errs, element ?? '');

    try {
      host().config.onCompileError?.({ source, code, errors: errs, element });
    } catch (hookError) {
      console.error('[LokaScript] onCompileError hook threw:', hookError);
    }

    try {
      const target = element ?? (typeof document !== 'undefined' ? document : null);
      target?.dispatchEvent(
        new CustomEvent('hyperfixi:compile-error', {
          bubbles: true,
          cancelable: false,
          detail: { source, code, errors: errs, element },
        })
      );
    } catch (dispatchError) {
      debug.parse('ATTR: Error dispatching hyperfixi:compile-error event:', dispatchError);
    }
  }

  /**
   * Process a <script type="text/hyperscript"> tag
   * Supports optional 'for' attribute to bind to specific elements
   */
  private async processHyperscriptTag(script: HTMLScriptElement): Promise<void> {
    const forSelector = script.getAttribute('for');

    if (forSelector) {
      await this.processHyperscriptTagForElements(script, forSelector);
    } else {
      await this.processHyperscriptTagGlobal(script);
    }
  }

  /**
   * Process a script tag with 'for' attribute - binds to specific elements
   * Example: <script type="text/hyperscript" for="#my-btn">on click toggle .active</script>
   */
  private async processHyperscriptTagForElements(
    script: HTMLScriptElement,
    selector: string
  ): Promise<void> {
    debug.parse(`SCRIPT: Processing hyperscript script tag with for="${selector}"`);

    const hyperscriptCode = script.textContent || script.innerHTML;
    if (!hyperscriptCode || !hyperscriptCode.trim()) {
      debug.parse('SCRIPT: No hyperscript code found in script tag');
      return;
    }

    // Resolve target elements
    const targets = document.querySelectorAll(selector);

    if (targets.length === 0) {
      console.warn(`[LokaScript] Script with for="${selector}" found no matching elements`);
      return;
    }

    try {
      debug.parse(
        `SCRIPT: Compiling for="${selector}" code:`,
        hyperscriptCode.substring(0, 50) + '...'
      );

      // Compile once, execute for each target
      const compilationResult = host().compileSync(hyperscriptCode);

      if (!compilationResult.ok) {
        this.reportCompileError('script', hyperscriptCode, compilationResult.errors, script);
        return;
      }

      // Execute for each matched element
      for (const target of targets) {
        if (target instanceof HTMLElement) {
          const context = createContext(target); // 'me' = target element
          await host().execute(compilationResult.ast!, context);
        }
      }

      debug.parse(`SCRIPT: Executed for="${selector}" on ${targets.length} element(s)`);
    } catch (error) {
      console.error(`[LokaScript] Error processing script for="${selector}":`, error);
    }
  }

  /**
   * Process a global script tag (no 'for' attribute) - for behavior definitions
   */
  private async processHyperscriptTagGlobal(script: HTMLScriptElement): Promise<void> {
    debug.parse('SCRIPT: Processing hyperscript script tag');

    const hyperscriptCode = script.textContent || script.innerHTML;
    if (!hyperscriptCode || !hyperscriptCode.trim()) {
      debug.parse('SCRIPT: No hyperscript code found in script tag');
      return;
    }

    try {
      debug.parse('SCRIPT: Compiling script tag code:', hyperscriptCode.substring(0, 50) + '...');

      // Create execution context (no specific element for global behavior definitions)
      const context = createContext(null);

      // Compile the hyperscript code
      const compilationResult = host().compileSync(hyperscriptCode);
      debug.parse('SCRIPT: Compilation result:', compilationResult.ok ? 'SUCCESS' : 'FAILED');

      if (!compilationResult.ok) {
        this.reportCompileError('script', hyperscriptCode, compilationResult.errors, script);
        return;
      }

      debug.parse(
        'ATTR: Script compiled, AST type:',
        compilationResult.ast?.type,
        'name:',
        (compilationResult.ast as { name?: string })?.name
      );

      // Execute the compiled code (this will register behaviors)
      // Must await to ensure behaviors are registered before elements are processed
      await host().execute(compilationResult.ast!, context);

      debug.parse('ATTR: Script executed successfully');
    } catch (error) {
      console.error('[LokaScript] Script execution error:', error);
    }
  }

  /**
   * Process a single element's hyperscript attribute (sync wrapper for backwards compatibility)
   */
  processElement(element: HTMLElement): void {
    // Fire and forget - for backwards compatibility
    void this.processElementAsync(element);
  }

  /**
   * Process a single element's hyperscript attribute (async)
   */
  async processElementAsync(element: HTMLElement): Promise<void> {
    debug.parse('ATTR: Attempting to process element:', element);

    // Skip if already processed and we only process new elements
    if (this.options.processOnlyNewElements && this.processedElements.has(element)) {
      debug.parse('ATTR: Skipping already processed element');
      return;
    }

    const hyperscriptCode = element.getAttribute(this.options.attributeName);
    debug.parse('ATTR: Found hyperscript code:', hyperscriptCode);

    if (!hyperscriptCode) {
      debug.parse('ATTR: No hyperscript code found on element');
      return;
    }

    // Mark as processed BEFORE the async compile+execute to prevent
    // double-registration from MutationObserver race conditions.
    // When an element with _="..." is appended to the DOM, both the
    // MutationObserver and an explicit processNode() call may invoke
    // processElementAsync concurrently. Without early marking, both
    // calls pass the processedElements check and register duplicate
    // event handlers (e.g., toggle fires twice, canceling itself).
    this.processedElements.add(element);
    this.processedCount++;

    // `hyperscript:before:init` is cancelable: a listener that calls
    // preventDefault() keeps the element un-initialized, and un-marked, so a
    // later explicit process() can try again.
    if (!dispatchLifecycle(element, 'hyperscript:before:init', true, { code: hyperscriptCode })) {
      this.processedElements.delete(element);
      this.processedCount--;
      return;
    }

    try {
      debug.parse('ATTR: Processing element with code:', hyperscriptCode);

      // Create execution context with the element as 'me'
      const context = createContext(element);
      debug.parse('ATTR: Created context for element');

      // Compile. English takes the synchronous core parser; any other
      // language goes through `compile()`, which consults the registered
      // front-end and falls back to the core parser itself. Both share the
      // API's AST cache, so a re-scan after a swap re-uses the compiled
      // program rather than re-parsing it.
      debug.parse('ATTR: About to compile hyperscript code');
      const lang = detectLanguage(element);
      const compilationResult =
        lang === DEFAULT_LANGUAGE
          ? host().compileSync(hyperscriptCode)
          : await host().compile(hyperscriptCode, { language: lang });
      debug.parse('ATTR: Compilation result:', compilationResult);

      if (!compilationResult.ok) {
        this.reportCompileError('attribute', hyperscriptCode, compilationResult.errors, element);
        return;
      }

      debug.parse('ATTR: Compilation succeeded, processing handler type');

      // Execute the compiled AST. An `eventHandler` installs its listener
      // synchronously, before the runtime's first await, so by the time
      // execute() has returned its promise the element IS powered — the
      // marker and `after:init` go out here, synchronously with the install,
      // which is what `hyperscript.process()` (void-returning) promises its
      // callers. Then WAIT for completion: behavior installation must finish
      // before `load`, and before a scan reports done.
      debug.parse('ATTR: Executing compiled AST');
      const execution = host().execute(compilationResult.ast!, context);
      markPowered(element);
      dispatchLifecycle(element, 'hyperscript:after:init', false, { code: hyperscriptCode });
      await execution;

      // Dispatch load event on the element after successful processing
      this.dispatchLoadEvent(element);
    } catch (error) {
      console.error('[LokaScript] Error processing _= attribute:', error, element);
    }
  }

  /**
   * Process elements in batches, yielding to the browser between chunks.
   * This prevents long main-thread blocking when many elements need processing.
   */
  private async processElementsChunked(htmlElements: HTMLElement[]): Promise<void> {
    const chunkSize = this.options.chunkSize;

    for (let i = 0; i < htmlElements.length; i += chunkSize) {
      const chunk = htmlElements.slice(i, i + chunkSize);

      // Process chunk in parallel (same as default eager path, but bounded)
      const promises = chunk.map(el => this.processElementAsync(el));
      await Promise.all(promises);

      // Yield to browser between chunks (skip for last chunk)
      if (i + chunkSize < htmlElements.length) {
        await yieldToBrowser();
      }
    }
  }

  /**
   * Register a lightweight stub listener for an event-driven attribute.
   * On first event, synchronously compiles and installs the real handler, then
   * executes the handler body with the original trusted event (preserving isTrusted
   * and user activation for security-sensitive APIs like clipboard).
   * Non-event attributes and immediate events fall back to eager processing.
   * @returns A promise if the element needs eager processing, or null if lazy-registered.
   */
  private processElementLazy(element: HTMLElement): Promise<void> | null {
    // Same skip as the eager path. This check was missing: a second scan
    // registered a second stub, and the first event ran the body twice.
    if (this.options.processOnlyNewElements && this.processedElements.has(element)) {
      return null;
    }

    const code = element.getAttribute(this.options.attributeName);
    if (!code) return null;

    const match = code.match(LAZY_HEADER);

    // Anything but the plain `on <event> <body>` shape is eager: no header
    // features (see LAZY_HEADER), no immediate event, one handler, and English
    // only — the stub's compile inside the trusted event must be synchronous,
    // and only the core parser is.
    if (
      !match ||
      IMMEDIATE_EVENTS.has(match[1]) ||
      this.hasMultipleHandlers(code) ||
      detectLanguage(element) !== DEFAULT_LANGUAGE
    ) {
      return this.processElementAsync(element);
    }

    if (!dispatchLifecycle(element, 'hyperscript:before:init', true, { code })) {
      return null;
    }

    const eventType = match[1];
    debug.parse(`ATTR: Lazy-registering stub for "${eventType}" on element`);

    // One-shot stub: on first event, compile synchronously and execute directly.
    // This avoids re-dispatching synthetic events (which lose isTrusted).
    const stubListener = async (event: Event) => {
      this.lazyStubs.delete(element);

      try {
        // Synchronous compile within the trusted event callback.
        // compileSync() is fully synchronous for English code, preserving
        // user activation for security-sensitive APIs (clipboard, fullscreen, etc.)
        const result = host().compileSync(code);
        if (!result.ok || !result.ast) {
          this.reportCompileError('attribute', code, result.errors, element);
          return;
        }

        // Install the real handler for future events.
        // execute() for eventHandler ASTs calls addEventListener() synchronously
        // (before its first internal await), so the handler is active immediately.
        const context = createContext(element);
        void host().execute(result.ast, context);

        // Execute the handler body for the current (trusted) event.
        // The real handler installed above won't fire for this event (per DOM spec:
        // listeners added during dispatch are not invoked for the current event).
        if (isEventHandler(result.ast)) {
          const handler = result.ast;
          if (handler.modifiers?.prevent) event.preventDefault();
          if (handler.modifiers?.stop) event.stopPropagation();

          // Mirrors the runtime's per-event hydration (runtime-base.ts).
          const eventContext: ExecutionContext = { ...createContext(element), it: event, event };
          eventContext.locals.set('event', event);
          eventContext.locals.set('target', event.target);

          for (const command of handler.commands) {
            // No return-value propagation into `it`/`result` — commands that
            // produce a value self-assign. Mirrors the handler-body executor in
            // runtime-base.ts; see the comment there.
            await host().execute(toLegacyNode(command), eventContext);
          }
        }

        this.dispatchLoadEvent(element);
      } catch (err) {
        console.error('[LokaScript] Error in lazy handler on first event:', err, element);
      }
    };

    element.addEventListener(eventType, stubListener, { once: true });
    this.lazyStubs.set(element, { eventType, listener: stubListener });
    this.processedElements.add(element); // Prevent re-processing via mutation observer
    this.processedCount++;
    markPowered(element);
    dispatchLifecycle(element, 'hyperscript:after:init', false, { code });
    return null;
  }

  /**
   * Check if hyperscript code contains multiple event handlers.
   * e.g., "on click add .a on mouseover add .b" should be processed eagerly.
   * Distinguishes handler-start "on click" from preposition "on me" / "on navigator.clipboard".
   */
  private hasMultipleHandlers(code: string): boolean {
    // Pronouns and targets that follow the preposition "on", not event names
    const TARGET_WORDS = new Set(['me', 'it', 'its', 'my', 'you', 'yourself']);
    let count = 0;
    const regex = /\bon\s+(\w+)/g;
    let m;
    while ((m = regex.exec(code)) !== null) {
      const word = m[1];
      // Skip property-access targets: "on navigator.clipboard", "on document.body"
      if (code[m.index + m[0].length] === '.') continue;
      // Skip hyperscript pronouns: "on me", "on it"
      if (TARGET_WORDS.has(word)) continue;
      count++;
      if (count > 1) return true;
    }
    return false;
  }

  /**
   * Dispatch load event on an element after it has been processed
   */
  private dispatchLoadEvent(element: HTMLElement): void {
    try {
      const loadEvent = new Event('load', {
        bubbles: false, // Element-specific event
        cancelable: false,
      });
      element.dispatchEvent(loadEvent);
    } catch (error) {
      debug.parse('ATTR: Error dispatching load event on element:', element, error);
    }
  }

  /**
   * Dispatch hyperscript:ready event on the document after initial processing
   */
  private dispatchReadyEvent(): void {
    // Only dispatch once
    if (this.readyEventDispatched) {
      return;
    }

    try {
      const readyEvent = new CustomEvent('hyperscript:ready', {
        bubbles: true,
        cancelable: false,
        detail: {
          processedElements: this.processedCount,
          timestamp: Date.now(),
        },
      });
      document.dispatchEvent(readyEvent);
      this.readyEventDispatched = true;
    } catch (error) {
      debug.parse('ATTR: Error dispatching hyperscript:ready event:', error);
    }
  }

  /**
   * Set up mutation observer to process new elements
   */
  private setupMutationObserver(): void {
    if (typeof MutationObserver === 'undefined') {
      return; // Skip in environments without MutationObserver
    }

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          // The same entry `hyperscript.process()` takes: script tags first,
          // then the element and its descendants, each initialized once.
          this.processTree(node as Element).catch(err => {
            console.error('[LokaScript] Error processing dynamically added node:', err);
          });
        });
      }
    });

    // Start observing
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Destroy the attribute processor and clean up resources
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.initialized = false;
    this.readyEventDispatched = false;
    this.processedCount = 0;
  }

  /**
   * Reset the processor (alias for destroy, allows re-initialization)
   */
  reset(): void {
    this.destroy();
  }
}

// Create and export default instance
export const defaultAttributeProcessor = new AttributeProcessor();

// Note: Auto-initialization is handled by browser bundles (browser-bundle.ts)
// This keeps the module free of side effects for better testability
