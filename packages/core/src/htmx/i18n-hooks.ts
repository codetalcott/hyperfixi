/**
 * Namespace-aware hooks for resolving htmx-compat attribute names.
 *
 * The htmx attribute processor used to hard-code English literals
 * (`hx-get`, `sse-connect`, `ws-send`). Phase 8 of htmx-v4-reactive-streaming
 * introduces per-element-lang localized attribute names via opt-in vocab
 * modules. This module owns the contract.
 *
 * Three hooks, modelled on the loka-js fixi pattern but extended for our
 * three namespaces (`hx-*`, `sse-*`, `ws-*`):
 *
 * - `nameOf(elt, ns, key)` — return the attribute name to read. Default is
 *   `${ns}-${key}`. Vocab impls return localized forms like `hx-acción`.
 * - `selectorFor(ns, key)` — return a CSS selector that matches any
 *   localization of this attribute. Default is `[${ns}-${key}]`. Vocab impls
 *   union over registered languages.
 * - `eventNameOf(elt, value)` — translate event-name strings from
 *   `hx-trigger` (e.g. Spanish `clic` → `click`). Default is identity.
 *
 * 8a is behavior-preserving by design — defaults route through the hooks
 * but resolve to today's literals. 8b wires the orchestrator that swaps
 * defaults for vocab-aware impls once any language is registered.
 */

export type AttrNamespace = 'hx' | 'sse' | 'ws';

export interface I18nHooks {
  nameOf(elt: Element, ns: AttrNamespace, key: string): string;
  selectorFor(ns: AttrNamespace, key: string): string;
  eventNameOf(elt: Element, value: string): string;
}

const DEFAULT_HOOKS: I18nHooks = {
  nameOf: (_elt, ns, key) => `${ns}-${key}`,
  selectorFor: (ns, key) => `[${ns}-${key}]`,
  eventNameOf: (_elt, value) => value,
};

let currentHooks: I18nHooks = DEFAULT_HOOKS;

/**
 * Replace the active hook implementations. Called by the orchestrator
 * once the first vocab module registers. Subsequent re-installs replace
 * wholesale — partial overrides are not supported (the orchestrator
 * builds a complete impl).
 */
export function installHooks(hooks: I18nHooks): void {
  currentHooks = hooks;
}

/** Return the currently-active hooks. Always returns a valid impl. */
export function getHooks(): I18nHooks {
  return currentHooks;
}

/** Restore default hooks. Mainly for tests. */
export function resetHooks(): void {
  currentHooks = DEFAULT_HOOKS;
}

/**
 * Canonical attribute-key registry. The processor iterates this when
 * building discovery selectors and during attribute reads — see
 * `htmx-attribute-processor.ts`. Vocab generators also consume this
 * list to enumerate what needs translation per language.
 *
 * `on` is here for vocab-generator visibility; the colon-suffix
 * `hx-on:*` family is discovered via attribute-name iteration
 * (findHxOnElements), not selector lookup.
 */
export const KEYS = {
  hx: [
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'target',
    'swap',
    'trigger',
    'confirm',
    'boost',
    'vals',
    'headers',
    'push-url',
    'replace-url',
    'on',
    'live',
  ],
  sse: ['connect', 'swap'],
  ws: ['connect', 'send'],
} as const satisfies Record<AttrNamespace, readonly string[]>;
