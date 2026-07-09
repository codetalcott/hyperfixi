/**
 * htmx-translator.ts
 *
 * Translates htmx/fixi attribute configurations to hyperscript syntax.
 * Supports both htmx-style (hx-*) and fixi-style (fx-*) configs.
 *
 * Key differences between htmx and fixi:
 * - htmx uses separate hx-get, hx-post, etc. attributes
 * - fixi uses fx-action + fx-method (default: GET)
 * - htmx default swap: innerHTML
 * - fixi default swap: outerHTML
 *
 * Attribute values follow htmx's HCON grammar (see hcon.ts): a head token
 * (event name / swap style) followed by `key:value` modifiers. Modifiers we
 * cannot express in hyperscript are reported through `warnUnsupportedModifier`
 * rather than dropped in silence.
 */

import { parse as hconParse, type HconObject, type HconValue } from './hcon.js';
import { getHooks } from './i18n-hooks.js';

export interface HtmxConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url?: string;
  target?: string;
  swap?: string;
  trigger?: string;
  confirm?: string;
  boost?: boolean;
  vals?: string;
  headers?: string;
  pushUrl?: boolean | string;
  replaceUrl?: boolean | string;
  onHandlers?: Record<string, string>;
  /**
   * htmx v4 `hx-live="..."` — reactive expression that re-runs when its
   * dependencies change. Body is hyperscript syntax (not JS, unlike upstream
   * htmx v4). Translated to a `live ... end` block, which requires
   * `@hyperfixi/reactivity` to be installed on the runtime.
   */
  hxLive?: string;
}

/**
 * Swap strategy translation map
 */
const SWAP_MAP: Record<string, string> = {
  innerHTML: 'innerHTML',
  outerHTML: 'outerHTML',
  beforebegin: 'before',
  afterbegin: 'start',
  beforeend: 'end',
  afterend: 'after',
  delete: 'delete',
  none: 'none',
  morph: 'morph',
  'morph:innerHTML': 'innerHTML morph',
  'morph:outerHTML': 'morph',
};

/**
 * Trigger event translation map
 */
const TRIGGER_MAP: Record<string, string> = {
  click: 'click',
  load: 'init',
  revealed: 'intersection',
  intersect: 'intersection',
  submit: 'submit',
  change: 'change',
  input: 'input',
  keyup: 'keyup',
  keydown: 'keydown',
  focus: 'focus',
  blur: 'blur',
  mouseenter: 'mouseenter',
  mouseleave: 'mouseleave',
};

/** Keys that must never be emitted into generated code or a live object. */
const PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Content type htmx uses for `hx-vals` on non-GET requests. */
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';

const warnedModifiers = new Set<string>();

/**
 * Reports an htmx modifier that HCON parsed but hyperscript cannot express.
 * Deduped, because the processor translates every matching element separately.
 */
function warnUnsupportedModifier(name: string, kind: 'trigger' | 'swap'): void {
  const key = `${kind}:${name}`;
  if (warnedModifiers.has(key)) return;
  warnedModifiers.add(key);
  console.warn(
    `[hyperfixi] htmx ${kind} modifier "${name}" is recognized but not supported; ignoring it.`
  );
}

/** Deduped warning for anything else the translator declines to do. */
function warnOnce(message: string): void {
  if (warnedModifiers.has(message)) return;
  warnedModifiers.add(message);
  console.warn(`[hyperfixi] ${message}`);
}

/**
 * htmx evaluates `js:`-prefixed attribute values. We never do — the whole point
 * of re-serializing these attributes is that their text stays data.
 */
function warnJsPrefixIgnored(attribute: string): void {
  warnOnce(`${attribute} uses a "js:" prefix, which is not evaluated; ignoring it.`);
}

/** Test seam: the dedupe cache above would otherwise leak across test cases. */
export function resetUnsupportedModifierWarnings(): void {
  warnedModifiers.clear();
}

/**
 * Quotes a string as a hyperscript single-quoted literal. Every value that
 * originates in an HTML attribute passes through here, so attribute text can
 * never escape into command position.
 */
function quoteHs(value: string): string {
  return `'${value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')}'`;
}

function emitHyperscriptValue(value: HconValue): string {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return quoteHs(value);
  if (Array.isArray(value)) return `[${value.map(emitHyperscriptValue).join(', ')}]`;
  return emitHyperscriptObjectLiteral(value);
}

/**
 * Renders a parsed HCON object as a hyperscript object literal. Prototype keys
 * are dropped at every level — HCON's `{`-prefixed JSON fast path can mint an
 * own `__proto__` key (see hcon.ts).
 */
function emitHyperscriptObjectLiteral(obj: HconObject): string {
  const entries = Object.entries(obj)
    .filter(([key]) => !PROTO_KEYS.has(key))
    .map(([key, value]) => `${quoteHs(key)}: ${emitHyperscriptValue(value)}`);
  return entries.length ? `{ ${entries.join(', ')} }` : '{}';
}

const DURATION_RE = /^([\d.]+)\s*(ms|s|m)?$/;

/**
 * `200ms` / `1.5s` / `2m` / bare `500` → milliseconds. HCON coerces a bare
 * number for us, so accept both. Returns null when the value isn't a duration.
 */
function parseDurationMs(raw: HconValue): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.round(raw) : null;
  if (typeof raw !== 'string') return null;

  const match = raw.trim().match(DURATION_RE);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  if (!Number.isFinite(amount)) return null;

  const unit = match[2] ?? 'ms';
  const factor = unit === 's' ? 1000 : unit === 'm' ? 60_000 : 1;
  return Math.round(amount * factor);
}

/** Event sources the `from` clause accepts as bare identifiers. */
const FROM_KEYWORDS = new Set(['window', 'document', 'body', 'me']);

/**
 * Builds the `from <source>` clause of an event handler. The clause takes a
 * single token, so htmx's compound forms (`closest form`) have no equivalent.
 */
function buildFromClause(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value === 'this') return 'me';
  if (FROM_KEYWORDS.has(value)) return value;

  if (/^(closest|find|next|previous)\s+/.test(value)) {
    warnUnsupportedModifier(`from:${value.split(/\s+/)[0]}`, 'trigger');
    return null;
  }
  return `<${value}/>`;
}

/**
 * `matches` only does CSS matching when the right-hand side *looks* like a
 * selector — a leading `.#:[` or a bare tag name (see expressions/logical).
 * Anything else (e.g. `ul > li`) would silently evaluate to false, so refuse it.
 */
const MATCHES_COMPATIBLE = /^[.#:[]|^[a-zA-Z][\w-]*$/;

function buildTargetFilter(raw: string): string | null {
  const value = raw.trim();
  if (!MATCHES_COMPATIBLE.test(value)) {
    warnUnsupportedModifier('target', 'trigger');
    return null;
  }
  return `target matches ${quoteHs(value)}`;
}

/** htmx allows `js:`/`javascript:` values. We parse literals only; never eval. */
function isJsPrefixed(value: string): boolean {
  return value.startsWith('js:') || value.startsWith('javascript:');
}

/**
 * Appends static HCON values to a URL's query string. Used for GET, where htmx
 * encodes `hx-vals` into the query rather than a body. URLSearchParams
 * percent-encodes quotes, so the result is always safe inside `quoteHs`.
 */
function appendQueryString(url: string, values: HconObject): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (PROTO_KEYS.has(key) || value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else if (typeof value === 'object') {
      params.append(key, JSON.stringify(value));
    } else {
      params.append(key, String(value));
    }
  }
  const query = params.toString();
  if (!query) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

function hasContentType(headers: HconObject): boolean {
  return Object.keys(headers).some(key => key.toLowerCase() === 'content-type');
}

/**
 * Resolve an `hx-target` attribute value to its hyperscript-selector equivalent.
 * Handles the shortcut forms (`this` / `closest <sel>` / `find <sel>` / `next <sel>` /
 * `previous <sel>`) plus plain CSS selectors. Exported so the SSE/WS swap path
 * in [htmx-attribute-processor.ts] can use the same resolver as the request-cycle
 * path — without it, those streaming swaps silently ignore the shortcut forms.
 */
export function resolveHxTarget(target: string): string {
  if (target === 'this') {
    return 'me';
  }

  // closest selector
  const closestMatch = target.match(/^closest\s+(.+)$/);
  if (closestMatch) {
    return `closest <${closestMatch[1]}/>`;
  }

  // find selector (within element)
  const findMatch = target.match(/^find\s+(.+)$/);
  if (findMatch) {
    return `first <${findMatch[1]}/> in me`;
  }

  // next sibling
  const nextMatch = target.match(/^next\s+(.+)$/);
  if (nextMatch) {
    return `next <${nextMatch[1]}/>`;
  }

  // previous sibling
  const prevMatch = target.match(/^previous\s+(.+)$/);
  if (prevMatch) {
    return `previous <${prevMatch[1]}/>`;
  }

  // CSS selector - return as-is (most common case)
  return target;
}

/**
 * Parse trigger string to extract event and modifiers.
 * Examples: "click", "click delay:500ms", "keyup[key=='Enter']".
 *
 * `translateEventName` is the orchestrator's vocab-aware mapper —
 * Spanish `hx-trigger="clic"` arrives here as `"clic"` and gets
 * translated to `"click"` so the runtime registers a real DOM
 * listener (downstream `TRIGGER_MAP` lookup then handles the
 * trigger-specific hyperscript form). Identity by default; vocab
 * impls walk the per-element lang scope.
 */
interface TriggerSpec {
  event: string;
  /** Contents of an `event[filter]` head, e.g. `key=='Enter'`. */
  filter?: string;
  modifiers: HconObject;
}

/** Head token is `event` or `event[filter]`; everything after it is HCON. */
const TRIGGER_HEAD_RE = /^(\S+\[[^\]]*\]|\S+)\s*(.*)$/;
const EVENT_FILTER_RE = /^(\w+)\[(.+)\]$/;

function parseTrigger(trigger: string, translateEventName: (value: string) => string): TriggerSpec {
  const match = trigger.trim().match(TRIGGER_HEAD_RE);
  if (!match) return { event: 'click', modifiers: {} };

  let head = match[1];
  const rest = match[2] ?? '';
  const modifiers = rest ? hconParse(rest) : {};

  // Unterminated filter (`click[ctrlKey`): keep the event, drop the fragment.
  if (/\[[^\]]*$/.test(head)) {
    warnUnsupportedModifier('unterminated event filter', 'trigger');
    head = head.slice(0, head.indexOf('['));
  }

  const filterMatch = head.match(EVENT_FILTER_RE);
  if (filterMatch) {
    const localized = translateEventName(filterMatch[1]);
    return { event: TRIGGER_MAP[localized] || localized, filter: filterMatch[2], modifiers };
  }

  const localized = translateEventName(head);
  return { event: TRIGGER_MAP[localized] || localized, modifiers };
}

/**
 * Builds the handler head from a trigger spec.
 *
 * The clause order is load-bearing: the parser accepts
 * `on <event><.dotmods>[<filter>] from <source>` and rejects any other
 * arrangement (notably `[filter]` before the dot-modifiers).
 */
function buildTriggerClause(spec: TriggerSpec): string {
  let debounceMs: number | null = null;
  let throttleMs: number | null = null;
  let once = false;
  let from: string | null = null;
  let targetFilter: string | null = null;

  for (const [key, raw] of Object.entries(spec.modifiers)) {
    switch (key) {
      case 'delay':
        debounceMs = parseDurationMs(raw);
        if (debounceMs === null) warnUnsupportedModifier('delay', 'trigger');
        break;
      case 'throttle':
        throttleMs = parseDurationMs(raw);
        if (throttleMs === null) warnUnsupportedModifier('throttle', 'trigger');
        break;
      case 'once':
        once = raw !== false;
        break;
      case 'changed':
        // Native behaviour for input/change events; nothing to emit.
        break;
      case 'from':
        from = buildFromClause(String(raw));
        break;
      case 'target':
        targetFilter = buildTargetFilter(String(raw));
        break;
      default:
        warnUnsupportedModifier(key, 'trigger');
    }
  }

  // Fixed order, so output doesn't depend on attribute authoring order.
  let dots = '';
  if (debounceMs !== null) dots += `.debounce(${debounceMs})`;
  if (throttleMs !== null) dots += `.throttle(${throttleMs})`;
  if (once) dots += '.once';

  const filters = [spec.filter, targetFilter].filter(Boolean) as string[];
  const filterClause =
    filters.length === 0
      ? ''
      : filters.length === 1
        ? `[${filters[0]}]`
        : `[(${filters[0]}) and (${filters[1]})]`;

  return `on ${spec.event}${dots}${filterClause}${from ? ` from ${from}` : ''}`;
}

/**
 * Determine default trigger based on element type
 */
function getDefaultTrigger(element: Element): string {
  const tagName = element.tagName.toLowerCase();

  if (tagName === 'form') {
    return 'submit';
  }

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    const type = element.getAttribute('type');
    if (type === 'submit' || type === 'button') {
      return 'click';
    }
    return 'change';
  }

  return 'click';
}

interface SwapSpec {
  style: string;
  modifiers: HconObject;
}

/**
 * Splits `hx-swap` into its head style token and HCON modifiers, e.g.
 * `innerHTML swap:200ms settle:100ms`.
 *
 * The SWAP_MAP membership test must precede the `modifier:`-shape test:
 * `morph:innerHTML` is a *style*, but it also looks like a `key:value` pair.
 */
function parseSwapSpec(swap: string | undefined, defaultStyle: string): SwapSpec {
  const spec = (swap ?? '').trim();
  if (!spec) return { style: defaultStyle, modifiers: {} };

  const head = spec.split(/\s+/)[0];
  if (Object.prototype.hasOwnProperty.call(SWAP_MAP, head) || !/^\S*:/.test(spec)) {
    return { style: head, modifiers: hconParse(spec.slice(head.length)) };
  }
  // Modifiers only — the style falls back to the caller's default.
  return { style: defaultStyle, modifiers: hconParse(spec) };
}

/**
 * htmx's `swap:` delays the swap; `settle:` delays whatever follows it. Both
 * become `wait <n>ms` around the swap command.
 */
function buildSwapTimings(modifiers: HconObject): {
  swapWaitMs: number | null;
  settleWaitMs: number | null;
} {
  let swapWaitMs: number | null = null;
  let settleWaitMs: number | null = null;

  for (const [key, raw] of Object.entries(modifiers)) {
    switch (key) {
      case 'swap':
        swapWaitMs = parseDurationMs(raw);
        if (swapWaitMs === null) warnUnsupportedModifier('swap', 'swap');
        break;
      case 'settle':
        settleWaitMs = parseDurationMs(raw);
        if (settleWaitMs === null) warnUnsupportedModifier('settle', 'swap');
        break;
      default:
        warnUnsupportedModifier(key, 'swap');
    }
  }

  return { swapWaitMs, settleWaitMs };
}

/**
 * Build the swap command based on strategy and target
 */
function buildSwapCommand(target: string, swap: string, useMorph: boolean): string {
  const strategy = SWAP_MAP[swap] || swap;

  // Handle special strategies
  if (strategy === 'none') {
    return ''; // No swap
  }

  if (strategy === 'delete') {
    return `remove ${target}`;
  }

  // Position-based insertions
  if (strategy === 'before') {
    return `put it before ${target}`;
  }
  if (strategy === 'after') {
    return `put it after ${target}`;
  }
  if (strategy === 'start') {
    return `put it at start of ${target}`;
  }
  if (strategy === 'end') {
    return `put it at end of ${target}`;
  }

  // Morph strategies
  if (strategy === 'morph' || useMorph) {
    return `morph ${target} with it`;
  }
  if (strategy === 'innerHTML morph') {
    return `morph innerHTML of ${target} with it`;
  }

  // Standard innerHTML/outerHTML swap
  if (strategy === 'outerHTML') {
    return `set ${target}'s outerHTML to it`;
  }

  // Default: innerHTML
  return `put it into ${target}`;
}

/**
 * Main translation function
 */
export function translateToHyperscript(config: HtmxConfig, element: Element): string {
  const parts: string[] = [];

  // hx-live → live ... end block. Emitted first so it's parsed as a top-level
  // feature alongside event handlers. Requires @hyperfixi/reactivity to be
  // installed; the processor's processElement gates the emission on feature
  // availability and logs a clear error if missing.
  if (config.hxLive) {
    parts.push(`live\n  ${config.hxLive}\nend`);
  }

  // hx-on:* handlers are NOT translated to hyperscript source here. Wrapping
  // them as `on EVENT body` and running through executeCallback parses fine
  // but never reaches the runtime path that calls `addEventListener` —
  // executeAST treats top-level event nodes inside a sequence as one-shot.
  // The processor installs real DOM listeners for them via installOnHandlers.

  // If no request URL, just return the event handlers (and any live block)
  if (!config.url) {
    return parts.join('\n');
  }

  // Build the main request handler
  const commands: string[] = [];

  // Event trigger — `getHooks().eventNameOf` translates per-element
  // localized event names (e.g. Spanish `clic` → `click`) before
  // TRIGGER_MAP / runtime listener registration. Identity by default.
  const triggerStr = config.trigger || getDefaultTrigger(element);
  const triggerSpec = parseTrigger(triggerStr, value => getHooks().eventNameOf(element, value));
  const triggerClause = buildTriggerClause(triggerSpec);

  // Confirmation dialog
  if (config.confirm) {
    commands.push(`if not js window.confirm('${config.confirm.replace(/'/g, "\\'")}') return end`);
  }

  // For forms and links, prevent default
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'form' || tagName === 'a') {
    commands.push('halt the event');
  }

  commands.push(buildFetchCommand(config, tagName));

  // Build swap command
  const target = config.target ? resolveHxTarget(config.target) : 'me';
  const { style, modifiers: swapModifiers } = parseSwapSpec(config.swap, 'innerHTML');
  const { swapWaitMs, settleWaitMs } = buildSwapTimings(swapModifiers);
  const swapCmd = buildSwapCommand(target, style, false);

  if (swapWaitMs !== null) {
    commands.push(`then wait ${swapWaitMs}ms`);
  }
  if (swapCmd) {
    commands.push(`then ${swapCmd}`);
  }
  if (settleWaitMs !== null) {
    commands.push(`then wait ${settleWaitMs}ms`);
  }

  // URL management
  if (config.pushUrl) {
    const url = config.pushUrl === true ? config.url : config.pushUrl;
    commands.push(`then push url ${quoteHs(url)}`);
  } else if (config.replaceUrl) {
    const url = config.replaceUrl === true ? config.url : config.replaceUrl;
    commands.push(`then replace url ${quoteHs(url)}`);
  }

  // Assemble the event handler
  const handlerCode = `${triggerClause}\n  ${commands.join('\n  ')}`;
  parts.push(handlerCode);

  return parts.join('\n');
}

/**
 * Builds the `fetch` command, including the `with { headers, body }` options.
 *
 * `hx-vals` and `hx-headers` are parsed as HCON (or JSON) and re-emitted as a
 * hyperscript object literal, so attribute text is always data and never code.
 * Values are sent the way htmx sends them: query string for GET, an
 * `application/x-www-form-urlencoded` body otherwise. That encoding is what lets
 * server frameworks that read form fields — e.g. Django's `csrfmiddlewaretoken`
 * out of `request.POST` — see the values at all; a JSON body would not appear
 * there.
 */
function buildFetchCommand(config: HtmxConfig, tagName: string): string {
  const isGet = !config.method || config.method === 'GET';

  const headers: HconObject = {};
  if (config.headers) {
    if (isJsPrefixed(config.headers.trim())) {
      warnJsPrefixIgnored('hx-headers');
    } else {
      Object.assign(headers, hconParse(config.headers));
    }
  }

  let vals: HconObject | null = null;
  if (config.vals) {
    if (isJsPrefixed(config.vals.trim())) {
      warnJsPrefixIgnored('hx-vals');
    } else {
      vals = hconParse(config.vals);
    }
  }

  let url = config.url as string;
  let bodyExpr: string | null = null;

  if (tagName === 'form') {
    if (vals && Object.keys(vals).length) {
      warnOnce('hx-vals is not merged with form values; the form fields win.');
    }
    if (isGet) {
      // htmx encodes a GET form's fields into the query string. The fields are
      // only known at event time, so there is nothing to emit statically.
      warnOnce('GET form values are not appended to the query string yet.');
    } else {
      // `me as FormEncoded`, not `values of me as FormEncoded`: `values of me`
      // parses as a property access (`me.values`), which is undefined on a form.
      // The FormEncoded conversion extracts an element's fields for us.
      bodyExpr = 'me as FormEncoded';
    }
  } else if (vals && Object.keys(vals).length) {
    if (isGet) {
      url = appendQueryString(url, vals);
    } else {
      bodyExpr = `${emitHyperscriptObjectLiteral(vals)} as FormEncoded`;
    }
  }

  // A form-encoded body is a plain string; without this the browser would label
  // it text/plain and the server would not parse any fields out of it.
  if (bodyExpr && !hasContentType(headers)) {
    headers['Content-Type'] = FORM_CONTENT_TYPE;
  }

  // The method goes inside the options object rather than into a `via <METHOD>`
  // clause. `via` exists only in the hybrid parser; in the main parser it is an
  // unrecognized token that halts the modifier loop, so `via POST with {...}`
  // loses BOTH the method and the whole `with` clause. `with { method: ... }` is
  // read by fetch's RequestInit allowlist and works in every parser.
  const withParts: string[] = [];
  if (config.method && config.method !== 'GET') {
    withParts.push(`method: ${quoteHs(config.method)}`);
  }
  if (Object.keys(headers).length) {
    withParts.push(`headers: ${emitHyperscriptObjectLiteral(headers)}`);
  }
  if (bodyExpr) {
    withParts.push(`body: ${bodyExpr}`);
  }

  let fetchCmd = `fetch ${quoteHs(url)}`;
  if (withParts.length) {
    fetchCmd += ` with { ${withParts.join(', ')} }`;
  }
  return `${fetchCmd} as html`;
}

/**
 * Check if an element has any htmx attributes
 */
export function hasHtmxAttributes(element: Element): boolean {
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    if (attrs[i].name.startsWith('hx-')) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an element has any fixi attributes
 */
export function hasFxAttributes(element: Element): boolean {
  return element.hasAttribute('fx-action');
}

/**
 * Check if an element has any htmx or fixi attributes
 */
export function hasAnyAttributes(element: Element): boolean {
  return hasHtmxAttributes(element) || hasFxAttributes(element);
}
