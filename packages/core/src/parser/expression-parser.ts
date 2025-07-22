/**
 * Expression Parser Integration
 * Bridges string input to expression evaluation via AST parsing
 */

import type { ExecutionContext, ASTNode } from '../types/core.js';
import { tokenize } from './tokenizer.js';
import { TokenType, type Token } from './tokenizer.js';

// Import our expression implementations
import { referenceExpressions } from '../expressions/references/index.js';
import { logicalExpressions } from '../expressions/logical/index.js';
import { conversionExpressions } from '../expressions/conversion/index.js';
import { positionalExpressions } from '../expressions/positional/index.js';
import { propertyExpressions } from '../expressions/properties/index.js';
import { specialExpressions } from '../expressions/special/index.js';

interface ParseState {
  tokens: Token[];
  position: number;
}

export class ExpressionParseError extends Error {
  constructor(message: string, position?: number) {
    super(position !== undefined ? `${message} at position ${position}` : message);
    this.name = 'ExpressionParseError';
  }
}

/**
 * Main entry point: Parse and evaluate a hyperscript expression from string
 */
export async function parseAndEvaluateExpression(
  expressionString: string, 
  context: ExecutionContext
): Promise<any> {
  try {
    // Step 1: Tokenize the input
    const tokens = tokenize(expressionString);
    
    // Step 2: Parse tokens into AST
    const ast = parseExpression(tokens);
    
    // Step 3: Evaluate AST using our expression system
    return await evaluateASTNode(ast, context);
  } catch (error) {
    if (error instanceof ExpressionParseError) {
      throw error;
    }
    throw new ExpressionParseError(`Failed to parse expression: ${error}`);
  }
}

/**
 * Parse tokens into an AST node
 */
function parseExpression(tokens: Token[]): ASTNode {
  const state: ParseState = { tokens, position: 0 };
  
  if (tokens.length === 0) {
    throw new ExpressionParseError('Empty expression');
  }
  
  const ast = parseLogicalExpression(state);
  
  // Ensure we've consumed all tokens
  if (state.position < tokens.length) {
    throw new ExpressionParseError(`Unexpected token: ${tokens[state.position].value}`, state.position);
  }
  
  return ast;
}

/**
 * Parse logical expressions (and, or, not) - lowest precedence
 * Enforces _hyperscript's strict precedence: mixed logical operators require parentheses
 */
function parseLogicalExpression(state: ParseState): ASTNode {
  let left = parseComparisonExpression(state);
  let firstOperator: string | null = null;
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.LOGICAL_OPERATOR) {
      const operator = token.value;
      
      // Enforce strict precedence: reject mixed operators
      if (firstOperator === null) {
        firstOperator = operator;
      } else if (firstOperator !== operator) {
        throw new ExpressionParseError(
          `You must parenthesize logical operations with different operators\n\n${reconstructExpression(state, left)}\n${' '.repeat(token.start)}^^`
        );
      }
      
      state.position++; // consume operator
      
      const right = parseComparisonExpression(state);
      
      left = {
        type: 'binaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end
      };
    } else {
      break;
    }
  }
  
  return left;
}

/**
 * Parse comparison expressions (>, <, ==, etc.)
 */
function parseComparisonExpression(state: ParseState): ASTNode {
  let left = parseArithmeticExpression(state);
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.COMPARISON_OPERATOR || 
        (token.type === TokenType.KEYWORD && ['is', 'equals'].includes(token.value))) {
      const operator = token.value;
      state.position++; // consume operator
      
      // Handle unary operators that don't need a right operand
      if (['exists', 'is empty', 'is not empty'].includes(operator)) {
        left = {
          type: 'unaryExpression',
          operator,
          operand: left,
          start: left.start,
          end: token.end
        };
      }
      // Handle multi-word operators like "is not"
      else if (operator === 'is' && peek(state)?.value === 'not') {
        state.position++; // consume 'not'
        const right = parseArithmeticExpression(state);
        left = {
          type: 'binaryExpression',
          operator: 'is not',
          left,
          right,
          start: left.start,
          end: right.end
        };
      } else {
        const right = parseArithmeticExpression(state);
        left = {
          type: 'binaryExpression',
          operator,
          left,
          right,
          start: left.start,
          end: right.end
        };
      }
    } else {
      break;
    }
  }
  
  return left;
}

/**
 * Parse arithmetic expressions (+, -, *, /, mod)
 * Enforces _hyperscript's strict precedence: mixed math operators require parentheses
 */
function parseArithmeticExpression(state: ParseState): ASTNode {
  let left = parseAsExpression(state);
  let firstOperator: string | null = null;
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.OPERATOR && ['+', '-', '*', '/', 'mod'].includes(token.value)) {
      const operator = token.value;
      
      // Enforce strict precedence: reject mixed operators
      if (firstOperator === null) {
        firstOperator = operator;
      } else if (firstOperator !== operator) {
        throw new ExpressionParseError(
          `You must parenthesize math operations with different operators\n\n${reconstructExpression(state, left)}\n${' '.repeat(token.start)}^^`
        );
      }
      
      state.position++; // consume operator
      
      const right = parseAsExpression(state);
      
      left = {
        type: 'binaryExpression',
        operator,
        left,
        right,
        start: left.start,
        end: right.end
      };
    } else {
      break;
    }
  }
  
  return left;
}

/**
 * Parse 'as' type conversion expressions
 */
function parseAsExpression(state: ParseState): ASTNode {
  let left = parsePossessiveExpression(state);
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.KEYWORD && token.value === 'as') {
      state.position++; // consume 'as'
      
      const typeToken = advance(state);
      if (!typeToken) {
        throw new ExpressionParseError('Expected type after "as"');
      }
      
      // Handle parameterized types like "Fixed:2"
      let typeName = typeToken.value;
      if (peek(state)?.value === ':') {
        state.position++; // consume ':'
        const paramToken = advance(state);
        if (paramToken) {
          typeName += ':' + paramToken.value;
        }
      }
      
      left = {
        type: 'asExpression',
        expression: left,
        targetType: typeName,
        start: left.start,
        end: typeToken.end
      };
    } else {
      break;
    }
  }
  
  return left;
}

/**
 * Parse possessive expressions (obj's property, my property, its property)
 */
function parsePossessiveExpression(state: ParseState): ASTNode {
  let left = parsePrimaryExpression(state);
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    // Handle possessive syntax with apostrophe (obj's property) - supports chaining
    if (token.type === TokenType.OPERATOR && token.value === "'s") {
      state.position++; // consume "'s" operator
      
      const property = parsePrimaryExpression(state);
      
      left = {
        type: 'possessiveExpression',
        object: left,
        property,
        start: left.start,
        end: property.end
      };
      // Continue loop to handle chained possessive (obj's prop1's prop2)
      continue;
    }
    // Handle context possessive syntax (my property, its property, your property)
    else if (left.type === 'identifier' && 
             ['my', 'its', 'your'].includes((left as any).name) &&
             token.type === TokenType.IDENTIFIER) {
      
      const property = parsePrimaryExpression(state);
      
      left = {
        type: 'contextPossessive',
        contextType: (left as any).name,
        property,
        start: left.start,
        end: property.end
      };
    } else {
      break;
    }
  }
  
  return left;
}

/**
 * Parse primary expressions (literals, identifiers, parentheses)
 */
function parsePrimaryExpression(state: ParseState): ASTNode {
  const token = peek(state);
  
  if (!token) {
    throw new ExpressionParseError('Unexpected end of expression');
  }
  
  // Handle unary operators (not, !)
  if (token.type === TokenType.LOGICAL_OPERATOR && token.value === 'not') {
    advance(state); // consume 'not'
    const operand = parsePrimaryExpression(state);
    return {
      type: 'unaryExpression',
      operator: 'not',
      operand,
      start: token.start,
      end: operand.end
    };
  }
  
  // Parenthesized expressions
  if (token.value === '(') {
    state.position++; // consume '('
    const expr = parseLogicalExpression(state);
    const closeToken = advance(state);
    if (!closeToken || closeToken.value !== ')') {
      throw new ExpressionParseError('Expected closing parenthesis');
    }
    return expr;
  }
  
  // String literals
  if (token.type === TokenType.STRING) {
    advance(state);
    // Remove quotes
    const value = token.value.slice(1, -1);
    return {
      type: 'literal',
      value,
      valueType: 'string',
      start: token.start,
      end: token.end
    };
  }
  
  // Number literals
  if (token.type === TokenType.NUMBER) {
    advance(state);
    const value = token.value.includes('.') ? parseFloat(token.value) : parseInt(token.value, 10);
    return {
      type: 'literal',
      value,
      valueType: 'number',
      start: token.start,
      end: token.end
    };
  }
  
  // Boolean literals
  if (token.type === TokenType.BOOLEAN) {
    advance(state);
    return {
      type: 'literal',
      value: token.value === 'true',
      valueType: 'boolean',
      start: token.start,
      end: token.end
    };
  }
  
  // CSS ID selector (#id)
  if (token.type === TokenType.ID_SELECTOR) {
    advance(state);
    return {
      type: 'cssSelector',
      selectorType: 'id',
      selector: token.value,
      start: token.start,
      end: token.end
    };
  }
  
  // CSS class selector (.class)
  if (token.type === TokenType.CLASS_SELECTOR) {
    advance(state);
    return {
      type: 'cssSelector',
      selectorType: 'class',
      selector: token.value,
      start: token.start,
      end: token.end
    };
  }
  
  // Query reference (<selector/>)
  if (token.type === TokenType.QUERY_REFERENCE) {
    advance(state);
    return {
      type: 'queryReference',
      selector: token.value,
      start: token.start,
      end: token.end
    };
  }
  
  // Bracket notation for attribute access [@attr] or [expr]
  if (token.value === '[') {
    advance(state); // consume '['
    
    // Check if this is attribute syntax [@attr]
    const nextToken = peek(state);
    if (nextToken?.value === '@') {
      advance(state); // consume '@'
      const attrToken = advance(state);
      if (!attrToken || attrToken.type !== TokenType.IDENTIFIER) {
        throw new ExpressionParseError('Expected attribute name after @');
      }
      
      const closeToken = advance(state);
      if (!closeToken || closeToken.value !== ']') {
        throw new ExpressionParseError('Expected closing bracket after attribute name');
      }
      
      return {
        type: 'attributeAccess',
        attributeName: attrToken.value,
        start: token.start,
        end: closeToken.end
      };
    } else {
      // Handle general bracket expressions [expr]
      const expr = parseLogicalExpression(state);
      const closeToken = advance(state);
      if (!closeToken || closeToken.value !== ']') {
        throw new ExpressionParseError('Expected closing bracket');
      }
      
      return {
        type: 'bracketExpression',
        expression: expr,
        start: token.start,
        end: closeToken.end
      };
    }
  }
  
  // Context variables and identifiers
  if (token.type === TokenType.CONTEXT_VAR || token.type === TokenType.IDENTIFIER) {
    advance(state);
    return {
      type: 'identifier',
      name: token.value,
      start: token.start,
      end: token.end
    };
  }
  
  throw new ExpressionParseError(`Unexpected token: ${token.value}`, state.position);
}

/**
 * Peek at current token without consuming it
 */
function peek(state: ParseState): Token | undefined {
  return state.tokens[state.position];
}

/**
 * Consume and return current token
 */
function advance(state: ParseState): Token | undefined {
  return state.tokens[state.position++];
}

/**
 * Evaluate an AST node using our expression system
 */
async function evaluateASTNode(node: ASTNode, context: ExecutionContext): Promise<any> {
  switch (node.type) {
    case 'literal':
      return node.value;
      
    case 'identifier':
      return resolveIdentifier(node.name, context);
      
    case 'binaryExpression':
      return evaluateBinaryExpression(node, context);
      
    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);
      
    case 'contextPossessive':
      return evaluateContextPossessive(node, context);
      
    case 'asExpression':
      return evaluateAsExpression(node, context);
      
    case 'cssSelector':
      return evaluateCSSSelector(node, context);
      
    case 'queryReference':
      return evaluateQueryReference(node, context);
      
    case 'unaryExpression':
      return evaluateUnaryExpression(node, context);
      
    case 'attributeAccess':
      return evaluateAttributeAccess(node, context);
      
    case 'bracketExpression':
      return evaluateBracketExpression(node, context);
      
    default:
      throw new ExpressionParseError(`Unknown AST node type: ${(node as any).type}`);
  }
}

/**
 * Resolve identifier to its value in context
 */
function resolveIdentifier(name: string, context: ExecutionContext): any {
  // Check context variables first
  if (name === 'me') return context.me;
  if (name === 'you') return context.you;
  if (name === 'it') return context.it;
  if (name === 'result') return context.result;
  
  // Check locals
  if (context.locals.has(name)) {
    return context.locals.get(name);
  }
  
  // Check globals
  if (context.globals.has(name)) {
    return context.globals.get(name);
  }
  
  // Return undefined for unknown identifiers
  return undefined;
}

/**
 * Evaluate binary expressions using our expression implementations
 */
async function evaluateBinaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const left = await evaluateASTNode(node.left, context);
  const right = await evaluateASTNode(node.right, context);
  
  const operator = node.operator;
  
  // Map operators to our expression implementations
  switch (operator) {
    case 'and':
      return logicalExpressions.and.evaluate(context, left, right);
    case 'or':
      return logicalExpressions.or.evaluate(context, left, right);
    case 'is':
    case 'equals':
    case '==':
      return logicalExpressions.equals.evaluate(context, left, right);
    case 'is not':
    case '!=':
      return logicalExpressions.notEquals.evaluate(context, left, right);
    case '===':
      return logicalExpressions.strictEquals.evaluate(context, left, right);
    case '!==':
      return logicalExpressions.strictNotEquals.evaluate(context, left, right);
    case '>':
      return logicalExpressions.greaterThan.evaluate(context, left, right);
    case '<':
      return logicalExpressions.lessThan.evaluate(context, left, right);
    case '>=':
      return logicalExpressions.greaterThanOrEqual.evaluate(context, left, right);
    case '<=':
      return logicalExpressions.lessThanOrEqual.evaluate(context, left, right);
    case '+':
      return evaluateAddition(left, right);
    case '-':
      return specialExpressions.subtraction.evaluate(context, left, right);
    case '*':
      return specialExpressions.multiplication.evaluate(context, left, right);
    case '/':
      return specialExpressions.division.evaluate(context, left, right);
    case 'mod':
      return specialExpressions.modulo.evaluate(context, left, right);
    case 'matches':
      return logicalExpressions.matches.evaluate(context, left, right);
    case 'contains':
      return logicalExpressions.contains.evaluate(context, left, right);
    case 'does not contain':
      return logicalExpressions.doesNotContain.evaluate(context, left, right);
    case 'exists':
      return logicalExpressions.exists.evaluate(context, left);
    case 'is empty':
      return logicalExpressions.isEmpty.evaluate(context, left);
    case 'is not empty':
      return logicalExpressions.isNotEmpty.evaluate(context, left);
    case 'is in':
      return logicalExpressions.contains.evaluate(context, right, left); // Note: reversed args for membership
    case 'is not in':
      return logicalExpressions.doesNotContain.evaluate(context, right, left); // Note: reversed args
    default:
      throw new ExpressionParseError(`Unknown binary operator: ${operator}`);
  }
}

/**
 * Hyperscript-compatible addition that handles both numbers and string concatenation
 */
function evaluateAddition(left: any, right: any): string | number {
  // If either operand is a string, concatenate
  if (typeof left === 'string' || typeof right === 'string') {
    return String(left) + String(right);
  }
  
  // Otherwise, try to add as numbers
  const leftNum = typeof left === 'number' ? left : parseFloat(left);
  const rightNum = typeof right === 'number' ? right : parseFloat(right);
  
  if (isNaN(leftNum) || isNaN(rightNum)) {
    // If we can't convert to numbers, concatenate as strings
    return String(left) + String(right);
  }
  
  return leftNum + rightNum;
}

/**
 * Evaluate possessive expressions using our property access implementation
 */
async function evaluatePossessiveExpression(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const propertyNode = node.property;
  
  // Handle different types of property access
  if (propertyNode.type === 'identifier') {
    const propertyName = propertyNode.name;
    return propertyExpressions.possessive.evaluate(context, object, propertyName);
  } else if (propertyNode.type === 'attributeAccess') {
    // Handle [@attr] syntax - access attribute on the object
    const attributeName = propertyNode.attributeName;
    if (object && object instanceof Element) {
      return object.getAttribute(attributeName);
    }
    return null;
  } else if (propertyNode.type === 'bracketExpression') {
    // Handle [expr] syntax - evaluate expression as property key
    const propertyKey = await evaluateASTNode(propertyNode.expression, context);
    return propertyExpressions.possessive.evaluate(context, object, String(propertyKey));
  } else {
    throw new ExpressionParseError(`Unsupported property access type: ${propertyNode.type}`);
  }
}

/**
 * Evaluate context possessive expressions (my property, its property, your property)
 */
async function evaluateContextPossessive(node: any, context: ExecutionContext): Promise<any> {
  const contextType = node.contextType;
  const propertyNode = node.property;
  
  // Extract property name
  let propertyName: string;
  if (propertyNode.type === 'identifier') {
    propertyName = propertyNode.name;
  } else {
    throw new ExpressionParseError('Property name must be an identifier');
  }
  
  // Use our context-specific expressions
  switch (contextType) {
    case 'my':
      return propertyExpressions.my.evaluate(context, propertyName);
    case 'its':
      return propertyExpressions.its.evaluate(context, propertyName);
    case 'your':
      return propertyExpressions.your.evaluate(context, propertyName);
    default:
      throw new ExpressionParseError(`Unknown context type: ${contextType}`);
  }
}

/**
 * Evaluate 'as' type conversion expressions
 */
async function evaluateAsExpression(node: any, context: ExecutionContext): Promise<any> {
  const value = await evaluateASTNode(node.expression, context);
  const targetType = node.targetType;
  
  // Use our unified 'as' expression which handles all conversions
  return conversionExpressions.as.evaluate(context, value, targetType);
}

/**
 * Evaluate CSS selector expressions (#id, .class)
 */
async function evaluateCSSSelector(node: any, context: ExecutionContext): Promise<any> {
  const selector = node.selector;
  
  if (node.selectorType === 'id') {
    // ID selector returns single element or null
    return propertyExpressions.idReference.evaluate(context, selector);
  } else if (node.selectorType === 'class') {
    // Class selector returns array of elements
    return propertyExpressions.classReference.evaluate(context, selector);
  }
  
  throw new ExpressionParseError(`Unknown CSS selector type: ${node.selectorType}`);
}

/**
 * Evaluate query reference expressions (<selector/>)
 */
async function evaluateQueryReference(node: any, context: ExecutionContext): Promise<any> {
  const selector = node.selector;
  
  // Remove the < and /> wrapper to get the actual selector
  const cleanSelector = selector.slice(1, -2); // Remove '<' and '/>'
  
  // Handle different query types
  if (cleanSelector.startsWith('#')) {
    // ID query: <#id/> returns single element
    return propertyExpressions.idReference.evaluate(context, cleanSelector);
  } else if (cleanSelector.startsWith('.')) {
    // Class query: <.class/> returns array of elements  
    return propertyExpressions.classReference.evaluate(context, cleanSelector);
  } else if (cleanSelector.startsWith('[') && cleanSelector.endsWith(']')) {
    // Attribute query: <[attr="value"]/> 
    return referenceExpressions.querySelectorAll.evaluate(context, cleanSelector);
  } else {
    // Complex selector query: <input.foo:checked/>
    return referenceExpressions.querySelectorAll.evaluate(context, cleanSelector);
  }
}

/**
 * Evaluate unary expressions (not operand)
 */
async function evaluateUnaryExpression(node: any, context: ExecutionContext): Promise<any> {
  const operand = await evaluateASTNode(node.operand, context);
  const operator = node.operator;
  
  switch (operator) {
    case 'not':
      return logicalExpressions.not.evaluate(context, operand);
    case 'exists':
      return logicalExpressions.exists.evaluate(context, operand);
    case 'is empty':
      return logicalExpressions.isEmpty.evaluate(context, operand);
    case 'is not empty':
      return logicalExpressions.isNotEmpty.evaluate(context, operand);
    default:
      throw new ExpressionParseError(`Unknown unary operator: ${operator}`);
  }
}

/**
 * Evaluate attribute access expressions [@data-foo]
 */
async function evaluateAttributeAccess(node: any, context: ExecutionContext): Promise<any> {
  const attributeName = node.attributeName;
  
  // Use the current context element (usually 'me') or return the attribute name for further processing
  if (context.me && context.me instanceof Element) {
    return context.me.getAttribute(attributeName);
  }
  
  // Return as attribute reference for possessive evaluation
  return `@${attributeName}`;
}

/**
 * Evaluate bracket expressions [expr]
 */
async function evaluateBracketExpression(node: any, context: ExecutionContext): Promise<any> {
  // Evaluate the inner expression
  return await evaluateASTNode(node.expression, context);
}

/**
 * Helper function to reconstruct expression text for error messages
 */
function reconstructExpression(state: ParseState, leftNode?: ASTNode): string {
  // Simple reconstruction - in a more sophisticated implementation,
  // we'd traverse the AST to rebuild the original text
  return state.tokens.map(token => token.value).join(' ');
}