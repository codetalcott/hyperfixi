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
  HtmlLiteralNode,
  IdentifierNode,
  LiteralNode,
  SelectorNode,
  VariableNode,
  PossessiveNode,
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
    if (arg.type === 'htmlLiteral') {
      const tagNode = arg as HtmlLiteralNode;
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
      const possessive = targetNode as PossessiveNode;
      const obj = ctx.generateExpression(possessive.object);
      const prop = possessive.property;

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
      const value = (arg as LiteralNode).value;
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
// ADDITIONAL COMMAND IMPLEMENTATIONS
// =============================================================================

/**
 * Unless command: unless condition (negated if — generates guard check)
 */
class UnlessCodegen implements CommandCodegen {
  readonly command = 'unless';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    if (args.length === 0) return null;

    const condition = ctx.generateExpression(args[0]);
    return {
      code: `if (!(${condition}))`,
      async: false,
      sideEffects: false,
    };
  }
}

/**
 * Throw command: throw "message" or throw expression
 */
class ThrowCodegen implements CommandCodegen {
  readonly command = 'throw';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const args = node.args ?? [];
    const value = args.length > 0 ? ctx.generateExpression(args[0]) : "'Error'";

    return {
      code: `throw new Error(${value})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Default command: default :var to value (set if undefined/null)
 */
class DefaultCodegen implements CommandCodegen {
  readonly command = 'default';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const modifiers = node.modifiers as Record<string, ASTNode> | undefined;

    const targetNode = roles?.destination ?? args[0];
    const valueNode = roles?.patient ?? (modifiers?.to as ASTNode) ?? args[1];

    if (!targetNode || !valueNode) return null;

    const value = ctx.generateExpression(valueNode);

    if (targetNode.type === 'variable') {
      const varNode = targetNode as VariableNode;
      const name = varNode.name.startsWith(':') ? varNode.name.slice(1) : varNode.name;
      const safeName = sanitizeIdentifier(name);

      if (varNode.scope === 'local') {
        return {
          code: `if (_ctx.locals.get('${safeName}') == null) _ctx.locals.set('${safeName}', ${value})`,
          async: false,
          sideEffects: true,
        };
      }

      if (varNode.scope === 'global') {
        ctx.requireHelper('globals');
        return {
          code: `if (_rt.globals.get('${safeName}') == null) _rt.globals.set('${safeName}', ${value})`,
          async: false,
          sideEffects: true,
        };
      }
    }

    return null;
  }
}

/**
 * Go command: go to url, go back, go forward
 */
class GoCodegen implements CommandCodegen {
  readonly command = 'go';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const target = roles?.destination ?? args[0];
    if (!target) return null;

    // go back / go forward
    if (target.type === 'identifier') {
      const name = (target as IdentifierNode).value;
      if (name === 'back') {
        return { code: 'history.back()', async: false, sideEffects: true };
      }
      if (name === 'forward') {
        return { code: 'history.forward()', async: false, sideEffects: true };
      }
    }

    // go to url
    const url = ctx.generateExpression(target);
    return {
      code: `window.location.href = ${url}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Append command: append content to target
 */
class AppendCodegen implements CommandCodegen {
  readonly command = 'append';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const contentNode = roles?.patient ?? args[0];
    if (!contentNode) return null;

    const content = ctx.generateExpression(contentNode);
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    return {
      code: `${target}.insertAdjacentHTML('beforeend', ${content})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Pick command: pick random item from collection
 */
class PickCodegen implements CommandCodegen {
  readonly command = 'pick';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const collection = roles?.source ?? args[0];
    if (!collection) return null;

    const arr = ctx.generateExpression(collection);
    return {
      code: `_ctx.it = (() => { const _a = ${arr}; return _a[Math.floor(Math.random() * _a.length)]; })()`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Push URL command: push url to browser history
 */
class PushUrlCodegen implements CommandCodegen {
  readonly command = 'push-url';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const urlNode = roles?.destination ?? args[0];
    if (!urlNode) return null;

    const url = ctx.generateExpression(urlNode);
    return {
      code: `history.pushState({}, '', ${url})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Replace URL command: replace url in browser history
 */
class ReplaceUrlCodegen implements CommandCodegen {
  readonly command = 'replace-url';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const urlNode = roles?.destination ?? args[0];
    if (!urlNode) return null;

    const url = ctx.generateExpression(urlNode);
    return {
      code: `history.replaceState({}, '', ${url})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Get command: get expression (evaluates and stores in `it`/`result`)
 */
class GetCodegen implements CommandCodegen {
  readonly command = 'get';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const expr = roles?.patient ?? args[0];
    if (!expr) return null;

    const value = ctx.generateExpression(expr);
    return {
      code: `_ctx.it = _ctx.result = ${value}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Break command: break out of a loop
 */
class BreakCodegen implements CommandCodegen {
  readonly command = 'break';

  generate(_node: CommandNode, _ctx: CodegenContext): GeneratedExpression {
    return {
      code: 'break',
      async: false,
      sideEffects: false,
    };
  }
}

/**
 * Continue command: skip to next iteration of a loop
 */
class ContinueCodegen implements CommandCodegen {
  readonly command = 'continue';

  generate(_node: CommandNode, _ctx: CodegenContext): GeneratedExpression {
    return {
      code: 'continue',
      async: false,
      sideEffects: false,
    };
  }
}

/**
 * Beep command: debug helper — logs expression with formatting
 */
class BeepCodegen implements CommandCodegen {
  readonly command = 'beep';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const args = node.args ?? [];
    const roles = node.roles;

    const expr = roles?.patient ?? args[0];
    if (!expr) {
      return {
        code: `console.log('%c[beep]', 'color: orange; font-weight: bold')`,
        async: false,
        sideEffects: true,
      };
    }

    const value = ctx.generateExpression(expr);
    return {
      code: `console.log('%c[beep]', 'color: orange; font-weight: bold', ${value})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Js command: inline JavaScript block — passes through code string
 */
class JsCodegen implements CommandCodegen {
  readonly command = 'js';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    // The js command body is typically passed as a literal string or the first arg
    const bodyNode = roles?.patient ?? args[0];
    if (!bodyNode) return null;

    if (bodyNode.type === 'literal') {
      const code = (bodyNode as LiteralNode).value;
      if (typeof code === 'string') {
        // Inline the JS directly — it runs in handler scope with _ctx available
        return {
          code: `(function(_ctx) { ${code} })(_ctx)`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Expression form: evaluate and store result
    const value = ctx.generateExpression(bodyNode);
    return {
      code: `_ctx.it = _ctx.result = ${value}`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Copy command: copy text to clipboard
 */
class CopyCodegen implements CommandCodegen {
  readonly command = 'copy';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const contentNode = roles?.patient ?? args[0];
    if (!contentNode) return null;

    const content = ctx.generateExpression(contentNode);
    return {
      code: `await navigator.clipboard.writeText(String(${content}))`,
      async: true,
      sideEffects: true,
    };
  }
}

/**
 * Make command: create a DOM element — `make <tag/> then ...`
 */
class MakeCodegen implements CommandCodegen {
  readonly command = 'make';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const targetNode = roles?.patient ?? args[0];
    if (!targetNode) return null;

    // HTML literal: make <div.foo#bar/>
    if (targetNode.type === 'htmlLiteral') {
      const tagNode = targetNode as HtmlLiteralNode;
      const tag = tagNode.tag ?? 'div';
      const classes = tagNode.classes ?? [];
      const id = tagNode.id;
      const attrs = tagNode.attributes ?? {};

      let code = `(() => { const _el = document.createElement('${tag}');`;
      if (classes.length > 0) {
        code += ` _el.className = '${classes.join(' ')}';`;
      }
      if (id) {
        code += ` _el.id = '${sanitizeIdentifier(id)}';`;
      }
      for (const [attr, val] of Object.entries(attrs)) {
        code += ` _el.setAttribute('${sanitizeSelector(attr)}', '${sanitizeSelector(val)}');`;
      }
      code += ` return _el; })()`;

      return {
        code: `_ctx.it = _ctx.result = ${code}`,
        async: false,
        sideEffects: true,
      };
    }

    // String tag name: make "div"
    if (targetNode.type === 'literal') {
      const tag = (targetNode as LiteralNode).value;
      if (typeof tag === 'string') {
        return {
          code: `_ctx.it = _ctx.result = document.createElement('${sanitizeSelector(tag)}')`,
          async: false,
          sideEffects: true,
        };
      }
    }

    // Dynamic: make expr
    const expr = ctx.generateExpression(targetNode);
    return {
      code: `_ctx.it = _ctx.result = document.createElement(${expr})`,
      async: false,
      sideEffects: true,
    };
  }
}

// =============================================================================
// SWAP / MORPH COMMANDS
// =============================================================================

/**
 * Swap command: swap [strategy] of target with content
 *
 * Strategies: innerHTML (default), outerHTML, beforeBegin, afterBegin, beforeEnd, afterEnd, delete, morph
 */
class SwapCodegen implements CommandCodegen {
  readonly command = 'swap';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    // delete strategy: swap delete target
    if (
      args.length > 0 &&
      args[0].type === 'identifier' &&
      (args[0] as IdentifierNode).value === 'delete'
    ) {
      const targetNode = args[1] ?? node.target;
      if (!targetNode) return null;
      const target = ctx.generateExpression(targetNode);
      return { code: `${target}.remove()`, async: false, sideEffects: true };
    }

    const contentNode = roles?.patient ?? args[args.length - 1];
    const targetNode = roles?.destination ?? node.target ?? args[0];

    if (!targetNode || !contentNode) return null;

    const target = ctx.generateExpression(targetNode);
    const content = ctx.generateExpression(contentNode);

    // Determine strategy from modifiers or args
    const strategy = this.resolveStrategy(node, args);

    switch (strategy) {
      case 'outerHTML':
        return { code: `${target}.outerHTML = ${content}`, async: false, sideEffects: true };
      case 'beforebegin':
        return {
          code: `${target}.insertAdjacentHTML('beforebegin', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'afterbegin':
        return {
          code: `${target}.insertAdjacentHTML('afterbegin', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'beforeend':
        return {
          code: `${target}.insertAdjacentHTML('beforeend', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'afterend':
        return {
          code: `${target}.insertAdjacentHTML('afterend', ${content})`,
          async: false,
          sideEffects: true,
        };
      case 'morph':
        ctx.requireHelper('morph');
        return { code: `_rt.morph(${target}, ${content})`, async: false, sideEffects: true };
      case 'innerHTML':
      default:
        return { code: `${target}.innerHTML = ${content}`, async: false, sideEffects: true };
    }
  }

  private resolveStrategy(node: CommandNode, args: ASTNode[]): string {
    // Check modifiers for strategy
    const mods = node.modifiers as Record<string, unknown> | undefined;
    if (mods?.strategy && typeof mods.strategy === 'string') return mods.strategy.toLowerCase();

    // Check first arg for strategy keyword
    if (args.length >= 2 && args[0].type === 'identifier') {
      const name = ((args[0] as IdentifierNode).value ?? '').toLowerCase();
      const strategies: Record<string, string> = {
        innerhtml: 'innerHTML',
        outerhtml: 'outerHTML',
        morph: 'morph',
        beforebegin: 'beforebegin',
        afterbegin: 'afterbegin',
        beforeend: 'beforeend',
        afterend: 'afterend',
        into: 'innerHTML',
        over: 'outerHTML',
      };
      if (strategies[name]) return strategies[name];
    }

    return 'innerHTML';
  }
}

/**
 * Morph command: morph target with content (intelligent DOM diffing)
 */
class MorphCodegen implements CommandCodegen {
  readonly command = 'morph';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const targetNode = roles?.destination ?? node.target ?? args[0];
    const contentNode = roles?.patient ?? args[args.length > 1 ? args.length - 1 : 0];

    if (!targetNode) return null;

    const target = ctx.generateExpression(targetNode);
    ctx.requireHelper('morph');

    if (!contentNode || contentNode === targetNode) {
      return { code: `_rt.morph(${target}, '')`, async: false, sideEffects: true };
    }

    const content = ctx.generateExpression(contentNode);
    return { code: `_rt.morph(${target}, ${content})`, async: false, sideEffects: true };
  }
}

// =============================================================================
// ANIMATION COMMANDS (transition, measure, settle)
// =============================================================================

/**
 * Transition command: transition property to value [over duration] [with timing]
 *
 * Generates CSS transition setup + transitionend listener.
 */
class TransitionCodegen implements CommandCodegen {
  readonly command = 'transition';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const mods = node.modifiers as Record<string, ASTNode | unknown> | undefined;

    const propertyNode = roles?.patient ?? args[0];
    if (!propertyNode) return null;

    const property = ctx.generateExpression(propertyNode);

    // Get value from 'to' modifier or second arg
    const valueNode = (mods?.to as ASTNode | undefined) ?? args[1];
    if (!valueNode) return null;

    const value = ctx.generateExpression(valueNode);
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    // Duration from 'over' modifier
    const durationNode = mods?.over as ASTNode | undefined;
    const duration = durationNode ? ctx.generateExpression(durationNode) : '300';

    // Timing from 'with' modifier
    const timingNode = mods?.with as ASTNode | undefined;
    const timing = timingNode ? ctx.generateExpression(timingNode) : "'ease'";

    ctx.requireHelper('transition');
    return {
      code: `await _rt.transition(${target}, ${property}, ${value}, ${duration}, ${timing})`,
      async: true,
      sideEffects: true,
    };
  }
}

/**
 * Measure command: measure [target] [property]
 *
 * Measures element dimensions and stores in `it`/`result`.
 */
class MeasureCodegen implements CommandCodegen {
  readonly command = 'measure';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    // Determine property to measure
    const propNode = roles?.patient ?? args[0];
    if (!propNode) {
      // No property — measure all (getBoundingClientRect)
      return {
        code: `_ctx.it = _ctx.result = ${target}.getBoundingClientRect()`,
        async: false,
        sideEffects: true,
      };
    }

    if (propNode.type === 'identifier') {
      const propName = (propNode as IdentifierNode).value ?? '';
      // Common measurement shortcuts
      const rectProps = ['width', 'height', 'top', 'left', 'right', 'bottom', 'x', 'y'];
      if (rectProps.includes(propName.toLowerCase())) {
        return {
          code: `_ctx.it = _ctx.result = ${target}.getBoundingClientRect().${propName.toLowerCase()}`,
          async: false,
          sideEffects: true,
        };
      }
    }

    const prop = ctx.generateExpression(propNode);
    ctx.requireHelper('measure');
    return {
      code: `_ctx.it = _ctx.result = _rt.measure(${target}, ${prop})`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Settle command: settle [target] [for timeout]
 *
 * Waits for CSS transitions/animations to complete.
 */
class SettleCodegen implements CommandCodegen {
  readonly command = 'settle';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression {
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';
    const mods = node.modifiers as Record<string, ASTNode | unknown> | undefined;

    const timeoutNode = mods?.for as ASTNode | undefined;
    const timeout = timeoutNode ? ctx.generateExpression(timeoutNode) : '5000';

    ctx.requireHelper('settle');
    return {
      code: `await _rt.settle(${target}, ${timeout})`,
      async: true,
      sideEffects: true,
    };
  }
}

// =============================================================================
// EXECUTION COMMANDS (tell, async)
// =============================================================================

/**
 * Tell command: tell target command [command ...]
 *
 * Executes body commands with `me` rebound to the target element.
 * In AOT, generates a scoped block.
 */
class TellCodegen implements CommandCodegen {
  readonly command = 'tell';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const targetNode = roles?.destination ?? args[0];
    if (!targetNode) return null;

    const target = ctx.generateExpression(targetNode);

    // Generate a scoped block that rebinds _ctx.me
    return {
      code: `{ const _prevMe = _ctx.me; _ctx.me = ${target}; _ctx.you = ${target};`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Async command: async command [command ...]
 *
 * Wraps body in a fire-and-forget async IIFE.
 */
class AsyncCodegen implements CommandCodegen {
  readonly command = 'async';

  generate(_node: CommandNode, _ctx: CodegenContext): GeneratedExpression {
    // The async command wraps its body in a fire-and-forget async IIFE.
    // The actual body commands are generated by the event handler codegen.
    // Here we just signal the start of the async block.
    return {
      code: `(async () => {`,
      async: false, // The outer handler doesn't await this
      sideEffects: true,
    };
  }
}

// =============================================================================
// BEHAVIOR & TEMPLATE COMMANDS (install, render)
// =============================================================================

/**
 * Install command: install BehaviorName [(params)] [on target]
 *
 * Installs a named behavior on an element.
 */
class InstallCodegen implements CommandCodegen {
  readonly command = 'install';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;

    const behaviorNode = roles?.patient ?? args[0];
    if (!behaviorNode) return null;

    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    // Extract behavior name
    let behaviorName: string;
    if (behaviorNode.type === 'identifier') {
      behaviorName = (behaviorNode as IdentifierNode).value ?? '';
    } else if (behaviorNode.type === 'literal') {
      behaviorName = String((behaviorNode as LiteralNode).value);
    } else {
      behaviorName = ctx.generateExpression(behaviorNode);
      ctx.requireHelper('installBehavior');
      return {
        code: `_rt.installBehavior(${target}, ${behaviorName})`,
        async: false,
        sideEffects: true,
      };
    }

    ctx.requireHelper('installBehavior');

    // Check for parameters (second arg could be an object)
    const paramsNode = args.length > 1 ? args[1] : undefined;
    if (paramsNode && paramsNode.type === 'object') {
      const params = ctx.generateExpression(paramsNode);
      return {
        code: `_rt.installBehavior(${target}, '${sanitizeIdentifier(behaviorName)}', ${params})`,
        async: false,
        sideEffects: true,
      };
    }

    return {
      code: `_rt.installBehavior(${target}, '${sanitizeIdentifier(behaviorName)}')`,
      async: false,
      sideEffects: true,
    };
  }
}

/**
 * Render command: render template [with variables]
 *
 * Renders a template with variable interpolation.
 */
class RenderCodegen implements CommandCodegen {
  readonly command = 'render';

  generate(node: CommandNode, ctx: CodegenContext): GeneratedExpression | null {
    const args = node.args ?? [];
    const roles = node.roles;
    const mods = node.modifiers as Record<string, ASTNode | unknown> | undefined;

    const templateNode = roles?.patient ?? args[0];
    if (!templateNode) return null;

    const template = ctx.generateExpression(templateNode);
    const target = node.target ? ctx.generateExpression(node.target) : '_ctx.me';

    // Check for 'with' modifier or second arg for variables
    const varsNode = (mods?.with as ASTNode | undefined) ?? (args.length > 1 ? args[1] : undefined);

    ctx.requireHelper('render');

    if (varsNode) {
      const vars = ctx.generateExpression(varsNode);
      return {
        code: `${target}.innerHTML = _rt.render(${template}, ${vars})`,
        async: false,
        sideEffects: true,
      };
    }

    return {
      code: `${target}.innerHTML = _rt.render(${template}, {})`,
      async: false,
      sideEffects: true,
    };
  }
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
  ['unless', new UnlessCodegen()],
  ['throw', new ThrowCodegen()],
  ['default', new DefaultCodegen()],
  ['go', new GoCodegen()],
  ['append', new AppendCodegen()],
  ['pick', new PickCodegen()],
  ['push-url', new PushUrlCodegen()],
  ['replace-url', new ReplaceUrlCodegen()],
  ['get', new GetCodegen()],
  ['break', new BreakCodegen()],
  ['continue', new ContinueCodegen()],
  ['beep', new BeepCodegen()],
  ['js', new JsCodegen()],
  ['copy', new CopyCodegen()],
  ['make', new MakeCodegen()],
  // Phase 1 additions
  ['swap', new SwapCodegen()],
  ['morph', new MorphCodegen()],
  ['transition', new TransitionCodegen()],
  ['measure', new MeasureCodegen()],
  ['settle', new SettleCodegen()],
  ['tell', new TellCodegen()],
  ['async', new AsyncCodegen()],
  ['install', new InstallCodegen()],
  ['render', new RenderCodegen()],
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
