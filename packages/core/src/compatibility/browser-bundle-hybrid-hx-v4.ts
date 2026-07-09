/**
 * HyperFixi Hybrid-HX v4 Browser Bundle
 *
 * The htmx v4 compatibility bundle: full runtime + reactivity + htmx-compat
 * attribute processor, all wired together with a single notify chain so
 * `hx-live` actually re-renders when `_=` handlers mutate global state.
 *
 * Why this bundle exists vs. the slim `hyperfixi-hx.js`:
 *   `hyperfixi-hx.js` layers htmx-compat on the slim `hybrid-complete`
 *   runtime. The slim runtime's `set` command writes directly to its own
 *   `globalVars` Map without invoking `notifyGlobalWrite()`. Reactive
 *   effects subscribed via `@hyperfixi/reactivity` therefore never wake on
 *   `_=` writes from sibling elements, which makes `hx-live` half-render
 *   (initial value only, no updates).
 *
 *   This bundle uses the full runtime where `set` routes through
 *   `setGlobal()` → `notifyGlobalWrite()` → reactivity hooks, giving a
 *   single coherent notify path.
 *
 * Trade-off: this bundle is roughly the full `hyperfixi.js` (~203 KB
 * gzipped) plus htmx-compat (~5 KB) plus reactivity (~6 KB). If you don't
 * need `hx-live` / SSE / WS / `bind`, stay on `hyperfixi-hx.js`. For
 * size-tuned production builds, use the `@hyperfixi/vite-plugin` instead
 * of either premade bundle.
 *
 * Supports everything `hyperfixi-hx.js` supports, plus:
 *   - `hx-live="<hyperscript expr>"`           reactive expressions
 *   - `bind $x to <el>.<property>`             explicit property binding
 *   - SSE: `sse-connect`, `sse-swap`           (Phase 3 — wiring landing later)
 *   - WS:  `ws-connect`, `ws-send`             (Phase 4 — wiring landing later)
 *
 * Usage:
 *   <script src="hyperfixi-hx-v4.js"></script>
 *   <div hx-live="put $count into me"></div>
 *   <button _="on click set $count to $count + 1">+1</button>
 */

// Importing browser-bundle triggers default-runtime construction and
// `window.hyperfixi` assignment in the same script-tag execution turn.
// We install the reactivity plugin onto that same default runtime below,
// so a single runtime instance handles both `_=` and `hx-live`.
import hyperfixiAPI from './browser-bundle.js';

import { reactivityPlugin } from '@hyperfixi/reactivity';
import { realtimePlugin } from '@hyperfixi/realtime';

import {
  HtmxAttributeProcessor,
  FIXI_ATTRS,
  HTMX_ATTRS,
  type HtmxProcessorOptions,
  type FxInitEventDetail,
  type FxConfigEventDetail,
  type FxAfterEventDetail,
  type FxFinallyEventDetail,
} from '../htmx/htmx-attribute-processor.js';
import {
  translateToHyperscript,
  hasHtmxAttributes,
  hasFxAttributes,
  hasAnyAttributes,
  type HtmxConfig,
} from '../htmx/htmx-translator.js';

// Install `window.__hyperfixi_i18n` synchronously so vocab modules
// (vocab/htmx/{lang}.js) loaded by `<script>` tags AFTER this bundle can
// register their localized attribute names. The orchestrator module already
// calls this on import, but Terser's `unused: true, toplevel: true` pass
// elides the side effect under `sideEffects: false`. Calling here from the
// entry guarantees the assignment survives minification.
import { installPublicAPI as installI18nPublicAPI } from '../htmx/i18n-orchestrator.js';
installI18nPublicAPI();

// ============== REACTIVITY INSTALL ==============

// The default runtime is constructed lazily on first use by the
// hyperscript API. We need it alive BEFORE the htmx-compat scanner runs
// so reactivity is registered on the runtime that will actually evaluate
// `hx-live` blocks. `getDefaultRuntime()` is the public, intent-revealing
// way to force construction (returns the singleton directly; no indirection
// through `globalThis._hyperscript.runtime`).
function installBundledPluginsOnDefaultRuntime(): void {
  const runtime = hyperfixiAPI.getDefaultRuntime();
  // Cast both args through `never` because the plugins are built against
  // `dist/` types of `@hyperfixi/core` while this entry file imports from
  // `src/`. The shapes are identical at runtime (same module pre- vs
  // post-build) but TypeScript treats them as distinct nominal types due to
  // private-property identity in CommandRegistryV2.
  // (browser-bundle.ts already installs both; these are idempotent and kept
  // for explicitness should the import graph change.)
  hyperfixiAPI.installPlugin(runtime as never, reactivityPlugin as never);
  hyperfixiAPI.installPlugin(runtime as never, realtimePlugin as never);
}

installBundledPluginsOnDefaultRuntime();

// ============== HTMX/FIXI COMPATIBILITY ==============

let htmxProcessor: HtmxAttributeProcessor | null = null;

interface HtmxCompatOptions extends HtmxProcessorOptions {
  /** Whether to also process `_=` attributes (default: true) */
  processHyperscript?: boolean;
}

/**
 * Wrap the full-runtime `run(code, element)` into the
 * `(code, element)` signature `HtmxAttributeProcessor.init()` expects.
 *
 * MUST go through `run()` (not `evalHyperScript`) because `evalHyperScript`
 * calls `convertContext()` which constructs a NEW empty globals Map per
 * invocation. That breaks cross-handler `$global` sharing — writes from one
 * `_=` handler wouldn't be visible to another handler's reads, and
 * reactivity's per-name notify chain would have nothing to read.
 *
 * `run` → `hyperscript.eval` → `evalCode` accepts an Element directly and
 * uses `createContext(element)`, which threads the shared-globals Map from
 * `core/context.ts`. All callers — `_=` attribute scans, `hx-live`
 * translations, and inline `window.hyperfixi.run(...)` — therefore see the
 * same `$count`, `$price`, `$quantity`, etc.
 */
async function executeOnElement(code: string, element: Element): Promise<void> {
  await hyperfixiAPI.run(code, element);
}

function enableHtmxCompatibility(options: HtmxCompatOptions = {}): void {
  const { processHyperscript: _processHyperscript = true, ...htmxOptions } = options;

  htmxProcessor = new HtmxAttributeProcessor({
    processExisting: htmxOptions.processExisting ?? true,
    watchMutations: htmxOptions.watchMutations ?? true,
    debug: htmxOptions.debug ?? false,
    root: htmxOptions.root ?? document.body,
    requestDropping: htmxOptions.requestDropping ?? true,
    fixiEvents: htmxOptions.fixiEvents ?? true,
  });

  htmxProcessor.init(executeOnElement);

  // Upstream _hyperscript 0.9.90: listen for both `htmx:load` (htmx 3) and
  // `htmx:after:process` (htmx 4). After morphs/swaps insert new content,
  // re-scan the subtree so any `_=` on it gets wired by the full
  // attribute processor.
  installHtmxLifecycleListeners();

  if (options.debug) {
    console.log('[hyperfixi-hx-v4] htmx/fixi compatibility enabled');
  }
}

let htmxLifecycleHandler: ((e: Event) => void) | null = null;
function installHtmxLifecycleListeners(): void {
  if (htmxLifecycleHandler || typeof document === 'undefined') return;

  htmxLifecycleHandler = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { elt?: Element } | undefined;
    const target = detail?.elt ?? (e.target as Element | null);
    if (target && typeof (target as Element).querySelector === 'function') {
      void hyperfixiAPI.processNode(target);
    }
  };

  document.addEventListener('htmx:load', htmxLifecycleHandler);
  document.addEventListener('htmx:after:process', htmxLifecycleHandler);
}

function uninstallHtmxLifecycleListeners(): void {
  if (!htmxLifecycleHandler || typeof document === 'undefined') return;
  document.removeEventListener('htmx:load', htmxLifecycleHandler);
  document.removeEventListener('htmx:after:process', htmxLifecycleHandler);
  htmxLifecycleHandler = null;
}

function disableHtmxCompatibility(): void {
  if (htmxProcessor) {
    htmxProcessor.destroy();
    htmxProcessor = null;
  }
  uninstallHtmxLifecycleListeners();
}

function getHtmxProcessor(): HtmxAttributeProcessor | null {
  return htmxProcessor;
}

function translateHtmx(element: Element): string {
  const processor = new HtmxAttributeProcessor({
    processExisting: false,
    watchMutations: false,
  });
  return processor.manualProcess(element);
}

// ============== PUBLIC API ==============

const api = {
  ...hyperfixiAPI,

  version: '2.0.0-hybrid-hx-v4',

  enableHtmxCompatibility,
  disableHtmxCompatibility,
  getHtmxProcessor,
  translateHtmx,
  hasHtmxAttributes,
  hasFxAttributes,
  hasAnyAttributes,

  HtmxAttributeProcessor,
  translateToHyperscript,

  features: {
    htmx: true,
    fixi: true,
    hyperscript: true,
    reactivity: true,
    hxLive: true,
  },

  htmxAttributes: HTMX_ATTRS,
  fixiAttributes: FIXI_ATTRS,

  fixiEvents: [
    'fx:init',
    'fx:inited',
    'fx:config',
    'fx:before',
    'fx:after',
    'fx:error',
    'fx:finally',
    'fx:swapped',
  ],
};

// ============== AUTO-INITIALIZATION ==============

if (typeof window !== 'undefined') {
  // browser-bundle.js already set `window.hyperfixi` to its API; augment
  // (don't replace) with the htmx-compat surface so consumers who imported
  // from the full bundle keep working.
  Object.assign((window as unknown as { hyperfixi: typeof api }).hyperfixi, api);

  const initHybridHxV4 = (): void => {
    enableHtmxCompatibility({
      processExisting: true,
      watchMutations: true,
      processHyperscript: true,
      requestDropping: true,
      fixiEvents: true,
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHybridHxV4);
  } else {
    initHybridHxV4();
  }
}

export default api;
export {
  enableHtmxCompatibility,
  disableHtmxCompatibility,
  translateHtmx,
  HtmxAttributeProcessor,
  hasFxAttributes,
  hasAnyAttributes,
  FIXI_ATTRS,
  HTMX_ATTRS,
};
export type {
  HtmxConfig,
  HtmxCompatOptions,
  HtmxProcessorOptions,
  FxInitEventDetail,
  FxConfigEventDetail,
  FxAfterEventDetail,
  FxFinallyEventDetail,
};
