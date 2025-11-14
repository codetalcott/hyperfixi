/**
 * Expression Evaluator - Bridge between parser AST and expression system
 * Connects parsed AST nodes to the comprehensive expression implementations
 */

import type { ASTNode, ExecutionContext } from '../types/core';
import { debug } from '../utils/debug';

// Import all expression categories
import { referencesExpressions } from '../expressions/references/index';
import { logicalExpressions } from '../expressions/logical/index';
import { conversionExpressions } from '../expressions/conversion/index';
import { positionalExpressions } from '../expressions/positional/index';
import { propertiesExpressions } from '../expressions/properties/index';
import { specialExpressions } from '../expressions/special/index';

export class ExpressionEvaluator {
  private expressionRegistry: Map<string, any>;

  constructor() {
    this.expressionRegistry = new Map();
    this.registerExpressions();
  }

  /**
   * Register all expression implementations from different categories
   */
  private registerExpressions(): void {
    // Register reference expressions
    Object.entries(referencesExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });

    // Register logical expressions
    Object.entries(logicalExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });

    // Register conversion expressions
    Object.entries(conversionExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });

    // Register positional expressions
    Object.entries(positionalExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });

    // Register property expressions
    debug.expr('About to register properties expressions:', Object.keys(propertiesExpressions));
    Object.entries(propertiesExpressions).forEach(([name, impl]) => {
      debug.expr(`Registering property expression: ${name}`);
      this.expressionRegistry.set(name, impl);
    });
    debug.expr('Total expressions registered:', this.expressionRegistry.size);
    debug.expr('Registry has "possessive":', this.expressionRegistry.has('possessive'));
    debug.expr('Registry has "my":', this.expressionRegistry.has('my'));

    // Register special expressions
    Object.entries(specialExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });
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
      console.error('⚠️ EVALUATOR: Node missing type property:', node);
      throw new Error(`Node missing type property: ${JSON.stringify(node)}`);
    }

    switch (node.type) {
      case 'identifier':
        return this.evaluateIdentifier(node as any, context);

      case 'literal':
        return this.evaluateLiteral(node as any, context);

      case 'string':
        // String literal nodes (alternative to 'literal' for string values)
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

      default:
        throw new Error(`Unsupported AST node type for evaluation: ${node.type}`);
    }
  }

  /**
   * Evaluate array literal - evaluate each element
   * Example: [pointermove, pointerup] -> array of evaluated event names
   */
  private async evaluateArrayLiteral(node: any, context: ExecutionContext): Promise<any[]> {
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
   * Example: { left: ${x}px, top: ${y}px } -> { left: "100px", top: "50px" }
   */
  private async evaluateObjectLiteral(
    node: any,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const properties = node.properties || [];
    const result: Record<string, any> = {};

    for (const property of properties) {
      // Evaluate the key
      let key: string;
      if (property.key.type === 'identifier') {
        // For object literal keys that are identifiers, use the name directly
        key = property.key.name;
      } else if (property.key.type === 'literal') {
        key = String(property.key.value);
      } else {
        // For other key types, evaluate them
        const evaluatedKey = await this.evaluate(property.key, context);
        key = String(evaluatedKey);
      }

      // Evaluate the value
      const value = await this.evaluate(property.value, context);

      // Add to result object
      result[key] = value;
    }

    return result;
  }

  /**
   * Evaluate template literal - parse ${} expressions and substitute values
   * Example: `hsl(${rand} 100% 90%)` where rand = 180 -> "hsl(180 100% 90%)"
   */
  private async evaluateTemplateLiteral(node: any, context: ExecutionContext): Promise<string> {
    const template = node.value || '';

    // DEBUG: Log template literal evaluation
    debug.expressions('TEMPLATE LITERAL: Evaluating', { template, node });

    // Parse and evaluate ${} expressions
    let result = '';
    let i = 0;

    while (i < template.length) {
      // Find next ${ expression
      const exprStart = template.indexOf('${', i);

      if (exprStart === -1) {
        // No more expressions, append rest of string
        result += template.slice(i);
        break;
      }

      // Append static text before ${
      result += template.slice(i, exprStart);

      // Find matching }
      const exprEnd = template.indexOf('}', exprStart);
      if (exprEnd === -1) {
        throw new Error(`Unterminated template expression in: ${template}`);
      }

      // Extract expression code (between ${ and })
      const exprCode = template.slice(exprStart + 2, exprEnd);

      debug.expressions('TEMPLATE: Evaluating expression:', exprCode);

      // Evaluate expression - check context variables first
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
        // Expression is more complex - try to evaluate it with context
        value = await this.evaluateSimpleExpression(exprCode, context);
        debug.expressions(`TEMPLATE: Evaluated expression "${exprCode}" =`, value);
      }

      // Append evaluated value
      result += String(value);

      // Move past the }
      i = exprEnd + 1;
    }

    return result;
  }

  /**
   * Evaluate simple expressions like "clientX - xoff" or "clientX-xoff" using context variables
   * Handles basic arithmetic: +, -, *, /, %
   */
  private async evaluateSimpleExpression(
    exprCode: string,
    context: ExecutionContext
  ): Promise<any> {
    debug.expressions('EVAL: Evaluating arithmetic expression:', exprCode);

    // Try to find an operator in the expression
    // Match identifier/number, operator, identifier/number (with or without spaces)
    // Use a more specific pattern that matches identifiers
    const arithmeticMatch = exprCode.match(
      /^([a-zA-Z_$][a-zA-Z0-9_$]*|\d+(?:\.\d+)?)\s*([\+\-\*\/\%])\s*([a-zA-Z_$][a-zA-Z0-9_$]*|\d+(?:\.\d+)?)$/
    );

    if (arithmeticMatch) {
      const [, left, operator, right] = arithmeticMatch;
      debug.expressions('EVAL: Parsed arithmetic:', { left, operator, right });

      // Evaluate left and right sides
      const leftValue = await this.resolveValue(left.trim(), context);
      const rightValue = await this.resolveValue(right.trim(), context);
      debug.expressions('EVAL: Resolved values:', { leftValue, rightValue });

      // Perform arithmetic
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
      } else {
        debug.expressions('EVAL: Non-numeric values, returning as-is');
      }
    } else {
      debug.expressions('EVAL: No arithmetic pattern matched, trying as single value');
    }

    // Fallback: try to resolve as a single value
    const fallback = await this.resolveValue(exprCode.trim(), context);
    debug.expressions('EVAL: Fallback result:', fallback);
    return fallback;
  }

  /**
   * Resolve a value from context or parse as literal
   */
  private async resolveValue(name: string, context: ExecutionContext): Promise<any> {
    debug.expressions(`RESOLVE: Looking for '${name}' in context`, {
      hasInLocals: context.locals.has(name),
      localsKeys: Array.from(context.locals.keys()),
      value: context.locals.get(name),
    });

    // Check context
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

    // Return as-is if nothing else works
    return name;
  }

  /**
   * Evaluate identifier nodes (me, you, it, etc.)
   */
  private async evaluateIdentifier(
    node: { name: string; scope?: 'local' | 'global' },
    context: ExecutionContext
  ): Promise<any> {
    const { name, scope } = node;

    // Check if it's a built-in reference expression
    const expression = this.expressionRegistry.get(name);
    if (expression) {
      return expression.evaluate(context);
    }

    // If explicit scope is specified, ONLY check that scope
    if (scope === 'local') {
      // Only check locals (for :variable syntax)
      if (context.locals?.has(name)) {
        return context.locals.get(name);
      }
      // Return undefined if not found in locals
      return undefined;
    }

    if (scope === 'global') {
      // Only check globals (for ::variable syntax or explicit global)
      if (context.globals?.has(name)) {
        return context.globals.get(name);
      }
      // Also check window for browser globals
      if (typeof window !== 'undefined' && name in window) {
        return (window as any)[name];
      }
      return undefined;
    }

    // No explicit scope - use normal resolution order (locals → globals → variables → window)
    // Check locals first (for command arguments and locally scoped variables)
    if (context.locals?.has(name)) {
      return context.locals.get(name);
    }

    // Check globals (for globally scoped variables)
    if (context.globals?.has(name)) {
      return context.globals.get(name);
    }

    // Check custom variables (legacy support)
    if (context.variables?.has(name)) {
      return context.variables.get(name);
    }

    // Check JavaScript global objects (Date, Math, Object, Array, etc.)
    if (typeof globalThis !== 'undefined' && name in globalThis) {
      return (globalThis as any)[name];
    }

    // Check window object explicitly (for browser globals set by commands)
    if (typeof window !== 'undefined' && name in window) {
      return (window as any)[name];
    }

    // Return undefined for unknown identifiers (not the name as string)
    // This allows patterns like (count or 0) to work correctly
    return undefined;
  }

  /**
   * Evaluate literal nodes (strings, numbers, booleans)
   */
  private async evaluateLiteral(node: { value: any }, _context: ExecutionContext): Promise<any> {
    return node.value;
  }

  /**
   * Evaluate member expressions (object.property)
   */
  private async evaluateMemberExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property, computed } = node;

    // Special case: handle command-like member expressions (add.active, remove.active)
    if (object.type === 'identifier' && ['add', 'remove'].includes(object.name)) {
      const commandName = object.name;
      const className = property.name || property;

      // Execute as class manipulation command on context.me
      if (!context.me) {
        throw new Error('Context element "me" is null');
      }

      if (commandName === 'add') {
        context.me.classList.add(className);
      } else if (commandName === 'remove') {
        context.me.classList.remove(className);
      }

      return; // No return value for these commands
    }

    // Evaluate the object first for normal member expressions
    const objectValue = await this.evaluate(object, context);

    if (computed) {
      // For computed access like obj[key]
      const propertyValue = await this.evaluate(property, context);
      return objectValue[propertyValue];
    } else {
      // For property access like obj.property
      const propertyName = property.name || property;

      // Special handling for possessive syntax (element's property)
      if (propertyName && this.expressionRegistry.has('possessive')) {
        const possessiveExpr = this.expressionRegistry.get('possessive');
        return possessiveExpr.evaluate(context, objectValue, propertyName);
      }

      return objectValue[propertyName];
    }
  }

  /**
   * Evaluate binary expressions (comparisons, arithmetic, etc.)
   */
  private async evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
    const { operator, left, right } = node;

    // Special handling for 'in' operator - don't evaluate left if it's a selector
    if (operator === 'in' && left.type === 'selector') {
      const selector = left.value;
      const contextElement = await this.evaluate(right, context);

      // Verify we have a valid DOM element as context
      if (!contextElement || typeof contextElement.querySelector !== 'function') {
        throw new Error(
          `'in' operator requires a DOM element as the right operand (got: ${typeof contextElement})`
        );
      }

      // Query for ALL matching elements within the context element
      // Convert NodeList to Array for easier manipulation in hyperscript
      const nodeList = contextElement.querySelectorAll(selector);
      return Array.from(nodeList);
    }

    // Evaluate operands normally for other operators
    const leftValue = await this.evaluate(left, context);
    const rightValue = await this.evaluate(right, context);

    // Map operators to expression implementations
    switch (operator) {
      case '>':
        const greaterThanExpr = this.expressionRegistry.get('greaterThan');
        return greaterThanExpr
          ? greaterThanExpr.evaluate(context, leftValue, rightValue)
          : leftValue > rightValue;

      case '<':
        const lessThanExpr = this.expressionRegistry.get('lessThan');
        return lessThanExpr
          ? lessThanExpr.evaluate(context, leftValue, rightValue)
          : leftValue < rightValue;

      case '>=':
        const gteExpr = this.expressionRegistry.get('greaterThanOrEqual');
        return gteExpr ? gteExpr.evaluate(context, leftValue, rightValue) : leftValue >= rightValue;

      case '<=':
        const lteExpr = this.expressionRegistry.get('lessThanOrEqual');
        return lteExpr ? lteExpr.evaluate(context, leftValue, rightValue) : leftValue <= rightValue;

      case '==':
      case '===':
      case 'equals':
        const equalsExpr = this.expressionRegistry.get('equals');
        return equalsExpr
          ? equalsExpr.evaluate(context, leftValue, rightValue)
          : leftValue === rightValue;

      case 'is equal to':
        // Same as regular equals - loose equality
        return leftValue == rightValue;

      case 'is really equal to':
      case 'really equals':
        // Strict equality - type and value must match
        return leftValue === rightValue;

      case 'is not equal to':
        // Negated loose equality
        return leftValue != rightValue;

      case 'is not really equal to':
        // Negated strict equality
        return leftValue !== rightValue;

      case 'is greater than':
        return leftValue > rightValue;

      case 'is less than':
        return leftValue < rightValue;

      case 'is greater than or equal to':
        return leftValue >= rightValue;

      case 'is less than or equal to':
        return leftValue <= rightValue;

      case '!=':
      case '!==':
        const notEqualsExpr = this.expressionRegistry.get('notEquals');
        return notEqualsExpr
          ? notEqualsExpr.evaluate(context, leftValue, rightValue)
          : leftValue !== rightValue;

      case '+':
        // Smart operator resolution: choose between numeric addition and string concatenation
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

        // Fallback to native JavaScript addition/concatenation
        debug.expressions('Using fallback + operation for:', { leftValue, rightValue });
        return leftValue + rightValue;

      case '-':
        const subtractExpr = this.expressionRegistry.get('subtract');
        return subtractExpr
          ? subtractExpr.evaluate(context, leftValue, rightValue)
          : leftValue - rightValue;

      case '*':
        const multiplyExpr = this.expressionRegistry.get('multiply');
        return multiplyExpr
          ? multiplyExpr.evaluate(context, leftValue, rightValue)
          : leftValue * rightValue;

      case '/':
        const divideExpr = this.expressionRegistry.get('divide');
        return divideExpr
          ? divideExpr.evaluate(context, leftValue, rightValue)
          : leftValue / rightValue;

      case '%':
      case 'mod':
        const modExpr = this.expressionRegistry.get('modulo');
        return modExpr ? modExpr.evaluate(context, leftValue, rightValue) : leftValue % rightValue;

      case 'as':
        // Type conversion - right operand should be a type name
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
        const andExpr = this.expressionRegistry.get('and');
        return andExpr ? andExpr.evaluate(context, leftValue, rightValue) : leftValue && rightValue;

      case '||':
      case 'or':
        const orExpr = this.expressionRegistry.get('or');
        return orExpr ? orExpr.evaluate(context, leftValue, rightValue) : leftValue || rightValue;

      case 'is':
        // Identity comparison - strict equality (bypass registry for binary comparison)
        return leftValue === rightValue;

      case 'is not':
        // Negative identity comparison - strict inequality
        return leftValue !== rightValue;

      case '=':
        // Assignment operator - set variable in context
        if (left.type === 'identifier') {
          const variableName = left.name;

          // Handle special context variables
          if (variableName === 'result') {
            Object.assign(context, { result: rightValue });
          } else if (variableName === 'it') {
            Object.assign(context, { it: rightValue });
          } else if (variableName === 'you') {
            context.you = rightValue;
          } else {
            // Set regular variable
            if (!context.variables) {
              Object.assign(context, { variables: new Map() });
            }
            context.variables!.set(variableName, rightValue);
          }

          return rightValue; // Assignment returns the assigned value
        } else {
          throw new Error('Left side of assignment must be an identifier');
        }

      case 'contains':
        // Container contains item - works with arrays, strings, and DOM elements
        if (Array.isArray(leftValue)) {
          return leftValue.includes(rightValue);
        }
        if (typeof leftValue === 'string') {
          return leftValue.includes(String(rightValue));
        }
        // DOM element containment (CSS selector matching)
        if (leftValue && typeof leftValue.matches === 'function') {
          return leftValue.matches(String(rightValue));
        }
        return false;

      case 'include':
      case 'includes':
        // Alias for contains
        if (Array.isArray(leftValue)) {
          return leftValue.includes(rightValue);
        }
        if (typeof leftValue === 'string') {
          return leftValue.includes(String(rightValue));
        }
        // DOM element containment (CSS selector matching)
        if (leftValue && typeof leftValue.matches === 'function') {
          return leftValue.matches(String(rightValue));
        }
        return false;

      case 'in':
        // DOM query within context (fallback for non-selector cases)
        // Note: Most common case (.selector in element) is handled before the switch
        const selector = typeof leftValue === 'string' ? leftValue : String(leftValue);
        const contextElement = rightValue;

        // Verify we have a valid DOM element as context
        if (!contextElement || typeof contextElement.querySelector !== 'function') {
          // Could also be array/object membership check
          if (Array.isArray(contextElement)) {
            return contextElement.includes(leftValue);
          }
          if (typeof contextElement === 'object' && contextElement !== null) {
            return selector in contextElement;
          }
          throw new Error(
            `'in' operator requires a DOM element, array, or object as the right operand (got: ${typeof contextElement})`
          );
        }

        // Query for the selector within the context element
        return contextElement.querySelector(selector);

      case ' ':
        // Space operator - typically for command with selector
        if (typeof leftValue === 'string' && typeof rightValue === 'string') {
          // This might be a command-selector pattern, return both values
          return { command: leftValue, selector: rightValue };
        }

        // Special case: command identifier + selector node
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
  private async evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
    const { operator, argument } = node;

    // Evaluate operand
    const operandValue = await this.evaluate(argument, context);

    switch (operator) {
      case 'not':
      case '!':
        const notExpr = this.expressionRegistry.get('not');
        return notExpr ? notExpr.evaluate(context, operandValue) : !operandValue;

      case 'no':
        const noExpr = this.expressionRegistry.get('no');
        return noExpr ? noExpr.evaluate(context, operandValue) : false;

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
   */
  private async evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
    const { callee, arguments: args, isConstructor } = node;

    // Handle constructor calls (new ClassName())
    if (isConstructor) {
      const constructorName = callee.name;

      // Try to resolve constructor from global scope
      const Constructor = context.globals?.get(constructorName) || (window as any)[constructorName];
      if (typeof Constructor === 'function') {
        const evaluatedArgs = await Promise.all(
          args.map((arg: any) => this.evaluate(arg, context))
        );
        return new Constructor(...evaluatedArgs);
      }

      throw new Error(`Unknown constructor: ${constructorName}`);
    }

    // Handle member expression calls (like obj.method())
    if (callee.type === 'memberExpression') {
      // Evaluate the member expression to get the function
      const func = await this.evaluateMemberExpression(callee, context);

      if (typeof func === 'function') {
        const evaluatedArgs = await Promise.all(
          args.map((arg: any) => this.evaluate(arg, context))
        );
        // Evaluate the object to use as 'this' context
        const thisContext = await this.evaluate(callee.object, context);
        return func.apply(thisContext, evaluatedArgs);
      }

      throw new Error(
        `Member expression does not evaluate to a function: ${callee.property?.name || 'unknown'}`
      );
    }

    // Get function name
    const functionName = callee.name || callee;

    // Check if it's a registered expression function
    const expression = this.expressionRegistry.get(functionName);
    if (expression) {
      // Evaluate arguments
      const evaluatedArgs = await Promise.all(args.map((arg: any) => this.evaluate(arg, context)));

      return expression.evaluate(context, ...evaluatedArgs);
    }

    // For unknown functions, try to resolve from context or global scope
    const func = context.globals?.get(functionName) || (window as any)[functionName];
    if (typeof func === 'function') {
      const evaluatedArgs = await Promise.all(args.map((arg: any) => this.evaluate(arg, context)));
      return func(...evaluatedArgs);
    }

    throw new Error(`Unknown function: ${functionName}`);
  }

  /**
   * Evaluate CSS selector nodes
   */
  private async evaluateSelector(
    node: { value: string },
    context: ExecutionContext
  ): Promise<HTMLElement[]> {
    const selectorExpr = this.expressionRegistry.get('querySelector');
    if (selectorExpr) {
      const element = await selectorExpr.evaluate(context, node.value);
      return element ? [element] : [];
    }

    // Fallback to basic querySelector
    const elements = document.querySelectorAll(node.value);
    return Array.from(elements) as HTMLElement[];
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
  private async evaluateDollarExpression(
    node: { expression: any },
    context: ExecutionContext
  ): Promise<any> {
    // Evaluate the inner expression normally
    const value = await this.evaluate(node.expression, context);

    // If it's a simple identifier, try to resolve it from context
    if (node.expression.type === 'identifier') {
      const varName = node.expression.name;

      // Handle numeric literals like $1, $2
      if (/^\d+$/.test(varName)) {
        return varName;
      }

      // Handle context variables
      if (context.locals?.has(varName)) {
        return context.locals.get(varName);
      }

      // Handle special context properties
      if (varName === 'me' && context.me) return context.me;
      if (varName === 'you' && context.you) return context.you;
      if (varName === 'it' && context.it) return context.it;
      if (varName === 'result' && context.result) return context.result;

      // Handle globals including window
      if (typeof window !== 'undefined' && varName === 'window') {
        return window;
      }

      if (context.globals?.has(varName)) {
        return context.globals.get(varName);
      }

      // Return empty string for unresolved variables (hyperscript behavior)
      return '';
    }

    // For member expressions, evaluate normally
    return value;
  }

  /**
   * Evaluate possessive expressions (element's property)
   */
  private async evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
    const { object, property } = node;

    // Evaluate the object first
    const objectValue = await this.evaluate(object, context);

    if (!objectValue) {
      return undefined;
    }

    // Get property name
    const propertyName = property.name || property.value || property;

    // Handle special possessive syntax patterns
    if (typeof propertyName === 'string') {
      // Handle attribute access (@data-attr becomes getAttribute)
      if (propertyName.startsWith('@')) {
        const attrName = propertyName.substring(1);
        if (objectValue && typeof objectValue.getAttribute === 'function') {
          return objectValue.getAttribute(attrName);
        }
      }

      // Handle style access (style.color)
      if (propertyName.startsWith('style.')) {
        const styleProp = propertyName.substring(6);
        if (objectValue && objectValue.style) {
          return objectValue.style[styleProp];
        }
      }

      // Regular property access
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
}
