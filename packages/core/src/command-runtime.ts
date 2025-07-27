/**
 * Command Execution Runtime
 * 
 * Provides the runtime system for executing hyperscript commands
 * Compatible with _hyperscript command execution patterns
 */

import type { ExecutionContext, ASTNode } from './types/base-types.js';

// Type aliases for backward compatibility
type ExpressionNode = ASTNode;
type CommandNode = ASTNode;

/**
 * Runtime for executing hyperscript commands
 */
export class CommandRuntime {
  private config: any;
  
  constructor(config: any = {}) {
    this.config = {
      conversions: {
        Fragment: this.convertToFragment.bind(this),
        String: (val: any) => String(val),
        Number: (val: any) => Number(val),
        ...config.conversions
      },
      ...config
    };
  }

  /**
   * Execute a command AST node
   */
  async executeCommand(command: CommandNode, context: ExecutionContext): Promise<any> {
    switch (command.name) {
      case 'put':
        return this.executePutCommand(command, context);
      case 'add':
        return this.executeAddCommand(command, context);
      case 'remove':
        return this.executeRemoveCommand(command, context);
      case 'toggle':
        return this.executeToggleCommand(command, context);
      case 'set':
        return this.executeSetCommand(command, context);
      case 'log':
        return this.executeLogCommand(command, context);
      default:
        throw new Error(`Unknown command: ${command.name}`);
    }
  }

  /**
   * Execute PUT command: put <value> into/before/after/at <target>
   */
  private async executePutCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [valueExpr, targetExpr] = args;
    const value = await this.evaluateExpression(valueExpr, context);
    const target = await this.resolveTarget(targetExpr, context);

    // Handle different PUT variations based on command structure
    if (this.hasKeyword(command, 'before')) {
      await this.putBefore(value, target, context);
    } else if (this.hasKeyword(command, 'after')) {
      await this.putAfter(value, target, context);
    } else if (this.hasKeyword(command, 'at')) {
      if (this.hasKeyword(command, 'start')) {
        await this.putAtStart(value, target, context);
      } else if (this.hasKeyword(command, 'end')) {
        await this.putAtEnd(value, target, context);
      }
    } else {
      // Default: put X into Y
      await this.putInto(value, target, context);
    }
  }

  /**
   * Execute ADD command: add <class/attribute> to <target>
   */
  private async executeAddCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [itemExpr, targetExpr] = args;
    const item = await this.evaluateExpression(itemExpr, context);
    const targets = await this.resolveTargets(targetExpr, context);

    await this.implicitLoop(targets, async (target: Element) => {
      if (typeof item === 'string') {
        if (item.startsWith('.')) {
          // Add CSS class
          target.classList.add(item.slice(1));
        } else if (item.startsWith('@')) {
          // Add attribute
          const attrName = item.slice(1);
          target.setAttribute(attrName, '');
        } else {
          // Add class without dot
          target.classList.add(item);
        }
      }
    });
  }

  /**
   * Execute REMOVE command: remove <class/attribute> from <target>
   */
  private async executeRemoveCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [itemExpr, targetExpr] = args;
    const item = await this.evaluateExpression(itemExpr, context);
    const targets = await this.resolveTargets(targetExpr, context);

    await this.implicitLoop(targets, async (target: Element) => {
      if (typeof item === 'string') {
        if (item.startsWith('.')) {
          // Remove CSS class
          target.classList.remove(item.slice(1));
        } else if (item.startsWith('@')) {
          // Remove attribute
          const attrName = item.slice(1);
          target.removeAttribute(attrName);
        } else {
          // Remove class without dot
          target.classList.remove(item);
        }
      }
    });
  }

  /**
   * Execute TOGGLE command: toggle <class/attribute> on <target>
   */
  private async executeToggleCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [itemExpr, targetExpr] = args;
    const item = await this.evaluateExpression(itemExpr, context);
    const targets = targetExpr ? await this.resolveTargets(targetExpr, context) : [context.me];
    const validTargets = Array.isArray(targets) ? targets.filter((t): t is Element => t != null) : targets;

    await this.implicitLoop(validTargets, async (target: Element) => {
      if (typeof item === 'string') {
        if (item.startsWith('.')) {
          // Toggle CSS class
          target.classList.toggle(item.slice(1));
        } else if (item.startsWith('@')) {
          // Toggle attribute
          const attrName = item.slice(1);
          if (target.hasAttribute(attrName)) {
            target.removeAttribute(attrName);
          } else {
            target.setAttribute(attrName, '');
          }
        } else {
          // Toggle class without dot
          target.classList.toggle(item);
        }
      }
    });
  }

  /**
   * Execute SET command: set <variable> to <value>
   */
  private async executeSetCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [variableExpr, valueExpr] = args;
    const value = await this.evaluateExpression(valueExpr, context);
    
    // Handle variable assignment
    if (variableExpr.type === 'expression' && typeof variableExpr.value === 'string') {
      this.setSymbol(variableExpr.value, value, context);
    }
  }

  /**
   * Execute LOG command: log <expression>
   */
  private async executeLogCommand(command: CommandNode, context: ExecutionContext): Promise<void> {
    const args = command.args as unknown[];
    const [expressionArg] = args;
    const value = await this.evaluateExpression(expressionArg, context);
    console.log(value);
  }

  /**
   * PUT operations implementation
   */

  private async putInto(value: any, target: any, context: ExecutionContext): Promise<void> {
    if (!target) return; // Null tolerance

    if (target.type === 'symbol') {
      // Variable assignment
      this.setSymbol(target.name, value, context);
    } else if (target.type === 'property') {
      // Property assignment
      await this.implicitLoop(target.root, async (element: any) => {
        if (element && target.property) {
          element[target.property] = value;
        }
      });
    } else if (target.type === 'attribute') {
      // Attribute assignment
      await this.implicitLoop(target.element, async (element: Element) => {
        if (element && target.name) {
          element.setAttribute(target.name, String(value));
        }
      });
    } else if (target.type === 'style') {
      // Style assignment
      await this.implicitLoop(target.element, async (element: HTMLElement) => {
        if (element && target.property) {
          element.style[target.property as any] = String(value);
        }
      });
    } else if (target instanceof Element || target instanceof Document || 
               (target && typeof target === 'object' && 'appendChild' in target)) {
      // Element content replacement (including mock elements in tests)
      const fragment = this.convertValue(value, 'Fragment');
      target.innerHTML = '';
      target.appendChild(fragment);
      this.processNode(target);
    }
  }

  private async putBefore(value: any, target: Element, _context: ExecutionContext): Promise<void> {
    if (!target) return;
    const fragment = this.convertValue(value, 'Fragment');
    target.before(fragment);
    this.processNode(fragment);
  }

  private async putAfter(value: any, target: Element, _context: ExecutionContext): Promise<void> {
    if (!target) return;
    const fragment = this.convertValue(value, 'Fragment');
    target.after(fragment);
    this.processNode(fragment);
  }

  private async putAtStart(value: any, target: Element, _context: ExecutionContext): Promise<void> {
    if (!target) return;
    const fragment = this.convertValue(value, 'Fragment');
    target.prepend(fragment);
    this.processNode(fragment);
  }

  private async putAtEnd(value: any, target: Element, _context: ExecutionContext): Promise<void> {
    if (!target) return;
    const fragment = this.convertValue(value, 'Fragment');
    target.append(fragment);
    this.processNode(fragment);
  }

  /**
   * Helper methods
   */

  private async evaluateExpression(expr: ExpressionNode, context: ExecutionContext): Promise<any> {
    if (!expr) return null;

    // Handle possessive expressions first
    if (expr.operator === 'possessive' && expr.operands?.length === 2) {
      const object = await this.evaluateExpression(expr.operands[0], context);
      const property = await this.evaluateExpression(expr.operands[1], context);
      return object?.[property];
    }

    // Handle expressions with values
    if (expr.type === 'expression' && typeof expr.value === 'string') {
      const name = expr.value;
      
      // Handle context variables
      if (name === 'me') return context.me;
      if (name === 'it') return context.it;
      if (name === 'event') return context.event;
      
      // Look up variable in context
      const varValue = this.getSymbol(name, context);
      if (varValue !== undefined) {
        return varValue;
      }
      
      // Return literal value if no variable found
      return name;
    }

    // Handle direct values
    if (expr.value !== undefined) {
      return expr.value;
    }

    return null;
  }

  private async resolveTarget(expr: ExpressionNode, context: ExecutionContext): Promise<any> {
    if (!expr) return null;

    // Handle different target types
    if (typeof expr.value === 'string') {
      const value = expr.value;
      
      if (value.startsWith('#')) {
        // ID reference
        return document.getElementById(value.slice(1));
      } else if (value.startsWith('.')) {
        // Class reference - return first match
        return document.querySelector(value);
      } else if (value.startsWith('@')) {
        // Attribute reference
        return {
          type: 'attribute',
          element: context.me,
          name: value.slice(1)
        };
      } else if (value.startsWith('*')) {
        // Style reference
        return {
          type: 'style', 
          element: context.me,
          property: value.slice(1)
        };
      } else if (value === 'me') {
        return context.me;
      } else if (value === 'it') {
        return context.it;
      } else {
        // Variable reference
        return {
          type: 'symbol',
          name: value
        };
      }
    }

    if (expr.operator === 'possessive' && expr.operands?.length === 2) {
      const object = await this.evaluateExpression(expr.operands[0], context);
      const property = await this.evaluateExpression(expr.operands[1], context);
      
      if (object instanceof Element || 
          (object && typeof object === 'object' && 'innerHTML' in object)) {
        return {
          type: 'property',
          root: object,
          property: property
        };
      }
    }

    return await this.evaluateExpression(expr, context);
  }

  private async resolveTargets(expr: ExpressionNode, context: ExecutionContext): Promise<Element[]> {
    const target = await this.resolveTarget(expr, context);
    
    if (target instanceof Element) {
      return [target];
    } else if (target instanceof NodeList) {
      return Array.from(target) as Element[];
    } else if (Array.isArray(target)) {
      return target.filter(item => item instanceof Element);
    }
    
    return [];
  }

  private async implicitLoop<T>(targets: T | T[], callback: (target: T) => Promise<void> | void): Promise<void> {
    if (Array.isArray(targets) || targets instanceof NodeList) {
      for (const target of targets) {
        await callback(target);
      }
    } else if (targets != null) {
      await callback(targets);
    }
  }

  private hasKeyword(command: CommandNode, keyword: string): boolean {
    // Simple keyword detection - check for whole word boundaries
    if (!command.source) return false;
    
    // Use word boundaries to avoid false positives like 'at' in '@data-test'
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(command.source);
  }

  private convertValue(value: any, type: string): any {
    const converter = this.config.conversions[type];
    return converter ? converter(value) : value;
  }

  private convertToFragment(val: any): DocumentFragment {
    const frag = document.createDocumentFragment();
    
    if (val instanceof Node) {
      frag.append(val);
    } else if (Array.isArray(val)) {
      val.forEach(item => {
        if (item instanceof Node) {
          frag.append(item);
        } else {
          const temp = document.createElement('template');
          temp.innerHTML = String(item);
          frag.append(temp.content);
        }
      });
    } else {
      const temp = document.createElement('template');
      temp.innerHTML = String(val);
      frag.append(temp.content);
    }
    
    return frag;
  }

  private processNode(node: Node): void {
    // Process hyperscript attributes on new content
    if (node instanceof Element) {
      // TODO: Integrate with parser to process _ attributes
    } else if (node instanceof DocumentFragment) {
      const elements = node.querySelectorAll('*');
      elements.forEach(element => this.processNode(element));
    }
  }

  private setSymbol(name: string, value: any, context: ExecutionContext): void {
    // Variable assignment - simplified for now
    (context as any)[name] = value;
  }

  private getSymbol(name: string, context: ExecutionContext): any {
    // Variable lookup - simplified for now  
    return (context as any)[name];
  }
}