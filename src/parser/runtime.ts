/**
 * Hyperscript Runtime Expression Evaluator
 * Connects AST parser with Phase 3 expression evaluation system
 */

import type { ASTNode, ExecutionContext } from '../types/core.js';

// Import Phase 3 expression system
import { referenceExpressions } from '../expressions/references/index.js';
import { logicalExpressions } from '../expressions/logical/index.js';
import { conversionExpressions } from '../expressions/conversion/index.js';
import { positionalExpressions } from '../expressions/positional/index.js';
import { propertyExpressions } from '../expressions/properties/index.js';
import { specialExpressions } from '../expressions/special/index.js';

/**
 * Evaluates an AST node using the Phase 3 expression system
 */
export async function evaluateAST(node: ASTNode, context: ExecutionContext): Promise<any> {
  if (!node) {
    throw new Error('Cannot evaluate null or undefined AST node');
  }
  
  switch (node.type) {
    case 'literal':
      return evaluateLiteral(node);
      
    case 'identifier':
      return evaluateIdentifier(node, context);
      
    case 'binaryExpression':
      return evaluateBinaryExpression(node, context);
      
    case 'unaryExpression':
      return evaluateUnaryExpression(node, context);
      
    case 'memberExpression':
      return evaluateMemberExpression(node, context);
      
    case 'callExpression':
      return evaluateCallExpression(node, context);
      
    case 'selector':
      return evaluateSelector(node, context);
      
    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);
      
    case 'eventHandler':
      return evaluateEventHandler(node, context);
      
    case 'command':
      return evaluateCommand(node, context);
      
    case 'conditionalExpression':
      return evaluateConditionalExpression(node, context);
      
    default:
      throw new Error(`Unknown AST node type: ${(node as any).type}`);
  }
}

/**
 * Evaluates literal nodes (numbers, strings, booleans)
 */
function evaluateLiteral(node: any): any {
  return node.value;
}

/**
 * Evaluates identifier nodes using Phase 3 reference expressions
 */
async function evaluateIdentifier(node: any, context: ExecutionContext): Promise<any> {
  const name = node.name;
  
  // Handle context variables using Phase 3 reference expressions
  if (name === 'me') {
    return referenceExpressions.me.evaluate(context);
  }
  
  if (name === 'you') {
    return referenceExpressions.you.evaluate(context);
  }
  
  if (name === 'it') {
    return referenceExpressions.it.evaluate(context);
  }
  
  if (name === 'window') {
    return referenceExpressions.window.evaluate(context);
  }
  
  if (name === 'document') {
    return referenceExpressions.document.evaluate(context);
  }
  
  // Check if identifier exists in context scope
  if (context.locals && context.locals.has(name)) {
    return context.locals.get(name);
  }
  
  if (context.globals && context.globals.has(name)) {
    return context.globals.get(name);
  }
  
  // Check if it's a property on the context object (for backward compatibility)
  if ((context as any)[name] !== undefined) {
    return (context as any)[name];
  }
  
  // Default to undefined for unknown identifiers
  return undefined;
}

/**
 * Evaluates binary expressions using Phase 3 logical expressions
 */
async function evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const left = await evaluateAST(node.left, context);
  const operator = node.operator;
  
  // Handle short-circuit evaluation for logical operators
  if (operator === 'and') {
    if (!left) return false;
    const right = await evaluateAST(node.right, context);
    return logicalExpressions.and.evaluate(context, left, right);
  }
  
  if (operator === 'or') {
    if (left) return true;
    const right = await evaluateAST(node.right, context);
    return logicalExpressions.or.evaluate(context, left, right);
  }
  
  // Evaluate right side for other operators
  const right = await evaluateAST(node.right, context);
  
  // Delegate to Phase 3 expression system based on operator
  switch (operator) {
    case '+':
      return specialExpressions.addition.evaluate(context, left, right);
    case '-':
      return specialExpressions.subtraction.evaluate(context, left, right);
    case '*':
      return specialExpressions.multiplication.evaluate(context, left, right);
    case '/':
      return specialExpressions.division.evaluate(context, left, right);
    case '%':
    case 'mod':
      return specialExpressions.modulo.evaluate(context, left, right);
      
    case '>':
      return logicalExpressions.greaterThan.evaluate(context, left, right);
    case '<':
      return logicalExpressions.lessThan.evaluate(context, left, right);
    case '>=':
      return logicalExpressions.greaterThanOrEqual.evaluate(context, left, right);
    case '<=':
      return logicalExpressions.lessThanOrEqual.evaluate(context, left, right);
    case '==':
    case 'is':
      return logicalExpressions.equals.evaluate(context, left, right);
    case '!=':
      return logicalExpressions.notEquals.evaluate(context, left, right);
    case '===':
      return logicalExpressions.strictEquals.evaluate(context, left, right);
    case '!==':
      return logicalExpressions.strictNotEquals.evaluate(context, left, right);
      
    case 'as':
      return conversionExpressions.as.evaluate(context, left, right);
      
      
    case 'contains':
      return logicalExpressions.contains.evaluate(context, left, right);
      
    case 'matches':
      return logicalExpressions.matches.evaluate(context, left, right);
      
    case 'in':
      return positionalExpressions.in.evaluate(context, left, right);
      
    case 'of':
      return positionalExpressions.of.evaluate(context, left, right);
      
    default:
      throw new Error(`Unknown binary operator: ${operator}`);
  }
}

/**
 * Evaluates unary expressions
 */
async function evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const argument = await evaluateAST(node.argument, context);
  const operator = node.operator;
  
  switch (operator) {
    case 'not':
      return logicalExpressions.not.evaluate(context, argument);
      
    case '-':
      return -argument;
      
    case '+':
      return +argument;
      
    default:
      throw new Error(`Unknown unary operator: ${operator}`);
  }
}

/**
 * Evaluates member expressions using Phase 3 property expressions
 */
async function evaluateMemberExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateAST(node.object, context);
  
  if (node.computed) {
    // Computed access: object[property]
    const property = await evaluateAST(node.property, context);
    return object?.[property];
  } else {
    // Non-computed access: object.property
    const propertyName = node.property.name;
    return object?.[propertyName];
  }
}

/**
 * Evaluates call expressions using Phase 3 reference expressions
 */
async function evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
  const callee = await evaluateAST(node.callee, context);
  const args = await Promise.all(
    node.arguments.map((arg: ASTNode) => evaluateAST(arg, context))
  );
  
  // Handle special hyperscript functions
  if (node.callee.type === 'identifier') {
    const funcName = node.callee.name;
    
    switch (funcName) {
      case 'closest':
        return referenceExpressions.closest.evaluate(context, ...args);
        
      case 'first':
        return positionalExpressions.first.evaluate(context, ...args);
        
      case 'last':
        return positionalExpressions.last.evaluate(context, ...args);
        
      case 'next':
        return positionalExpressions.next.evaluate(context, ...args);
        
      case 'previous':
        return positionalExpressions.previous.evaluate(context, ...args);
        
      default:
        // Regular function call
        if (typeof callee === 'function') {
          return callee(...args);
        }
        throw new Error(`Cannot call non-function: ${funcName}`);
    }
  }
  
  // Method calls
  if (typeof callee === 'function') {
    return callee(...args);
  }
  
  throw new Error('Cannot call non-function');
}

/**
 * Evaluates CSS selector expressions using Phase 3 reference expressions
 */
async function evaluateSelector(node: any, context: ExecutionContext): Promise<any> {
  const selector = node.value;
  const result = await referenceExpressions.elementWithSelector.evaluate(context, selector);
  
  // If result is array, return first element to match hyperscript behavior
  if (Array.isArray(result) && result.length > 0) {
    return result[0];
  }
  
  return result;
}

/**
 * Evaluates possessive expressions (element's property)
 */
async function evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateAST(node.object, context);
  const propertyName = node.property.name;
  
  // Use Phase 3 property expression system
  return propertyExpressions.possessive.evaluate(context, object, propertyName);
}

/**
 * Evaluates event handler expressions
 */
async function evaluateEventHandler(node: any, context: ExecutionContext): Promise<any> {
  // Event handlers return a handler function
  return {
    event: node.event,
    selector: node.selector,
    commands: node.commands,
    handler: async (event: Event) => {
      // Set up event context
      const eventContext = {
        ...context,
        event,
        target: event.target,
        currentTarget: event.currentTarget
      };
      
      // Execute commands in sequence
      for (const command of node.commands) {
        await evaluateAST(command, eventContext);
      }
    }
  };
}

/**
 * Evaluates command expressions
 */
async function evaluateCommand(node: any, context: ExecutionContext): Promise<any> {
  const commandName = node.name;
  const args = await Promise.all(
    (node.args || []).map((arg: ASTNode) => evaluateAST(arg, context))
  );
  
  // Use Phase 3 command system when available
  // For now, return command descriptor
  return {
    type: 'command',
    name: commandName,
    args,
    execute: async () => {
      // Command execution logic will be implemented in Phase 4 command system
      console.log(`Executing command: ${commandName}`, args);
    }
  };
}

/**
 * Evaluates conditional expressions (if-then-else)
 */
async function evaluateConditionalExpression(node: any, context: ExecutionContext): Promise<any> {
  const test = await evaluateAST(node.test, context);
  
  if (test) {
    return evaluateAST(node.consequent, context);
  } else if (node.alternate) {
    return evaluateAST(node.alternate, context);
  }
  
  return undefined;
}