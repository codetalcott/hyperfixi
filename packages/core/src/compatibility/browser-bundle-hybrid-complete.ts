/**
 * HyperFixi Hybrid Complete Browser Bundle
 *
 * Combines the best of both hybrid approaches:
 * - Full recursive descent parser with operator precedence (from Hybrid)
 * - Event modifiers: .once, .prevent, .stop, .debounce, .throttle (from Hybrid Lite)
 * - While loops, fetch blocks (from Hybrid Lite)
 * - i18n alias system (from Hybrid Lite)
 * - Smart hybrid detection for fast regex path (from Hybrid Lite)
 * - Positional expressions, function calls (from Hybrid)
 * - HTML selector syntax <button.class/> (from Hybrid)
 *
 * Target: ~7-8 KB gzipped (~85% hyperscript coverage)
 *
 * Now uses modular parser components for better tree-shaking.
 */

// =============================================================================
// MODULAR PARSER IMPORTS (tree-shakeable)
// =============================================================================

import { HybridParser } from '../parser/hybrid/parser-core';
import { tokenize } from '../parser/hybrid/tokenizer';
import type { ASTNode, CommandNode, BlockNode, EventNode } from '../parser/hybrid/ast-types';
import { addCommandAliases, addEventAliases } from '../parser/hybrid/aliases';

// =============================================================================
// RUNTIME (stays inline - specific to this bundle)
// =============================================================================

export interface Context {
  me: Element;
  event?: Event;
  it?: any;
  you?: Element;
  locals: Map<string, any>;
  globals: Map<string, any>;
}

const globalVars = new Map<string, any>();
const MAX_LOOP_ITERATIONS = 1000;

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
      if (node.value in (window as any)) return (window as any)[node.value];
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

    case 'unary':
      const operand = await evaluate(node.operand, ctx);
      return node.operator === 'not' ? !operand : operand;

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
        const prop = node.callee.computed
          ? await evaluate(node.callee.property, ctx)
          : node.callee.property;
        callee = callContext?.[prop];
      } else {
        callee = await evaluate(node.callee, ctx);
      }

      const args = await Promise.all(node.args.map((a: ASTNode) => evaluate(a, ctx)));
      if (typeof callee === 'function') return callee.apply(callContext, args);
      return undefined;
    }

    case 'positional':
      return evaluatePositional(node, ctx);

    case 'object':
      const result: Record<string, any> = {};
      for (const prop of node.properties) {
        result[prop.key] = await evaluate(prop.value, ctx);
      }
      return result;

    case 'array':
      return Promise.all(node.elements.map((e: ASTNode) => evaluate(e, ctx)));

    default:
      return undefined;
  }
}

async function evaluateBinary(node: ASTNode, ctx: Context): Promise<any> {
  if (node.operator === 'has') {
    const left = await evaluate(node.left, ctx);
    if (left instanceof Element) {
      if (node.right.type === 'selector' && node.right.value.startsWith('.')) {
        return left.classList.contains(node.right.value.slice(1));
      }
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
    case '%':
      return left % right;
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
    case 'has':
      if (left instanceof Element) {
        const selector = typeof right === 'string' ? right : right?.value;
        if (typeof selector === 'string' && selector.startsWith('.')) {
          return left.classList.contains(selector.slice(1));
        }
      }
      return false;
    case 'contains':
    case 'includes':
      if (typeof left === 'string') return left.includes(right);
      if (Array.isArray(left)) return left.includes(right);
      if (left instanceof Element) return left.contains(right);
      return false;
    case 'matches':
      if (left instanceof Element) return left.matches(right);
      if (typeof left === 'string') return new RegExp(right).test(left);
      return false;
    default:
      return undefined;
  }
}

function evaluatePositional(node: ASTNode, ctx: Context): Element | null {
  const target = node.target;
  let elements: Element[] = [];

  let selector: string | null = null;
  if (target.type === 'selector') {
    selector = target.value;
  } else if (target.type === 'identifier') {
    selector = target.value;
  } else if (target.type === 'htmlSelector') {
    selector = target.value;
  }
  if (selector) {
    elements = Array.from(document.querySelectorAll(selector));
  }

  switch (node.position) {
    case 'first':
      return elements[0] || null;
    case 'last':
      return elements[elements.length - 1] || null;
    case 'next':
      return ctx.me.nextElementSibling;
    case 'previous':
      return ctx.me.previousElementSibling;
    case 'closest':
      return target.value ? ctx.me.closest(target.value) : null;
    case 'parent':
      return ctx.me.parentElement;
    default:
      return elements[0] || null;
  }
}

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

  const toElementArray = (val: any): Element[] => {
    if (Array.isArray(val)) return val.filter(e => e instanceof Element);
    if (val instanceof Element) return [val];
    if (typeof val === 'string') return Array.from(document.querySelectorAll(val));
    return [];
  };

  const isStyleProp = (prop: string) => prop.startsWith('*');
  const getStyleName = (prop: string) => prop.substring(1);
  const setStyleProp = (el: Element, prop: string, value: any): boolean => {
    if (!isStyleProp(prop)) return false;
    (el as HTMLElement).style.setProperty(getStyleName(prop), String(value));
    return true;
  };
  const getStyleProp = (el: Element, prop: string): string | undefined => {
    if (!isStyleProp(prop)) return undefined;
    return getComputedStyle(el as HTMLElement).getPropertyValue(getStyleName(prop));
  };

  switch (cmd.name) {
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

    case 'removeClass': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.remove(className);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }

    case 'remove': {
      const targets = await getTarget();
      for (const el of targets) el.remove();
      return null;
    }

    case 'put': {
      const content = await evaluate(cmd.args[0], ctx);
      const modifier = cmd.modifier || 'into';

      if (cmd.target?.type === 'possessive' && isStyleProp(cmd.target.property)) {
        const obj = await evaluate(cmd.target.object, ctx);
        const elements = toElementArray(obj);
        for (const el of elements) {
          setStyleProp(el, cmd.target.property, content);
        }
        ctx.it = content;
        return content;
      }

      const targets = await getTarget();
      for (const el of targets) {
        const html = String(content);
        if (modifier === 'into') el.innerHTML = html;
        else if (modifier === 'before') el.insertAdjacentHTML('beforebegin', html);
        else if (modifier === 'after') el.insertAdjacentHTML('afterend', html);
        else if (modifier === 'at start of') el.insertAdjacentHTML('afterbegin', html);
        else if (modifier === 'at end of') el.insertAdjacentHTML('beforeend', html);
      }
      ctx.it = content;
      return content;
    }

    case 'append': {
      const content = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      for (const el of targets) el.insertAdjacentHTML('beforeend', String(content));
      ctx.it = content;
      return content;
    }

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
          if (obj instanceof Element && setStyleProp(obj, target.property, value)) {
            ctx.it = value;
            return value;
          }
          (obj as any)[target.property] = value;
          ctx.it = value;
          return value;
        }
      }

      ctx.it = value;
      return value;
    }

    case 'get': {
      const value = await evaluate(cmd.args[0], ctx);
      ctx.it = value;
      return value;
    }

    case 'call': {
      const result = await evaluate(cmd.args[0], ctx);
      ctx.it = result;
      return result;
    }

    case 'log': {
      const values = await Promise.all(cmd.args.map(a => evaluate(a, ctx)));
      console.log(...values);
      return values[0];
    }

    case 'send': {
      const eventName = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      const event = new CustomEvent(String(eventName), { bubbles: true, detail: ctx.it });
      for (const el of targets) el.dispatchEvent(event);
      ctx.it = event;
      return event;
    }

    case 'wait': {
      const duration = await evaluate(cmd.args[0], ctx);
      const ms = typeof duration === 'number' ? duration : parseInt(String(duration));
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    }

    case 'waitFor': {
      const eventName = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      const target = targets[0] || ctx.me;
      return new Promise(resolve => {
        target.addEventListener(
          String(eventName),
          e => {
            ctx.it = e;
            resolve(e);
          },
          { once: true }
        );
      });
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

    case 'take': {
      const className = getClassName(await evaluate(cmd.args[0], ctx));
      const from = cmd.target ? await getTarget() : [ctx.me.parentElement!];
      for (const container of from) {
        const siblings = container.querySelectorAll('.' + className);
        siblings.forEach(el => el.classList.remove(className));
      }
      ctx.me.classList.add(className);
      return ctx.me;
    }

    case 'increment':
    case 'decrement': {
      const target = cmd.args[0];
      const amount = await evaluate(cmd.args[1], ctx);
      const delta = cmd.name === 'increment' ? amount : -amount;

      if (target.type === 'variable') {
        const varName = target.name.slice(1);
        const map = target.scope === 'local' ? ctx.locals : globalVars;
        const current = map.get(varName) || 0;
        const newVal = current + delta;
        map.set(varName, newVal);
        ctx.it = newVal;
        return newVal;
      }

      if (target.type === 'possessive' && isStyleProp(target.property)) {
        const obj = await evaluate(target.object, ctx);
        const elements = toElementArray(obj);
        for (const el of elements) {
          const current = parseFloat(getStyleProp(el, target.property) || '0') || 0;
          const newVal = current + delta;
          setStyleProp(el, target.property, newVal);
          ctx.it = newVal;
        }
        return ctx.it;
      }

      const elements = toElementArray(await evaluate(target, ctx));
      for (const el of elements) {
        const current = parseFloat(el.textContent || '0') || 0;
        const newVal = current + delta;
        el.textContent = String(newVal);
        ctx.it = newVal;
      }
      return ctx.it;
    }

    case 'focus': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).focus();
      return targets;
    }

    case 'blur': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).blur();
      return targets;
    }

    case 'go': {
      const dest = await evaluate(cmd.args[0], ctx);
      const d = String(dest).toLowerCase();
      if (d === 'back') history.back();
      else if (d === 'forward') history.forward();
      else window.location.href = String(dest);
      return null;
    }

    case 'return': {
      const value = cmd.args[0] ? await evaluate(cmd.args[0], ctx) : ctx.it;
      throw { type: 'return', value };
    }

    default:
      console.warn(`Unknown command: ${cmd.name}`);
      return null;
  }
}

async function executeSeqPropagateReturn(nodes: ASTNode[], ctx: Context): Promise<any> {
  try {
    return await executeSequence(nodes, ctx);
  } catch (e: any) {
    if (e?.type === 'return') throw e;
    throw e;
  }
}

async function executeBlock(block: BlockNode, ctx: Context): Promise<any> {
  switch (block.type) {
    case 'if': {
      const condition = await evaluate(block.condition!, ctx);
      if (condition) return executeSeqPropagateReturn(block.body, ctx);
      else if (block.elseBody) return executeSeqPropagateReturn(block.elseBody, ctx);
      return null;
    }

    case 'repeat': {
      const count = await evaluate(block.condition!, ctx);
      const n = typeof count === 'number' ? count : parseInt(String(count));
      for (let i = 0; i < n && i < MAX_LOOP_ITERATIONS; i++) {
        ctx.locals.set('__loop_index__', i);
        ctx.locals.set('__loop_count__', i + 1);
        await executeSeqPropagateReturn(block.body, ctx);
      }
      return null;
    }

    case 'for': {
      const { variable, iterable } = block.condition as any;
      const items = await evaluate(iterable, ctx);
      const arr = Array.isArray(items)
        ? items
        : items instanceof NodeList
          ? Array.from(items)
          : [items];
      const varName = variable.startsWith(':') ? variable.slice(1) : variable;
      for (let i = 0; i < arr.length && i < MAX_LOOP_ITERATIONS; i++) {
        ctx.locals.set(varName, arr[i]);
        ctx.locals.set('__loop_index__', i);
        ctx.locals.set('__loop_count__', i + 1);
        await executeSeqPropagateReturn(block.body, ctx);
      }
      return null;
    }

    case 'while': {
      let iterations = 0;
      while ((await evaluate(block.condition!, ctx)) && iterations < MAX_LOOP_ITERATIONS) {
        ctx.locals.set('__loop_index__', iterations);
        await executeSeqPropagateReturn(block.body, ctx);
        iterations++;
      }
      return null;
    }

    case 'fetch': {
      const { url, responseType } = block.condition as any;
      try {
        const urlVal = await evaluate(url, ctx);
        const response = await fetch(String(urlVal));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const resType = await evaluate(responseType, ctx);
        let data: any;
        if (resType === 'json') data = await response.json();
        else if (resType === 'html') {
          const text = await response.text();
          const doc = new DOMParser().parseFromString(text, 'text/html');
          data = doc.body.innerHTML;
        } else data = await response.text();

        ctx.it = data;
        ctx.locals.set('it', data);
        ctx.locals.set('result', data);
        ctx.locals.set('response', response);

        await executeSeqPropagateReturn(block.body, ctx);
      } catch (error: any) {
        if (error?.type === 'return') throw error;
        ctx.locals.set('error', error);
        console.error('Fetch error:', error);
      }
      return null;
    }

    default:
      return null;
  }
}

async function executeSequence(nodes: ASTNode[], ctx: Context): Promise<any> {
  let result: any;
  for (const node of nodes) {
    if (node.type === 'command') result = await executeCommand(node as CommandNode, ctx);
    else if (['if', 'repeat', 'for', 'while', 'fetch'].includes(node.type)) {
      result = await executeBlock(node as BlockNode, ctx);
    }
  }
  return result;
}

async function executeAST(ast: ASTNode, me: Element, event?: Event): Promise<any> {
  const ctx: Context = { me, event, locals: new Map(), globals: globalVars };

  if (ast.type === 'sequence') return executeSequence(ast.commands, ctx);

  if (ast.type === 'event') {
    const eventNode = ast as EventNode;
    const eventName = eventNode.event;

    if (eventName.startsWith('interval:')) {
      const interval = eventName.split(':')[1];
      const ms = interval.endsWith('ms')
        ? parseInt(interval)
        : interval.endsWith('s')
          ? parseFloat(interval) * 1000
          : parseInt(interval);
      setInterval(async () => {
        const intervalCtx: Context = { me, locals: new Map(), globals: globalVars };
        try {
          await executeSequence(eventNode.body, intervalCtx);
        } catch (err: any) {
          if (err?.type !== 'return') throw err;
        }
      }, ms);
      return;
    }

    if (eventName === 'init') {
      try {
        await executeSequence(eventNode.body, ctx);
      } catch (err: any) {
        if (err?.type !== 'return') throw err;
      }
      return;
    }

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
        globals: globalVars,
      };
      try {
        await executeSequence(eventNode.body, handlerCtx);
      } catch (err: any) {
        if (err?.type === 'return') return err.value;
        throw err;
      }
    };

    if (mods.debounce) {
      let timeout: any;
      const orig = handler;
      handler = async (e: Event) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => orig(e), mods.debounce);
      };
    }

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
// DOM PROCESSOR
// =============================================================================

function processElement(el: Element): void {
  const code = el.getAttribute('_');
  if (!code) return;

  try {
    const parser = new HybridParser(code);
    const ast = parser.parse();
    console.log('HyperFixi AST:', JSON.stringify(ast, null, 2).slice(0, 500));
    executeAST(ast, el);
  } catch (err) {
    console.error('HyperFixi Hybrid Complete error:', err, 'Code:', code);
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
  version: '1.0.0-hybrid-complete',

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

  init: processElements,
  process: processElements,

  addAliases: addCommandAliases,
  addEventAliases: addEventAliases,

  tokenize,
  evaluate,

  commands: [
    'toggle',
    'add',
    'remove',
    'put',
    'append',
    'set',
    'get',
    'call',
    'log',
    'send',
    'trigger',
    'wait',
    'show',
    'hide',
    'transition',
    'take',
    'increment',
    'decrement',
    'focus',
    'blur',
    'go',
    'return',
  ],

  blocks: ['if', 'else', 'unless', 'repeat', 'for', 'while', 'fetch'],
};

// =============================================================================
// AUTO-INITIALIZE
// =============================================================================

if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
}

export default api;
