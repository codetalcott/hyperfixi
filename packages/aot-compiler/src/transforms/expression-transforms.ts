/**
 * Expression Transforms
 *
 * Transforms hyperscript expression AST nodes to JavaScript code.
 */

import type {
  ASTNode,
  CodegenContext,
  LiteralNode,
  IdentifierNode,
  SelectorNode,
  VariableNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  MemberExpressionNode,
  PossessiveNode,
  CallExpressionNode,
  PositionalNode,
  ConditionalNode,
  ArrayExpressionNode,
  ObjectExpressionNode,
  TemplateNode,
} from '../types/aot-types.js';

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

/**
 * Sanitize a class name for safe interpolation into JavaScript string literals.
 */
export function sanitizeClassName(name: string): string | null {
  // CSS class names: must start with letter, underscore, or hyphen
  // followed by letters, digits, underscores, or hyphens
  if (!/^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) {
    return null;
  }
  return name;
}

/**
 * Sanitize a CSS selector for safe interpolation into JavaScript string literals.
 */
export function sanitizeSelector(selector: string): string {
  return selector
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\0/g, '');
}

/**
 * Sanitize an identifier for use as a JavaScript variable name.
 */
export function sanitizeIdentifier(name: string): string {
  // Replace invalid characters with underscores
  return name.replace(/[^a-zA-Z0-9_$]/g, '_');
}

// =============================================================================
// EXPRESSION CODEGEN CLASS
// =============================================================================

/**
 * Code generator for expressions.
 */
export class ExpressionCodegen {
  private ctx: CodegenContext;

  constructor(ctx: CodegenContext) {
    this.ctx = ctx;
  }

  /**
   * Generate JavaScript code for an expression.
   */
  generate(node: ASTNode): string {
    if (!node) {
      return 'undefined';
    }

    switch (node.type) {
      case 'literal':
        return this.generateLiteral(node as LiteralNode);

      case 'identifier':
        return this.generateIdentifier(node as IdentifierNode);

      case 'selector':
        return this.generateSelector(node as SelectorNode);

      case 'variable':
        return this.generateVariable(node as VariableNode);

      case 'binary':
        return this.generateBinary(node as BinaryExpressionNode);

      case 'member':
        return this.generateMember(node as MemberExpressionNode);

      case 'possessive':
        return this.generatePossessive(node as PossessiveNode);

      case 'call':
        return this.generateCall(node as CallExpressionNode);

      case 'positional':
        return this.generatePositional(node as PositionalNode);

      case 'array':
        return this.generateArray(node);

      case 'object':
        return this.generateObject(node);

      case 'template':
        return this.generateTemplate(node);

      case 'unary':
        return this.generateUnary(node);

      case 'conditional':
        return this.generateConditional(node);

      case 'sequence':
        return 'undefined';

      default:
        // Unknown node type - return as-is if it has a value
        if ('value' in node) {
          return JSON.stringify(node.value);
        }
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }

  // ===========================================================================
  // LITERAL EXPRESSIONS
  // ===========================================================================

  private generateLiteral(node: LiteralNode): string {
    const value = node.value;

    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  // ===========================================================================
  // IDENTIFIER EXPRESSIONS
  // ===========================================================================

  private generateIdentifier(node: IdentifierNode): string {
    const name = node.value ?? node.name ?? '';

    // Context variables
    switch (name) {
      case 'me':
      case 'my':
        return '_ctx.me';
      case 'you':
      case 'your':
        return '_ctx.you';
      case 'it':
      case 'result':
        return '_ctx.it';
      case 'event':
        return '_ctx.event';
      case 'body':
        return 'document.body';
      case 'document':
        return 'document';
      case 'window':
        return 'window';
      case 'true':
        return 'true';
      case 'false':
        return 'false';
      case 'null':
        return 'null';
      case 'undefined':
        return 'undefined';
      default:
        // Check if it's a local variable reference
        if (name.startsWith(':')) {
          const varName = sanitizeIdentifier(name.slice(1));
          return `_ctx.locals.get('${varName}')`;
        }
        // Global variable reference
        if (name.startsWith('$') || name.startsWith('::')) {
          const varName = sanitizeIdentifier(name.replace(/^(\$|::)/, ''));
          this.ctx.requireHelper('globals');
          return `_rt.globals.get('${varName}')`;
        }
        // Plain identifier - assume it's defined elsewhere
        return sanitizeIdentifier(name);
    }
  }

  // ===========================================================================
  // SELECTOR EXPRESSIONS
  // ===========================================================================

  private generateSelector(node: SelectorNode): string {
    const selector = node.value;
    const sanitized = sanitizeSelector(selector);

    // Check if we can use a cached selector
    if (this.ctx.canCacheSelector(selector)) {
      return this.ctx.getCachedSelector(selector);
    }

    // ID selector optimization
    if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes('.')) {
      const id = selector.slice(1);
      return `document.getElementById('${sanitizeSelector(id)}')`;
    }

    // General selector
    return `document.querySelector('${sanitized}')`;
  }

  // ===========================================================================
  // VARIABLE EXPRESSIONS
  // ===========================================================================

  private generateVariable(node: VariableNode): string {
    const name = node.name;
    const varName = sanitizeIdentifier(
      name.startsWith(':') || name.startsWith('$') ? name.slice(1) : name
    );

    switch (node.scope) {
      case 'local':
        return `_ctx.locals.get('${varName}')`;
      case 'global':
        this.ctx.requireHelper('globals');
        return `_rt.globals.get('${varName}')`;
      case 'element':
        return `_ctx.me.${varName}`;
      default:
        return `_ctx.locals.get('${varName}')`;
    }
  }

  // ===========================================================================
  // BINARY EXPRESSIONS
  // ===========================================================================

  private generateBinary(node: BinaryExpressionNode): string {
    const left = this.generate(node.left);
    const right = this.generate(node.right);
    const op = node.operator;

    // Map hyperscript operators to JavaScript
    switch (op) {
      // Equality
      case 'is':
      case '==':
        return `(${left} === ${right})`;
      case 'is not':
      case '!=':
        return `(${left} !== ${right})`;

      // Comparison
      case '<':
      case '>':
      case '<=':
      case '>=':
        return `(${left} ${op} ${right})`;

      // Arithmetic
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
        return `(${left} ${op} ${right})`;

      // Logical
      case 'and':
      case '&&':
        return `(${left} && ${right})`;
      case 'or':
      case '||':
        return `(${left} || ${right})`;

      // String/collection operators
      case 'contains':
        this.ctx.requireHelper('contains');
        return `_rt.contains(${left}, ${right})`;

      case 'matches':
        this.ctx.requireHelper('matches');
        return `_rt.matches(${left}, ${right})`;

      case 'starts with':
        return `${left}.startsWith(${right})`;

      case 'ends with':
        return `${left}.endsWith(${right})`;

      // Class check
      case 'has':
        // "element has .class" pattern
        if (node.right.type === 'selector') {
          const sel = (node.right as SelectorNode).value;
          if (sel.startsWith('.')) {
            const className = sanitizeClassName(sel.slice(1));
            if (className) {
              return `${left}.classList.contains('${className}')`;
            }
          }
        }
        this.ctx.requireHelper('contains');
        return `_rt.contains(${left}, ${right})`;

      // Type check
      case 'is a':
      case 'is an':
        return `(typeof ${left} === ${right} || ${left} instanceof ${right})`;

      case 'is not a':
      case 'is not an':
        return `(typeof ${left} !== ${right} && !(${left} instanceof ${right}))`;

      // Concatenation
      case '&':
        return `(String(${left}) + String(${right}))`;

      default:
        // Unknown operator - use as-is
        return `(${left} ${op} ${right})`;
    }
  }

  // ===========================================================================
  // MEMBER EXPRESSIONS
  // ===========================================================================

  private generateMember(node: MemberExpressionNode): string {
    const object = this.generate(node.object);

    if (typeof node.property === 'string') {
      const prop = node.property;

      // Style property (*opacity, *color, etc.)
      if (prop.startsWith('*')) {
        const styleProp = prop.slice(1);
        return `${object}.style.${styleProp}`;
      }

      // Attribute (@disabled, @checked, etc.)
      if (prop.startsWith('@')) {
        const attrName = prop.slice(1);
        return `${object}.getAttribute('${sanitizeSelector(attrName)}')`;
      }

      // Computed property
      if (node.computed) {
        return `${object}[${JSON.stringify(prop)}]`;
      }

      return `${object}.${sanitizeIdentifier(prop)}`;
    }

    // Computed property with expression
    const propExpr = this.generate(node.property as ASTNode);
    return `${object}[${propExpr}]`;
  }

  // ===========================================================================
  // POSSESSIVE EXPRESSIONS
  // ===========================================================================

  private generatePossessive(node: PossessiveNode): string {
    const object = this.generate(node.object);
    const property = node.property;

    // Style property (*opacity, etc.)
    if (property.startsWith('*')) {
      const styleProp = property.slice(1);
      return `${object}.style.${styleProp}`;
    }

    // Attribute (@disabled, etc.)
    if (property.startsWith('@')) {
      const attrName = property.slice(1);
      return `${object}.getAttribute('${sanitizeSelector(attrName)}')`;
    }

    // Common DOM properties
    const domProps = [
      'value',
      'textContent',
      'innerHTML',
      'innerText',
      'outerHTML',
      'checked',
      'disabled',
      'selected',
      'hidden',
      'src',
      'href',
      'id',
      'className',
      'classList',
      'parentElement',
      'parentNode',
      'children',
      'firstChild',
      'lastChild',
      'nextSibling',
      'previousSibling',
      'nextElementSibling',
      'previousElementSibling',
      'offsetWidth',
      'offsetHeight',
      'offsetTop',
      'offsetLeft',
      'clientWidth',
      'clientHeight',
      'scrollWidth',
      'scrollHeight',
      'scrollTop',
      'scrollLeft',
    ];

    if (domProps.includes(property)) {
      return `${object}.${property}`;
    }

    // General property access - try property first, then attribute
    this.ctx.requireHelper('getProp');
    return `_rt.getProp(${object}, '${sanitizeSelector(property)}')`;
  }

  // ===========================================================================
  // CALL EXPRESSIONS
  // ===========================================================================

  private generateCall(node: CallExpressionNode): string {
    const args = (node.args ?? []).map(arg => this.generate(arg)).join(', ');

    // Method call
    if (node.callee.type === 'member' || node.callee.type === 'possessive') {
      const memberNode = node.callee as MemberExpressionNode | PossessiveNode;
      const object = this.generate(memberNode.object);
      const method =
        typeof memberNode.property === 'string'
          ? memberNode.property
          : this.generate(memberNode.property as ASTNode);

      if (typeof memberNode.property === 'string') {
        return `${object}.${sanitizeIdentifier(memberNode.property)}(${args})`;
      }
      return `${object}[${method}](${args})`;
    }

    // Direct function call
    const callee = this.generate(node.callee);
    return `${callee}(${args})`;
  }

  // ===========================================================================
  // POSITIONAL EXPRESSIONS
  // ===========================================================================

  private generatePositional(node: PositionalNode): string {
    const position = node.position;
    const target = node.target ? this.generate(node.target) : null;

    switch (position) {
      case 'first':
        if (target) {
          // first in collection
          if (node.target?.type === 'selector') {
            const sel = (node.target as SelectorNode).value;
            return `document.querySelector('${sanitizeSelector(sel)}')`;
          }
          this.ctx.requireHelper('first');
          return `_rt.first(${target})`;
        }
        return '_ctx.me';

      case 'last':
        if (target) {
          if (node.target?.type === 'selector') {
            const sel = (node.target as SelectorNode).value;
            const sanitized = sanitizeSelector(sel);
            return `(()=>{const _els=document.querySelectorAll('${sanitized}');return _els[_els.length-1]})()`;
          }
          this.ctx.requireHelper('last');
          return `_rt.last(${target})`;
        }
        return '_ctx.me';

      case 'random':
        if (target) {
          this.ctx.requireHelper('random');
          return `_rt.random(${target})`;
        }
        return '_ctx.me';

      case 'next':
        return '_ctx.me.nextElementSibling';

      case 'previous':
        return '_ctx.me.previousElementSibling';

      case 'closest':
        if (target && node.target?.type === 'selector') {
          const sel = (node.target as SelectorNode).value;
          return `_ctx.me.closest('${sanitizeSelector(sel)}')`;
        }
        if (target) {
          return `_ctx.me.closest(${target})`;
        }
        return '_ctx.me.parentElement';

      case 'parent':
        return '_ctx.me.parentElement';

      default:
        throw new Error(`Unknown positional: ${position}`);
    }
  }

  // ===========================================================================
  // ARRAY EXPRESSIONS
  // ===========================================================================

  private generateArray(node: ArrayExpressionNode): string {
    const elements = node.elements ?? [];
    const items = elements.map(el => this.generate(el)).join(', ');
    return `[${items}]`;
  }

  // ===========================================================================
  // OBJECT EXPRESSIONS
  // ===========================================================================

  private generateObject(node: ObjectExpressionNode): string {
    const properties = node.properties ?? [];
    const pairs = properties
      .map(prop => {
        const key =
          typeof prop.key === 'string' ? JSON.stringify(prop.key) : this.generate(prop.key);
        const value = this.generate(prop.value);
        return `${key}: ${value}`;
      })
      .join(', ');
    return `{${pairs}}`;
  }

  // ===========================================================================
  // TEMPLATE EXPRESSIONS
  // ===========================================================================

  private generateTemplate(node: TemplateNode): string {
    const parts = node.parts ?? [];
    const segments = parts
      .map(part => {
        if (typeof part === 'string') {
          return part.replace(/`/g, '\\`').replace(/\$/g, '\\$');
        }
        return '${' + this.generate(part) + '}';
      })
      .join('');
    return '`' + segments + '`';
  }

  // ===========================================================================
  // UNARY EXPRESSIONS
  // ===========================================================================

  private generateUnary(node: UnaryExpressionNode): string {
    const operand = this.generate(node.operand);

    switch (node.operator) {
      case 'not':
      case '!':
        return `!${operand}`;
      case '-':
        return `-${operand}`;
      case '+':
        return `+${operand}`;
      case 'no':
        return `!${operand}`;
      default:
        return `${node.operator}${operand}`;
    }
  }

  // ===========================================================================
  // CONDITIONAL EXPRESSIONS
  // ===========================================================================

  private generateConditional(node: ConditionalNode): string {
    const condition = this.generate(node.condition);
    const consequent = this.generate(node.consequent);
    const alternate = this.generate(node.alternate);
    return `(${condition} ? ${consequent} : ${alternate})`;
  }
}

// =============================================================================
// CONVENIENCE FUNCTION
// =============================================================================

/**
 * Generate JavaScript code for an expression.
 */
export function generateExpression(node: ASTNode, ctx: CodegenContext): string {
  const codegen = new ExpressionCodegen(ctx);
  return codegen.generate(node);
}

export default ExpressionCodegen;
