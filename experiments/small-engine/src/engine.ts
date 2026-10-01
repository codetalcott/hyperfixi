/**
 * The engine: one grammar, DOM initialisation, and the public `_hyperscript` API.
 *
 * A bundle builds its engine by calling `register(...)` with the modules it wants.
 * Follows upstream `_hyperscript.js` and the DOM half of `core/runtime/runtime.js`.
 */
import type { Cmd, Ctx, Expr, Program } from './ast';
import { expr } from './expressions';
import { ParseError, Parser, createGrammar, formatError, type Grammar } from './parser';
import {
  config,
  conversions,
  dataOf,
  dropData,
  dynamicResolvers,
  host,
  makeContext,
  peekData,
  runList,
  rx,
  triggerEvent,
} from './runtime';
import { commandList, program } from './statements';
import { tokenize } from './tokenizer';
import { get, then1 } from './util';

export type Module = (g: Grammar) => void;

export const grammar = createGrammar();

/** Add grammar modules to this bundle's engine. */
export function register(...modules: Module[]): void {
  for (const module of modules) module(grammar);
}

const parser = (src: string) => new Parser(grammar, tokenize(src), src);

/** Parse the script of an element. Throws `ParseError`; a leftover token is an error. */
export function parseProgram(src: string): Program {
  const p = parser(src);
  const parsed = program(p);
  if (p.hasMore()) p.err();
  return parsed;
}

export type Parsed =
  | { kind: 'commands'; commands: Cmd[] }
  | { kind: 'features'; program: Program }
  | { kind: 'expression'; expression: Expr };

/** Parse free-standing source: commands, features or one expression, decided by the first word. */
export function parse(src: string): Parsed {
  const p = parser(src);
  const first = p.cur();
  const parsed: Parsed = p.commandStart(first)
    ? { kind: 'commands', commands: commandList(p) }
    : p.featureStart(first)
      ? { kind: 'features', program: program(p) }
      : { kind: 'expression', expression: expr(p) };
  if (p.hasMore()) p.err();
  return parsed;
}

/** Run source against a context. Synchronous unless the source itself waits on something. */
export function evaluate(src: string, overrides?: Partial<Ctx>): unknown {
  let parsed: Parsed;
  try {
    parsed = parse(src);
  } catch (e) {
    if (e instanceof ParseError) throw new Error(e.message + '\n\n' + formatError(e));
    throw e;
  }
  const body = document.body;
  if (parsed.kind === 'features') {
    for (const feature of parsed.program.features) feature.install(body, body);
    return;
  }
  const ctx = Object.assign(makeContext(body, undefined, body, null), overrides);
  if (parsed.kind === 'expression') return parsed.expression.ev(ctx);
  return then1(runList(parsed.commands, ctx), signal => {
    const returned = get(signal, 'k') === 'return' ? get(signal, 'value') : undefined;
    return returned !== undefined ? returned : ctx.result;
  });
}

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------

const attributes = () => config.attributes.replaceAll(' ', '').split(',');

const isScript = (elt: unknown): elt is HTMLScriptElement =>
  elt instanceof HTMLScriptElement && elt.type === 'text/hyperscript';

function scriptOf(elt: Element): string | null {
  for (const name of attributes()) {
    if (elt.hasAttribute(name)) return elt.getAttribute(name);
  }
  return isScript(elt) ? elt.innerText : null;
}

const hash = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h << 5) + h + s.charCodeAt(i);
  return h;
};

/**
 * A plugin's rewrite of a script, applied as the script is read (the multilingual adapter
 * turns it into English). The element keeps the text its author wrote. Returning nothing
 * leaves the script as it is.
 */
export type SourceTransform = (source: string, element: Element) => string | null | undefined;
const transforms: SourceTransform[] = [];

function initElement(elt: Element): void {
  if (elt.closest(config.disableSelector)) return;
  const written = scriptOf(elt);
  if (!written) return;
  // The hash is of what is written, so a rewrite never looks like a changed script.
  const scriptHash = hash(written);
  if (peekData(elt)?.initialized) {
    if (peekData(elt)?.scriptHash === scriptHash) return;
    // The script changed under us (a morph, an attribute write): start over.
    cleanup(elt);
  }
  if (!triggerEvent(elt, 'hyperscript:before:init')) return;
  Object.assign(dataOf(elt), { initialized: true, scriptHash });
  // A script tag's features belong to the document body.
  const target = isScript(elt) ? document.body : elt;
  let src = written;
  try {
    for (const transform of transforms) src = transform(src, elt) ?? src;
    for (const feature of parseProgram(src).features) feature.install(target, elt);
    elt.setAttribute('data-hyperscript-powered', 'true');
    triggerEvent(elt, 'hyperscript:after:init');
    setTimeout(() => triggerEvent(target, 'load', { hyperscript: true }), 1);
  } catch (e) {
    if (e instanceof ParseError) {
      // The error is in the rewritten script; say what the author wrote.
      if (src !== written) e.written = written;
      triggerEvent(elt, 'hyperscript:parse-error', { errors: [e] });
      const from = e.written ? `\n  rewritten from: ${e.written}\n` : '';
      console.error('hyperscript: 1 parse error(s) on:', elt, '\n\n' + formatError(e) + from);
    } else {
      triggerEvent(elt, 'exception', { error: e });
      console.error('hyperscript errors were found on the following element:', elt, '\n\n', e);
    }
  }
}

type ProcessRoot = Element | Document | DocumentFragment;
type ProcessHook = (root: ProcessRoot) => void;
const beforeProcess: ProcessHook[] = [];
const afterProcess: ProcessHook[] = [];

/** Initialise every scripted element in a subtree. Elements already initialised are skipped. */
export function processNode(node: unknown): void {
  if (!(node instanceof Element || node instanceof Document || node instanceof DocumentFragment))
    return;
  // A plugin may rewrite scripts before they are read (the multilingual adapter does).
  for (const hook of beforeProcess) hook(node);
  const selector =
    attributes()
      .map(a => `[${a}]`)
      .join(', ') + ", [type='text/hyperscript']";
  if (node instanceof Element && node.matches(selector)) initElement(node);
  node.querySelectorAll(selector).forEach(initElement);
  for (const hook of afterProcess) hook(node);
}

/** Remove everything an element's script installed: listeners, observers, timers, state. */
export function cleanup(elt: Element): void {
  const data = peekData(elt);
  if (!data) return;
  triggerEvent(elt, 'hyperscript:before:cleanup');
  for (const { target, event, handler } of data.listeners ?? [])
    target.removeEventListener(event, handler);
  for (const observer of data.observers ?? []) observer.disconnect();
  for (const timer of data.timers ?? []) clearTimeout(timer);
  rx.stop(elt);
  elt.querySelectorAll('[data-hyperscript-powered]').forEach(cleanup);
  triggerEvent(elt, 'hyperscript:after:cleanup');
  elt.removeAttribute('data-hyperscript-powered');
  dropData(elt);
}

host.process = processNode;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * `parse` as a host exposes it, in upstream's shape: the parsed node with an
 * `errors` list. A grammar error is reported in the list; a tokenizer error throws.
 */
export function hostParse(src: string): { errors: ParseError[]; features?: Program['features'] } {
  try {
    const parsed = parse(src);
    if (parsed.kind === 'features') return { ...parsed.program, errors: [] };
    return { ...(parsed.kind === 'commands' ? parsed.commands[0] : parsed.expression), errors: [] };
  } catch (e) {
    if (e instanceof ParseError) return { errors: [e] };
    throw e;
  }
}

/** The public object, shaped like upstream's `_hyperscript` so its plugins can be used. */
export const api = Object.assign(evaluate, {
  // Upstream's shape: `config.conversions.Foo = …` and `config.conversions.dynamicResolvers.push(…)`.
  config: Object.assign(config, { conversions: Object.assign(conversions, { dynamicResolvers }) }),
  /** `use(plugin)`: the plugin receives this object. */
  use(plugin: (hyperscript: unknown) => void) {
    plugin(api);
  },
  addBeforeProcessHook: (hook: ProcessHook) => void beforeProcess.push(hook),
  addAfterProcessHook: (hook: ProcessHook) => void afterProcess.push(hook),
  /** Not in upstream: rewrite a script as it is read, leaving the attribute as written. */
  addSourceTransform: (transform: SourceTransform) => void transforms.push(transform),
  evaluate,
  parse: hostParse,
  process: processNode,
  /** Upstream's older name for `process`. */
  processNode,
  cleanup,
  /** The part of upstream's `internals` that pages and tests reach for. */
  internals: { runtime: { cleanup, processNode } },
  version: '0.0.0-spike',
});

/** Install as `window._hyperscript` and initialise the document once it is ready. */
export function boot(): void {
  Object.assign(globalThis, { _hyperscript: api });
  if (typeof document === 'undefined') return;
  const start = () => {
    processNode(document.documentElement);
    document.dispatchEvent(new Event('hyperscript:ready'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start);
}
