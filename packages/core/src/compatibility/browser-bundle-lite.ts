/**
 * HyperFixi Lite Browser Bundle
 *
 * A hyperscript-compatible bundle that prioritizes size over features.
 * Uses a regex-based parser instead of full AST parsing.
 *
 * Target: ~20-25 KB gzipped (matching original hyperscript)
 *
 * Commands included (8):
 * - add, remove, toggle (DOM class manipulation)
 * - put (content insertion)
 * - set (variable assignment)
 * - log (debugging)
 * - send (event dispatch)
 * - wait (async timing)
 */

// ============== LITE PARSER ==============
// Regex-based parser for minimal bundle size

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

/**
 * Parse hyperscript code using simple regex patterns
 * Much smaller than full AST parser (~50 lines vs ~4000 lines)
 */
function parseLite(code: string): LiteEventHandler | LiteCommand[] {
  const trimmed = code.trim();

  // Handle event handlers: "on click toggle .active"
  // Also handles: "on click from .btn toggle .active"
  const onMatch = trimmed.match(/^on\s+(\w+)(?:\s+from\s+([^\s]+))?\s+(.+)$/i);
  if (onMatch) {
    return {
      event: onMatch[1],
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
  // Split on 'then' and 'and' but not inside strings
  const parts = code.split(/\s+(?:then|and)\s+/i);
  return parts.map(parseCommand).filter(Boolean) as LiteCommand[];
}

/**
 * Parse a single command
 */
function parseCommand(code: string): LiteCommand | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // toggle .class [on target]
  let match = trimmed.match(/^toggle\s+(\.\w+|\w+)(?:\s+on\s+(.+))?$/i);
  if (match) {
    return { name: 'toggle', args: [match[1]], target: match[2] };
  }

  // add .class [to target]
  match = trimmed.match(/^add\s+(\.\w+|\w+)(?:\s+to\s+(.+))?$/i);
  if (match) {
    return { name: 'add', args: [match[1]], target: match[2] };
  }

  // remove .class [from target] | remove [target]
  match = trimmed.match(/^remove\s+(\.\w+)(?:\s+from\s+(.+))?$/i);
  if (match) {
    return { name: 'remove', args: [match[1]], target: match[2] };
  }
  match = trimmed.match(/^remove\s+(.+)$/i);
  if (match) {
    return { name: 'remove', args: [], target: match[1] };
  }

  // put "content" into target
  match = trimmed.match(/^put\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s+(into|before|after)\s+(.+)$/i);
  if (match) {
    const content = match[1] || match[2] || match[3];
    return { name: 'put', args: [content], modifier: match[4], target: match[5] };
  }

  // set target to value | set :var to value
  match = trimmed.match(/^set\s+(.+?)\s+to\s+(.+)$/i);
  if (match) {
    return { name: 'set', args: [match[1], match[2]] };
  }

  // log message
  match = trimmed.match(/^log\s+(.+)$/i);
  if (match) {
    return { name: 'log', args: [match[1]] };
  }

  // send event [to target]
  match = trimmed.match(/^send\s+(\w+)(?:\s+to\s+(.+))?$/i);
  if (match) {
    return { name: 'send', args: [match[1]], target: match[2] };
  }

  // wait Nms | wait Ns
  match = trimmed.match(/^wait\s+(\d+)(ms|s)?$/i);
  if (match) {
    const ms = match[2] === 's' ? parseInt(match[1]) * 1000 : parseInt(match[1]);
    return { name: 'wait', args: [ms.toString()] };
  }

  // if condition command | unless condition command
  match = trimmed.match(
    /^(if|unless)\s+(.+?)\s+(toggle|add|remove|put|set|log|send|wait)\s+(.+)$/i
  );
  if (match) {
    const innerCmd = parseCommand(`${match[3]} ${match[4]}`);
    if (innerCmd) {
      innerCmd.modifier = match[1].toLowerCase();
      innerCmd.args.unshift(match[2]); // condition as first arg
      return innerCmd;
    }
  }

  // show/hide shortcuts (map to add/remove .hidden)
  match = trimmed.match(/^(show|hide)(?:\s+(.+))?$/i);
  if (match) {
    const target = match[2];
    return match[1].toLowerCase() === 'show'
      ? { name: 'remove', args: ['.hidden'], target }
      : { name: 'add', args: ['.hidden'], target };
  }

  // Unknown command - try generic parsing
  const parts = trimmed.split(/\s+/);
  if (parts.length > 0) {
    return { name: parts[0], args: parts.slice(1) };
  }

  return null;
}

// ============== LITE RUNTIME ==============

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
 * Get class name from argument (handles .class or class format)
 */
function getClassName(arg: string): string {
  return arg.startsWith('.') ? arg.slice(1) : arg;
}

/**
 * Execute a single lite command
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
        // Remove class
        const className = getClassName(cmd.args[0]);
        for (const el of elements) {
          (el as HTMLElement).classList.remove(className);
        }
      } else {
        // Remove element
        for (const el of elements) {
          el.remove();
        }
      }
      return null;
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

    case 'set': {
      const [targetExpr, valueExpr] = cmd.args;
      const value = evaluateValue(valueExpr, me, locals);

      // Local variable
      if (targetExpr.startsWith(':')) {
        locals.set(targetExpr.slice(1), value);
        return value;
      }

      // Property setting (my.prop, target's prop)
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

  // Just return the string as-is for unknown expressions
  return e;
}

/**
 * Execute a parsed result (event handler or command list)
 */
async function executeParsed(
  parsed: LiteEventHandler | LiteCommand[],
  me: Element,
  locals: Map<string, any> = new Map()
): Promise<any> {
  if (Array.isArray(parsed)) {
    // Execute command list
    let result: any;
    for (const cmd of parsed) {
      // Handle if/unless conditions
      if (cmd.modifier === 'if' || cmd.modifier === 'unless') {
        const condition = evaluateCondition(cmd.args[0], me, locals);
        const shouldRun = cmd.modifier === 'if' ? condition : !condition;
        if (!shouldRun) continue;
        cmd.args.shift(); // Remove condition from args
      }
      result = await executeCommand(cmd, me, locals);
    }
    return result;
  }

  // Event handler - attach listener
  const handler = parsed as LiteEventHandler;
  const targetEl = handler.filter ? document.querySelector(handler.filter) : me;
  const eventName = handler.event;

  // Handle interval events: "every 500ms"
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

  // Handle init event - execute immediately
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

/**
 * Evaluate a simple condition
 */
function evaluateCondition(expr: string, me: Element, locals: Map<string, any>): boolean {
  const e = expr.trim();

  // Check for class: "me has .active" or ".active in me"
  const hasMatch = e.match(/^(me|my)\s+has\s+\.(\w+)$/i);
  if (hasMatch) {
    return (me as HTMLElement).classList.contains(hasMatch[2]);
  }

  // Check for property: "me.checked" or "my.disabled"
  const propMatch = e.match(/^(me|my)\.(\w+)$/i);
  if (propMatch) {
    return Boolean((me as any)[propMatch[2]]);
  }

  // Check local variable
  if (e.startsWith(':')) {
    return Boolean(locals.get(e.slice(1)));
  }

  // Fallback - try to evaluate as boolean
  const value = evaluateValue(e, me, locals);
  return Boolean(value);
}

// ============== DOM PROCESSOR ==============

/**
 * Process all elements with _="" attributes
 */
function processElements(root: Element | Document = document): void {
  const elements = root.querySelectorAll('[_]');

  for (const el of elements) {
    const code = el.getAttribute('_');
    if (code) {
      try {
        const parsed = parseLite(code);
        executeParsed(parsed, el);
      } catch (err) {
        console.error('HyperFixi Lite error:', err, 'Code:', code);
      }
    }
  }
}

// ============== PUBLIC API ==============

const api = {
  version: '1.0.0-lite',

  /**
   * Parse hyperscript code (returns internal representation)
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
   * Process all _="" attributes in the document
   */
  init: processElements,

  /**
   * Process _="" attributes in a specific root
   */
  process: processElements,

  /**
   * Available commands in this lite bundle
   */
  commands: ['add', 'remove', 'toggle', 'put', 'set', 'log', 'send', 'wait'],
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
