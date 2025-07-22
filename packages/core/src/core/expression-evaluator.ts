/**
 * Expression Evaluator - Bridge between parser AST and expression system
 * Connects parsed AST nodes to the comprehensive expression implementations
 */

import type { ASTNode, ExecutionContext } from '../types/core.js';

// Import all expression categories
import { referenceExpressions } from '../expressions/references/index.js';
import { logicalExpressions } from '../expressions/logical/index.js';
import { conversionExpressions } from '../expressions/conversion/index.js';
import { positionalExpressions } from '../expressions/positional/index.js';
import { propertyExpressions } from '../expressions/properties/index.js';
import { specialExpressions } from '../expressions/special/index.js';

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
    Object.entries(referenceExpressions).forEach(([name, impl]) => {
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
    Object.entries(propertyExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });

    // Register special expressions
    Object.entries(specialExpressions).forEach(([name, impl]) => {
      this.expressionRegistry.set(name, impl);
    });
  }

  /**
   * Evaluate an AST node using the appropriate expression implementation
   */
  async evaluate(node: ASTNode, context: ExecutionContext): Promise<any> {
    switch (node.type) {
      case 'identifier':
        return this.evaluateIdentifier(node as any, context);
      
      case 'literal':
        return this.evaluateLiteral(node as any, context);
      
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
      
      default:
        throw new Error(`Unsupported AST node type for evaluation: ${node.type}`);
    }
  }

  /**
   * Evaluate identifier nodes (me, you, it, etc.)
   */
  private async evaluateIdentifier(node: { name: string }, context: ExecutionContext): Promise<any> {
    const { name } = node;
    
    // Check if it's a built-in reference expression
    const expression = this.expressionRegistry.get(name);
    if (expression) {
      return expression.evaluate(context);
    }
    
    // Check custom variables
    if (context.variables?.has(name)) {
      return context.variables.get(name);
    }
    
    // Default to returning the name itself for unknown identifiers
    return name;
  }

  /**
   * Evaluate literal nodes (strings, numbers, booleans)
   */
  private async evaluateLiteral(node: { value: any }, context: ExecutionContext): Promise<any> {
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
    
    // Evaluate operands
    const leftValue = await this.evaluate(left, context);
    const rightValue = await this.evaluate(right, context);
    
    // Map operators to expression implementations
    switch (operator) {
      case '>':
        const greaterThanExpr = this.expressionRegistry.get('greaterThan');
        return greaterThanExpr ? greaterThanExpr.evaluate(context, leftValue, rightValue) : leftValue > rightValue;
      
      case '<':
        const lessThanExpr = this.expressionRegistry.get('lessThan');
        return lessThanExpr ? lessThanExpr.evaluate(context, leftValue, rightValue) : leftValue < rightValue;
      
      case '>=':
        const gteExpr = this.expressionRegistry.get('greaterThanOrEqual');
        return gteExpr ? gteExpr.evaluate(context, leftValue, rightValue) : leftValue >= rightValue;
      
      case '<=':
        const lteExpr = this.expressionRegistry.get('lessThanOrEqual');
        return lteExpr ? lteExpr.evaluate(context, leftValue, rightValue) : leftValue <= rightValue;
      
      case '==':
      case '===':
        const equalsExpr = this.expressionRegistry.get('equals');
        return equalsExpr ? equalsExpr.evaluate(context, leftValue, rightValue) : leftValue === rightValue;
      
      case '!=':
      case '!==':
        const notEqualsExpr = this.expressionRegistry.get('notEquals');
        return notEqualsExpr ? notEqualsExpr.evaluate(context, leftValue, rightValue) : leftValue !== rightValue;
      
      case '+':
        const addExpr = this.expressionRegistry.get('add');
        return addExpr ? addExpr.evaluate(context, leftValue, rightValue) : leftValue + rightValue;
      
      case '-':
        const subtractExpr = this.expressionRegistry.get('subtract');
        return subtractExpr ? subtractExpr.evaluate(context, leftValue, rightValue) : leftValue - rightValue;
      
      case '*':
        const multiplyExpr = this.expressionRegistry.get('multiply');
        return multiplyExpr ? multiplyExpr.evaluate(context, leftValue, rightValue) : leftValue * rightValue;
      
      case '/':
        const divideExpr = this.expressionRegistry.get('divide');
        return divideExpr ? divideExpr.evaluate(context, leftValue, rightValue) : leftValue / rightValue;
      
      case '%':
        const modExpr = this.expressionRegistry.get('modulo');
        return modExpr ? modExpr.evaluate(context, leftValue, rightValue) : leftValue % rightValue;
      
      case 'as':
        // Type conversion - right operand should be a type name
        const typeName = typeof rightValue === 'string' ? rightValue : 
                        right.type === 'identifier' ? right.name :
                        right.type === 'literal' ? right.value :
                        String(rightValue);
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
            context.result = rightValue;
          } else if (variableName === 'it') {
            context.it = rightValue;
          } else if (variableName === 'you') {
            context.you = rightValue;
          } else {
            // Set regular variable
            if (!context.variables) {
              context.variables = new Map();
            }
            context.variables.set(variableName, rightValue);
          }
          
          return rightValue; // Assignment returns the assigned value
        } else {
          throw new Error('Left side of assignment must be an identifier');
        }
      
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
        throw new Error(`Unsupported binary operator: ${operator}`);
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
    const { callee, arguments: args } = node;
    
    // Get function name
    const functionName = callee.name || callee;
    
    // Check if it's a registered expression function
    const expression = this.expressionRegistry.get(functionName);
    if (expression) {
      // Evaluate arguments
      const evaluatedArgs = await Promise.all(
        args.map((arg: any) => this.evaluate(arg, context))
      );
      
      return expression.evaluate(context, ...evaluatedArgs);
    }
    
    // For unknown functions, try to resolve from context or global scope
    const func = context.globals?.get(functionName) || (window as any)[functionName];
    if (typeof func === 'function') {
      const evaluatedArgs = await Promise.all(
        args.map((arg: any) => this.evaluate(arg, context))
      );
      return func(...evaluatedArgs);
    }
    
    throw new Error(`Unknown function: ${functionName}`);
  }

  /**
   * Evaluate CSS selector nodes
   */
  private async evaluateSelector(node: { value: string }, context: ExecutionContext): Promise<HTMLElement[]> {
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
   * Check if an expression is registered
   */
  hasExpression(name: string): boolean {
    return this.expressionRegistry.has(name);
  }
}