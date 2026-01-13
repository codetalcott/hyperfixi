/**
 * HyperFixi Lite Plus Browser Bundle
 *
 * Extended lite bundle with more commands while staying small.
 * Uses regex-based parser - no AST overhead.
 *
 * Target: ~3-4 KB gzipped
 *
 * Commands included (14):
 * - add, remove, toggle, take (DOM class manipulation)
 * - put, append (content insertion)
 * - set, increment, decrement (data manipulation)
 * - show, hide (visibility shortcuts)
 * - focus, blur (form control)
 * - log (debugging)
 * - send, trigger (event dispatch)
 * - wait (async timing)
 * - go (navigation)
 *
 * Extensible via keyword aliases for internationalization.
 */

// ============== KEYWORD ALIASES ==============
// Pattern for extending to other languages.
// To add Spanish: import { SPANISH_ALIASES } from './aliases/es';
// Then merge: Object.assign(COMMAND_ALIASES, SPANISH_ALIASES);

/**
 * Command keyword aliases for internationalization.
 * Maps non-English keywords to canonical English commands.
 *
 * Example language extension pattern:
 * ```typescript
 * // aliases/es.ts
 * export const SPANISH_ALIASES: Record<string, string> = {
 *   alternar: 'toggle', agregar: 'add', quitar: 'remove',
 *   poner: 'put', establecer: 'set', esperar: 'wait',
 *   enviar: 'send', mostrar: 'show', ocultar: 'hide',
 *   incrementar: 'increment', decrementar: 'decrement',
 *   enfocar: 'focus', desenfocar: 'blur', ir: 'go',
 *   tomar: 'take', disparar: 'trigger', añadir: 'append'
 * };
 *
 * // aliases/tr.ts
 * export const TURKISH_ALIASES: Record<string, string> = {
 *   değiştir: 'toggle', ekle: 'add', kaldır: 'remove',
 *   koy: 'put', ayarla: 'set', bekle: 'wait',
 *   gönder: 'send', göster: 'show', gizle: 'hide',
 *   artır: 'increment', azalt: 'decrement',
 *   odakla: 'focus', git: 'go', al: 'take'
 * };
 * ```
 */
const COMMAND_ALIASES: Record<string, string> = {
  // English synonyms (built-in)
  flip: 'toggle',
  switch: 'toggle',
  display: 'show',
  reveal: 'show',
  conceal: 'hide',
  increase: 'increment',
  decrease: 'decrement',
  fire: 'trigger',
  dispatch: 'send',
  navigate: 'go',
  goto: 'go',
};

/**
 * Event keyword aliases for internationalization.
 */
const EVENT_ALIASES: Record<string, string> = {
  // English synonyms
  clicked: 'click',
  pressed: 'keydown',
  changed: 'change',
  submitted: 'submit',
  loaded: 'load',
};

/**
 * Normalize a command name using aliases
 */
function normalizeCommand(name: string): string {
  const lower = name.toLowerCase();
  return COMMAND_ALIASES[lower] || lower;
}

/**
 * Normalize an event name using aliases
 */
function normalizeEvent(name: string): string {
  const lower = name.toLowerCase();
  return EVENT_ALIASES[lower] || lower;
}

// ============== TYPES ==============

interface LiteCommand {
  name: string;
  args: string[];
  target?: string;
  modifier?: string;
}

interface LiteEventHandler {
  event: string;
  filter?: string;
  commands: LiteCommand[];
}

// ============== PARSER ==============

/**
 * Parse hyperscript code using regex patterns
 */
function parseLite(code: string): LiteEventHandler | LiteCommand[] {
  const trimmed = code.trim();

  // Handle event handlers: "on click toggle .active"
  const onMatch = trimmed.match(/^on\s+(\w+)(?:\s+from\s+([^\s]+))?\s+(.+)$/i);
  if (onMatch) {
    return {
      event: normalizeEvent(onMatch[1]),
      filter: onMatch[2],
      commands: parseCommands(onMatch[3]),
    };
  }

  // Handle "every Nms" event pattern
  const everyMatch = trimmed.match(/^every\s+(\d+)(ms|s)?\s+(.+)$/i);
  if (everyMatch) {
    const ms = everyMatch[2] === 's' ? parseInt(everyMatch[1]) * 1000 : parseInt(everyMatch[1]);
    return {
      event: `interval:${ms}`,
      commands: parseCommands(everyMatch[3]),
    };
  }

  // Handle "init" pattern
  const initMatch = trimmed.match(/^init\s+(.+)$/i);
  if (initMatch) {
    return {
      event: 'init',
      commands: parseCommands(initMatch[1]),
    };
  }

  return parseCommands(trimmed);
}

/**
 * Parse a sequence of commands separated by "then" or "and"
 */
function parseCommands(code: string): LiteCommand[] {
  const parts = code.split(/\s+(?:then|and)\s+/i);
  return parts.map(parseCommand).filter(Boolean) as LiteCommand[];
}

/**
 * Parse a single command
 */
function parseCommand(code: string): LiteCommand | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  let match: RegExpMatchArray | null;

  // toggle .class [on target]
  match = trimmed.match(/^(\w+)\s+(\.\w+|\w+)(?:\s+on\s+(.+))?$/i);
  if (match && normalizeCommand(match[1]) === 'toggle') {
    return { name: 'toggle', args: [match[2]], target: match[3] };
  }

  // add .class [to target]
  match = trimmed.match(/^(\w+)\s+(\.\w+|\w+)(?:\s+to\s+(.+))?$/i);
  if (match && normalizeCommand(match[1]) === 'add') {
    return { name: 'add', args: [match[2]], target: match[3] };
  }

  // remove .class [from target] | remove [target]
  match = trimmed.match(/^(\w+)\s+(\.\w+)(?:\s+from\s+(.+))?$/i);
  if (match && normalizeCommand(match[1]) === 'remove') {
    return { name: 'remove', args: [match[2]], target: match[3] };
  }
  match = trimmed.match(/^(\w+)\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'remove') {
    return { name: 'remove', args: [], target: match[2] };
  }

  // take .class from .siblings (exclusive toggle)
  match = trimmed.match(/^(\w+)\s+(\.\w+)\s+from\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'take') {
    return { name: 'take', args: [match[2]], target: match[3] };
  }

  // put "content" into|before|after target
  match = trimmed.match(/^(\w+)\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s+(into|before|after)\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'put') {
    const content = match[2] || match[3] || match[4];
    return { name: 'put', args: [content], modifier: match[5], target: match[6] };
  }

  // append "content" to target
  match = trimmed.match(/^(\w+)\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s+to\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'append') {
    const content = match[2] || match[3] || match[4];
    return { name: 'append', args: [content], target: match[5] };
  }

  // set target to value
  match = trimmed.match(/^(\w+)\s+(.+?)\s+to\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'set') {
    return { name: 'set', args: [match[2], match[3]] };
  }

  // increment/decrement target [by N]
  match = trimmed.match(/^(\w+)\s+(.+?)(?:\s+by\s+(\d+))?$/i);
  if (
    match &&
    (normalizeCommand(match[1]) === 'increment' || normalizeCommand(match[1]) === 'decrement')
  ) {
    return { name: normalizeCommand(match[1]), args: [match[2], match[3] || '1'] };
  }

  // log message
  match = trimmed.match(/^(\w+)\s+(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'log') {
    return { name: 'log', args: [match[2]] };
  }

  // send/trigger event [to target]
  match = trimmed.match(/^(\w+)\s+(\w+)(?:\s+to\s+(.+))?$/i);
  if (
    match &&
    (normalizeCommand(match[1]) === 'send' || normalizeCommand(match[1]) === 'trigger')
  ) {
    return { name: 'send', args: [match[2]], target: match[3] };
  }

  // wait Nms | wait Ns
  match = trimmed.match(/^(\w+)\s+(\d+)(ms|s)?$/i);
  if (match && normalizeCommand(match[1]) === 'wait') {
    const ms = match[3] === 's' ? parseInt(match[2]) * 1000 : parseInt(match[2]);
    return { name: 'wait', args: [ms.toString()] };
  }

  // focus/blur [target]
  match = trimmed.match(/^(\w+)(?:\s+(.+))?$/i);
  if (match && (normalizeCommand(match[1]) === 'focus' || normalizeCommand(match[1]) === 'blur')) {
    return { name: normalizeCommand(match[1]), args: [], target: match[2] };
  }

  // go to url "/path" | go back | go forward
  match = trimmed.match(/^(\w+)\s+(?:to\s+(?:url\s+)?)?(.+)$/i);
  if (match && normalizeCommand(match[1]) === 'go') {
    return { name: 'go', args: [match[2]] };
  }

  // show/hide [target]
  match = trimmed.match(/^(\w+)(?:\s+(.+))?$/i);
  if (match && (normalizeCommand(match[1]) === 'show' || normalizeCommand(match[1]) === 'hide')) {
    const target = match[2];
    return normalizeCommand(match[1]) === 'show'
      ? { name: 'remove', args: ['.hidden'], target }
      : { name: 'add', args: ['.hidden'], target };
  }

  // if/unless condition command
  match = trimmed.match(
    /^(if|unless)\s+(.+?)\s+(toggle|add|remove|put|set|log|send|wait|show|hide|increment|decrement|focus|blur|go|take|append)\s+(.+)$/i
  );
  if (match) {
    const innerCmd = parseCommand(`${match[3]} ${match[4]}`);
    if (innerCmd) {
      innerCmd.modifier = match[1].toLowerCase();
      innerCmd.args.unshift(match[2]);
      return innerCmd;
    }
  }

  // Unknown - generic parse
  const parts = trimmed.split(/\s+/);
  if (parts.length > 0) {
    return { name: normalizeCommand(parts[0]), args: parts.slice(1) };
  }

  return null;
}

// ============== RUNTIME ==============

/**
 * Resolve a target selector to element(s)
 */
function resolveTarget(target: string | undefined, me: Element): Element | Element[] | null {
  if (!target) return me;

  const t = target.trim();
  if (t === 'me') return me;
  if (t === 'body') return document.body;

  // CSS selector
  if (t.startsWith('#') || t.startsWith('.') || t.startsWith('[')) {
    const elements = document.querySelectorAll(t);
    return elements.length === 1 ? elements[0] : Array.from(elements);
  }

  // ID shorthand
  if (/^\w+$/.test(t) && document.getElementById(t)) {
    return document.getElementById(t);
  }

  return me;
}

/**
 * Get class name from argument
 */
function getClassName(arg: string): string {
  return arg.startsWith('.') ? arg.slice(1) : arg;
}

/**
 * Evaluate a value expression
 */
function evaluateValue(expr: string, me: Element, locals: Map<string, any>): any {
  if (!expr) return undefined;
  const e = expr.trim();

  // String literals
  if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
    return e.slice(1, -1);
  }

  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(e)) {
    return parseFloat(e);
  }

  // Booleans
  if (e === 'true') return true;
  if (e === 'false') return false;
  if (e === 'null') return null;

  // Local variables
  if (e.startsWith(':')) {
    return locals.get(e.slice(1));
  }

  // References
  if (e === 'me') return me;
  if (e === 'my') return me;
  if (e === 'body') return document.body;

  // Property access: my.innerHTML, me.value
  const propMatch = e.match(/^(me|my)\.(\w+)$/);
  if (propMatch) {
    return (me as any)[propMatch[2]];
  }

  // Target property: #el.value, .class's textContent
  const targetPropMatch = e.match(/^([#.\w]+)(?:'s|\.)\s*(\w+)$/);
  if (targetPropMatch) {
    const target = resolveTarget(targetPropMatch[1], me);
    if (target && !Array.isArray(target)) {
      return (target as any)[targetPropMatch[2]];
    }
  }

  return e;
}

/**
 * Evaluate a simple condition
 */
function evaluateCondition(expr: string, me: Element, locals: Map<string, any>): boolean {
  const e = expr.trim();

  // Class check: "me has .active"
  const hasMatch = e.match(/^(me|my)\s+has\s+\.(\w+)$/i);
  if (hasMatch) {
    return (me as HTMLElement).classList.contains(hasMatch[2]);
  }

  // Property check: "me.checked"
  const propMatch = e.match(/^(me|my)\.(\w+)$/i);
  if (propMatch) {
    return Boolean((me as any)[propMatch[2]]);
  }

  // Local variable
  if (e.startsWith(':')) {
    return Boolean(locals.get(e.slice(1)));
  }

  return Boolean(evaluateValue(e, me, locals));
}

/**
 * Execute a single command
 */
async function executeCommand(
  cmd: LiteCommand,
  me: Element,
  locals: Map<string, any>
): Promise<any> {
  const target = resolveTarget(cmd.target, me);
  const elements = Array.isArray(target) ? target : target ? [target] : [me];

  switch (cmd.name) {
    case 'toggle': {
      const className = getClassName(cmd.args[0]);
      for (const el of elements) {
        (el as HTMLElement).classList.toggle(className);
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'add': {
      const className = getClassName(cmd.args[0]);
      for (const el of elements) {
        (el as HTMLElement).classList.add(className);
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'remove': {
      if (cmd.args[0]) {
        const className = getClassName(cmd.args[0]);
        for (const el of elements) {
          (el as HTMLElement).classList.remove(className);
        }
      } else {
        for (const el of elements) {
          el.remove();
        }
      }
      return null;
    }

    case 'take': {
      // Exclusive toggle: remove from siblings, add to me
      const className = getClassName(cmd.args[0]);
      const siblings = resolveTarget(cmd.target, me);
      const siblingEls = Array.isArray(siblings) ? siblings : siblings ? [siblings] : [];
      for (const el of siblingEls) {
        (el as HTMLElement).classList.remove(className);
      }
      (me as HTMLElement).classList.add(className);
      return me;
    }

    case 'put': {
      const content = evaluateValue(cmd.args[0], me, locals);
      for (const el of elements) {
        switch (cmd.modifier?.toLowerCase()) {
          case 'into':
            (el as HTMLElement).innerHTML = String(content);
            break;
          case 'before':
            el.insertAdjacentHTML('beforebegin', String(content));
            break;
          case 'after':
            el.insertAdjacentHTML('afterend', String(content));
            break;
          default:
            (el as HTMLElement).innerHTML = String(content);
        }
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'append': {
      const content = evaluateValue(cmd.args[0], me, locals);
      for (const el of elements) {
        (el as HTMLElement).insertAdjacentHTML('beforeend', String(content));
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'set': {
      const [targetExpr, valueExpr] = cmd.args;
      const value = evaluateValue(valueExpr, me, locals);

      // Local variable
      if (targetExpr.startsWith(':')) {
        locals.set(targetExpr.slice(1), value);
        return value;
      }

      // Property setting
      const propMatch = targetExpr.match(/^(.+?)(?:'s|\.)\s*(\w+)$/);
      if (propMatch) {
        const obj = resolveTarget(propMatch[1], me) as any;
        if (obj) {
          obj[propMatch[2]] = value;
          return obj;
        }
      }

      return value;
    }

    case 'increment': {
      const [targetExpr, amount] = cmd.args;
      const delta = parseInt(amount) || 1;

      if (targetExpr.startsWith(':')) {
        const current = locals.get(targetExpr.slice(1)) || 0;
        locals.set(targetExpr.slice(1), current + delta);
        return current + delta;
      }

      const propMatch = targetExpr.match(/^(.+?)(?:'s|\.)\s*(\w+)$/);
      if (propMatch) {
        const obj = resolveTarget(propMatch[1], me) as any;
        if (obj) {
          obj[propMatch[2]] = (parseInt(obj[propMatch[2]]) || 0) + delta;
          return obj[propMatch[2]];
        }
      }

      // Direct element text content
      const el = resolveTarget(targetExpr, me);
      if (el && !Array.isArray(el)) {
        const current = parseInt((el as HTMLElement).textContent || '0') || 0;
        (el as HTMLElement).textContent = String(current + delta);
        return current + delta;
      }

      return null;
    }

    case 'decrement': {
      const [targetExpr, amount] = cmd.args;
      const delta = parseInt(amount) || 1;

      if (targetExpr.startsWith(':')) {
        const current = locals.get(targetExpr.slice(1)) || 0;
        locals.set(targetExpr.slice(1), current - delta);
        return current - delta;
      }

      const propMatch = targetExpr.match(/^(.+?)(?:'s|\.)\s*(\w+)$/);
      if (propMatch) {
        const obj = resolveTarget(propMatch[1], me) as any;
        if (obj) {
          obj[propMatch[2]] = (parseInt(obj[propMatch[2]]) || 0) - delta;
          return obj[propMatch[2]];
        }
      }

      const el = resolveTarget(targetExpr, me);
      if (el && !Array.isArray(el)) {
        const current = parseInt((el as HTMLElement).textContent || '0') || 0;
        (el as HTMLElement).textContent = String(current - delta);
        return current - delta;
      }

      return null;
    }

    case 'focus': {
      for (const el of elements) {
        (el as HTMLElement).focus();
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'blur': {
      for (const el of elements) {
        (el as HTMLElement).blur();
      }
      return elements.length === 1 ? elements[0] : elements;
    }

    case 'go': {
      const dest = cmd.args[0]?.trim();
      if (dest === 'back') {
        history.back();
      } else if (dest === 'forward') {
        history.forward();
      } else if (dest) {
        const url = dest.replace(/^["']|["']$/g, '');
        window.location.href = url;
      }
      return null;
    }

    case 'log': {
      const value = evaluateValue(cmd.args.join(' '), me, locals);
      console.log(value);
      return value;
    }

    case 'send': {
      const eventName = cmd.args[0];
      const event = new CustomEvent(eventName, { bubbles: true });
      for (const el of elements) {
        el.dispatchEvent(event);
      }
      return event;
    }

    case 'wait': {
      const ms = parseInt(cmd.args[0]) || 0;
      await new Promise(resolve => setTimeout(resolve, ms));
      return ms;
    }

    default:
      console.warn(`Unknown command: ${cmd.name}`);
      return null;
  }
}

/**
 * Execute a parsed result
 */
async function executeParsed(
  parsed: LiteEventHandler | LiteCommand[],
  me: Element,
  locals: Map<string, any> = new Map()
): Promise<any> {
  if (Array.isArray(parsed)) {
    let result: any;
    for (const cmd of parsed) {
      if (cmd.modifier === 'if' || cmd.modifier === 'unless') {
        const condition = evaluateCondition(cmd.args[0], me, locals);
        const shouldRun = cmd.modifier === 'if' ? condition : !condition;
        if (!shouldRun) continue;
        cmd.args.shift();
      }
      result = await executeCommand(cmd, me, locals);
    }
    return result;
  }

  const handler = parsed as LiteEventHandler;
  const targetEl = handler.filter ? document.querySelector(handler.filter) : me;
  const eventName = handler.event;

  // Interval events
  if (eventName.startsWith('interval:')) {
    const ms = parseInt(eventName.split(':')[1]);
    setInterval(async () => {
      const handlerLocals = new Map(locals);
      for (const cmd of handler.commands) {
        await executeCommand(cmd, me, handlerLocals);
      }
    }, ms);
    return me;
  }

  // Init event
  if (eventName === 'init') {
    const handlerLocals = new Map(locals);
    for (const cmd of handler.commands) {
      await executeCommand(cmd, me, handlerLocals);
    }
    return me;
  }

  // Standard DOM event
  if (targetEl) {
    targetEl.addEventListener(eventName, async event => {
      const handlerLocals = new Map(locals);
      handlerLocals.set('event', event);
      for (const cmd of handler.commands) {
        await executeCommand(cmd, me, handlerLocals);
      }
    });
  }

  return me;
}

// ============== DOM PROCESSOR ==============

function processElements(root: Element | Document = document): void {
  const elements = root.querySelectorAll('[_]');

  for (const el of elements) {
    const code = el.getAttribute('_');
    if (code) {
      try {
        const parsed = parseLite(code);
        executeParsed(parsed, el);
      } catch (err) {
        console.error('HyperFixi Lite+ error:', err, 'Code:', code);
      }
    }
  }
}

// ============== PUBLIC API ==============

const api = {
  version: '1.0.0-lite-plus',

  /**
   * Parse hyperscript code
   */
  parse: parseLite,

  /**
   * Execute hyperscript code on an element
   */
  execute: async (code: string, element?: Element) => {
    const me = element || document.body;
    const parsed = parseLite(code);
    return executeParsed(parsed, me);
  },

  /**
   * Process all _="" attributes
   */
  init: processElements,

  /**
   * Process _="" attributes in a root
   */
  process: processElements,

  /**
   * Register command aliases (for i18n)
   *
   * @example
   * // Add Spanish support
   * hyperfixi.addAliases({
   *   alternar: 'toggle',
   *   agregar: 'add',
   *   quitar: 'remove'
   * });
   */
  addAliases: (aliases: Record<string, string>) => {
    Object.assign(COMMAND_ALIASES, aliases);
  },

  /**
   * Register event aliases (for i18n)
   */
  addEventAliases: (aliases: Record<string, string>) => {
    Object.assign(EVENT_ALIASES, aliases);
  },

  /**
   * Available commands in this bundle
   */
  commands: [
    'add',
    'remove',
    'toggle',
    'take',
    'put',
    'append',
    'set',
    'increment',
    'decrement',
    'show',
    'hide',
    'focus',
    'blur',
    'log',
    'send',
    'trigger',
    'wait',
    'go',
  ],
};

// Auto-initialize
if (typeof window !== 'undefined') {
  (window as any).hyperfixi = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => processElements());
  } else {
    processElements();
  }
}

export default api;
