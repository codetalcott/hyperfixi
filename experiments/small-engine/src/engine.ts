/**
 * The engine: one grammar, DOM initialisation, and the public `_hyperscript` API.
 *
 * A bundle builds its engine by calling `use(...)` with the modules it wants.
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
  triggerEvent,
} from './runtime';
import { commandList, program } from './statements';
import { tokenize } from './tokenizer';
import { get, then1 } from './util';

export type Module = (g: Grammar) => void;

export const grammar = createGrammar();

export function use(...modules: Module[]): void {
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

function initElement(elt: Element): void {
  if (elt.closest(config.disableSelector)) return;
  const src = scriptOf(elt);
  if (!src) return;
  const scriptHash = hash(src);
  if (peekData(elt)?.initialized) {
    if (peekData(elt)?.scriptHash === scriptHash) return;
    // The script changed under us (a morph, an attribute write): start over.
    cleanup(elt);
  }
  if (!triggerEvent(elt, 'hyperscript:before:init')) return;
  Object.assign(dataOf(elt), { initialized: true, scriptHash });
  // A script tag's features belong to the document body.
  const target = isScript(elt) ? document.body : elt;
  try {
    for (const feature of parseProgram(src).features) feature.install(target, elt);
    elt.setAttribute('data-hyperscript-powered', 'true');
    triggerEvent(elt, 'hyperscript:after:init');
    setTimeout(() => triggerEvent(target, 'load', { hyperscript: true }), 1);
  } catch (e) {
    if (e instanceof ParseError) {
      triggerEvent(elt, 'hyperscript:parse-error', { errors: [e] });
      console.error('hyperscript: 1 parse error(s) on:', elt, '\n\n' + formatError(e));
    } else {
      triggerEvent(elt, 'exception', { error: e });
      console.error('hyperscript errors were found on the following element:', elt, '\n\n', e);
    }
  }
}

/** Initialise every scripted element in a subtree. Elements already initialised are skipped. */
export function processNode(node: unknown): void {
  if (!(node instanceof Element || node instanceof Document || node instanceof DocumentFragment)) return;
  const selector = attributes().map(a => `[${a}]`).join(', ') + ", [type='text/hyperscript']";
  if (node instanceof Element && node.matches(selector)) initElement(node);
  node.querySelectorAll(selector).forEach(initElement);
}

/** Remove everything an element's script installed: listeners, observers, timers, state. */
export function cleanup(elt: Element): void {
  const data = peekData(elt);
  if (!data) return;
  triggerEvent(elt, 'hyperscript:before:cleanup');
  for (const { target, event, handler } of data.listeners ?? []) target.removeEventListener(event, handler);
  for (const observer of data.observers ?? []) observer.disconnect();
  for (const timer of data.timers ?? []) clearTimeout(timer);
  elt.querySelectorAll('[data-hyperscript-powered]').forEach(cleanup);
  triggerEvent(elt, 'hyperscript:after:cleanup');
  elt.removeAttribute('data-hyperscript-powered');
  dropData(elt);
}

host.process = processNode;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = Object.assign(evaluate, {
  // Upstream's shape: `config.conversions.Foo = …` and `config.conversions.dynamicResolvers.push(…)`.
  config: Object.assign(config, { conversions: Object.assign(conversions, { dynamicResolvers }) }),
  use,
  evaluate,
  parse,
  process: processNode,
  /** Upstream's older name for `process`. */
  processNode,
  cleanup,
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
