/**
 * HyperFixi Modular Standard Browser Bundle
 *
 * This bundle demonstrates the modular parser adapter architecture.
 * It uses the extracted StandardParser (~1,000 lines) instead of the
 * full parser (~3,860 lines), providing significant bundle size savings.
 *
 * Features:
 * - 22 commands (toggle, add, remove, set, show, hide, wait, etc.)
 * - Full expression parser with operator precedence
 * - Block commands (if/else, repeat, for, while, fetch)
 * - Event modifiers (.once, .prevent, .debounce, .throttle)
 * - Chained commands with then/and
 *
 * Target size: ~15-20 KB gzipped (vs ~25 KB for full bundle)
 */

import { createStandardParser } from '../parser/adapters/parser-standard';
import type { ParseResult } from '../parser/adapters/parser-adapter';

// ============== TYPES ==============

interface HyperFixiConfig {
  autoInit?: boolean;
  attributeName?: string;
  debug?: boolean;
}

interface ASTNode {
  type: string;
  [key: string]: unknown;
}

interface CompiledHandler {
  event: string;
  modifiers: EventModifiers;
  execute: (event: Event) => Promise<void>;
}

interface EventModifiers {
  once?: boolean;
  prevent?: boolean;
  stop?: boolean;
  debounce?: number;
  throttle?: number;
}

// ============== PARSER ==============

const parser = createStandardParser();

function parse(code: string): ParseResult {
  return parser.parse(code);
}

// ============== RUNTIME ==============

class ModularRuntime {
  private config: HyperFixiConfig;
  private handlers = new WeakMap<Element, CompiledHandler[]>();

  constructor(config: HyperFixiConfig = {}) {
    this.config = {
      autoInit: true,
      attributeName: '_',
      debug: false,
      ...config,
    };
  }

  init(): void {
    const attr = this.config.attributeName!;
    const elements = document.querySelectorAll(`[${attr}]`);

    elements.forEach((el) => {
      const code = el.getAttribute(attr);
      if (code) {
        this.processElement(el as HTMLElement, code);
      }
    });

    // Watch for new elements
    this.setupMutationObserver();
  }

  private setupMutationObserver(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            const code = el.getAttribute(this.config.attributeName!);
            if (code) {
              this.processElement(el, code);
            }
            // Check children
            el.querySelectorAll(`[${this.config.attributeName}]`).forEach(
              (child) => {
                const childCode = child.getAttribute(this.config.attributeName!);
                if (childCode) {
                  this.processElement(child as HTMLElement, childCode);
                }
              }
            );
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  private processElement(element: HTMLElement, code: string): void {
    const result = parse(code);

    if (!result.success || !result.node) {
      if (this.config.debug) {
        console.error('HyperFixi parse error:', result.error?.message, 'in:', code);
      }
      return;
    }

    this.attachHandlers(element, result.node);
  }

  private attachHandlers(element: HTMLElement, node: ASTNode): void {
    if (node.type === 'eventHandler') {
      this.attachEventHandler(element, node);
    } else if (node.type === 'init') {
      // Execute init immediately
      const context = this.createContext(element, new CustomEvent('init'));
      this.executeCommands(node.body as ASTNode[], context);
    } else if (node.type === 'script' && Array.isArray(node.handlers)) {
      // Multiple handlers
      for (const handler of node.handlers) {
        this.attachHandlers(element, handler as ASTNode);
      }
    }
  }

  private attachEventHandler(element: HTMLElement, node: ASTNode): void {
    const eventName = node.event as string;
    const modifiers = this.parseModifiers(node.modifiers as string[] | undefined);
    const source = node.source as ASTNode | undefined;
    const body = node.body as ASTNode[];

    // Determine event target
    let target: EventTarget = element;
    if (source) {
      if (source.type === 'identifier') {
        const value = (source as any).value;
        if (value === 'window') target = window;
        else if (value === 'document') target = document;
      }
    }

    // Create handler
    const handler = async (event: Event) => {
      if (modifiers.prevent) event.preventDefault();
      if (modifiers.stop) event.stopPropagation();

      const context = this.createContext(element, event);
      await this.executeCommands(body, context);
    };

    // Apply modifiers
    const finalHandler = this.applyModifiers(handler, modifiers);

    target.addEventListener(eventName, finalHandler, {
      once: modifiers.once,
    });
  }

  private parseModifiers(mods?: string[]): EventModifiers {
    const result: EventModifiers = {};
    if (!mods) return result;

    for (const mod of mods) {
      if (mod === 'once') result.once = true;
      else if (mod === 'prevent') result.prevent = true;
      else if (mod === 'stop') result.stop = true;
      else if (mod.startsWith('debounce(')) {
        result.debounce = parseInt(mod.slice(9, -1), 10);
      } else if (mod.startsWith('throttle(')) {
        result.throttle = parseInt(mod.slice(9, -1), 10);
      }
    }

    return result;
  }

  private applyModifiers(
    handler: (event: Event) => Promise<void>,
    modifiers: EventModifiers
  ): (event: Event) => void {
    let fn = handler;

    if (modifiers.debounce) {
      const delay = modifiers.debounce;
      let timeout: number | undefined;
      const original = fn;
      fn = async (event: Event) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => original(event), delay);
      };
    }

    if (modifiers.throttle) {
      const delay = modifiers.throttle;
      let lastCall = 0;
      const original = fn;
      fn = async (event: Event) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          original(event);
        }
      };
    }

    return (event: Event) => {
      fn(event);
    };
  }

  private createContext(element: HTMLElement, event: Event): ExecutionContext {
    return {
      me: element,
      event,
      it: undefined,
      result: undefined,
      locals: new Map(),
      globals: new Map(),
    };
  }

  private async executeCommands(
    commands: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    for (const cmd of commands) {
      await this.executeNode(cmd, context);
    }
  }

  private async executeNode(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    switch (node.type) {
      case 'command':
        return this.executeCommand(node, context);

      case 'if':
        return this.executeIf(node, context);

      case 'repeat':
        return this.executeRepeat(node, context);

      case 'for':
        return this.executeFor(node, context);

      case 'while':
        return this.executeWhile(node, context);

      case 'fetch':
        return this.executeFetch(node, context);

      default:
        if (this.config.debug) {
          console.warn('Unknown node type:', node.type);
        }
        return undefined;
    }
  }

  private async executeCommand(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const name = node.name as string;
    const args = node.args as ASTNode[];
    const target = node.target as ASTNode | undefined;

    switch (name) {
      case 'toggle':
        return this.cmdToggle(args, target, context);
      case 'add':
        return this.cmdAdd(args, target, context);
      case 'remove':
        return this.cmdRemove(args, target, context);
      case 'set':
        return this.cmdSet(args, context);
      case 'put':
        return this.cmdPut(node, context);
      case 'append':
        return this.cmdAppend(args, target, context);
      case 'show':
        return this.cmdShow(args, context);
      case 'hide':
        return this.cmdHide(args, context);
      case 'wait':
        return this.cmdWait(args);
      case 'log':
        return this.cmdLog(args, context);
      case 'call':
        return this.cmdCall(args, context);
      case 'trigger':
      case 'send':
        return this.cmdTrigger(args, target, context);
      case 'take':
        return this.cmdTake(args, target, context);
      case 'increment':
        return this.cmdIncrement(args, context);
      case 'decrement':
        return this.cmdDecrement(args, context);
      case 'focus':
        return this.cmdFocus(args, context);
      case 'blur':
        return this.cmdBlur(args, context);
      case 'go':
        return this.cmdGo(args, context);
      case 'transition':
        return this.cmdTransition(node, context);
      case 'return':
        return this.cmdReturn(args, context);
      default:
        if (this.config.debug) {
          console.warn('Unknown command:', name);
        }
        return undefined;
    }
  }

  // ============== EXPRESSION EVALUATOR ==============

  private async evaluate(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    switch (node.type) {
      case 'literal':
        return node.value;

      case 'identifier':
        return this.resolveIdentifier(node.value as string, context);

      case 'selector':
        return this.resolveSelector(node.value as string, context);

      case 'localVar':
        return context.locals.get(node.value as string);

      case 'globalVar':
        return context.globals.get(node.value as string);

      case 'binary':
        return this.evaluateBinary(node, context);

      case 'unary':
        return this.evaluateUnary(node, context);

      case 'member':
        return this.evaluateMember(node, context);

      case 'call':
        return this.evaluateCall(node, context);

      case 'possessive':
        return this.evaluatePossessive(node, context);

      case 'positional':
        return this.evaluatePositional(node, context);

      default:
        return undefined;
    }
  }

  private resolveIdentifier(name: string, context: ExecutionContext): unknown {
    switch (name) {
      case 'me':
        return context.me;
      case 'it':
        return context.it;
      case 'result':
        return context.result;
      case 'event':
        return context.event;
      case 'window':
        return window;
      case 'document':
        return document;
      case 'true':
        return true;
      case 'false':
        return false;
      case 'null':
        return null;
      case 'undefined':
        return undefined;
      default:
        return context.locals.get(name) ?? (window as any)[name];
    }
  }

  private resolveSelector(selector: string, context: ExecutionContext): Element | null {
    return document.querySelector(selector);
  }

  private async evaluateBinary(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const op = node.operator as string;
    const left = await this.evaluate(node.left as ASTNode, context);

    // Short-circuit for and/or
    if (op === 'and' && !left) return false;
    if (op === 'or' && left) return true;

    const right = await this.evaluate(node.right as ASTNode, context);

    switch (op) {
      case '+':
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);
      case '==':
      case 'is':
        return left == right;
      case '!=':
      case 'is not':
        return left != right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);
      case 'and':
        return left && right;
      case 'or':
        return left || right;
      case 'contains':
        if (typeof left === 'string') return left.includes(right as string);
        if (Array.isArray(left)) return left.includes(right);
        return false;
      case 'matches':
        if (left instanceof Element && typeof right === 'string') {
          return left.matches(right);
        }
        if (typeof left === 'string') {
          return new RegExp(right as string).test(left);
        }
        return false;
      default:
        return undefined;
    }
  }

  private async evaluateUnary(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const op = node.operator as string;
    const operand = await this.evaluate(node.operand as ASTNode, context);

    switch (op) {
      case 'not':
      case '!':
        return !operand;
      case '-':
        return -(operand as number);
      case 'exists':
        return operand != null;
      case 'is empty':
        if (typeof operand === 'string') return operand.length === 0;
        if (Array.isArray(operand)) return operand.length === 0;
        return !operand;
      default:
        return undefined;
    }
  }

  private async evaluateMember(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const obj = await this.evaluate(node.object as ASTNode, context);
    const prop = node.property as string;

    if (obj == null) return undefined;
    return (obj as any)[prop];
  }

  private async evaluateCall(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const callee = node.callee as ASTNode;
    const args = node.arguments as ASTNode[];
    const evaluatedArgs = await Promise.all(
      args.map((arg) => this.evaluate(arg, context))
    );

    if (callee.type === 'member') {
      const obj = await this.evaluate(callee.object as ASTNode, context);
      const method = callee.property as string;
      if (obj && typeof (obj as any)[method] === 'function') {
        return (obj as any)[method](...evaluatedArgs);
      }
    } else if (callee.type === 'identifier') {
      const fn = (window as any)[callee.value as string];
      if (typeof fn === 'function') {
        return fn(...evaluatedArgs);
      }
    }

    return undefined;
  }

  private async evaluatePossessive(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const owner = await this.evaluate(node.owner as ASTNode, context);
    const prop = node.property as string;

    if (owner == null) return undefined;

    // Handle my.xxx as me.xxx
    if (node.owner && (node.owner as ASTNode).type === 'identifier') {
      const ownerName = (node.owner as ASTNode).value;
      if (ownerName === 'my') {
        return (context.me as any)?.[prop];
      }
    }

    return (owner as any)[prop];
  }

  private async evaluatePositional(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<unknown> {
    const position = node.position as string;
    const target = await this.evaluate(node.target as ASTNode, context);

    if (target instanceof NodeList || Array.isArray(target)) {
      const arr = Array.from(target);
      switch (position) {
        case 'first':
          return arr[0];
        case 'last':
          return arr[arr.length - 1];
        default:
          return undefined;
      }
    }

    if (target instanceof Element) {
      switch (position) {
        case 'next':
          return target.nextElementSibling;
        case 'previous':
          return target.previousElementSibling;
        case 'parent':
          return target.parentElement;
        default:
          return undefined;
      }
    }

    return undefined;
  }

  // ============== COMMAND IMPLEMENTATIONS ==============

  private async cmdToggle(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const what = await this.evaluate(args[0], context);
    const el = target
      ? await this.evaluate(target, context)
      : context.me;

    if (el instanceof Element && typeof what === 'string') {
      if (what.startsWith('.')) {
        el.classList.toggle(what.slice(1));
      } else {
        el.classList.toggle(what);
      }
    }
  }

  private async cmdAdd(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const what = await this.evaluate(args[0], context);
    const el = target
      ? await this.evaluate(target, context)
      : context.me;

    if (el instanceof Element && typeof what === 'string') {
      const className = what.startsWith('.') ? what.slice(1) : what;
      el.classList.add(className);
    }
  }

  private async cmdRemove(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const what = await this.evaluate(args[0], context);
    const el = target
      ? await this.evaluate(target, context)
      : context.me;

    if (el instanceof Element) {
      if (typeof what === 'string') {
        const className = what.startsWith('.') ? what.slice(1) : what;
        el.classList.remove(className);
      } else if (!args[0] && !target) {
        // remove me
        el.remove();
      }
    }
  }

  private async cmdSet(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const targetNode = args[0];
    const value = await this.evaluate(args[1], context);

    if (targetNode.type === 'localVar') {
      context.locals.set(targetNode.value as string, value);
    } else if (targetNode.type === 'globalVar') {
      context.globals.set(targetNode.value as string, value);
    } else if (targetNode.type === 'member' || targetNode.type === 'possessive') {
      const obj = await this.evaluate(
        (targetNode.object || targetNode.owner) as ASTNode,
        context
      );
      const prop = targetNode.property as string;
      if (obj != null) {
        (obj as any)[prop] = value;
      }
    }
  }

  private async cmdPut(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const value = await this.evaluate(node.value as ASTNode, context);
    const target = await this.evaluate(node.target as ASTNode, context);
    const operation = node.operation as string || 'into';

    if (target instanceof Element) {
      const html = String(value);
      switch (operation) {
        case 'into':
          target.innerHTML = html;
          break;
        case 'before':
          target.insertAdjacentHTML('beforebegin', html);
          break;
        case 'after':
          target.insertAdjacentHTML('afterend', html);
          break;
        case 'at start of':
          target.insertAdjacentHTML('afterbegin', html);
          break;
        case 'at end of':
          target.insertAdjacentHTML('beforeend', html);
          break;
      }
    }
  }

  private async cmdAppend(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const what = await this.evaluate(args[0], context);
    const el = target
      ? await this.evaluate(target, context)
      : context.me;

    if (el instanceof Element) {
      el.insertAdjacentHTML('beforeend', String(what));
    }
  }

  private async cmdShow(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const el = args[0]
      ? await this.evaluate(args[0], context)
      : context.me;

    if (el instanceof HTMLElement) {
      el.style.display = '';
    }
  }

  private async cmdHide(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const el = args[0]
      ? await this.evaluate(args[0], context)
      : context.me;

    if (el instanceof HTMLElement) {
      el.style.display = 'none';
    }
  }

  private async cmdWait(args: ASTNode[]): Promise<void> {
    const duration = args[0]?.value as number || 0;
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  private async cmdLog(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const values = await Promise.all(
      args.map((arg) => this.evaluate(arg, context))
    );
    console.log(...values);
  }

  private async cmdCall(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<unknown> {
    if (args[0].type === 'call') {
      return this.evaluateCall(args[0], context);
    }
    return undefined;
  }

  private async cmdTrigger(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const eventName = args[0]?.value as string;
    const el = target
      ? await this.evaluate(target, context)
      : context.me;

    if (el instanceof Element && eventName) {
      el.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
    }
  }

  private async cmdTake(
    args: ASTNode[],
    target: ASTNode | undefined,
    context: ExecutionContext
  ): Promise<void> {
    const className = (args[0]?.value as string)?.replace(/^\./, '');
    const scope = target
      ? await this.evaluate(target, context)
      : document;

    if (scope instanceof Element || scope instanceof Document) {
      // Remove class from all siblings
      scope.querySelectorAll(`.${className}`).forEach((el) => {
        el.classList.remove(className);
      });
      // Add to me
      context.me.classList.add(className);
    }
  }

  private async cmdIncrement(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const targetNode = args[0];
    let current = await this.evaluate(targetNode, context);
    const newValue = (Number(current) || 0) + 1;

    if (targetNode.type === 'localVar') {
      context.locals.set(targetNode.value as string, newValue);
    } else if (targetNode.type === 'member') {
      const obj = await this.evaluate(targetNode.object as ASTNode, context);
      if (obj) (obj as any)[targetNode.property as string] = newValue;
    }
  }

  private async cmdDecrement(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const targetNode = args[0];
    let current = await this.evaluate(targetNode, context);
    const newValue = (Number(current) || 0) - 1;

    if (targetNode.type === 'localVar') {
      context.locals.set(targetNode.value as string, newValue);
    } else if (targetNode.type === 'member') {
      const obj = await this.evaluate(targetNode.object as ASTNode, context);
      if (obj) (obj as any)[targetNode.property as string] = newValue;
    }
  }

  private async cmdFocus(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const el = args[0]
      ? await this.evaluate(args[0], context)
      : context.me;

    if (el instanceof HTMLElement) {
      el.focus();
    }
  }

  private async cmdBlur(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    const el = args[0]
      ? await this.evaluate(args[0], context)
      : context.me;

    if (el instanceof HTMLElement) {
      el.blur();
    }
  }

  private async cmdGo(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<void> {
    if (args[0]?.type === 'identifier') {
      const target = args[0].value as string;
      if (target === 'back') {
        history.back();
      } else if (target === 'forward') {
        history.forward();
      }
    } else if (args[0]) {
      const dest = await this.evaluate(args[0], context);
      if (typeof dest === 'string') {
        location.href = dest;
      } else if (dest instanceof Element) {
        dest.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  private async cmdTransition(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const property = node.property as string;
    const value = await this.evaluate(node.value as ASTNode, context);
    const duration = (node.duration as number) || 400;
    const target = node.target
      ? await this.evaluate(node.target as ASTNode, context)
      : context.me;

    if (target instanceof HTMLElement) {
      const prevTransition = target.style.transition;
      target.style.transition = `${property} ${duration}ms`;
      (target.style as any)[property] = value;

      await new Promise<void>((resolve) => {
        const done = () => {
          target.style.transition = prevTransition;
          target.removeEventListener('transitionend', done);
          resolve();
        };
        target.addEventListener('transitionend', done, { once: true });
        // Fallback timeout
        setTimeout(done, duration + 50);
      });
    }
  }

  private async cmdReturn(
    args: ASTNode[],
    context: ExecutionContext
  ): Promise<unknown> {
    if (args[0]) {
      return this.evaluate(args[0], context);
    }
    return undefined;
  }

  // ============== CONTROL FLOW ==============

  private async executeIf(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const condition = await this.evaluate(node.condition as ASTNode, context);

    if (condition) {
      await this.executeCommands(node.body as ASTNode[], context);
    } else if (node.elseBody) {
      await this.executeCommands(node.elseBody as ASTNode[], context);
    }
  }

  private async executeRepeat(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const count = await this.evaluate(node.condition as ASTNode, context);
    const times = typeof count === 'number' ? count : 1;

    for (let i = 0; i < times; i++) {
      context.locals.set('index', i);
      await this.executeCommands(node.body as ASTNode[], context);
    }
  }

  private async executeFor(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const items = await this.evaluate(node.collection as ASTNode, context);
    const varName = node.variable as string;

    if (items && typeof items === 'object' && Symbol.iterator in items) {
      let index = 0;
      for (const item of items as Iterable<unknown>) {
        context.locals.set(varName, item);
        context.locals.set('index', index++);
        await this.executeCommands(node.body as ASTNode[], context);
      }
    }
  }

  private async executeWhile(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    while (iterations < maxIterations) {
      const condition = await this.evaluate(
        node.condition as ASTNode,
        context
      );
      if (!condition) break;

      await this.executeCommands(node.body as ASTNode[], context);
      iterations++;
    }
  }

  private async executeFetch(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<void> {
    const config = node.condition as ASTNode;
    const url = await this.evaluate(config.url as ASTNode, context);
    const responseType = config.responseType
      ? await this.evaluate(config.responseType as ASTNode, context)
      : 'text';

    try {
      const response = await fetch(String(url));

      let result: unknown;
      switch (responseType) {
        case 'json':
          result = await response.json();
          break;
        case 'html':
          result = await response.text();
          break;
        default:
          result = await response.text();
      }

      context.result = result;
      context.it = result;

      await this.executeCommands(node.body as ASTNode[], context);
    } catch (error) {
      if (this.config.debug) {
        console.error('Fetch error:', error);
      }
    }
  }
}

// ============== EXECUTION CONTEXT ==============

interface ExecutionContext {
  me: HTMLElement;
  event: Event;
  it: unknown;
  result: unknown;
  locals: Map<string, unknown>;
  globals: Map<string, unknown>;
}

// ============== GLOBAL EXPORTS ==============

const runtime = new ModularRuntime();

// Auto-init on DOMContentLoaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => runtime.init());
  } else {
    runtime.init();
  }
}

export const hyperfixi = {
  version: '1.0.0-modular',
  parser: 'standard',
  commands: parser.getSupportedCommands(),
  capabilities: parser.capabilities,

  init: () => runtime.init(),
  parse: (code: string) => parser.parse(code),

  getParserInfo: () => ({
    tier: parser.tier,
    name: parser.name,
    commands: parser.getSupportedCommands().length,
  }),
};

// Browser global
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = hyperfixi;
}
