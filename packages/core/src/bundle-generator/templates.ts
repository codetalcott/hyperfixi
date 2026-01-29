/**
 * Bundle Generator Templates
 *
 * Code templates for individual commands and blocks.
 * These are used by the generator to build minimal bundles.
 *
 * Supports 'ts' (TypeScript) and 'js' (JavaScript) output formats.
 */

export type CodeFormat = 'ts' | 'js';

/**
 * Strip TypeScript type annotations for JavaScript output.
 */
function stripTypes(code: string, format: CodeFormat): string {
  if (format === 'ts') return code;

  return (
    code
      // Remove " as Type" casts
      .replace(/\s+as\s+\w+(?:\[\])?/g, '')
      // Remove ": Type" in catch clauses like "catch (error: any)"
      .replace(/\((\w+):\s*\w+\)/g, '($1)')
      // Remove ": Type" in arrow function params like "(a: any) =>"
      .replace(/\((\w+):\s*any\)/g, '($1)')
      // Remove "<void>" generic from Promise<void>[]
      .replace(/Promise<void>\[\]/g, 'Promise[]')
      // Clean up Promise<void> standalone
      .replace(/Promise<void>/g, 'Promise')
      // Remove TransitionEvent type
      .replace(/:\s*TransitionEvent/g, '')
  );
}

/**
 * Command implementations as switch case code snippets.
 * Each command is a complete case block for the executeCommand switch.
 */
const COMMAND_IMPLEMENTATIONS_TS: Record<string, string> = {
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

  morph: `
    case 'morph': {
      const targets = await getTarget();
      const content = await evaluate(cmd.args[0], ctx);
      const contentStr = String(content);
      const isOuter = cmd.modifier === 'over';

      for (const target of targets) {
        try {
          if (isOuter) {
            morphlexMorph(target, contentStr);
          } else {
            morphlexMorphInner(target, contentStr);
          }
        } catch (error) {
          // Fallback to innerHTML/outerHTML if morph fails
          console.warn('[LokaScript] Morph failed, falling back:', error);
          if (isOuter) {
            target.outerHTML = contentStr;
          } else {
            target.innerHTML = contentStr;
          }
        }
      }
      ctx.it = targets.length === 1 ? targets[0] : targets;
      return ctx.it;
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

  return: `
    case 'return': {
      const value = cmd.args[0] ? await evaluate(cmd.args[0], ctx) : ctx.it;
      throw { type: 'return', value };
    }`,

  break: `
    case 'break': {
      throw { type: 'break' };
    }`,

  continue: `
    case 'continue': {
      throw { type: 'continue' };
    }`,

  // === Control Flow Commands ===
  halt: `
    case 'halt': {
      // Check for "halt the event" pattern
      const firstArg = cmd.args[0];
      let targetEvent = ctx.event;
      if (firstArg?.type === 'identifier' && firstArg.name === 'the' && cmd.args[1]?.name === 'event') {
        targetEvent = ctx.event;
      } else if (firstArg) {
        const evaluated = await evaluate(firstArg, ctx);
        if (evaluated?.preventDefault) targetEvent = evaluated;
      }

      if (targetEvent && typeof targetEvent.preventDefault === 'function') {
        targetEvent.preventDefault();
        targetEvent.stopPropagation();
        return { halted: true, eventHalted: true };
      }

      // Regular halt - stop execution
      const haltError = new Error('HALT_EXECUTION');
      (haltError as any).isHalt = true;
      throw haltError;
    }`,

  exit: `
    case 'exit': {
      const exitError = new Error('EXIT_COMMAND');
      (exitError as any).isExit = true;
      throw exitError;
    }`,

  throw: `
    case 'throw': {
      const message = cmd.args[0] ? await evaluate(cmd.args[0], ctx) : 'Error';
      const errorToThrow = message instanceof Error ? message : new Error(String(message));
      throw errorToThrow;
    }`,

  // === Debug Commands ===
  beep: `
    case 'beep': {
      const values = await Promise.all(cmd.args.map((a: any) => evaluate(a, ctx)));
      const displayValues = values.length > 0 ? values : [ctx.it];

      for (const val of displayValues) {
        const typeInfo = val === null ? 'null' :
                        val === undefined ? 'undefined' :
                        Array.isArray(val) ? \`Array[\${val.length}]\` :
                        val instanceof Element ? \`Element<\${val.tagName.toLowerCase()}>\` :
                        typeof val;
        console.log('[beep]', typeInfo + ':', val);
      }
      return displayValues[0];
    }`,

  // === JavaScript Execution ===
  js: `
    case 'js': {
      const codeArg = cmd.args[0];
      let jsCode = '';

      if (codeArg.type === 'string') {
        jsCode = codeArg.value;
      } else if (codeArg.type === 'template') {
        jsCode = await evaluate(codeArg, ctx);
      } else {
        jsCode = String(await evaluate(codeArg, ctx));
      }

      // Build context object for the Function
      const jsContext = {
        me: ctx.me,
        it: ctx.it,
        event: ctx.event,
        target: ctx.target || ctx.me,
        locals: Object.fromEntries(ctx.locals),
        globals: Object.fromEntries(globalVars),
        document: typeof document !== 'undefined' ? document : undefined,
        window: typeof window !== 'undefined' ? window : undefined,
      };

      try {
        const fn = new Function('ctx', \`with(ctx) { return (async () => { \${jsCode} })(); }\`);
        const result = await fn(jsContext);
        ctx.it = result;
        return result;
      } catch (error) {
        console.error('[js] Execution error:', error);
        throw error;
      }
    }`,

  // === Clipboard Commands ===
  copy: `
    case 'copy': {
      const source = await evaluate(cmd.args[0], ctx);
      let textToCopy = '';

      if (typeof source === 'string') {
        textToCopy = source;
      } else if (source instanceof Element) {
        textToCopy = source.textContent || '';
      } else {
        textToCopy = String(source);
      }

      try {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = textToCopy;
          textarea.style.cssText = 'position:fixed;top:0;left:-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }

        if (ctx.me instanceof Element) {
          ctx.me.dispatchEvent(new CustomEvent('copy:success', {
            bubbles: true,
            detail: { text: textToCopy }
          }));
        }
        ctx.it = textToCopy;
        return textToCopy;
      } catch (error) {
        if (ctx.me instanceof Element) {
          ctx.me.dispatchEvent(new CustomEvent('copy:error', {
            bubbles: true,
            detail: { error }
          }));
        }
        throw error;
      }
    }`,

  // === URL Navigation Commands ===
  push: `
    case 'push':
    case 'push-url': {
      // Handle "push url '/path'" pattern
      let urlArg = cmd.args[0];
      if (urlArg?.type === 'identifier' && urlArg.name === 'url') {
        urlArg = cmd.args[1];
      }

      const url = String(await evaluate(urlArg, ctx));
      let title = '';

      // Check for "with title" modifier
      if (cmd.modifiers?.title) {
        title = String(await evaluate(cmd.modifiers.title, ctx));
      }

      window.history.pushState(null, '', url);
      if (title) document.title = title;

      window.dispatchEvent(new CustomEvent('lokascript:pushurl', {
        detail: { url, title }
      }));

      return { url, title, mode: 'push' };
    }`,

  replace: `
    case 'replace':
    case 'replace-url': {
      // Handle "replace url '/path'" pattern
      let urlArg = cmd.args[0];
      if (urlArg?.type === 'identifier' && urlArg.name === 'url') {
        urlArg = cmd.args[1];
      }

      const url = String(await evaluate(urlArg, ctx));
      let title = '';

      // Check for "with title" modifier
      if (cmd.modifiers?.title) {
        title = String(await evaluate(cmd.modifiers.title, ctx));
      }

      window.history.replaceState(null, '', url);
      if (title) document.title = title;

      window.dispatchEvent(new CustomEvent('lokascript:replaceurl', {
        detail: { url, title }
      }));

      return { url, title, mode: 'replace' };
    }`,
};

/**
 * Block implementations as switch case code snippets.
 * Each block is a complete case block for the executeBlock switch.
 */
const BLOCK_IMPLEMENTATIONS_TS: Record<string, string> = {
  if: `
    case 'if': {
      const condition = await evaluate(block.condition!, ctx);
      if (condition) {
        return executeSequenceWithBlocks(block.body, ctx);
      } else if (block.elseBody) {
        return executeSequenceWithBlocks(block.elseBody, ctx);
      }
      return null;
    }`,

  repeat: `
    case 'repeat': {
      const count = await evaluate(block.condition!, ctx);
      const n = typeof count === 'number' ? count : parseInt(String(count));
      for (let i = 0; i < n && i < MAX_LOOP_ITERATIONS; i++) {
        ctx.locals.set('__loop_index__', i);
        ctx.locals.set('__loop_count__', i + 1);
        try {
          await executeSequenceWithBlocks(block.body, ctx);
        } catch (e: any) {
          if (e?.type === 'break') break;
          if (e?.type === 'continue') continue;
          throw e;
        }
      }
      return null;
    }`,

  for: `
    case 'for': {
      const { variable, iterable } = block.condition as any;
      const items = await evaluate(iterable, ctx);
      const arr = Array.isArray(items) ? items : items instanceof NodeList ? Array.from(items) : [items];
      const varName = variable.startsWith(':') ? variable.slice(1) : variable;
      for (let i = 0; i < arr.length && i < MAX_LOOP_ITERATIONS; i++) {
        ctx.locals.set(varName, arr[i]);
        ctx.locals.set('__loop_index__', i);
        ctx.locals.set('__loop_count__', i + 1);
        try {
          await executeSequenceWithBlocks(block.body, ctx);
        } catch (e: any) {
          if (e?.type === 'break') break;
          if (e?.type === 'continue') continue;
          throw e;
        }
      }
      return null;
    }`,

  while: `
    case 'while': {
      let iterations = 0;
      while (await evaluate(block.condition!, ctx) && iterations < MAX_LOOP_ITERATIONS) {
        ctx.locals.set('__loop_index__', iterations);
        try {
          await executeSequenceWithBlocks(block.body, ctx);
        } catch (e: any) {
          if (e?.type === 'break') break;
          if (e?.type === 'continue') { iterations++; continue; }
          throw e;
        }
        iterations++;
      }
      return null;
    }`,

  fetch: `
    case 'fetch': {
      const { url, responseType } = block.condition as any;
      try {
        const urlVal = await evaluate(url, ctx);
        const response = await fetch(String(urlVal));
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);

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

        await executeSequenceWithBlocks(block.body, ctx);
      } catch (error: any) {
        if (error?.type === 'return') throw error;
        ctx.locals.set('error', error);
        console.error('Fetch error:', error);
      }
      return null;
    }`,
};

/**
 * Commands that require style property helpers (isStyleProp, setStyleProp)
 */
export const STYLE_COMMANDS = ['set', 'put', 'increment', 'decrement'];

/**
 * Commands that require toElementArray helper
 */
export const ELEMENT_ARRAY_COMMANDS = ['put', 'increment', 'decrement'];

/**
 * Commands that require morphlex import for DOM morphing
 */
export const MORPH_COMMANDS = ['morph'];

/**
 * Get command implementations for the specified format.
 * @param format 'ts' for TypeScript, 'js' for JavaScript
 */
export function getCommandImplementations(format: CodeFormat = 'ts'): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, code] of Object.entries(COMMAND_IMPLEMENTATIONS_TS)) {
    result[name] = stripTypes(code, format);
  }
  return result;
}

/**
 * Get block implementations for the specified format.
 * @param format 'ts' for TypeScript, 'js' for JavaScript
 */
export function getBlockImplementations(format: CodeFormat = 'ts'): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, code] of Object.entries(BLOCK_IMPLEMENTATIONS_TS)) {
    result[name] = stripTypes(code, format);
  }
  return result;
}

/**
 * Get list of all available commands
 */
export function getAvailableCommands(): string[] {
  return Object.keys(COMMAND_IMPLEMENTATIONS_TS);
}

/**
 * Get list of all available blocks
 */
export function getAvailableBlocks(): string[] {
  return Object.keys(BLOCK_IMPLEMENTATIONS_TS);
}

// Re-export for backwards compatibility (TypeScript format)
export const COMMAND_IMPLEMENTATIONS = COMMAND_IMPLEMENTATIONS_TS;
export const BLOCK_IMPLEMENTATIONS = BLOCK_IMPLEMENTATIONS_TS;
