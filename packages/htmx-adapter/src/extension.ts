/**
 * htmx extension + auto-sweep wiring.
 *
 * Primary target is **htmx v4**, whose extensions register via
 * `htmx.registerExtension(name, ext)` and hook lifecycle events through
 * underscore-named methods (event name with `:` → `_`), each receiving
 * `(elt, detail)`. Verified against htmx 4.0.0 (see
 * test/browser/vendor/README.md): `process(root)` fires
 * `htmx:before:process` on the processed root — `document.body`
 * initially, each swapped-in subtree afterwards — BEFORE any element
 * init or hx-on binding, so canonicalizing in `htmx_before_process`
 * covers everything htmx will read. `htmx_before_process_node` is kept
 * as a defensive alias for other v4 prereleases that used per-node
 * naming; an unmatched key is inert. The cancelable
 * `htmx_before_on_init` hook (fires per hx-on-carrying node, after
 * before:process; documented as cancelable in htmx 4.0.0's `htmx.d.ts`)
 * lets executor mode keep claimed `hx-on:*` attributes in the DOM
 * instead of removing them — see createExtension.
 *
 * A v2 fallback (`htmx.defineExtension` + `onEvent('htmx:beforeProcessNode')`)
 * is included because the localized attribute names are version-agnostic
 * data — but v2 support is best-effort, not a tested target. Measured on
 * 2.0.10: `processNode` binds `hx-on` (`processHxOnWildcard`) BEFORE it
 * fires `htmx:beforeProcessNode` per node, so v2 has no pre-bind seam and
 * executor-mode claims keep removing canonical `hx-on:*` attrs there.
 *
 * The extension hook alone is not enough for the *initial* page: script
 * order decides whether our sweep beats htmx's own DOMContentLoaded scan.
 * `installAutoSweep()` handles that — load this adapter (and vocab
 * modules) BEFORE the htmx <script> tag, mirroring loka-js's
 * "orchestrator before libraries" rule, and the sweep listener registers
 * ahead of htmx's.
 */

import { canonicalizeTree, setTriggerSpecSplitter } from './canonicalize.js';
import { onVocabUpdate } from './registry.js';
import {
  claimedAttrNames,
  onBodyHooksChanged,
  removeClaimedCanonicalAttrs,
  setNeutralizeOnClaim,
} from './hx-on.js';

export const EXTENSION_NAME = 'lokascript-i18n';

/** Minimal shape of the htmx global we interact with. */
export interface HtmxLike {
  /**
   * htmx v4 registration entry point. Returns `false` when the name is
   * rejected — `htmx.config.extensions` is a non-empty allowlist that
   * omits it, or it was already registered. (`htmx.d.ts` types the
   * return as `void`; the runtime, verified on 4.0.0, returns `false`.)
   */
  registerExtension?(name: string, extension: object): boolean | void;
  /** htmx v1/v2 registration entry point. */
  defineExtension?(name: string, extension: object): void;
  /** htmx v4 config — the parts that decide which hx-on spellings it binds. */
  config?: {
    /** Alternate attribute prefix (`data-hx-` by default; `''` disables it). */
    prefix?: string;
    /** Separator between `hx-on` and the event name (`:` by default). */
    metaCharacter?: string;
  };
}

/** The slice of htmx v4's `internalAPI` the extension reads. */
interface InternalApiLike {
  HCON?: { split?(value: string): string[] };
}

/**
 * The hx-on attribute names htmx v4 will bind on a node, mirroring
 * `#prefixes("hx-on")` + `#handleHxOnAttributes` (vendored 4.0.0):
 * for each prefix `p` in [`hx-on`, `config.prefix + "on"`], the bare
 * composite `p` (`hx-on="event -> code"`) and `p + metaCharacter + event`.
 * `hx-online` / `data-hx-once` are NOT bound — the char after the prefix
 * must be the meta character.
 */
function isHtmxBindableHxOn(name: string, prefixes: string[], mc: string): boolean {
  for (const p of prefixes) {
    if (name === p) return true;
    if (name.startsWith(p) && name.charAt(p.length) === mc) return true;
  }
  return false;
}

/**
 * Build the extension object. v4 hooks and the v2 `onEvent` callback are
 * both present — each API only reads the members it knows about. Pass
 * the htmx instance so the v4 hook can read `config.prefix` /
 * `config.metaCharacter` (defaults are assumed otherwise).
 *
 * `init(internalAPI)` (v4 only) takes exactly one thing from the API:
 * `HCON.split`, htmx's own top-level trigger-spec splitter, which
 * replaces the regex mirror in canonicalize.ts for the lifetime of the
 * page. The rest of the 4.0.0 surface — `attributeValue`,
 * `parseTriggerSpecs`, `getAttributeObject`, `insertContent`, `morph`,
 * `initSecurity`, `onTrigger`, `htmxProp`, `triggerHtmxEvent`,
 * `executeJavaScript` — was evaluated and not used: `parseTriggerSpecs`
 * is parse-only (no serializer, so translating through it would mean a
 * hand-written spec serializer); `attributeValue`'s inheritance-aware
 * reads buy nothing for a sweep that visits every element anyway; and
 * `htmxProp(node).onInitialized = true` WOULD keep htmx's binder off a
 * node, but couples to a private flag where `htmx:before:on:init` is a
 * typed, documented, cancelable event — the hook below uses that.
 */
export function createExtension(htmx?: HtmxLike | null): object {
  const cfg = htmx?.config;
  const prefix = cfg && 'prefix' in cfg ? (cfg.prefix ?? '') : 'data-hx-';
  const mc = cfg?.metaCharacter || ':';
  const hxOnPrefixes = prefix ? ['hx-on', prefix + 'on'] : ['hx-on'];

  return {
    init(internalAPI?: InternalApiLike): void {
      const split = internalAPI?.HCON?.split;
      if (typeof split === 'function') setTriggerSpecSplitter(split.bind(internalAPI!.HCON));
    },
    // htmx v4 (verified on 4.0.0): fires on each process() root
    // before element init and hx-on binding.
    htmx_before_process(elt: Element): void {
      canonicalizeTree(elt);
    },
    // Defensive alias for v4 prereleases with per-node hook naming.
    htmx_before_process_node(elt: Element): void {
      canonicalizeTree(elt);
    },
    // htmx v4 (verified on 4.0.0): fires per node carrying an
    // hx-on-family attribute, cancelable — returning false makes htmx
    // skip JS-binding that node entirely. This is executor mode's
    // zero-mutation double-execution guard, decided from what the sweep
    // RECORDED on the node (not from whether an executor is set now):
    //
    // - nothing claimed on this node → htmx proceeds as usual;
    // - every hx-on attribute htmx would bind here is claimed → cancel,
    //   the authored attributes stay in the DOM;
    // - the node also carries forms htmx must bind and the adapter never
    //   claims (the legacy composite `hx-on="event -> code"`, the
    //   `config.prefix` spelling, a custom meta character) → per-node
    //   cancellation would kill those too, so fall back to removing the
    //   claimed canonical attrs and let htmx bind the rest.
    htmx_before_on_init(elt: Element): boolean | undefined {
      const claimedNames = claimedAttrNames(elt);
      if (claimedNames.size === 0) return undefined;
      let unclaimedBindable = false;
      for (const attr of Array.from(elt.attributes)) {
        const name = attr.name;
        if (claimedNames.has(name)) continue;
        if (isHtmxBindableHxOn(name, hxOnPrefixes, mc)) {
          unclaimedBindable = true;
          break;
        }
      }
      if (!unclaimedBindable) return false;
      removeClaimedCanonicalAttrs(elt);
      return undefined;
    },
    // htmx v1/v2 fallback: single event dispatcher.
    onEvent(name: string, evt: CustomEvent & { target?: EventTarget | null }): void {
      if (name !== 'htmx:beforeProcessNode') return;
      const detail = evt?.detail as { elt?: Element } | undefined;
      const elt = detail?.elt ?? (evt?.target instanceof Element ? evt.target : null);
      if (elt) canonicalizeTree(elt);
    },
  };
}

/**
 * Register the extension with an htmx global. Returns which API accepted
 * it (`'v4'` / `'v2'`) or `null` if the object exposes neither, or if
 * v4 rejected the registration.
 *
 * Only an ACCEPTED v4 registration turns claim-time neutralization off:
 * that is the one runtime whose per-node `htmx:before:on:init` hook can
 * keep htmx off a preserved `hx-on:*` attribute. Everything else keeps
 * the hook-independent removal guard.
 */
export function registerWith(htmx: HtmxLike | undefined | null): 'v4' | 'v2' | null {
  if (!htmx) return null;
  const ext = createExtension(htmx);
  if (typeof htmx.registerExtension === 'function') {
    // v4 REJECTS the registration (returns false) when
    // `htmx.config.extensions` is an allowlist that omits us, or on a
    // duplicate name. Nothing we return from a hook can then run, so
    // claim-time neutralization must stay on — turning it off here would
    // leave claimed hx-on:* bodies in the DOM for htmx to JS-eval.
    if (htmx.registerExtension(EXTENSION_NAME, ext) === false) {
      if (typeof console !== 'undefined') {
        console.warn(
          `[htmx-i18n] htmx.registerExtension("${EXTENSION_NAME}") returned false — the ` +
            'extension is not registered. If htmx.config.extensions (the <meta name="htmx-config"> ' +
            `allowlist) is set, add "${EXTENSION_NAME}" to it. Swapped-in content will not be ` +
            'canonicalized; executor-mode claims fall back to removing canonical hx-on:* attrs.'
        );
      }
      setNeutralizeOnClaim(true);
      return null;
    }
    setNeutralizeOnClaim(false);
    return 'v4';
  }
  if (typeof htmx.defineExtension === 'function') {
    htmx.defineExtension(EXTENSION_NAME, ext);
    // v2 binds hx-on before it fires beforeProcessNode — no pre-bind
    // seam, so removal at claim time stays the guard.
    setNeutralizeOnClaim(true);
    return 'v2';
  }
  return null;
}

/**
 * Sweep the whole document once the DOM is parsed, and re-sweep whenever
 * a vocab module registers or the body executor changes after that
 * (e.g. a vocab <script> below htmx, a lazily loaded _hyperscript, or
 * dynamic registration).
 *
 * "Parsed" means DOMContentLoaded has FIRED (or `readyState` is already
 * `'complete'`) — not merely `readyState !== 'loading'`. During
 * DOMContentLoaded dispatch `readyState` is already `'interactive'`, and
 * a `defer`/module adapter runs at `'interactive'` before htmx exists;
 * sweeping then would claim in the default remove mode before
 * `registerWith` had a chance to turn neutralization off. A `load`
 * listener covers a script injected after DOMContentLoaded but before
 * `'complete'` (DOMContentLoaded will not fire again for it).
 *
 * Returns a cleanup function (mainly for tests).
 */
export function installAutoSweep(doc: Document = document): () => void {
  const sweep = (): void => {
    canonicalizeTree(doc.body ?? doc.documentElement);
  };

  let ready = doc.readyState === 'complete';
  let removeReadyListeners: (() => void) | null = null;
  if (ready) {
    sweep();
  } else {
    const onReady = (): void => {
      if (ready) return;
      ready = true;
      removeReadyListeners?.();
      sweep();
    };
    const win = doc.defaultView;
    doc.addEventListener('DOMContentLoaded', onReady);
    win?.addEventListener('load', onReady);
    removeReadyListeners = () => {
      doc.removeEventListener('DOMContentLoaded', onReady);
      win?.removeEventListener('load', onReady);
    };
  }

  const unsubscribeVocab = onVocabUpdate(() => {
    if (ready) sweep();
  });

  // A body executor configured after the initial sweep flips the hx-on
  // family into executor mode — re-sweep so already-canonicalized
  // hx-on:* attrs get claimed (listener installed; an adapter-created
  // canonical sibling is removed, an authored one is left for the v4
  // hook or removed by the claim, per the neutralization setting).
  const unsubscribeBodyHooks = onBodyHooksChanged(() => {
    if (ready) sweep();
  });

  return () => {
    removeReadyListeners?.();
    unsubscribeVocab();
    unsubscribeBodyHooks();
  };
}
