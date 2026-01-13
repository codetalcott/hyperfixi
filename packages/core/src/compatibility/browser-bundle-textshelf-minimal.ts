/**
 * HyperFixi TextShelf Minimal Bundle
 *
 * Ultra-lightweight bundle following the hybrid-complete pattern.
 * Only includes 10 commands TextShelf actually uses.
 *
 * Commands (10):
 * - DOM: add, remove, toggle, show, hide
 * - Animation: transition
 * - Data: set
 * - Async: wait
 * - Navigation: go
 * - Execution: call
 *
 * Target: ~5 KB gzipped (vs 7 KB hybrid-complete)
 *
 * Features:
 * - HTMX integration (htmx:afterSettle re-processing)
 * - Drop-in _hyperscript compatibility
 * - Modular parser for tree-shaking
 */

// =============================================================================
// MODULAR PARSER IMPORTS (tree-shakeable)
// =============================================================================

import { HybridParser } from '../parser/hybrid/parser-core';
import type { ASTNode, CommandNode, EventNode } from '../parser/hybrid/ast-types';

// =============================================================================
// RUNTIME (minimal inline version)
// =============================================================================

interface Context {
  me: Element;
  event?: Event;
  it?: any;
  you?: Element;
  locals: Map<string, any>;
}

const globalVars = new Map<string, any>();

async function evaluate(node: ASTNode, ctx: Context): Promise<any> {
  switch (node.type) {
    case 'literal':
      return node.value;

    case 'identifier':
      if (node.value === 'me' || node.value === 'my') return ctx.me;
      if (node.value === 'it') return ctx.it;
      if (node.value === 'you') return ctx.you;
      if (node.value === 'event') return ctx.event;
      if (node.value === 'body') return document.body;
      if (node.value === 'document') return document;
      if (node.value === 'window') return window;
      if (ctx.locals.has(node.value)) return ctx.locals.get(node.value);
      if (node.value in (ctx.me as any)) return (ctx.me as any)[node.value];
      return node.value;

    case 'variable':
      if (node.scope === 'local') return ctx.locals.get(node.name.slice(1));
      const gName = node.name.slice(1);
      if (globalVars.has(gName)) return globalVars.get(gName);
      return (window as any)[node.name];

    case 'selector':
      const elements = document.querySelectorAll(node.value);
      return elements.length === 1 ? elements[0] : Array.from(elements);

    case 'binary':
      return evaluateBinary(node, ctx);

    case 'possessive':
    case 'member':
      const obj = await evaluate(node.object, ctx);
      if (obj == null) return undefined;
      const prop = node.computed ? await evaluate(node.property, ctx) : node.property;
      return obj[prop];

    case 'call': {
      let callContext: any = null;
      let callee: any;

      if (node.callee.type === 'member' || node.callee.type === 'possessive') {
        callContext = await evaluate(node.callee.object, ctx);
        const p = node.callee.computed
          ? await evaluate(node.callee.property, ctx)
          : node.callee.property;
        callee = callContext?.[p];
      } else {
        callee = await evaluate(node.callee, ctx);
      }

      const args = await Promise.all(node.args.map((a: ASTNode) => evaluate(a, ctx)));
      if (typeof callee === 'function') return callee.apply(callContext, args);
      return undefined;
    }

    default:
      return undefined;
  }
}

async function evaluateBinary(node: ASTNode, ctx: Context): Promise<any> {
  if (node.operator === 'has') {
    const left = await evaluate(node.left, ctx);
    if (
      left instanceof Element &&
      node.right.type === 'selector' &&
      node.right.value.startsWith('.')
    ) {
      return left.classList.contains(node.right.value.slice(1));
    }
    return false;
  }

  const left = await evaluate(node.left, ctx);
  const right = await evaluate(node.right, ctx);

  switch (node.operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    case '==':
    case 'is':
      return left == right;
    case '!=':
    case 'is not':
      return left != right;
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    case 'and':
    case '&&':
      return left && right;
    case 'or':
    case '||':
      return left || right;
    default:
      return undefined;
  }
}

// =============================================================================
// COMMAND EXECUTOR (only 10 commands TextShelf needs)
// =============================================================================

async function executeCommand(cmd: CommandNode, ctx: Context): Promise<any> {
  const getTarget = async (): Promise<Element[]> => {
    if (!cmd.target) return [ctx.me];
    const t = await evaluate(cmd.target, ctx);
    if (Array.isArray(t)) return t;
    if (t instanceof Element) return [t];
    if (typeof t === 'string') return Array.from(document.querySelectorAll(t));
    return [ctx.me];
  };

  const getClassName = (node: any): string => {
    if (!node) return '';
    if (node.type === 'selector') return node.value.slice(1);
    if (node.type === 'string' || node.type === 'literal') {
      const val = node.value;
      return typeof val === 'string' && val.startsWith('.') ? val.slice(1) : String(val);
    }
    if (node.type === 'identifier') return node.value;
    return '';
  };

  switch (cmd.name) {
    // DOM Commands
    case 'toggle': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.toggle(className);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }

    case 'add': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.add(className);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }

    case 'remove': {
      const targets = await getTarget();
      for (const el of targets) el.remove();
      return null;
    }

    case 'removeClass': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.remove(className);
      return targets;
    }

    case 'show': {
      const targets = await getTarget();
      for (const el of targets) {
        (el as HTMLElement).style.display = '';
        el.classList.remove('hidden');
      }
      return targets;
    }

    case 'hide': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).style.display = 'none';
      return targets;
    }

    // Data Commands
    case 'set': {
      const target = cmd.args[0];
      const value = await evaluate(cmd.args[1], ctx);

      if (target.type === 'variable') {
        const varName = target.name.slice(1);
        const map = target.scope === 'local' ? ctx.locals : globalVars;
        map.set(varName, value);
        ctx.it = value;
        return value;
      }

      if (target.type === 'possessive' || target.type === 'member') {
        const obj = await evaluate(target.object, ctx);
        if (obj) {
          (obj as any)[target.property] = value;
          ctx.it = value;
          return value;
        }
      }

      ctx.it = value;
      return value;
    }

    // Async Commands
    case 'wait': {
      const duration = await evaluate(cmd.args[0], ctx);
      const ms = typeof duration === 'number' ? duration : parseInt(String(duration));
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    }

    // Animation Commands
    case 'transition': {
      const property = String(await evaluate(cmd.args[0], ctx)).replace(/^\*/, '');
      const toValue = await evaluate(cmd.args[1], ctx);
      const durationVal = await evaluate(cmd.args[2], ctx);
      const duration =
        typeof durationVal === 'number'
          ? durationVal
          : String(durationVal).endsWith('ms')
            ? parseInt(String(durationVal))
            : String(durationVal).endsWith('s')
              ? parseFloat(String(durationVal)) * 1000
              : parseInt(String(durationVal)) || 300;

      const targets = await getTarget();
      const promises: Promise<void>[] = [];

      for (const el of targets) {
        const htmlEl = el as HTMLElement;
        const kebabProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();

        const oldTransition = htmlEl.style.transition;
        htmlEl.style.transition = `${kebabProp} ${duration}ms ease`;
        htmlEl.style.setProperty(kebabProp, String(toValue));

        promises.push(
          new Promise<void>(resolve => {
            const cleanup = () => {
              htmlEl.style.transition = oldTransition;
              resolve();
            };

            const onEnd = (e: TransitionEvent) => {
              if (e.propertyName === kebabProp) {
                htmlEl.removeEventListener('transitionend', onEnd);
                cleanup();
              }
            };

            htmlEl.addEventListener('transitionend', onEnd);
            setTimeout(cleanup, duration + 50);
          })
        );
      }

      await Promise.all(promises);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }

    // Navigation Commands
    case 'go': {
      const dest = await evaluate(cmd.args[0], ctx);
      const d = String(dest).toLowerCase();
      if (d === 'back') history.back();
      else if (d === 'forward') history.forward();
      else if (d === 'bottom') ctx.me.scrollIntoView({ block: 'end', behavior: 'smooth' });
      else if (d === 'top') ctx.me.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else window.location.href = String(dest);
      return null;
    }

    // Execution Commands
    case 'call': {
      const result = await evaluate(cmd.args[0], ctx);
      ctx.it = result;
      return result;
    }

    default:
      console.warn(`TextShelf bundle: Unknown command '${cmd.name}'`);
      return null;
  }
}

// =============================================================================
// SEQUENCE EXECUTOR
// =============================================================================

async function executeSequence(nodes: ASTNode[], ctx: Context): Promise<any> {
  let result: any;
  for (const node of nodes) {
    if (node.type === 'command') {
      result = await executeCommand(node as CommandNode, ctx);
    }
  }
  return result;
}

async function executeAST(ast: ASTNode, me: Element, event?: Event): Promise<any> {
  const ctx: Context = { me, event, locals: new Map() };

  if (ast.type === 'sequence') {
    return executeSequence(ast.commands, ctx);
  }

  if (ast.type === 'event') {
    const eventNode = ast as EventNode;
    const eventName = eventNode.event;

    // Handle init
    if (eventName === 'init') {
      await executeSequence(eventNode.body, ctx);
      return;
    }

    // Handle regular events
    const target = eventNode.filter ? await evaluate(eventNode.filter, ctx) : me;
    const targetEl = target instanceof Element ? target : me;
    const mods = eventNode.modifiers;

    let handler = async (e: Event) => {
      if (mods.prevent) e.preventDefault();
      if (mods.stop) e.stopPropagation();

      const handlerCtx: Context = {
        me,
        event: e,
        you: e.target instanceof Element ? e.target : undefined,
        locals: new Map(),
      };
      await executeSequence(eventNode.body, handlerCtx);
    };

    // Debounce modifier
    if (mods.debounce) {
      let timeout: any;
      const orig = handler;
      handler = async (e: Event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => orig(e), mods.debounce);
      };
    }

    // Throttle modifier
    if (mods.throttle) {
      let lastCall = 0;
      const orig = handler;
      handler = async (e: Event) => {
        const now = Date.now();
        if (now - lastCall >= mods.throttle!) {
          lastCall = now;
          await orig(e);
        }
      };
    }

    targetEl.addEventListener(eventName, handler, { once: !!mods.once });
    return;
  }

  return null;
}

// =============================================================================
// DOM PROCESSOR (with HTMX integration)
// =============================================================================

function processElement(el: Element): void {
  const code = el.getAttribute('_');
  if (!code) return;

  try {
    const parser = new HybridParser(code);
    const ast = parser.parse();
    executeAST(ast, el);
  } catch (err) {
    console.error('HyperFixi TextShelf error:', err, 'Code:', code);
  }
}

function processElements(root: Element | Document = document): void {
  const elements = root.querySelectorAll('[_]');
  elements.forEach(processElement);
}

// =============================================================================
// PUBLIC API
// =============================================================================

const api = {
  version: '1.0.0-textshelf-minimal',

  parse(code: string): ASTNode {
    const parser = new HybridParser(code);
    return parser.parse();
  },

  async execute(code: string, element?: Element): Promise<any> {
    const me = element || document.body;
    const parser = new HybridParser(code);
    const ast = parser.parse();
    return executeAST(ast, me);
  },

  run: async (code: string, element?: Element) => api.execute(code, element),
  eval: async (code: string, element?: Element) => api.execute(code, element),

  init: processElements,
  process: processElements,

  commands: ['toggle', 'add', 'remove', 'show', 'hide', 'transition', 'set', 'wait', 'go', 'call'],
  parserName: 'hybrid',
};

// =============================================================================
// AUTO-INITIALIZE (with HTMX integration)
// =============================================================================

if (typeof window !== 'undefined') {
  // Expose as hyperfixi
  (window as any).hyperfixi = api;

  // Also expose as _hyperscript for drop-in compatibility
  (window as any)._hyperscript = api;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }

  // Re-process on HTMX content swaps (critical for TextShelf!)
  document.addEventListener('htmx:afterSettle', (e: Event) => {
    const target = (e as CustomEvent).detail?.target;
    if (target) {
      processElements(target);
    }
  });
}

export default api;
export { api, processElements };
