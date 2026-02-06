/**
 * Command Transforms
 *
 * Transforms hyperscript command AST nodes to JavaScript code.
 * Each command has a dedicated code generator.
 */

import type {
  ASTNode,
  CommandNode,
  CodegenContext,
  GeneratedExpression,
  SelectorNode,
  VariableNode,
  IfNode,
  RepeatNode,
  ForEachNode,
  WhileNode,
} from '../types/aot-types.js';
import {
  ExpressionCodegen,
  sanitizeClassName,
  sanitizeSelector,
  sanitizeIdentifier,
} from './expression-transforms.js';

// =============================================================================
// COMMAND CODEGEN INTERFACE
// =============================================================================

/**
 * Interface for command code generators.
 */
export interface CommandCodegen {
  /** Command name this generator handles */
  readonly command: string;

  /** Generate JavaScript for this command */
  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null;
}

// =============================================================================
// COMMAND GENERATOR IMPLEMENTATIONS
// =============================================================================

/**
 * Toggle command: toggle .class [on target]
 */
class ToggleCodegen implements CommandCodegen {
  readonly command = 'toggle';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    const arg = args[0];

    // Class toggle: .active
    if (arg.type === 'selector') {
      const selector = (arg as SelectorNode).value;
      if (selector.startsWith('.')) {
        const className = sanitizeClassName(selector.slice(1));
        if (!className) return null;

        if (target === '_ctx.me') {
          return {
            code: `_ctx.me.classList.toggle('${className}')`,
            async: false,
            sideEffects: true,
          };
        }

        // Multiple elements
        return {
          code: `Array.from(document.querySelectorAll('${sanitizeSelector(selector.slice(1))}')).forEach(el => el.classList.toggle('${className}'))`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Attribute toggle: @disabled
    if (arg.type === 'identifier') {
      const value = (arg as { value?: string }).value ?? '';
      if (value.startsWith('@')) {
        const attrName = value.slice(1);
        ctx.requireHelper('toggleAttr');
        return {
          code: `_rt.toggleAttr(${target}, '${sanitizeSelector(attrName)}')`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Generic toggle
    ctx.requireHelper('toggle');
    return {
      code: `_rt.toggle(${ctx.generateExpression(arg)}, ${target})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Add command: add .class [to target]
 */
class AddCodegen implements CommandCodegen {
  readonly command = 'add';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    const arg = args[0];

    // Class add: .active
    if (arg.type === 'selector') {
      const selector = (arg as SelectorNode).value;
      if (selector.startsWith('.')) {
        const className = sanitizeClassName(selector.slice(1));
        if (!className) return null;

        if (target === '_ctx.me') {
          return {
            code: `_ctx.me.classList.add('${className}')`,
            async: false,
            sideEffects: true,
          };
        }

        return {
          code: `${target}.classList.add('${className}')`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // HTML element creation: <div.class/>
    if (arg.type === 'htmlLiteral' || (arg as { tag?: string }).tag) {
      const tagNode = arg as {
        tag?: string;
        classes?: string[];
        id?: string;
        attributes?: Record<string, string>;
      };
      const tag = tagNode.tag ?? 'div';
      const classes = tagNode.classes ?? [];
      const id = tagNode.id;

      let code = `(() => { const _el = document.createElement('${tag}');`;
      if (classes.length > 0) {
        code += ` _el.className = '${classes.join(' ')}';`;
      }
      if (id) {
        code += ` _el.id = '${id}';`;
      }
      code += ` ${target}.appendChild(_el); return _el; })()`;

      return { code, async: false, sideEffects: true };
    }

    // Attribute add
    ctx.requireHelper('addClass');
    return {
      code: `_rt.addClass(${target}, ${ctx.generateExpression(arg)})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Remove command: remove .class [from target] or remove element
 */
class RemoveCodegen implements CommandCodegen {
  readonly command = 'remove';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];

    // No args = remove the element itself
    if (args.length === 0) {
      const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';
      return {
        code: `${target}.remove()`,
        async: false,
        sideEffects: true,
      };
    }

    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    const arg = args[0];

    // Class remove: .active
    if (arg.type === 'selector') {
      const selector = (arg as SelectorNode).value;
      if (selector.startsWith('.')) {
        const className = sanitizeClassName(selector.slice(1));
        if (!className) return null;

        return {
          code: `${target}.classList.remove('${className}')`,
          async: false,
          sideEffects: true,
        };
      }
    }

    ctx.requireHelper('removeClass');
    return {
      code: `_rt.removeClass(${target}, ${ctx.generateExpression(arg)})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Set command: set :var to value or set element's property to value
 */
class SetCodegen implements CommandCodegen {
  readonly command = 'set';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const modifiers = node.modifiers as Record<string, ASTNode> | undefined;
    const roles = node.roles;

    // Resolve target and value from roles, modifiers, or args
    const targetNode = roles?.destination ?? args[0];
    const valueNode = roles?.patient ?? (modifiers?.to as ASTNode) ?? args[1];

    if (!targetNode || !valueNode) return null;

    const value = ctx.generateExpression(valueNode);

    // Local variable: :varName
    if (targetNode.type === 'variable') {
      const varNode = targetNode as VariableNode;
      const name = varNode.name.startsWith(':') ? varNode.name.slice(1) : varNode.name;
      const safeName = sanitizeIdentifier(name);

      if (varNode.scope === 'local') {
        return {
          code: `_ctx.locals.set('${safeName}', ${value})`,
          async: false,
          sideEffects: true,
        };
      }

      if (varNode.scope === 'global') {
        ctx.requireHelper('globals');
        return {
          code: `_rt.globals.set('${safeName}', ${value})`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Property assignment: element's property
    if (targetNode.type === 'possessive') {
      const obj = ctx.generateExpression((targetNode as unknown as { object: ASTNode }).object);
      const prop = (targetNode as unknown as { property: string }).property;

      // Style property
      if (prop.startsWith('*')) {
        const styleProp = prop.slice(1);
        return {
          code: `${obj}.style.${styleProp} = ${value}`,
          async: false,
          sideEffects: true,
        };
      }

      // Attribute
      if (prop.startsWith('@')) {
        const attrName = prop.slice(1);
        return {
          code: `${obj}.setAttribute('${sanitizeSelector(attrName)}', ${value})`,
          async: false,
          sideEffects: true,
        };
      }

      return {
        code: `${obj}.${sanitizeIdentifier(prop)} = ${value}`,
        async: false,
        sideEffects: true,
      };
    }

    // Member expression assignment
    if (targetNode.type === 'member') {
      const memberCode = ctx.generateExpression(targetNode);
      return {
        code: `${memberCode} = ${value}`,
        async: false,
        sideEffects: true,
      };
    }

    return null;
  }
}

/**
 * Put command: put value into/before/after target
 */
class PutCodegen implements CommandCodegen {
  readonly command = 'put';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const modifiers = node.modifiers as Record<string, unknown> | undefined;

    // Resolve content from roles or args
    const contentNode = roles?.patient ?? args[0];
    if (!contentNode) return null;

    const content = ctx.generateExpression(contentNode as ASTNode);

    // Resolve target: from roles, or from the modifier value, or from node.target
    let target = '_ctx.me';
    if (roles?.destination) {
      target = ctx.generateExpression(roles.destination);
    } else if (modifiers) {
      // Semantic parser uses modifier keys as position: modifiers.into = target, modifiers.before = target
      for (const key of ['into', 'before', 'after']) {
        if (modifiers[key] && typeof modifiers[key] === 'object') {
          target = ctx.generateExpression(modifiers[key] as ASTNode);
          break;
        }
      }
    }
    if (target === '_ctx.me' && node.target) {
      target = ctx.generateExpression(node.target);
    }

    // Detect position: from roles.method, modifier keys, or modifiers.position
    let modifier = 'into';
    if (roles?.method && (roles.method as { value?: unknown }).value) {
      modifier = String((roles.method as { value?: unknown }).value);
    } else if (modifiers) {
      if (modifiers.before) modifier = 'before';
      else if (modifiers.after) modifier = 'after';
      else if (typeof modifiers.position === 'string') modifier = modifiers.position;
    }

    switch (modifier) {
      case 'into':
        return {
          code: `${target}.innerHTML = ${content}`,
          async: false,
          sideEffects: true,
        };
      case 'before':
        return {
          code: `${target}.insertAdjacentHTML('beforebegin', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'after':
        return {
          code: `${target}.insertAdjacentHTML('afterend', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'at start of':
      case 'start':
        return {
          code: `${target}.insertAdjacentHTML('afterbegin', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'at end of':
      case 'end':
        return {
          code: `${target}.insertAdjacentHTML('beforeend', ${content})`,
          async: false,
          sideEffects: true,
        };
      default:
        return {
          code: `${target}.innerHTML = ${content}`,
          async: false,
          sideEffects: true,
        };
    }
  }
}

/**
 * Show command: show [target]
 */
class ShowCodegen implements CommandCodegen {
  readonly command = 'show';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    return {
      code: `${target}.style.display = ''`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Hide command: hide [target]
 */
class HideCodegen implements CommandCodegen {
  readonly command = 'hide';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    return {
      code: `${target}.style.display = 'none'`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Focus command: focus [target]
 */
class FocusCodegen implements CommandCodegen {
  readonly command = 'focus';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    return {
      code: `${target}.focus()`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Blur command: blur [target]
 */
class BlurCodegen implements CommandCodegen {
  readonly command = 'blur';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    return {
      code: `${target}.blur()`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Log command: log value [, value2, ...]
 */
class LogCodegen implements CommandCodegen {
  readonly command = 'log';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const args = node.args ?? [];
    const values = args.map(arg => ctx.generateExpression(arg)).join(', ');

    return {
      code: `console.log(${values || "''"})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Wait command: wait 100ms or wait for event
 */
class WaitCodegen implements CommandCodegen {
  readonly command = 'wait';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const arg = (roles?.duration ?? args[0]) as ASTNode | undefined;
    if (!arg) return null;

    // Duration wait: wait 100ms
    if (arg.type === 'literal') {
      const value = (arg as unknown as { value: unknown }).value;
      if (typeof value === 'number') {
        ctx.requireHelper('wait');
        return {
          code: `await _rt.wait(${value})`,
          async: true,
          sideEffects: false,
        };
      }
      // String duration like "100ms"
      if (typeof value === 'string') {
        const ms = parseDuration(value);
        if (ms !== null) {
          ctx.requireHelper('wait');
          return {
            code: `await _rt.wait(${ms})`,
            async: true,
            sideEffects: false,
          };
        }
      }
    }

    // Expression duration
    const duration = ctx.generateExpression(arg);
    ctx.requireHelper('wait');
    return {
      code: `await _rt.wait(${duration})`,
      async: true,
      sideEffects: false,
    };
  }
}

/**
 * Fetch command: fetch url [as json/text/html]
 */
class FetchCodegen implements CommandCodegen {
  readonly command = 'fetch';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const modifiers = node.modifiers as Record<string, unknown> | undefined;

    // Resolve URL from roles or args
    const urlNode = roles?.source ?? args[0];
    if (!urlNode) return null;

    const url = ctx.generateExpression(urlNode as ASTNode);

    // Resolve response format from roles, modifiers (node or string)
    let format = 'text';
    if (roles?.responseType) {
      const rt = roles.responseType as { value?: unknown; name?: string };
      format = String(rt.name ?? rt.value ?? 'text');
    } else if (modifiers?.as) {
      const asVal = modifiers.as;
      if (typeof asVal === 'string') {
        format = asVal;
      } else if (typeof asVal === 'object' && asVal !== null) {
        format = String(
          (asVal as { name?: string; value?: unknown }).name ??
            (asVal as { value?: unknown }).value ??
            'text'
        );
      }
    }

    switch (format) {
      case 'json':
        ctx.requireHelper('fetchJSON');
        return {
          code: `_ctx.it = await _rt.fetchJSON(${url})`,
          async: true,
          sideEffects: true,
        };
      case 'html':
        ctx.requireHelper('fetchHTML');
        return {
          code: `_ctx.it = await _rt.fetchHTML(${url})`,
          async: true,
          sideEffects: true,
        };
      case 'text':
      default:
        ctx.requireHelper('fetchText');
        return {
          code: `_ctx.it = await _rt.fetchText(${url})`,
          async: true,
          sideEffects: true,
        };
    }
  }
}

/**
 * Send/Trigger command: send eventName [to target]
 */
class SendCodegen implements CommandCodegen {
  readonly command = 'send';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const eventName = ctx.generateExpression(args[0]);
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    const detail = args.length > 1 ? ctx.generateExpression(args[1]) : 'undefined';

    ctx.requireHelper('send');
    return {
      code: `_rt.send(${target}, ${eventName}, ${detail})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Increment command: increment :var [by amount]
 */
class IncrementCodegen implements CommandCodegen {
  readonly command = 'increment';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const modifiers = node.modifiers as Record<string, unknown> | undefined;

    const target = roles?.destination ?? roles?.patient ?? args[0];
    if (!target) return null;

    // Resolve amount from roles.quantity, modifiers.by, or args[1]
    const amountNode = roles?.quantity ?? (modifiers?.by as ASTNode) ?? args[1];
    const amount = amountNode ? ctx.generateExpression(amountNode as ASTNode) : '1';

    if (target.type === 'variable') {
      const varNode = target as VariableNode;
      const name = varNode.name.startsWith(':') ? varNode.name.slice(1) : varNode.name;
      const safeName = sanitizeIdentifier(name);

      if (varNode.scope === 'local') {
        return {
          code: `_ctx.locals.set('${safeName}', (_ctx.locals.get('${safeName}') || 0) + ${amount})`,
          async: false,
          sideEffects: true,
        };
      }

      if (varNode.scope === 'global') {
        ctx.requireHelper('globals');
        return {
          code: `_rt.globals.set('${safeName}', (_rt.globals.get('${safeName}') || 0) + ${amount})`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Element textContent
    const targetCode = ctx.generateExpression(target);
    return {
      code: `${targetCode}.textContent = (parseFloat(${targetCode}.textContent) || 0) + ${amount}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Decrement command: decrement :var [by amount]
 */
class DecrementCodegen implements CommandCodegen {
  readonly command = 'decrement';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const modifiers = node.modifiers as Record<string, unknown> | undefined;

    const target = roles?.destination ?? roles?.patient ?? args[0];
    if (!target) return null;

    // Resolve amount from roles.quantity, modifiers.by, or args[1]
    const amountNode = roles?.quantity ?? (modifiers?.by as ASTNode) ?? args[1];
    const amount = amountNode ? ctx.generateExpression(amountNode as ASTNode) : '1';

    if (target.type === 'variable') {
      const varNode = target as VariableNode;
      const name = varNode.name.startsWith(':') ? varNode.name.slice(1) : varNode.name;
      const safeName = sanitizeIdentifier(name);

      if (varNode.scope === 'local') {
        return {
          code: `_ctx.locals.set('${safeName}', (_ctx.locals.get('${safeName}') || 0) - ${amount})`,
          async: false,
          sideEffects: true,
        };
      }

      if (varNode.scope === 'global') {
        ctx.requireHelper('globals');
        return {
          code: `_rt.globals.set('${safeName}', (_rt.globals.get('${safeName}') || 0) - ${amount})`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Element textContent
    const targetCode = ctx.generateExpression(target);
    return {
      code: `${targetCode}.textContent = (parseFloat(${targetCode}.textContent) || 0) - ${amount}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Halt command: halt (prevents default and stops execution)
 */
class HaltCodegen implements CommandCodegen {
  readonly command = 'halt';

  generate(_node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    ctx.requireHelper('HALT');
    return {
      code: `throw _rt.HALT`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Exit command: exit (stops execution without preventing default)
 */
class ExitCodegen implements CommandCodegen {
  readonly command = 'exit';

  generate(_node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    ctx.requireHelper('EXIT');
    return {
      code: `throw _rt.EXIT`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Return command: return [value]
 */
class ReturnCodegen implements CommandCodegen {
  readonly command = 'return';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const args = node.args ?? [];
    const value = args.length > 0 ? ctx.generateExpression(args[0]) : 'undefined';

    return {
      code: `return ${value}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Call command: call function() or call behavior
 */
class CallCodegen implements CommandCodegen {
  readonly command = 'call';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const fn = ctx.generateExpression(args[0]);
    return {
      code: fn,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Scroll command: scroll [to target] or scroll target into view
 */
class ScrollCodegen implements CommandCodegen {
  readonly command = 'scroll';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    const behavior = (node.modifiers as { smooth?: boolean })?.smooth ? "'smooth'" : "'auto'";

    return {
      code: `${target}.scrollIntoView({ behavior: ${behavior} })`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Take command: take .class [from others]
 */
class TakeCodegen implements CommandCodegen {
  readonly command = 'take';

  generate(node: CommandNode, _ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const arg = args[0];
    if (arg.type !== 'selector') return null;

    const selector = (arg as SelectorNode).value;
    if (!selector.startsWith('.')) return null;

    const className = sanitizeClassName(selector.slice(1));
    if (!className) return null;

    // Remove from siblings, add to me
    return {
      code: `(() => { const _me = _ctx.me; _me.parentElement?.querySelectorAll('.${className}').forEach(el => el.classList.remove('${className}')); _me.classList.add('${className}'); })()`,
      async: false,
      sideEffects: true,
    };
  }
}

// =============================================================================
// CONTROL FLOW GENERATORS
// =============================================================================

/**
 * Generate code for if/else statements.
 */
export function generateIf(
  node: IfNode,
  ctx: CodegenContext,
  generateBody: (nodes: ASTNode[]) => string
): string {
  const exprCodegen = new ExpressionCodegen(ctx);
  const condition = exprCodegen.generate(node.condition);
  const thenBody = generateBody(node.thenBranch);

  let code = `if (${condition}) {\n${thenBody}\n}`;

  // Handle else-if branches
  if (node.elseIfBranches) {
    for (const branch of node.elseIfBranches) {
      const branchCondition = exprCodegen.generate(branch.condition);
      const branchBody = generateBody(branch.body);
      code += ` else if (${branchCondition}) {\n${branchBody}\n}`;
    }
  }

  // Handle else branch
  if (node.elseBranch) {
    const elseBody = generateBody(node.elseBranch);
    code += ` else {\n${elseBody}\n}`;
  }

  return code;
}

/**
 * Generate code for repeat loops.
 */
export function generateRepeat(
  node: RepeatNode,
  ctx: CodegenContext,
  generateBody: (nodes: ASTNode[]) => string
): string {
  const exprCodegen = new ExpressionCodegen(ctx);
  const body = generateBody(node.body);

  // Fixed count: repeat 5 times
  if (node.count !== undefined) {
    const count =
      typeof node.count === 'number' ? String(node.count) : exprCodegen.generate(node.count);

    return `for (let _i = 0; _i < ${count}; _i++) {
  _ctx.locals.set('index', _i);
${body}
}`;
  }

  // While condition: repeat while condition
  if (node.whileCondition) {
    const condition = exprCodegen.generate(node.whileCondition);
    return `while (${condition}) {\n${body}\n}`;
  }

  // Infinite loop (should have break inside)
  return `while (true) {\n${body}\n}`;
}

/**
 * Generate code for for-each loops.
 */
export function generateForEach(
  node: ForEachNode,
  ctx: CodegenContext,
  generateBody: (nodes: ASTNode[]) => string
): string {
  const exprCodegen = new ExpressionCodegen(ctx);
  const collection = exprCodegen.generate(node.collection);
  const itemName = sanitizeIdentifier(node.itemName);
  const indexName = node.indexName ? sanitizeIdentifier(node.indexName) : 'index';
  const body = generateBody(node.body);

  return `{
  const _collection = ${collection};
  const _arr = Array.isArray(_collection) ? _collection : Array.from(_collection);
  for (let _i = 0; _i < _arr.length; _i++) {
    _ctx.locals.set('${itemName}', _arr[_i]);
    _ctx.locals.set('${indexName}', _i);
${body}
  }
}`;
}

/**
 * Generate code for while loops.
 */
export function generateWhile(
  node: WhileNode,
  ctx: CodegenContext,
  generateBody: (nodes: ASTNode[]) => string
): string {
  const exprCodegen = new ExpressionCodegen(ctx);
  const condition = exprCodegen.generate(node.condition);
  const body = generateBody(node.body);

  return `while (${condition}) {\n${body}\n}`;
}

// =============================================================================
// COMMAND REGISTRY
// =============================================================================

/**
 * Registry of command code generators.
 */
export const commandCodegens = new Map<string, CommandCodegen>([
  ['toggle', new ToggleCodegen()],
  ['add', new AddCodegen()],
  ['remove', new RemoveCodegen()],
  ['set', new SetCodegen()],
  ['put', new PutCodegen()],
  ['show', new ShowCodegen()],
  ['hide', new HideCodegen()],
  ['focus', new FocusCodegen()],
  ['blur', new BlurCodegen()],
  ['log', new LogCodegen()],
  ['wait', new WaitCodegen()],
  ['fetch', new FetchCodegen()],
  ['send', new SendCodegen()],
  ['trigger', new SendCodegen()], // Alias
  ['increment', new IncrementCodegen()],
  ['decrement', new DecrementCodegen()],
  ['halt', new HaltCodegen()],
  ['exit', new ExitCodegen()],
  ['return', new ReturnCodegen()],
  ['call', new CallCodegen()],
  ['scroll', new ScrollCodegen()],
  ['take', new TakeCodegen()],
]);

/**
 * Generate code for a command.
 */
export function generateCommand(
  node: CommandNode,
  ctx: CodegenContext
): GeneratedExpression | null {
  const codegen = commandCodegens.get(node.name);
  if (!codegen) {
    return null;
  }
  return codegen.generate(node, ctx);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Parse a duration string like "100ms" or "2s" to milliseconds.
 */
function parseDuration(duration: string): number | null {
  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h)?$/i.exec(duration.trim());
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60000;
    case 'h':
      return value * 3600000;
    default:
      return value;
  }
}

export default commandCodegens;
