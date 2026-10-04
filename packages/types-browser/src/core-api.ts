/**
 * Type definitions for the hyperscript host on `window.hyperfixi` and `window._hyperscript`.
 *
 * Both globals are one object: `@hyperfixi/engine`'s public API, which the engine's
 * `hyperfixi-hs.js` installs, and which `@hyperfixi/core` ships as `hyperfixi.js` (the same
 * file, since Phase C3 of the engine cutover). It is shaped like upstream `_hyperscript`'s
 * public object, so upstream plugins can use it, plus one hook upstream lacks
 * (`addSourceTransform`). `test/engine-api.check.ts` checks the engine's own `api` against
 * this interface, so the two cannot drift apart.
 *
 * (Until then `hyperfixi.js` was core's own bundle, and `window.hyperfixi` had core's API:
 * `compile`, `compileSync`, `execute`, `createContext`, `evalHyperScript`, … — none of which
 * the engine has. Those types are gone; see `HyperfixiAPI` for what replaced each.)
 */

/** The context `evaluate` runs its source in. Every field is optional. */
export interface HyperscriptContext {
  /** What `me` / `my` / `I` refer to (default: `document.body`). */
  me?: unknown;
  you?: unknown;
  /** `it` / `result`. */
  result?: unknown;
  event?: unknown;
  target?: unknown;
  detail?: unknown;
  sender?: unknown;
  body?: unknown;
  /** Local variables, by name. */
  locals?: Record<string, unknown>;
}

/** The token a parse error points at. */
export interface HyperscriptToken {
  type: string;
  value: string;
  /** Offsets into the source. */
  start: number;
  end: number;
  /** 1-based line, 0-based column. */
  line: number;
  column: number;
}

/** A grammar error, as `parse` reports it and as the `hyperscript:parse-error` event carries it. */
export interface HyperscriptParseError {
  message: string;
  token: HyperscriptToken;
  source: string;
  /** The words the parser would have accepted, when it knows. */
  expected?: string[];
  /** What the author wrote, when a source transform rewrote the script before it was parsed. */
  written?: string;
}

/** `parse`'s result: the parsed node in upstream's shape, with its `errors` (empty when it parsed). */
export interface HyperscriptParseResult {
  errors: HyperscriptParseError[];
}

/** A root `processNode` initialises: hooks receive it before and after. */
export type HyperscriptProcessRoot = Element | Document | DocumentFragment;

/**
 * A plugin's rewrite of a script, applied as the script is read; the element keeps the text its
 * author wrote. Return nothing to leave the script as it is.
 */
export type HyperscriptSourceTransform = (
  source: string,
  element: Element
) => string | null | undefined;

/** `config`: upstream's settings, and the table `as <Name>` conversions read. */
export interface HyperscriptConfig {
  /** Attributes that hold a script (default `'_, script, data-script'`). */
  attributes: string;
  defaultTransition: string;
  disableSelector: string;
  /** The strategy `hide` / `show` / `toggle` use when none is named (`display` if unset). */
  defaultHideShowStrategy?: string;
  /** Extra strategies, by name. */
  hideShowStrategies: Record<
    string,
    (op: 'hide' | 'show' | 'toggle', elt: HTMLElement, arg?: string) => void
  >;
  /** `fetch` throws when the response status matches one of these. */
  fetchThrowsOn: RegExp[];
  /** `as <Name>` conversions, by name; `dynamicResolvers` handle names with arguments. */
  conversions: Record<string, (value: unknown) => unknown> & {
    dynamicResolvers: ((name: string, value: unknown) => unknown)[];
  };
}

/**
 * `window.hyperfixi` / `window._hyperscript`. Callable: `hyperfixi(source, context?)` is
 * `hyperfixi.evaluate(source, context?)`.
 *
 * Replacing core 3.x's API: `compileSync(code)` → `parse(code).errors`;
 * `eval(code, element)` / `execute(code, element)` → `evaluate(code, { me: element })`;
 * `processNode(node)` is unchanged; `compile(code, { language })` → load
 * `@lokascript/hyperscript-adapter` beside a semantic bundle, which translates each script as
 * the engine reads it.
 */
export interface HyperfixiAPI {
  (source: string, context?: HyperscriptContext): unknown;

  /**
   * Run source: commands, features (installed on `document.body`) or one expression.
   * Synchronous unless the source itself waits on something; then it returns a promise.
   * A parse error throws.
   */
  evaluate(source: string, context?: HyperscriptContext): unknown;

  /** Parse without running. A grammar error is reported in `errors`; a tokenizer error throws. */
  parse(source: string): HyperscriptParseResult;

  /** Initialise every scripted element under a node; elements already initialised are skipped. */
  process(node: unknown): void;

  /** Upstream's older name for `process`. */
  processNode(node: unknown): void;

  /** Remove everything an element's script installed: listeners, observers, timers, state. */
  cleanup(element: Element): void;

  config: HyperscriptConfig;

  /** `use(plugin)`: the plugin receives this object (upstream's plugin API). */
  use(plugin: (hyperscript: unknown) => void): void;

  addBeforeProcessHook(hook: (root: HyperscriptProcessRoot) => void): void;

  addAfterProcessHook(hook: (root: HyperscriptProcessRoot) => void): void;

  /** Not in upstream: rewrite a script as it is read, leaving the attribute as written. */
  addSourceTransform(transform: HyperscriptSourceTransform): void;

  /** The part of upstream's `internals` that pages and tests reach for. */
  internals: {
    runtime: {
      cleanup(element: Element): void;
      processNode(node: unknown): void;
    };
  };

  /** The engine's package version (`'dev'` when built from source without one). */
  version: string;
}

/** @deprecated The 3.x name; `window.hyperfixi` is a {@link HyperfixiAPI} since 4.0. */
export type LokaScriptCoreAPI = HyperfixiAPI;
