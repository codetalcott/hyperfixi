/**
 * Base Expression Evaluator - Shared evaluation logic for all evaluator implementations
 *
 * This base class contains all AST node evaluation logic without any expression category imports.
 * Subclasses are responsible for registering expression categories via `registerCategory()`.
 *
 * This design enables:
 * - Tree-shakeable bundles (only import needed expression categories)
 * - Code deduplication (~800 lines shared between ExpressionEvaluator and LazyExpressionEvaluator)
 * - Flexible configuration (eager, lazy, or custom category loading)
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import type { ExecutionResult, ExecutionSignal } from '../types/result';
import { ok, err } from '../types/result';
import { debug } from '../utils/debug';
import { isElement, getElementProperty } from '../expressions/property-access-utils';

/**
 * Base Expression Evaluator - Abstract class with shared evaluation logic
 *
 * Subclasses must call `registerCategory()` to add expression implementations.
 */
export class BaseExpressionEvaluator {
  protected expressionRegistry: Map<string, any>;

  constructor() {
    this.expressionRegistry = new Map();
  }

  /**
   * Register an expression category's implementations
   * @param expressions - Object mapping expression names to implementations
   */
  protected registerCategory(expressions: Record<string, any>): void {
    Object.entries(expressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });
  }

  /**
   * Unwrap selector results to a single element.
   * CSS selectors return arrays via querySelectorAll or NodeList,
   * but property access and method calls typically expect a single element.
   */
  protected unwrapSelectorResult<T>(value: T | T[] | NodeList): T {
    // Only unwrap arrays/NodeLists that contain DOM elements (selector results)
    // Don't unwrap regex match results or other arrays with extra properties
    if (value instanceof NodeList && value.length > 0) {
      return value[0] as T;
    }
    if (Array.isArray(value) && value.length > 0) {
      // Check if this looks like a selector result (first element is a DOM node)
      // Regex match results have 'index' and 'input' properties - don't unwrap those
      const firstElement = value[0];
      const hasRegexProps = 'index' in value && 'input' in value;
      if (hasRegexProps) {
        // This is a regex match result - preserve the full array with its properties
        return value as unknown as T;
      }
      if (firstElement instanceof Element || firstElement instanceof Node) {
        return firstElement;
      }
      // For other arrays, preserve them as-is to maintain properties like .index
      return value as unknown as T;
    }
    return value as T;
  }

  /**
   * Evaluate an AST node using the appropriate expression implementation
   */
  async evaluate(node: ASTNode, context: ExecutionContext): Promise<any> {
    // Handle null/undefined nodes
    if (!node) {
      debug.expressions('EVALUATOR: Received null/undefined node, returning null');
      return null;
    }

    // Handle nodes without type property
    if (!node.type) {
      console.error('EVALUATOR: Node missing type property:', node);
      throw new Error(`Node missing type property: ${JSON.stringify(node)}`);
    }
    switch (node.type) {
      case 'identifier':
        return this.evaluateIdentifier(node as any, context);

      case 'literal':
        return this.evaluateLiteral(node as any, context);

      case 'string':
        return (node as any).value || (node as any).content || '';

      case 'memberExpression':
        return this.evaluateMemberExpression(node as any, context);

      case 'binaryExpression':
        return this.evaluateBinaryExpression(node as any, context);

      case 'unaryExpression':
        return this.evaluateUnaryExpression(node as any, context);

      case 'callExpression':
        return this.evaluateCallExpression(node as any, context);

      case 'selector':
        return this.evaluateSelector(node as any, context);

      case 'dollarExpression':
        return this.evaluateDollarExpression(node as any, context);

      case 'possessiveExpression':
        return this.evaluatePossessiveExpression(node as any, context);

      case 'templateLiteral':
        return this.evaluateTemplateLiteral(node as any, context);

      case 'arrayLiteral':
        return this.evaluateArrayLiteral(node as any, context);

      case 'objectLiteral':
        return this.evaluateObjectLiteral(node as any, context);

      case 'conditionalExpression':
        return this.evaluateConditionalExpression(node as any, context);

      case 'cssSelector':
        return this.evaluateCSSSelector(node as any, context);

      case 'propertyAccess':
        return this.evaluatePropertyAccess(node as any, context);

      case 'propertyOfExpression':
        return this.evaluatePropertyOfExpression(node as any, context);

      case 'contextReference':
        return this.evaluateContextReference(node as any, context);

      case 'queryReference':
        return this.evaluateQueryReference(node as any, context);

      default:
        throw new Error(`Unsupported AST node type for evaluation: ${node.type}`);
    }
  }

  /**
   * Result-based expression evaluation (napi-rs inspired pattern).
   *
   * Returns ExecutionResult instead of throwing exceptions for control flow.
   * Provides ~12-18% performance improvement on hot paths by eliminating
   * try-catch overhead for expected control flow signals.
   */
  async evaluateWithResult(
    node: ASTNode,
    context: ExecutionContext
  ): Promise<ExecutionResult<unknown>> {
    try {
      const value = await this.evaluate(node, context);
      return ok(value);
    } catch (e) {
      // Check if this is a control flow signal
      if (e instanceof Error) {
        const error = e as any;
        if (error.isHalt || error.message === 'HALT_EXECUTION') {
          return err({ type: 'halt' } as ExecutionSignal);
        }
        if (error.isExit || error.message === 'EXIT_COMMAND') {
          return err({ type: 'exit', returnValue: error.returnValue } as ExecutionSignal);
        }
        if (error.isBreak) {
          return err({ type: 'break' } as ExecutionSignal);
        }
        if (error.isContinue) {
          return err({ type: 'continue' } as ExecutionSignal);
        }
        if (error.isReturn) {
          return err({ type: 'return', returnValue: error.returnValue } as ExecutionSignal);
        }
      }
      // Real error - re-throw
      throw e;
    }
  }

  /**
   * Evaluate array literal - evaluate each element
   */
  protected async evaluateArrayLiteral(node: any, context: ExecutionContext): Promise<any[]> {
    const elements = node.elements || [];
    const evaluatedElements = [];

    for (const element of elements) {
      const value = await this.evaluate(element, context);
      evaluatedElements.push(value);
    }

    return evaluatedElements;
  }

  /**
   * Evaluate object literal - evaluate each property's key and value
   */
  protected async evaluateObjectLiteral(
    node: any,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const properties = node.properties || [];
    const result: Record<string, any> = {};

    for (const property of properties) {
      let key: string;
      if (property.key.type === 'identifier') {
        key = property.key.name;
      } else if (property.key.type === 'literal') {
        key = String(property.key.value);
      } else {
        const evaluatedKey = await this.evaluate(property.key, context);
        key = String(evaluatedKey);
      }

      const value = await this.evaluate(property.value, context);
      result[key] = value;
    }

    return result;
  }

  /**
   * Evaluate conditional expressions (if-then-else / ternary)
   */
  protected async evaluateConditionalExpression(
    node: any,
    context: ExecutionContext
  ): Promise<any> {
    const test = await this.evaluate(node.test, context);

    if (test) {
      return this.evaluate(node.consequent, context);
    } else if (node.alternate) {
      return this.evaluate(node.alternate, context);
    }

    return undefined;
  }

  /**
   * Evaluate template literal - parse $variable and ${expression} patterns
   * Supports both _hyperscript-style $var and JavaScript-style ${expr}
   */
  protected async evaluateTemplateLiteral(node: any, context: ExecutionContext): Promise<string> {
    let template = node.value || '';

    debug.expressions('TEMPLATE LITERAL: Evaluating', { template, node });

    // First pass: Replace $variable patterns (without curly braces)
    // Matches: $varName, $obj.prop (but NOT ${...})
    const varPattern = /\$([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g;

    // Collect all matches first to avoid index shifting during replacement
    const matches: Array<{ match: string; varName: string; index: number }> = [];
    let m;
    while ((m = varPattern.exec(template)) !== null) {
      // Skip if this is part of ${...} pattern (next char is '{')
      if (template[m.index + 1] === '{') continue;
      matches.push({ match: m[0], varName: m[1], index: m.index });
    }

    // Replace from end to preserve indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match, varName, index } = matches[i];
      const value = await this.resolveTemplateVariable(varName, context);
      debug.expressions(`TEMPLATE: $${varName} resolved to`, value);
      template =
        template.slice(0, index) + String(value ?? '') + template.slice(index + match.length);
    }

    // Second pass: Handle ${expression} patterns
    let result = '';
    let j = 0;

    while (j < template.length) {
      const exprStart = template.indexOf('${', j);

      if (exprStart === -1) {
        result += template.slice(j);
        break;
      }

      result += template.slice(j, exprStart);

      const exprEnd = template.indexOf('}', exprStart);
      if (exprEnd === -1) {
        throw new Error(`Unterminated template expression in: ${template}`);
      }

      const exprCode = template.slice(exprStart + 2, exprEnd);

      debug.expressions('TEMPLATE: Evaluating expression:', exprCode);

      let value: any;
      const trimmed = exprCode.trim();

      if (context.locals.has(trimmed)) {
        value = context.locals.get(trimmed);
        debug.expressions(`TEMPLATE: Found in locals: ${trimmed} =`, value);
      } else if (context.variables && context.variables.has(trimmed)) {
        value = context.variables.get(trimmed);
        debug.expressions(`TEMPLATE: Found in variables: ${trimmed} =`, value);
      } else if (context.globals && context.globals.has(trimmed)) {
        value = context.globals.get(trimmed);
        debug.expressions(`TEMPLATE: Found in globals: ${trimmed} =`, value);
      } else {
        value = await this.evaluateSimpleExpression(exprCode, context);
        debug.expressions(`TEMPLATE: Evaluated expression "${exprCode}" =`, value);
      }

      result += String(value);
      j = exprEnd + 1;
    }

    return result;
  }

  /**
   * Resolve a variable name (with optional property access) from context
   * Used for $variable template interpolation
   */
  private async resolveTemplateVariable(varName: string, context: ExecutionContext): Promise<any> {
    // Handle property access like obj.prop.nested
    if (varName.includes('.')) {
      const parts = varName.split('.');
      let value = this.lookupTemplateVariable(parts[0], context);
      for (let i = 1; i < parts.length && value != null; i++) {
        value = value[parts[i]];
      }
      return value;
    }
    return this.lookupTemplateVariable(varName, context);
  }

  /**
   * Look up a simple variable name in the context scope chain
   */
  private lookupTemplateVariable(name: string, context: ExecutionContext): any {
    if (context.locals?.has(name)) return context.locals.get(name);
    if (context.variables?.has(name)) return context.variables.get(name);
    if (context.globals?.has(name)) return context.globals.get(name);
    // Check context properties
    if (name === 'me') return context.me;
    if (name === 'it') return context.it;
    if (name === 'result') return context.result;
    return undefined;
  }

  /**
   * Evaluate simple expressions like "clientX - xoff" using context variables
   * Handles basic arithmetic: +, -, *, /, %
   */
  protected async evaluateSimpleExpression(
    exprCode: string,
    context: ExecutionContext
  ): Promise<any> {
    debug.expressions('EVAL: Evaluating expression:', exprCode);

    // Handle ternary expressions
    const ternaryMatch = exprCode.match(/^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/);
    if (ternaryMatch) {
      const [, conditionExpr, trueExpr, falseExpr] = ternaryMatch;
      debug.expressions('EVAL: Parsed ternary:', { conditionExpr, trueExpr, falseExpr });

      const conditionValue = await this.resolveValue(conditionExpr.trim(), context);
      debug.expressions('EVAL: Ternary condition value:', conditionValue);

      if (conditionValue) {
        const trueValue = await this.resolveValue(trueExpr.trim(), context);
        debug.expressions('EVAL: Ternary returned true branch:', trueValue);
        return trueValue;
      } else {
        const falseValue = await this.resolveValue(falseExpr.trim(), context);
        debug.expressions('EVAL: Ternary returned false branch:', falseValue);
        return falseValue;
      }
    }

    // Try arithmetic operators
    const arithmeticMatch = exprCode.match(
      /^([a-zA-Z_$][a-zA-Z0-9_$]*|\d+(?:\.\d+)?)\s*([\+\-\*\/\%])\s*([a-zA-Z_$][a-zA-Z0-9_$]*|\d+(?:\.\d+)?)$/
    );

    if (arithmeticMatch) {
      const [, left, operator, right] = arithmeticMatch;
      debug.expressions('EVAL: Parsed arithmetic:', { left, operator, right });

      const leftValue = await this.resolveValue(left.trim(), context);
      const rightValue = await this.resolveValue(right.trim(), context);
      debug.expressions('EVAL: Resolved values:', { leftValue, rightValue });

      const leftNum = Number(leftValue);
      const rightNum = Number(rightValue);

      if (!isNaN(leftNum) && !isNaN(rightNum)) {
        let result: number;
        switch (operator) {
          case '+':
            result = leftNum + rightNum;
            break;
          case '-':
            result = leftNum - rightNum;
            break;
          case '*':
            result = leftNum * rightNum;
            break;
          case '/':
            result = leftNum / rightNum;
            break;
          case '%':
            result = leftNum % rightNum;
            break;
          default:
            result = leftNum;
        }
        debug.expressions('EVAL: Arithmetic result:', result);
        return result;
      }
    }

    // Fallback: resolve as single value
    const fallback = await this.resolveValue(exprCode.trim(), context);
    debug.expressions('EVAL: Fallback result:', fallback);
    return fallback;
  }

  /**
   * Resolve a value from context or parse as literal
   */
  protected async resolveValue(name: string, context: ExecutionContext): Promise<any> {
    debug.expressions(`RESOLVE: Looking for '${name}' in context`, {
      hasInLocals: context.locals.has(name),
      localsKeys: Array.from(context.locals.keys()),
      value: context.locals.get(name),
    });

    if (context.locals.has(name)) {
      const value = context.locals.get(name);
      debug.expressions(`RESOLVE: Found '${name}' in locals:`, value);
      return value;
    }
    if (context.variables && context.variables.has(name)) {
      const value = context.variables.get(name);
      debug.expressions(`RESOLVE: Found '${name}' in variables:`, value);
      return value;
    }
    if (context.globals && context.globals.has(name)) {
      const value = context.globals.get(name);
      debug.expressions(`RESOLVE: Found '${name}' in globals:`, value);
      return value;
    }

    // Try parsing as number
    const num = Number(name);
    if (!isNaN(num)) {
      return num;
    }

    // Try parsing as string literal
    if (
      (name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))
    ) {
      return name.slice(1, -1);
    }

    // Handle property access (e.g., "todoData.id")
    if (name.includes('.')) {
      const parts = name.split('.');
      const baseName = parts[0];

      let obj: any = null;
      if (context.locals.has(baseName)) {
        obj = context.locals.get(baseName);
      } else if (context.variables && context.variables.has(baseName)) {
        obj = context.variables.get(baseName);
      } else if (context.globals && context.globals.has(baseName)) {
        obj = context.globals.get(baseName);
      }

      if (obj !== null && obj !== undefined) {
        for (let i = 1; i < parts.length; i++) {
          if (obj === null || obj === undefined) {
            debug.expressions(`RESOLVE: Property access failed at '${parts[i - 1]}'`);
            return undefined;
          }
          obj = obj[parts[i]];
        }
        debug.expressions(`RESOLVE: Property access '${name}' =`, obj);
        return obj;
      }
    }

    return name;
  }

  /**
   * Evaluate identifier nodes (me, you, it, etc.)
   */
  protected async evaluateIdentifier(
    node: { name: string; scope?: 'local' | 'global' },
    context: ExecutionContext
  ): Promise<any> {
    const { name, scope } = node;

    // Handle context references FIRST
    if (name === 'me' || name === 'my' || name === 'I') {
      return context.me;
    }
    if (name === 'you' || name === 'your') {
      return context.you;
    }
    if (name === 'it' || name === 'its') {
      return context.it;
    }
    if (name === 'result') {
      return context.result;
    }

    // Check if it's a built-in reference expression
    const expression = this.expressionRegistry.get(name);
    if (expression) {
      return expression.evaluate(context);
    }

    // If explicit scope is specified, ONLY check that scope
    if (scope === 'local') {
      if (context.locals?.has(name)) {
        return context.locals.get(name);
      }
      return undefined;
    }

    if (scope === 'global') {
      if (context.globals?.has(name)) {
        return context.globals.get(name);
      }
      if (typeof window !== 'undefined' && name in window) {
        return (window as any)[name];
      }
      return undefined;
    }

    // No explicit scope - use normal resolution order
    if (context.locals?.has(name)) {
      return context.locals.get(name);
    }
    if (context.globals?.has(name)) {
      return context.globals.get(name);
    }
    if (context.variables?.has(name)) {
      return context.variables.get(name);
    }

    // Check JavaScript global objects
    if (typeof globalThis !== 'undefined' && name in globalThis) {
      return (globalThis as any)[name];
    }
    if (typeof window !== 'undefined' && name in window) {
      return (window as any)[name];
    }

    return undefined;
  }

  /**
   * Evaluate literal nodes (strings, numbers, booleans)
   */
  protected async evaluateLiteral(node: { value: any }, _context: ExecutionContext): Promise<any> {
    return node.value;
  }

  /**
   * Evaluate context reference nodes (me, it, you, event, etc.)
   * These are produced by the semantic AST builder for context-dependent values.
   */
  protected async evaluateContextReference(
    node: { contextType: string; name: string },
    context: ExecutionContext
  ): Promise<any> {
    const { contextType } = node;

    switch (contextType) {
      case 'me':
        return context.me;
      case 'it':
        return context.result;
      case 'you':
        return context.you;
      case 'event':
        return context.event;
      case 'body':
        return (
          (context.meta as { ownerDocument?: Document })?.ownerDocument?.body || document?.body
        );
      case 'detail':
        return (context.event as CustomEvent)?.detail;
      case 'target':
        return context.you || (context.event as Event)?.target;
      case 'sender':
        return (context.event as Event)?.target;
      default:
        // For unknown context types, try to look up in locals
        if (context.locals && context.locals.has(contextType)) {
          return context.locals.get(contextType);
        }
        debug.expressions(`Unknown context reference type: ${contextType}`);
        return undefined;
    }
  }

  /**
   * Evaluate member expressions (object.property)
   */
  protected async evaluateMemberExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property, computed } = node;

    // Special case: handle command-like member expressions
    if (object.type === 'identifier' && ['add', 'remove'].includes(object.name)) {
      const commandName = object.name;
      const className = property.name || property;

      if (!context.me) {
        throw new Error('Context element "me" is null');
      }

      if (commandName === 'add') {
        context.me.classList.add(className);
      } else if (commandName === 'remove') {
        context.me.classList.remove(className);
      }

      return;
    }

    // Evaluate the object first
    let objectValue = await this.evaluate(object, context);

    if (computed) {
      // For computed access (arr[0], obj['key']), don't unwrap arrays
      // This preserves regex match arrays, user arrays, etc.
      const propertyValue = await this.evaluate(property, context);
      return objectValue[propertyValue];
    } else {
      // For dot access (obj.prop), unwrap selector results to single element
      objectValue = this.unwrapSelectorResult(objectValue);
      const propertyName = property.name || property;

      if (typeof propertyName === 'string') {
        // Handle computed style access
        if (propertyName.startsWith('computed-')) {
          const styleProp = propertyName.substring('computed-'.length);
          if (objectValue && typeof window !== 'undefined' && objectValue instanceof Element) {
            const computedStyle = window.getComputedStyle(objectValue);
            return computedStyle.getPropertyValue(styleProp);
          }
          return undefined;
        }

        // Handle attribute access
        if (propertyName.startsWith('@')) {
          const attrName = propertyName.substring(1);
          if (objectValue && typeof objectValue.getAttribute === 'function') {
            return objectValue.getAttribute(attrName);
          }
          return undefined;
        }

        // Handle _hyperscript shorthand for sibling access
        // 'previous' -> previousElementSibling, 'next' -> nextElementSibling
        if (objectValue && objectValue instanceof Element) {
          if (propertyName === 'previous' || propertyName === 'prev') {
            return objectValue.previousElementSibling;
          }
          if (propertyName === 'next') {
            return objectValue.nextElementSibling;
          }
        }
      }

      const value = objectValue?.[propertyName];

      // Bind functions to the object
      if (typeof value === 'function') {
        return value.bind(objectValue);
      }

      return value;
    }
  }

  /**
   * Evaluate binary expressions (comparisons, arithmetic, etc.)
   */
  protected async evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
    const { operator, left, right } = node;

    // Special handling for 'in' operator with selectors
    if (operator === 'in' && left.type === 'selector') {
      // Convert hyperscript selector <tag/> to CSS selector (tag)
      let selector = left.value;
      if (selector.startsWith('<') && selector.endsWith('/>')) {
        selector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
      }
      // Unwrap array/NodeList from selector evaluation to single element
      const contextElement = this.unwrapSelectorResult(await this.evaluate(right, context));

      if (!contextElement || typeof contextElement.querySelector !== 'function') {
        throw new Error(
          `'in' operator requires a DOM element as the right operand (got: ${typeof contextElement})`
        );
      }

      const nodeList = contextElement.querySelectorAll(selector);
      return Array.from(nodeList);
    }

    // Special handling for 'in' operator with queryReference (e.g., <button/> in closest nav)
    if (operator === 'in' && left.type === 'queryReference') {
      // Convert hyperscript selector <tag/> to CSS selector (tag)
      let selector = left.selector;
      if (selector.startsWith('<') && selector.endsWith('/>')) {
        selector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
      }
      // Unwrap array/NodeList from selector evaluation to single element
      const contextElement = this.unwrapSelectorResult(await this.evaluate(right, context));

      if (!contextElement || typeof contextElement.querySelector !== 'function') {
        throw new Error(
          `'in' operator requires a DOM element as the right operand (got: ${typeof contextElement})`
        );
      }

      const nodeList = contextElement.querySelectorAll(selector);
      return Array.from(nodeList);
    }

    // Special handling for positional expressions with 'in' scope
    if (operator === 'in') {
      let positionalOp: string | null = null;
      let selector: string | null = null;

      if (left.type === 'positionalExpression') {
        positionalOp = left.operator;
        const selectorArg = left.argument;

        if (selectorArg?.type === 'cssSelector') {
          selector = selectorArg.selector;
        } else if (selectorArg?.type === 'selector') {
          selector = selectorArg.value;
        } else if (selectorArg?.type === 'classSelector') {
          selector = '.' + selectorArg.className;
        } else if (selectorArg?.type === 'idSelector') {
          selector = '#' + selectorArg.id;
        } else if (selectorArg) {
          selector = String(await this.evaluate(selectorArg, context));
        }
      } else if (
        left.type === 'memberExpression' &&
        left.object?.type === 'identifier' &&
        (left.object.name === 'first' || left.object.name === 'last')
      ) {
        positionalOp = left.object.name;
        if (left.property?.type === 'identifier' && left.property.name) {
          selector = '.' + left.property.name;
        }
      } else if (
        left.type === 'callExpression' &&
        left.callee?.type === 'identifier' &&
        (left.callee.name === 'first' || left.callee.name === 'last')
      ) {
        positionalOp = left.callee.name;
        const selectorArg = left.arguments?.[0];

        if (selectorArg?.type === 'selector') {
          selector = selectorArg.value;
        } else if (selectorArg?.type === 'cssSelector') {
          selector = selectorArg.selector;
        } else if (selectorArg?.type === 'classSelector') {
          selector = '.' + selectorArg.className;
        } else if (selectorArg?.type === 'idSelector') {
          selector = '#' + selectorArg.id;
        } else if (selectorArg) {
          selector = String(await this.evaluate(selectorArg, context));
        }
      }

      if (positionalOp && selector) {
        const scopeElement = this.unwrapSelectorResult(await this.evaluate(right, context));

        if (!scopeElement || typeof scopeElement.querySelectorAll !== 'function') {
          return undefined;
        }

        const nodeList = scopeElement.querySelectorAll(selector);
        const elements = Array.from(nodeList);

        if (positionalOp === 'first') {
          return elements.length > 0 ? elements[0] : undefined;
        } else if (positionalOp === 'last') {
          return elements.length > 0 ? elements[elements.length - 1] : undefined;
        }

        return elements;
      }
    }

    // Special handling for 'matches' operator
    if (
      operator === 'matches' &&
      (right.type === 'selector' || right.type === 'cssSelector' || right.type === 'classSelector')
    ) {
      const leftValue = await this.evaluate(left, context);
      const selectorStr = right.value || right.selector;

      if (leftValue && typeof leftValue.matches === 'function') {
        try {
          return leftValue.matches(selectorStr);
        } catch {
          return false;
        }
      }
      return false;
    }

    // Evaluate operands normally
    const leftValue = await this.evaluate(left, context);
    const rightValue = await this.evaluate(right, context);

    switch (operator) {
      case '>':
      case 'is greater than':
        return leftValue > rightValue;

      case '<':
      case 'is less than':
        return leftValue < rightValue;

      case '>=':
      case 'is greater than or equal to':
        return leftValue >= rightValue;

      case '<=':
      case 'is less than or equal to':
        return leftValue <= rightValue;

      case '==':
      case 'equals':
      case 'is equal to':
        return leftValue == rightValue;

      case '===':
      case 'is really equal to':
      case 'really equals':
        return leftValue === rightValue;

      case '!=':
      case 'is not equal to':
        return leftValue != rightValue;

      case '!==':
      case 'is not really equal to':
        return leftValue !== rightValue;

      case '+':
        const shouldUseStringConcatenation =
          typeof leftValue === 'string' || typeof rightValue === 'string';

        if (shouldUseStringConcatenation) {
          const stringConcatExpr = this.expressionRegistry.get('stringConcatenation');
          if (stringConcatExpr) {
            debug.expressions('Using string concatenation for:', { leftValue, rightValue });
            const result = await stringConcatExpr.evaluate(context, {
              left: leftValue,
              right: rightValue,
            });
            return result.success ? result.value : leftValue + rightValue;
          }
        } else {
          const additionExpr = this.expressionRegistry.get('addition');
          if (additionExpr) {
            debug.expressions('Using numeric addition for:', { leftValue, rightValue });
            const result = await additionExpr.evaluate(context, {
              left: leftValue,
              right: rightValue,
            });
            return result.success ? result.value : leftValue + rightValue;
          }
        }
        return leftValue + rightValue;

      case '-':
        return leftValue - rightValue;

      case '*':
        return leftValue * rightValue;

      case '/':
        return leftValue / rightValue;

      case '%':
      case 'mod':
        return leftValue % rightValue;

      case 'as':
        const typeName =
          typeof rightValue === 'string'
            ? rightValue
            : right.type === 'identifier'
              ? right.name
              : right.type === 'literal'
                ? right.value
                : String(rightValue);
        const asExpr = this.expressionRegistry.get('as');
        return asExpr ? asExpr.evaluate(context, leftValue, typeName) : leftValue;

      case '&&':
      case 'and':
        return leftValue && rightValue;

      case '||':
      case 'or':
        return leftValue || rightValue;

      case 'is':
        return leftValue === rightValue;

      case 'is not':
        return leftValue !== rightValue;

      case 'is a':
      case 'is an':
        const checkTypeName =
          right.type === 'identifier' ? right.name.toLowerCase() : String(rightValue).toLowerCase();
        switch (checkTypeName) {
          case 'string':
            return typeof leftValue === 'string';
          case 'number':
            return typeof leftValue === 'number';
          case 'boolean':
            return typeof leftValue === 'boolean';
          case 'object':
            return typeof leftValue === 'object' && leftValue !== null;
          case 'array':
            return Array.isArray(leftValue);
          case 'function':
            return typeof leftValue === 'function';
          case 'null':
            return leftValue === null;
          case 'undefined':
            return leftValue === undefined;
          default:
            const typeNameStr = right.type === 'identifier' ? right.name : String(rightValue);
            return leftValue != null && leftValue.constructor?.name === typeNameStr;
        }

      case 'is not a':
      case 'is not an':
        const negCheckTypeName =
          right.type === 'identifier' ? right.name.toLowerCase() : String(rightValue).toLowerCase();
        switch (negCheckTypeName) {
          case 'string':
            return typeof leftValue !== 'string';
          case 'number':
            return typeof leftValue !== 'number';
          case 'boolean':
            return typeof leftValue !== 'boolean';
          case 'object':
            return !(typeof leftValue === 'object' && leftValue !== null);
          case 'array':
            return !Array.isArray(leftValue);
          case 'function':
            return typeof leftValue !== 'function';
          case 'null':
            return leftValue !== null;
          case 'undefined':
            return leftValue !== undefined;
          default:
            const negTypeNameStr = right.type === 'identifier' ? right.name : String(rightValue);
            return !(leftValue != null && leftValue.constructor?.name === negTypeNameStr);
        }

      case '=':
        if (left.type === 'identifier') {
          const variableName = left.name;

          if (variableName === 'result') {
            Object.assign(context, { result: rightValue });
          } else if (variableName === 'it') {
            Object.assign(context, { it: rightValue });
          } else if (variableName === 'you') {
            context.you = rightValue;
          } else {
            if (!context.variables) {
              Object.assign(context, { variables: new Map() });
            }
            context.variables!.set(variableName, rightValue);
          }

          return rightValue;
        } else {
          throw new Error('Left side of assignment must be an identifier');
        }

      case 'contains':
        if (Array.isArray(leftValue)) {
          return leftValue.includes(rightValue);
        }
        if (typeof leftValue === 'string') {
          return leftValue.includes(String(rightValue));
        }
        if (leftValue && typeof leftValue.matches === 'function') {
          return leftValue.matches(String(rightValue));
        }
        return false;

      case 'include':
      case 'includes':
        if (Array.isArray(leftValue)) {
          return leftValue.includes(rightValue);
        }
        if (typeof leftValue === 'string') {
          return leftValue.includes(String(rightValue));
        }
        if (leftValue && typeof leftValue.matches === 'function') {
          return leftValue.matches(String(rightValue));
        }
        return false;

      case 'match':
      case 'matches':
        if (leftValue && typeof leftValue.matches === 'function') {
          const selectorStr = typeof rightValue === 'string' ? rightValue : String(rightValue);
          try {
            return leftValue.matches(selectorStr);
          } catch {
            return false;
          }
        }
        return false;

      case 'in':
        const selectorIn = typeof leftValue === 'string' ? leftValue : String(leftValue);
        const contextElementIn = rightValue;

        if (!contextElementIn || typeof contextElementIn.querySelector !== 'function') {
          if (Array.isArray(contextElementIn)) {
            return contextElementIn.includes(leftValue);
          }
          if (typeof contextElementIn === 'object' && contextElementIn !== null) {
            return selectorIn in contextElementIn;
          }
          throw new Error(
            `'in' operator requires a DOM element, array, or object as the right operand (got: ${typeof contextElementIn})`
          );
        }

        return contextElementIn.querySelector(selectorIn);

      case ' ':
        if (typeof leftValue === 'string' && typeof rightValue === 'string') {
          return { command: leftValue, selector: rightValue };
        }
        if (left.type === 'identifier' && right.type === 'selector') {
          return { command: left.name, selector: right.value };
        }
        return rightValue;

      default:
        throw new Error(`Unsupported binary operator: "${operator}" (length: ${operator.length})`);
    }
  }

  /**
   * Evaluate unary expressions (not, -, +, etc.)
   */
  protected async evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
    const { operator, argument } = node;
    const operandValue = await this.evaluate(argument, context);

    switch (operator) {
      case 'not':
      case '!':
        const notExpr = this.expressionRegistry.get('not');
        return notExpr ? notExpr.evaluate(context, operandValue) : !operandValue;

      case 'no':
        const noExpr = this.expressionRegistry.get('no');
        return noExpr ? noExpr.evaluate(context, operandValue) : false;

      case 'some':
        if (operandValue === null || operandValue === undefined) return false;
        if (typeof operandValue === 'string') return operandValue.length > 0;
        if (Array.isArray(operandValue)) return operandValue.length > 0;
        if (operandValue instanceof NodeList) return operandValue.length > 0;
        if (operandValue instanceof HTMLCollection) return operandValue.length > 0;
        if (typeof operandValue === 'object') return Object.keys(operandValue).length > 0;
        return true;

      case 'exists':
        const existsExpr = this.expressionRegistry.get('exists');
        return existsExpr ? existsExpr.evaluate(context, operandValue) : operandValue != null;

      case 'does not exist':
        const doesNotExistExpr = this.expressionRegistry.get('doesNotExist');
        return doesNotExistExpr
          ? doesNotExistExpr.evaluate(context, operandValue)
          : operandValue == null;

      case '-':
        return -operandValue;

      case '+':
        return +operandValue;

      default:
        throw new Error(`Unsupported unary operator: ${operator}`);
    }
  }

  /**
   * Evaluate call expressions (function calls)
   *
   * This method handles function/method calls that have been PARSED INTO AST NODES
   * by the hyperscript parser. It processes:
   * - Constructor calls: `new Date()`
   * - Method calls: `#dialog.showModal()`, `element.getAttribute('id')`
   * - Function calls: `myFunction(arg1, arg2)`
   *
   * ARCHITECTURAL NOTE - Compare with FunctionCallExpression:
   * ───────────────────────────────────────────────────────
   * This method (BaseExpressionEvaluator):
   *   - Input: AST nodes from parser (callExpression with memberExpression/propertyAccess)
   *   - Processing: Extracts callee from AST, evaluates object and property separately
   *   - Structure: Type-safe, explicit AST structure with object/property fields
   *   - Error handling: Try-catch with exceptions
   *
   * FunctionCallExpression (expressions/function-calls):
   *   - Input: String paths or direct function references ("Math.max")
   *   - Processing: Parses string paths at runtime, traverses object hierarchy
   *   - Structure: Flexible string-based resolution with multi-context lookup
   *   - Error handling: Result-based pattern (no exceptions thrown)
   *
   * Both approaches coexist because they serve different execution pipelines:
   * 1. Parser-based (this method): Structured, from parsed hyperscript code
   * 2. Expression-based (FunctionCallExpression): Flexible, from runtime expressions
   *
   * @see FunctionCallExpression in packages/core/src/expressions/function-calls/index.ts
   * @see evaluateMethodCall() for the unified method call handler
   */
  protected async evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
    const { callee, arguments: args, isConstructor } = node;

    // Handle constructor calls
    if (isConstructor) {
      const constructorName = callee.name;
      const Constructor = context.globals?.get(constructorName) || (window as any)[constructorName];
      if (typeof Constructor === 'function') {
        const evaluatedArgs = await Promise.all(
          args.map((arg: any) => this.evaluate(arg, context))
        );
        return new Constructor(...evaluatedArgs);
      }
      throw new Error(`Unknown constructor: ${constructorName}`);
    }

    // Handle member expression and property access calls (obj.method() or #selector.method())
    // Both create similar AST structures with object and property
    if (callee.type === 'memberExpression' || callee.type === 'propertyAccess') {
      const result = await this.evaluateMethodCall(callee, args, context);
      return result;
    }

    const functionName = callee.name || callee;

    // Check if it's a registered expression function
    const expression = this.expressionRegistry.get(functionName);
    if (expression) {
      const selectorStringFunctions = ['closest', 'previous', 'next'];
      const collectionFunctions = ['first', 'last', 'random', 'at'];

      const needsSelectorString = selectorStringFunctions.includes(functionName);
      const needsCollection = collectionFunctions.includes(functionName);

      const evaluatedArgs = await Promise.all(
        args.map((arg: any) => {
          if (
            needsSelectorString &&
            arg &&
            arg.type === 'selector' &&
            typeof arg.value === 'string'
          ) {
            return arg.value;
          }
          // Handle identifier args for closest/previous/next (e.g., "closest nav" where nav is an identifier)
          if (
            needsSelectorString &&
            arg &&
            arg.type === 'identifier' &&
            typeof arg.name === 'string'
          ) {
            return arg.name;
          }
          if (needsCollection && arg && arg.type === 'selector' && typeof arg.value === 'string') {
            return this.evaluateSelector(arg, context);
          }
          return this.evaluate(arg, context);
        })
      );

      return expression.evaluate(context, ...evaluatedArgs);
    }

    // Try to resolve from context or global scope
    const func = context.globals?.get(functionName) || (window as any)[functionName];
    if (typeof func === 'function') {
      const evaluatedArgs = await Promise.all(args.map((arg: any) => this.evaluate(arg, context)));
      return func(...evaluatedArgs);
    }

    throw new Error(`Unknown function: ${functionName}`);
  }

  /**
   * Evaluate method calls on objects (both memberExpression and propertyAccess)
   * Handles: obj.method(), #selector.method(), element.showModal(), etc.
   *
   * This is a helper method used by evaluateCallExpression() to handle method
   * invocation on both regular objects and CSS selector results.
   *
   * DISTINGUISHING FEATURE:
   * This method works with ALREADY-PARSED AST STRUCTURES (from evaluateCallExpression).
   * For runtime string-based function resolution, see FunctionCallExpression#evaluate().
   *
   * The separation of concerns:
   * - evaluateCallExpression(): Dispatches different AST node types
   * - evaluateMethodCall(): Handles unified execution for memberExpression/propertyAccess
   * - FunctionCallExpression: Handles string paths and runtime resolution
   *
   * @see FunctionCallExpression#evaluate() in packages/core/src/expressions/function-calls/index.ts
   * @see evaluateCallExpression() for the dispatcher method
   */
  private async evaluateMethodCall(
    callee: any,
    args: any[],
    context: ExecutionContext
  ): Promise<any> {
    try {
      // Evaluate the object and extract the method
      const object = await this.evaluate(callee.object, context);
      const thisContext = this.unwrapSelectorResult(object);

      if (thisContext === null || thisContext === undefined) {
        throw new Error(`Cannot call method on null or undefined`);
      }

      // Extract property name (handle both memberExpression and propertyAccess formats)
      const propertyName = callee.property?.name || callee.property?.value || callee.property;
      if (!propertyName || typeof propertyName !== 'string') {
        throw new Error(`Invalid method name: ${propertyName}`);
      }

      const func = thisContext[propertyName];

      if (typeof func !== 'function') {
        throw new Error(
          `Property "${propertyName}" is not a function on ${
            thisContext.constructor?.name || typeof thisContext
          }`
        );
      }

      // Evaluate arguments
      const evaluatedArgs = await Promise.all(args.map((arg: any) => this.evaluate(arg, context)));

      // Call the method with proper 'this' binding
      const result = func.apply(thisContext, evaluatedArgs);
      return result;
    } catch (error) {
      // Re-throw with additional context if needed
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to evaluate method call: ${error}`);
    }
  }

  /**
   * Evaluate CSS selector nodes
   */
  protected async evaluateSelector(
    node: { value: string },
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    // Convert hyperscript selector <tag/> to CSS selector (tag)
    let selector = node.value;

    if (selector.startsWith('<') && selector.endsWith('/>')) {
      selector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
    }
    // Use element's ownerDocument for JSDOM compatibility, fall back to global document
    const doc =
      (context.me as any)?.ownerDocument ?? (typeof document !== 'undefined' ? document : null);
    if (!doc) {
      return [];
    }
    const elements = doc.querySelectorAll(selector);
    // Use duck-typing check instead of instanceof for cross-document compatibility
    const isElement = (el: any): el is HTMLElement =>
      el && typeof el === 'object' && el.nodeType === 1 && typeof el.tagName === 'string';
    return Array.from(elements).filter(isElement);
  }

  /**
   * Get available expression names
   */
  getAvailableExpressions(): string[] {
    return Array.from(this.expressionRegistry.keys());
  }

  /**
   * Evaluate dollar expressions ($variable, $1, $window.foo)
   */
  protected async evaluateDollarExpression(
    node: { expression: any },
    context: ExecutionContext
  ): Promise<any> {
    const value = await this.evaluate(node.expression, context);

    if (node.expression.type === 'identifier') {
      const varName = node.expression.name;

      if (/^\d+$/.test(varName)) {
        return varName;
      }

      if (context.locals?.has(varName)) {
        return context.locals.get(varName);
      }

      if (varName === 'me' && context.me) return context.me;
      if (varName === 'you' && context.you) return context.you;
      if (varName === 'it' && context.it) return context.it;
      if (varName === 'result' && context.result) return context.result;

      if (typeof window !== 'undefined' && varName === 'window') {
        return window;
      }

      if (context.globals?.has(varName)) {
        return context.globals.get(varName);
      }

      return '';
    }

    return value;
  }

  /**
   * Evaluate possessive expressions (element's property)
   */
  protected async evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property } = node;

    const objectValue = this.unwrapSelectorResult(await this.evaluate(object, context));

    if (!objectValue) {
      return undefined;
    }

    const propertyName = property.name || property.value || property;

    if (typeof propertyName === 'string') {
      if (propertyName.startsWith('@')) {
        const attrName = propertyName.substring(1);
        if (objectValue && typeof objectValue.getAttribute === 'function') {
          return objectValue.getAttribute(attrName);
        }
      }

      if (propertyName.startsWith('computed-')) {
        const styleProp = propertyName.substring('computed-'.length);
        if (objectValue && typeof window !== 'undefined' && objectValue instanceof Element) {
          const computedStyle = window.getComputedStyle(objectValue);
          return computedStyle.getPropertyValue(styleProp);
        }
      }

      if (propertyName.startsWith('style.')) {
        const styleProp = propertyName.substring(6);
        if (objectValue && objectValue.style) {
          return objectValue.style[styleProp];
        }
      }

      return objectValue[propertyName];
    }

    return objectValue[propertyName];
  }

  /**
   * Check if an expression is registered
   */
  hasExpression(name: string): boolean {
    return this.expressionRegistry.has(name);
  }

  /**
   * Evaluate CSS selector nodes created by expression-parser
   */
  protected async evaluateCSSSelector(
    node: { selectorType: string; selector: string },
    _context: ExecutionContext
  ): Promise<HTMLElement | HTMLElement[] | null> {
    // Convert hyperscript selector <tag/> to CSS selector (tag)
    let selector = node.selector;

    if (selector.startsWith('<') && selector.endsWith('/>')) {
      selector = selector.slice(1, -2).trim(); // Remove '<' and '/>' and whitespace
    }

    if (node.selectorType === 'id') {
      const id = selector.startsWith('#') ? selector.slice(1) : selector;
      return document.getElementById(id);
    } else if (node.selectorType === 'class') {
      const escapedSelector = selector.replace(/:/g, '\\:');
      const elements = document.querySelectorAll(escapedSelector);
      return Array.from(elements).filter((el): el is HTMLElement => el instanceof HTMLElement);
    }

    const elements = document.querySelectorAll(selector);
    return Array.from(elements).filter((el): el is HTMLElement => el instanceof HTMLElement);
  }

  /**
   * Evaluate query reference expressions (<selector/>)
   * Returns NodeList for compatibility with hyperscript selector semantics
   */
  protected async evaluateQueryReference(
    node: { selector: string },
    _context: ExecutionContext
  ): Promise<NodeList> {
    let selector = node.selector;

    // Remove the < and /> wrapper and trim whitespace (handles <form /> vs <form/>)
    if (selector.startsWith('<') && selector.endsWith('/>')) {
      selector = selector.slice(1, -2).trim();
    }

    // Query references return NodeList (not arrays) - this is the key difference
    try {
      return document.querySelectorAll(selector);
    } catch {
      // If CSS selector is invalid, return empty NodeList
      return document.createDocumentFragment().childNodes;
    }
  }

  /**
   * Evaluate dot notation property access
   */
  protected async evaluatePropertyAccess(
    node: { object: ASTNode; property: { name?: string; value?: string } },
    context: ExecutionContext
  ): Promise<any> {
    const object = await this.evaluate(node.object, context);
    const propertyNode = node.property;

    if (object === null || object === undefined) {
      throw new Error(
        `Cannot access property "${propertyNode.name || propertyNode.value}" of ${object}`
      );
    }

    const propertyName = propertyNode.name || propertyNode.value;
    if (!propertyName) {
      throw new Error('Property name must be an identifier');
    }

    try {
      // Use DOM-aware property access for elements
      let value: unknown;
      if (isElement(object)) {
        value = getElementProperty(object, propertyName);
      } else {
        value = object[propertyName];
      }

      if (typeof value === 'function') {
        return value.bind(object);
      }

      return value;
    } catch (error) {
      throw new Error(`Error accessing property "${propertyName}": ${error}`);
    }
  }

  /**
   * Evaluate "the X of Y" property access pattern
   */
  protected async evaluatePropertyOfExpression(
    node: { property: { name?: string; value?: string }; target: ASTNode },
    context: ExecutionContext
  ): Promise<any> {
    const propertyNode = node.property;
    const propertyName = propertyNode.name || propertyNode.value;

    if (!propertyName) {
      throw new Error('Property name must be an identifier in "the X of Y" pattern');
    }

    const target = this.unwrapSelectorResult(await this.evaluate(node.target, context));

    if (target === null || target === undefined) {
      throw new Error(`Cannot access property "${propertyName}" of ${target}`);
    }

    try {
      // Use DOM-aware property access for elements
      let value: unknown;
      if (isElement(target)) {
        value = getElementProperty(target, propertyName);
      } else {
        value = target[propertyName];
      }

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    } catch (error) {
      throw new Error(`Failed to access property "${propertyName}" on target: ${error}`);
    }
  }
}
