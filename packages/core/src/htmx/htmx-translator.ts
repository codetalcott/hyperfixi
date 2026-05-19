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
 */

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
 * Parse trigger string to extract event and modifiers
 * Examples: "click", "click delay:500ms", "keyup[key=='Enter']"
 */
function parseTrigger(trigger: string): { event: string; modifiers: string[] } {
  // Split on first space to separate event from modifiers
  const parts = trigger.trim().split(/\s+/);
  const eventPart = parts[0];
  const modifiers = parts.slice(1);

  // Handle event filters like keyup[key=='Enter']
  const filterMatch = eventPart.match(/^(\w+)\[(.+)\]$/);
  if (filterMatch) {
    return {
      event: TRIGGER_MAP[filterMatch[1]] || filterMatch[1],
      modifiers: [`filter: ${filterMatch[2]}`, ...modifiers],
    };
  }

  return {
    event: TRIGGER_MAP[eventPart] || eventPart,
    modifiers,
  };
}

/**
 * Translate trigger modifiers to hyperscript event modifiers
 */
function translateModifiers(modifiers: string[]): string {
  const result: string[] = [];

  for (const mod of modifiers) {
    // delay:Nms
    const delayMatch = mod.match(/^delay:(\d+)(ms|s)?$/);
    if (delayMatch) {
      const value = delayMatch[1];
      const unit = delayMatch[2] || 'ms';
      result.push(`.debounce(${value}${unit === 's' ? '000' : ''})`);
      continue;
    }

    // throttle:Nms
    const throttleMatch = mod.match(/^throttle:(\d+)(ms|s)?$/);
    if (throttleMatch) {
      const value = throttleMatch[1];
      const unit = throttleMatch[2] || 'ms';
      result.push(`.throttle(${value}${unit === 's' ? '000' : ''})`);
      continue;
    }

    // once
    if (mod === 'once') {
      result.push('.once');
      continue;
    }

    // changed
    if (mod === 'changed') {
      // This is handled differently - filter for value changes
      // For now, skip it (native behavior for input/change events)
      continue;
    }
  }

  return result.join('');
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

  // Handle hx-on:* inline handlers
  if (config.onHandlers) {
    for (const [event, code] of Object.entries(config.onHandlers)) {
      // hx-on:* handlers contain raw hyperscript, just wrap in event
      parts.push(`on ${event} ${code}`);
    }
  }

  // If no request URL, just return the event handlers (and any live block)
  if (!config.url) {
    return parts.join('\n');
  }

  // Build the main request handler
  const commands: string[] = [];

  // Event trigger
  const triggerStr = config.trigger || getDefaultTrigger(element);
  const { event, modifiers } = parseTrigger(triggerStr);
  const modifierStr = translateModifiers(modifiers);

  // Confirmation dialog
  if (config.confirm) {
    commands.push(`if not js window.confirm('${config.confirm.replace(/'/g, "\\'")}') return end`);
  }

  // For forms and links, prevent default
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'form' || tagName === 'a') {
    commands.push('halt the event');
  }

  // Build fetch command
  let fetchCmd = `fetch '${config.url}'`;

  if (config.method && config.method !== 'GET') {
    fetchCmd += ` via ${config.method}`;
  }

  // Include form values for forms or if vals specified
  if (tagName === 'form') {
    fetchCmd += ' with values of me';
  } else if (config.vals) {
    // Parse JSON vals and include them
    fetchCmd += ` with ${config.vals}`;
  }

  fetchCmd += ' as html';
  commands.push(fetchCmd);

  // Build swap command
  const target = config.target ? resolveHxTarget(config.target) : 'me';
  const swap = config.swap || 'innerHTML';
  const swapCmd = buildSwapCommand(target, swap, false);

  if (swapCmd) {
    commands.push(`then ${swapCmd}`);
  }

  // URL management
  if (config.pushUrl) {
    const url = config.pushUrl === true ? config.url : config.pushUrl;
    commands.push(`then push url '${url}'`);
  } else if (config.replaceUrl) {
    const url = config.replaceUrl === true ? config.url : config.replaceUrl;
    commands.push(`then replace url '${url}'`);
  }

  // Assemble the event handler
  const handlerCode = `on ${event}${modifierStr}\n  ${commands.join('\n  ')}`;
  parts.push(handlerCode);

  return parts.join('\n');
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
