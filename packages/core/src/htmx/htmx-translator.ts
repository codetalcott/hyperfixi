/**
 * htmx-translator.ts
 *
 * Translates htmx attribute configurations to hyperscript syntax.
 * Implements the translation matrix from the htmx compatibility plan.
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
  load: 'load',
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
 * Resolve hx-target value to hyperscript selector
 */
function resolveTarget(target: string): string {
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
    return `swap ${target} with it`;
  }

  // Default: innerHTML
  return `swap innerHTML of ${target} with it`;
}

/**
 * Main translation function
 */
export function translateToHyperscript(config: HtmxConfig, element: Element): string {
  const parts: string[] = [];

  // Handle hx-on:* inline handlers
  if (config.onHandlers) {
    for (const [event, code] of Object.entries(config.onHandlers)) {
      // hx-on:* handlers contain raw hyperscript, just wrap in event
      parts.push(`on ${event} ${code}`);
    }
  }

  // If no request URL, just return the event handlers
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
  const target = config.target ? resolveTarget(config.target) : 'me';
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
