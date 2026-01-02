#!/usr/bin/env npx tsx
/**
 * Inline Bundle Generator
 *
 * Generates minimal inline bundles by including only specified commands.
 * Uses code generation instead of tree-shaking for optimal bundle size.
 *
 * Usage:
 *   npx tsx scripts/generate-inline-bundle.ts --config my-bundle.config.json
 *   npx tsx scripts/generate-inline-bundle.ts --commands toggle,add,remove --output dist/my-bundle.ts
 *
 * Config file format:
 *   {
 *     "name": "my-bundle",
 *     "commands": ["toggle", "add", "remove", "show", "hide"],
 *     "output": "src/compatibility/browser-bundle-my-custom.ts",
 *     "htmxIntegration": true
 *   }
 */

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// COMMAND IMPLEMENTATIONS (inline code snippets)
// =============================================================================

const COMMAND_IMPLEMENTATIONS: Record<string, string> = {
  toggle: `
    case 'toggle': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.toggle(className);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }`,

  add: `
    case 'add': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.add(className);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }`,

  remove: `
    case 'remove': {
      const targets = await getTarget();
      for (const el of targets) el.remove();
      return null;
    }`,

  removeClass: `
    case 'removeClass': {
      const className = getClassName(cmd.args[0]) || String(await evaluate(cmd.args[0], ctx));
      const targets = await getTarget();
      for (const el of targets) el.classList.remove(className);
      return targets;
    }`,

  show: `
    case 'show': {
      const targets = await getTarget();
      for (const el of targets) {
        (el as HTMLElement).style.display = '';
        el.classList.remove('hidden');
      }
      return targets;
    }`,

  hide: `
    case 'hide': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).style.display = 'none';
      return targets;
    }`,

  set: `
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
          if (obj instanceof Element && isStyleProp(target.property)) {
            setStyleProp(obj, target.property, value);
          } else {
            (obj as any)[target.property] = value;
          }
          ctx.it = value;
          return value;
        }
      }

      ctx.it = value;
      return value;
    }`,

  get: `
    case 'get': {
      const value = await evaluate(cmd.args[0], ctx);
      ctx.it = value;
      return value;
    }`,

  wait: `
    case 'wait': {
      const duration = await evaluate(cmd.args[0], ctx);
      const ms = typeof duration === 'number' ? duration : parseInt(String(duration));
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    }`,

  transition: `
    case 'transition': {
      const property = String(await evaluate(cmd.args[0], ctx)).replace(/^\\*/, '');
      const toValue = await evaluate(cmd.args[1], ctx);
      const durationVal = await evaluate(cmd.args[2], ctx);
      const duration = typeof durationVal === 'number' ? durationVal :
                       String(durationVal).endsWith('ms') ? parseInt(String(durationVal)) :
                       String(durationVal).endsWith('s') ? parseFloat(String(durationVal)) * 1000 :
                       parseInt(String(durationVal)) || 300;

      const targets = await getTarget();
      const promises: Promise<void>[] = [];

      for (const el of targets) {
        const htmlEl = el as HTMLElement;
        const kebabProp = property.replace(/([A-Z])/g, '-$1').toLowerCase();

        const oldTransition = htmlEl.style.transition;
        htmlEl.style.transition = \`\${kebabProp} \${duration}ms ease\`;
        htmlEl.style.setProperty(kebabProp, String(toValue));

        promises.push(new Promise<void>(resolve => {
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
        }));
      }

      await Promise.all(promises);
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
    }`,

  go: `
    case 'go': {
      const dest = await evaluate(cmd.args[0], ctx);
      const d = String(dest).toLowerCase();
      if (d === 'back') history.back();
      else if (d === 'forward') history.forward();
      else if (d === 'bottom') ctx.me.scrollIntoView({ block: 'end', behavior: 'smooth' });
      else if (d === 'top') ctx.me.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else window.location.href = String(dest);
      return null;
    }`,

  call: `
    case 'call': {
      const result = await evaluate(cmd.args[0], ctx);
      ctx.it = result;
      return result;
    }`,

  log: `
    case 'log': {
      const values = await Promise.all(cmd.args.map((a: any) => evaluate(a, ctx)));
      console.log(...values);
      return values[0];
    }`,

  send: `
    case 'send': {
      const eventName = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      const event = new CustomEvent(String(eventName), { bubbles: true, detail: ctx.it });
      for (const el of targets) el.dispatchEvent(event);
      ctx.it = event;
      return event;
    }`,

  trigger: `
    case 'trigger': {
      const eventName = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      const event = new CustomEvent(String(eventName), { bubbles: true, detail: ctx.it });
      for (const el of targets) el.dispatchEvent(event);
      ctx.it = event;
      return event;
    }`,

  put: `
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
    }`,

  append: `
    case 'append': {
      const content = await evaluate(cmd.args[0], ctx);
      const targets = await getTarget();
      for (const el of targets) el.insertAdjacentHTML('beforeend', String(content));
      ctx.it = content;
      return content;
    }`,

  take: `
    case 'take': {
      const className = getClassName(await evaluate(cmd.args[0], ctx));
      const from = cmd.target ? await getTarget() : [ctx.me.parentElement!];
      for (const container of from) {
        const siblings = container.querySelectorAll('.' + className);
        siblings.forEach(el => el.classList.remove(className));
      }
      ctx.me.classList.add(className);
      return ctx.me;
    }`,

  increment: `
    case 'increment': {
      const target = cmd.args[0];
      const amount = cmd.args[1] ? await evaluate(cmd.args[1], ctx) : 1;

      if (target.type === 'variable') {
        const varName = target.name.slice(1);
        const map = target.scope === 'local' ? ctx.locals : globalVars;
        const current = map.get(varName) || 0;
        const newVal = current + amount;
        map.set(varName, newVal);
        ctx.it = newVal;
        return newVal;
      }

      const elements = toElementArray(await evaluate(target, ctx));
      for (const el of elements) {
        const current = parseFloat(el.textContent || '0') || 0;
        const newVal = current + amount;
        el.textContent = String(newVal);
        ctx.it = newVal;
      }
      return ctx.it;
    }`,

  decrement: `
    case 'decrement': {
      const target = cmd.args[0];
      const amount = cmd.args[1] ? await evaluate(cmd.args[1], ctx) : 1;

      if (target.type === 'variable') {
        const varName = target.name.slice(1);
        const map = target.scope === 'local' ? ctx.locals : globalVars;
        const current = map.get(varName) || 0;
        const newVal = current - amount;
        map.set(varName, newVal);
        ctx.it = newVal;
        return newVal;
      }

      const elements = toElementArray(await evaluate(target, ctx));
      for (const el of elements) {
        const current = parseFloat(el.textContent || '0') || 0;
        const newVal = current - amount;
        el.textContent = String(newVal);
        ctx.it = newVal;
      }
      return ctx.it;
    }`,

  focus: `
    case 'focus': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).focus();
      return targets;
    }`,

  blur: `
    case 'blur': {
      const targets = await getTarget();
      for (const el of targets) (el as HTMLElement).blur();
      return targets;
    }`,

  'return': `
    case 'return': {
      const value = cmd.args[0] ? await evaluate(cmd.args[0], ctx) : ctx.it;
      throw { type: 'return', value };
    }`,
};

// Commands that require style property helpers
const STYLE_COMMANDS = ['set', 'put', 'increment', 'decrement'];

// Commands that require toElementArray helper
const ELEMENT_ARRAY_COMMANDS = ['put', 'increment', 'decrement'];

// =============================================================================
// TEMPLATE GENERATION
// =============================================================================

interface BundleConfig {
  name: string;
  commands: string[];
  output: string;
  htmxIntegration?: boolean;
  globalName?: string;
}

function generateBundle(config: BundleConfig): string {
  const { name, commands, htmxIntegration = false, globalName = 'hyperfixi' } = config;

  const needsStyleHelpers = commands.some(cmd => STYLE_COMMANDS.includes(cmd));
  const needsElementArrayHelper = commands.some(cmd => ELEMENT_ARRAY_COMMANDS.includes(cmd));

  const commandCases = commands
    .filter(cmd => COMMAND_IMPLEMENTATIONS[cmd])
    .map(cmd => COMMAND_IMPLEMENTATIONS[cmd])
    .join('\n');

  const unknownCommands = commands.filter(cmd => !COMMAND_IMPLEMENTATIONS[cmd]);
  if (unknownCommands.length > 0) {
    console.warn(`Warning: Unknown commands will not be included: ${unknownCommands.join(', ')}`);
  }

  return `/**
 * HyperFixi ${name} Bundle (Auto-Generated)
 *
 * Generated by: npx tsx scripts/generate-inline-bundle.ts
 * Commands: ${commands.join(', ')}
 *
 * DO NOT EDIT - Regenerate with the build script.
 */

// =============================================================================
// MODULAR PARSER IMPORTS
// =============================================================================

import { HybridParser } from '../parser/hybrid/parser-core';
import type { ASTNode, CommandNode, EventNode } from '../parser/hybrid/ast-types';

// =============================================================================
// RUNTIME
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
    case 'literal': return node.value;

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

    default: return undefined;
  }
}

async function evaluateBinary(node: ASTNode, ctx: Context): Promise<any> {
  if (node.operator === 'has') {
    const left = await evaluate(node.left, ctx);
    if (left instanceof Element && node.right.type === 'selector' && node.right.value.startsWith('.')) {
      return left.classList.contains(node.right.value.slice(1));
    }
    return false;
  }

  const left = await evaluate(node.left, ctx);
  const right = await evaluate(node.right, ctx);

  switch (node.operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '*': return left * right;
    case '/': return left / right;
    case '==': case 'is': return left == right;
    case '!=': case 'is not': return left != right;
    case '<': return left < right;
    case '>': return left > right;
    case '<=': return left <= right;
    case '>=': return left >= right;
    case 'and': case '&&': return left && right;
    case 'or': case '||': return left || right;
    default: return undefined;
  }
}

// =============================================================================
// COMMAND EXECUTOR
// =============================================================================

${needsStyleHelpers ? `
const isStyleProp = (prop: string) => prop?.startsWith('*');
const getStyleName = (prop: string) => prop.substring(1);
const setStyleProp = (el: Element, prop: string, value: any): boolean => {
  if (!isStyleProp(prop)) return false;
  (el as HTMLElement).style.setProperty(getStyleName(prop), String(value));
  return true;
};
` : ''}

${needsElementArrayHelper ? `
const toElementArray = (val: any): Element[] => {
  if (Array.isArray(val)) return val.filter(e => e instanceof Element);
  if (val instanceof Element) return [val];
  if (typeof val === 'string') return Array.from(document.querySelectorAll(val));
  return [];
};
` : ''}

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
${commandCases}

    default:
      console.warn(\`${name} bundle: Unknown command '\${cmd.name}'\`);
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

    if (eventName === 'init') {
      await executeSequence(eventNode.body, ctx);
      return;
    }

    const target = eventNode.filter ? await evaluate(eventNode.filter, ctx) : me;
    const targetEl = target instanceof Element ? target : me;
    const mods = eventNode.modifiers;

    let handler = async (e: Event) => {
      if (mods.prevent) e.preventDefault();
      if (mods.stop) e.stopPropagation();

      const handlerCtx: Context = {
        me, event: e,
        you: e.target instanceof Element ? e.target : undefined,
        locals: new Map(),
      };
      await executeSequence(eventNode.body, handlerCtx);
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
    executeAST(ast, el);
  } catch (err) {
    console.error('HyperFixi ${name} error:', err, 'Code:', code);
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
  version: '1.0.0-${name.toLowerCase().replace(/\s+/g, '-')}',

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

  commands: ${JSON.stringify(commands)},
  parserName: 'hybrid',
};

// =============================================================================
// AUTO-INITIALIZE
// =============================================================================

if (typeof window !== 'undefined') {
  (window as any).${globalName} = api;
  (window as any)._hyperscript = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
${htmxIntegration ? `
  // HTMX integration
  document.addEventListener('htmx:afterSettle', (e: Event) => {
    const target = (e as CustomEvent).detail?.target;
    if (target) processElements(target);
  });
` : ''}
}

export default api;
export { api, processElements };
`;
}

// =============================================================================
// CLI
// =============================================================================

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Inline Bundle Generator

Usage:
  npx tsx scripts/generate-inline-bundle.ts --config <config.json>
  npx tsx scripts/generate-inline-bundle.ts --commands <cmd1,cmd2,...> --output <file.ts>

Options:
  --config <file>     JSON config file
  --commands <list>   Comma-separated list of commands
  --output <file>     Output file path
  --name <name>       Bundle name (default: "Custom")
  --htmx              Enable HTMX integration
  --global <name>     Global variable name (default: "hyperfixi")

Available commands:
  ${Object.keys(COMMAND_IMPLEMENTATIONS).join(', ')}
`);
    process.exit(0);
  }

  let config: BundleConfig;

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1) {
    const configPath = args[configIndex + 1];
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } else {
    const commandsIndex = args.indexOf('--commands');
    const outputIndex = args.indexOf('--output');
    const nameIndex = args.indexOf('--name');
    const globalIndex = args.indexOf('--global');

    if (commandsIndex === -1 || outputIndex === -1) {
      console.error('Error: Either --config or both --commands and --output are required');
      process.exit(1);
    }

    config = {
      name: nameIndex !== -1 ? args[nameIndex + 1] : 'Custom',
      commands: args[commandsIndex + 1].split(','),
      output: args[outputIndex + 1],
      htmxIntegration: args.includes('--htmx'),
      globalName: globalIndex !== -1 ? args[globalIndex + 1] : 'hyperfixi',
    };
  }

  const bundle = generateBundle(config);
  const outputPath = path.resolve(process.cwd(), config.output);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bundle);

  console.log(`Generated: ${outputPath}`);
  console.log(`Commands: ${config.commands.join(', ')}`);
}

main();
