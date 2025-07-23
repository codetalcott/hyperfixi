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
 * Parse logical expressions (and, or, not) with proper operator precedence
 * Handles standard logical precedence: and (4) before or (3)
 */
function parseLogicalExpression(state: ParseState): ASTNode {
  return parseLogicalExpressionWithPrecedence(state, 3); // Start with lowest logical precedence (or)
}

/**
 * Precedence climbing for logical expressions
 * Precedence levels:
 * - OR (or): 3
 * - AND (and): 4  
 * - NOT (not): handled separately as unary
 */
function parseLogicalExpressionWithPrecedence(state: ParseState, minPrecedence: number): ASTNode {
  let left = parseComparisonExpression(state);
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.LOGICAL_OPERATOR && isLogicalBinaryOperator(token.value)) {
      const operator = token.value;
      const precedence = getLogicalOperatorPrecedence(operator);
      
      // Stop if this operator has lower precedence than minimum required
      if (precedence < minPrecedence) {
        break;
      }
      
      state.position++; // consume operator
      
      // All logical operators are left-associative, so use precedence + 1
      const nextMinPrecedence = precedence + 1;
      const right = parseLogicalExpressionWithPrecedence(state, nextMinPrecedence);
      
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
 * Check if operator is a binary logical operator
 */
function isLogicalBinaryOperator(operator: string): boolean {
  return ['and', 'or'].includes(operator);
}

/**
 * Get logical operator precedence
 */
function getLogicalOperatorPrecedence(operator: string): number {
  switch (operator) {
    case 'or':
      return 3;
    case 'and':
      return 4;
    default:
      return 0;
  }
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
 * Parse arithmetic expressions (+, -, *, /, %) with proper operator precedence
 * Handles standard math precedence: multiplication/division (7) before addition/subtraction (6)
 */
function parseArithmeticExpression(state: ParseState): ASTNode {
  return parseArithmeticExpressionWithPrecedence(state, 6); // Start with lowest math precedence
}

/**
 * Precedence climbing for arithmetic expressions
 * Precedence levels: 
 * - Addition/Subtraction (+, -): 6
 * - Multiplication/Division/Modulo (*, /, mod): 7
 * - Exponentiation (^, **): 8
 */
function parseArithmeticExpressionWithPrecedence(state: ParseState, minPrecedence: number): ASTNode {
  let left = parseAsExpression(state);
  
  while (state.position < state.tokens.length) {
    const token = state.tokens[state.position];
    
    if (token.type === TokenType.OPERATOR && isArithmeticOperator(token.value)) {
      const operator = token.value;
      const precedence = getArithmeticOperatorPrecedence(operator);
      
      // Stop if this operator has lower precedence than minimum required
      if (precedence < minPrecedence) {
        break;
      }
      
      state.position++; // consume operator
      
      // For right-associative operators (like ^), use same precedence
      // For left-associative operators, use precedence + 1 to ensure left-to-right
      const nextMinPrecedence = isRightAssociative(operator) ? precedence : precedence + 1;
      const right = parseArithmeticExpressionWithPrecedence(state, nextMinPrecedence);
      
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
 * Check if operator is arithmetic
 */
function isArithmeticOperator(operator: string): boolean {
  return ['+', '-', '*', '/', '%', '^', '**', 'mod'].includes(operator);
}

/**
 * Get arithmetic operator precedence
 */
function getArithmeticOperatorPrecedence(operator: string): number {
  switch (operator) {
    case '+':
    case '-':
      return 6;
    case '*':
    case '/':
    case '%':
    case 'mod':
      return 7;
    case '^':
    case '**':
      return 8;
    default:
      return 0;
  }
}

/**
 * Check if operator is right-associative
 */
function isRightAssociative(operator: string): boolean {
  return ['^', '**'].includes(operator); // Exponentiation is right-associative
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
             (token.type === TokenType.IDENTIFIER || token.type === TokenType.CONTEXT_VAR)) {
      
      const property = parsePrimaryExpression(state);
      
      left = {
        type: 'contextPossessive',
        contextType: (left as any).name,
        property,
        start: left.start,
        end: property.end
      };
    }
    // Handle dot notation property access (obj.property)
    else if (token.type === TokenType.OPERATOR && token.value === '.') {
      state.position++; // consume '.'
      
      // Next token should be an identifier for the property name
      const propertyToken = advance(state);
      if (!propertyToken || propertyToken.type !== TokenType.IDENTIFIER) {
        throw new ExpressionParseError('Expected property name after "."');
      }
      
      left = {
        type: 'propertyAccess',
        object: left,
        property: {
          type: 'identifier',
          name: propertyToken.value,
          start: propertyToken.start,
          end: propertyToken.end
        },
        start: left.start,
        end: propertyToken.end
      };
      // Continue loop to handle chained property access (obj.prop1.prop2)
      continue;
    }
    // Handle array access (arr[index])
    else if (token.type === TokenType.OPERATOR && token.value === '[') {
      state.position++; // consume '['
      
      // Parse the index expression
      const index = parseLogicalExpression(state);
      
      // Consume closing bracket
      const closeToken = advance(state);
      if (!closeToken || closeToken.value !== ']') {
        throw new ExpressionParseError('Expected closing bracket after array index');
      }
      
      left = {
        type: 'arrayAccess',
        object: left,
        index,
        start: left.start,
        end: closeToken.end
      };
      // Continue loop to handle chained array access (arr[0][1])
      continue;
    }
    // Handle method calls (obj.method())
    else if (token.type === TokenType.OPERATOR && token.value === '(') {
      state.position++; // consume '('
      
      // Parse function arguments
      const args: ASTNode[] = [];
      
      // Check for arguments before closing paren
      let currentToken = peek(state);
      while (currentToken && currentToken.value !== ')') {
        const arg = parseLogicalExpression(state);
        args.push(arg);
        
        currentToken = peek(state);
        if (currentToken && currentToken.value === ',') {
          advance(state); // consume comma
          currentToken = peek(state);
        } else {
          break;
        }
      }
      
      // Consume closing paren
      const closeParen = advance(state);
      if (!closeParen || closeParen.value !== ')') {
        throw new ExpressionParseError('Expected closing parenthesis');
      }
      
      left = {
        type: 'callExpression',
        callee: left,
        arguments: args,
        start: left.start,
        end: closeParen.end
      };
      // Continue loop to handle chained method calls (obj.method().another())
      continue;
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
  
  // Handle unary operators (not, no, !, -, +)
  if (token.type === TokenType.LOGICAL_OPERATOR && (token.value === 'not' || token.value === 'no')) {
    advance(state); // consume 'not' or 'no'
    const operand = parsePrimaryExpression(state);
    return {
      type: 'unaryExpression',
      operator: token.value,
      operand,
      start: token.start,
      end: operand.end
    };
  }
  
  // Handle unary minus and plus operators
  if (token.type === TokenType.OPERATOR && (token.value === '-' || token.value === '+')) {
    advance(state); // consume operator
    const operand = parsePrimaryExpression(state);
    return {
      type: 'unaryExpression',
      operator: token.value,
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
  
  // Template literals
  if (token.type === TokenType.TEMPLATE_LITERAL) {
    advance(state);
    return {
      type: 'templateLiteral',
      value: token.value,
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
  
  // Object literals ({key: value, ...})
  if (token.value === '{') {
    advance(state); // consume '{'
    
    const properties: { key: ASTNode; value: ASTNode }[] = [];
    
    // Handle empty object {}
    if (peek(state)?.value === '}') {
      advance(state); // consume '}'
      return {
        type: 'objectLiteral',
        properties,
        start: token.start,
        end: state.tokens[state.position - 1].end
      };
    }
    
    // Parse object properties
    do {
      // Parse key (can be identifier or string)
      const keyToken = peek(state);
      if (!keyToken) {
        throw new ExpressionParseError('Expected property key in object literal');
      }
      
      let key: ASTNode;
      if (keyToken.type === TokenType.IDENTIFIER) {
        advance(state);
        key = {
          type: 'identifier',
          name: keyToken.value,
          start: keyToken.start,
          end: keyToken.end
        };
      } else if (keyToken.type === TokenType.STRING) {
        advance(state);
        key = {
          type: 'literal',
          value: keyToken.value.slice(1, -1), // Remove quotes
          valueType: 'string',
          start: keyToken.start,
          end: keyToken.end
        };
      } else {
        throw new ExpressionParseError(`Expected property key, got: ${keyToken.type}`);
      }
      
      // Expect colon
      const colonToken = advance(state);
      if (!colonToken || colonToken.value !== ':') {
        throw new ExpressionParseError('Expected ":" after property key');
      }
      
      // Parse value
      const value = parseLogicalExpression(state);
      
      properties.push({ key, value });
      
      // Check for comma or closing brace
      const nextToken = peek(state);
      if (nextToken?.value === ',') {
        advance(state); // consume ','
      } else if (nextToken?.value === '}') {
        break;
      } else {
        throw new ExpressionParseError('Expected "," or "}" in object literal');
      }
    } while (peek(state) && peek(state)!.value !== '}');
    
    // Consume closing brace
    const closeToken = advance(state);
    if (!closeToken || closeToken.value !== '}') {
      throw new ExpressionParseError('Expected closing brace "}" in object literal');
    }
    
    return {
      type: 'objectLiteral',
      properties,
      start: token.start,
      end: closeToken.end
    };
  }

  // Array literals and bracket notation
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
      // Check if this is a standalone attribute selector [attr] or [attr="value"]
      const currentPos = state.position;
      const isAttributeSelector = looksLikeAttributeSelector(state, currentPos);
      
      if (isAttributeSelector) {
        // Parse as CSS attribute selector
        return parseAttributeSelector(state, token);
      }
      
      // Check if this is an array literal by looking for array-like patterns
      // Array literal if: [], [expr], [expr, expr], etc.
      let isArrayLiteral = false;
      
      // If immediately followed by ], it's an empty array
      if (nextToken?.value === ']') {
        isArrayLiteral = true;
      } else {
        // Look ahead to see if there are commas (array) or no commas (bracket expression)
        let lookahead = currentPos;
        let bracketDepth = 1;
        let foundComma = false;
        
        while (lookahead < state.tokens.length && bracketDepth > 0) {
          const tok = state.tokens[lookahead];
          if (tok.value === '[') bracketDepth++;
          if (tok.value === ']') bracketDepth--;
          if (tok.value === ',' && bracketDepth === 1) {
            foundComma = true;
            break;
          }
          lookahead++;
        }
        
        // If we found a comma at the top level, it's an array literal
        if (foundComma) {
          isArrayLiteral = true;
        }
      }
      
      if (isArrayLiteral) {
        // Parse as array literal
        const elements: ASTNode[] = [];
        
        // Handle empty array
        if (peek(state)?.value === ']') {
          advance(state); // consume ']'
          return {
            type: 'arrayLiteral',
            elements,
            start: token.start,
            end: state.tokens[state.position - 1].end
          };
        }
        
        // Parse array elements
        do {
          elements.push(parseLogicalExpression(state));
          
          if (peek(state)?.value === ',') {
            advance(state); // consume ','
          } else {
            break;
          }
        } while (peek(state) && peek(state)!.value !== ']');
        
        const closeToken = advance(state);
        if (!closeToken || closeToken.value !== ']') {
          throw new ExpressionParseError('Expected closing bracket in array literal');
        }
        
        return {
          type: 'arrayLiteral',
          elements,
          start: token.start,
          end: closeToken.end
        };
      } else {
        // Handle as bracket expression [expr]
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
  }
  
  // Context variables and identifiers
  if (token.type === TokenType.CONTEXT_VAR || token.type === TokenType.IDENTIFIER) {
    const identifierToken = advance(state)!;
    
    // Check for function call syntax: identifier()
    const nextToken = peek(state);
    if (nextToken && nextToken.value === '(') {
      advance(state); // consume '('
      
      // Parse function arguments
      const args: ASTNode[] = [];
      
      // Check for arguments before closing paren
      let currentToken = peek(state);
      while (currentToken && currentToken.value !== ')') {
        const arg = parseExpression(state);
        args.push(arg);
        
        currentToken = peek(state);
        if (currentToken && currentToken.value === ',') {
          advance(state); // consume comma
          currentToken = peek(state);
        }
      }
      
      // Consume closing paren
      const closeParen = peek(state);
      if (!closeParen || closeParen.value !== ')') {
        throw new ExpressionParseError('Expected closing parenthesis');
      }
      advance(state);
      
      return {
        type: 'callExpression',
        callee: {
          type: 'identifier',
          name: identifierToken.value,
          start: identifierToken.start,
          end: identifierToken.end
        },
        arguments: args,
        start: identifierToken.start,
        end: closeParen.end
      };
    }
    
    // Handle special literal identifiers
    if (identifierToken.value === 'null') {
      return {
        type: 'literal',
        value: null,
        valueType: 'null',
        start: identifierToken.start,
        end: identifierToken.end
      };
    }
    
    if (identifierToken.value === 'undefined') {
      return {
        type: 'literal',
        value: undefined,
        valueType: 'undefined',
        start: identifierToken.start,
        end: identifierToken.end
      };
    }
    
    // Regular identifier
    return {
      type: 'identifier',
      name: identifierToken.value,
      start: identifierToken.start,
      end: identifierToken.end
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
      
    case 'templateLiteral':
      return evaluateTemplateLiteral(node, context);
      
    case 'identifier':
      return resolveIdentifier(node.name, context);
      
    case 'binaryExpression':
      return evaluateBinaryExpression(node, context);
      
    case 'possessiveExpression':
      return evaluatePossessiveExpression(node, context);
      
    case 'contextPossessive':
      return evaluateContextPossessive(node, context);
      
    case 'propertyAccess':
      return evaluatePropertyAccess(node, context);
      
    case 'asExpression':
      return evaluateAsExpression(node, context);
      
    case 'cssSelector':
      return evaluateCSSSelector(node, context);
      
    case 'queryReference':
      return evaluateQueryReference(node, context);
      
    case 'attributeSelector':
      return evaluateAttributeSelector(node, context);
      
    case 'unaryExpression':
      return evaluateUnaryExpression(node, context);
      
    case 'attributeAccess':
      return evaluateAttributeAccess(node, context);
      
    case 'bracketExpression':
      return evaluateBracketExpression(node, context);
      
    case 'callExpression':
      return evaluateCallExpression(node, context);
      
    case 'arrayLiteral':
      return evaluateArrayLiteral(node, context);
      
    case 'objectLiteral':
      return evaluateObjectLiteral(node, context);
      
    case 'arrayAccess':
      return evaluateArrayAccess(node, context);
      
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
    case '^':
    case '**':
      return specialExpressions.exponentiation.evaluate(context, left, right);
    case 'matches':
      return logicalExpressions.matches.evaluate(context, left, right);
    case 'contains':
      return logicalExpressions.contains.evaluate(context, left, right);
    case 'in':
      return evaluateInOperator(left, right, context);
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
 * Evaluate dot notation property access (obj.property)
 */
async function evaluatePropertyAccess(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const propertyNode = node.property;
  
  // Handle null/undefined objects gracefully
  if (object === null || object === undefined) {
    throw new ExpressionParseError(`Cannot access property "${propertyNode.name}" of ${object}`);
  }
  
  // Extract property name
  if (propertyNode.type !== 'identifier') {
    throw new ExpressionParseError('Property name must be an identifier');
  }
  
  const propertyName = propertyNode.name;
  
  // Use standard JavaScript property access
  try {
    const value = object[propertyName];
    
    // Handle method calls - if it's a function, bind it to the object
    if (typeof value === 'function') {
      return value.bind(object);
    }
    
    return value;
  } catch (error) {
    throw new ExpressionParseError(`Error accessing property "${propertyName}": ${error}`);
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
    case 'no':
      return logicalExpressions.no.evaluate(context, operand);
    case 'exists':
      return logicalExpressions.exists.evaluate(context, operand);
    case 'is empty':
      return logicalExpressions.isEmpty.evaluate(context, operand);
    case 'is not empty':
      return logicalExpressions.isNotEmpty.evaluate(context, operand);
    case '-':
      // Unary minus: negate the number
      const negativeValue = typeof operand === 'number' ? operand : parseFloat(operand);
      return isNaN(negativeValue) ? 0 : -negativeValue;
    case '+':
      // Unary plus: convert to number
      const positiveValue = typeof operand === 'number' ? operand : parseFloat(operand);
      return isNaN(positiveValue) ? 0 : positiveValue;
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
 * Evaluate call expressions (function calls)
 */
async function evaluateCallExpression(node: any, context: ExecutionContext): Promise<any> {
  // Evaluate the function (callee)
  const func = await evaluateASTNode(node.callee, context);
  
  if (typeof func !== 'function') {
    throw new ExpressionParseError(`Cannot call non-function value: ${typeof func}`);
  }
  
  // Evaluate arguments
  const args = [];
  for (const arg of node.arguments) {
    const value = await evaluateASTNode(arg, context);
    args.push(value);
  }
  
  // Call the function
  const result = func(...args);
  
  // Handle async functions
  if (result && typeof result.then === 'function') {
    return await result;
  }
  
  return result;
}

/**
 * Evaluate array literal expressions [1, 2, 3]
 */
async function evaluateArrayLiteral(node: any, context: ExecutionContext): Promise<any[]> {
  const elements = [];
  
  for (const element of node.elements) {
    const value = await evaluateASTNode(element, context);
    elements.push(value);
  }
  
  return elements;
}

/**
 * Evaluate object literal expressions {key: value, ...}
 */
async function evaluateObjectLiteral(node: any, context: ExecutionContext): Promise<Record<string, any>> {
  const result: Record<string, any> = {};
  
  for (const property of node.properties) {
    // Evaluate the key
    let key: string;
    if (property.key.type === 'identifier') {
      key = property.key.name;
    } else if (property.key.type === 'literal' && property.key.valueType === 'string') {
      key = property.key.value;
    } else {
      // For computed keys, evaluate them
      const keyValue = await evaluateASTNode(property.key, context);
      key = String(keyValue);
    }
    
    // Evaluate the value
    const value = await evaluateASTNode(property.value, context);
    
    result[key] = value;
  }
  
  return result;
}

/**
 * Evaluate array access expressions arr[index]
 */
async function evaluateArrayAccess(node: any, context: ExecutionContext): Promise<any> {
  const object = await evaluateASTNode(node.object, context);
  const index = await evaluateASTNode(node.index, context);
  
  // Handle null/undefined objects gracefully
  if (object === null || object === undefined) {
    throw new ExpressionParseError(`Cannot access index "${index}" of ${object}`);
  }
  
  // Handle array access
  if (Array.isArray(object)) {
    const numIndex = typeof index === 'number' ? index : parseInt(index, 10);
    if (isNaN(numIndex)) {
      throw new ExpressionParseError(`Array index must be a number, got: ${typeof index}`);
    }
    return object[numIndex];
  }
  
  // Handle object property access with bracket notation
  if (typeof object === 'object') {
    return object[String(index)];
  }
  
  // Handle string character access
  if (typeof object === 'string') {
    const numIndex = typeof index === 'number' ? index : parseInt(index, 10);
    if (isNaN(numIndex)) {
      throw new ExpressionParseError(`String index must be a number, got: ${typeof index}`);
    }
    return object[numIndex];
  }
  
  throw new ExpressionParseError(`Cannot access property of ${typeof object}`);
}

/**
 * Evaluate 'in' operator for membership testing
 */
async function evaluateInOperator(item: any, collection: any, context: ExecutionContext): Promise<boolean> {
  
  // Handle array membership
  if (Array.isArray(collection)) {
    return collection.includes(item);
  }
  
  // Handle object property membership
  if (typeof collection === 'object' && collection !== null) {
    // Convert item to string for property name comparison
    const propertyName = String(item);
    return propertyName in collection;
  }
  
  // Handle string containment (if needed)
  if (typeof collection === 'string') {
    return collection.includes(String(item));
  }
  
  throw new ExpressionParseError(`Cannot use 'in' operator with ${typeof collection}`);
}

/**
 * Evaluate CSS attribute selector - returns NodeList of matching elements
 */
async function evaluateAttributeSelector(node: any, context: ExecutionContext): Promise<NodeList> {
  // Build CSS selector string
  let selectorStr = `[${node.attribute}`;
  
  if (node.operator && node.value !== null) {
    selectorStr += `${node.operator}"${node.value}"`;
  }
  
  selectorStr += ']';
  
  // Use DOM querySelectorAll to find matching elements
  if (typeof document !== 'undefined') {
    return document.querySelectorAll(selectorStr);
  } else {
    // In non-DOM environments, return empty NodeList-like object
    return [] as unknown as NodeList;
  }
}

/**
 * Check if bracket content looks like an attribute selector
 */
function looksLikeAttributeSelector(state: ParseState, position: number): boolean {
  let pos = position;
  
  // Look for pattern: identifier (optionally followed by operator and value)
  const firstToken = state.tokens[pos];
  if (!firstToken || firstToken.type !== TokenType.IDENTIFIER) {
    return false;
  }
  
  pos++; // Move past identifier
  
  // Check what comes next
  const nextToken = state.tokens[pos];
  if (!nextToken) return false;
  
  // If directly followed by ], it's a simple attribute selector [attr]
  if (nextToken.value === ']') {
    return true;
  }
  
  // If followed by =, ~=, |=, ^=, $=, *=, it's an attribute selector with value
  if (nextToken.value === '=' || nextToken.value === '~=' || 
      nextToken.value === '|=' || nextToken.value === '^=' ||
      nextToken.value === '$=' || nextToken.value === '*=') {
    return true;
  }
  
  return false;
}

/**
 * Parse CSS attribute selector [attr] or [attr="value"]
 */
function parseAttributeSelector(state: ParseState, openBracket: Token): ASTNode {
  // Parse attribute name
  const attrToken = advance(state);
  if (!attrToken || attrToken.type !== TokenType.IDENTIFIER) {
    throw new ExpressionParseError('Expected attribute name in selector');
  }
  
  let operator = null;
  let value = null;
  
  // Check for operator
  const nextToken = peek(state);
  if (nextToken && ['=', '~=', '|=', '^=', '$=', '*='].includes(nextToken.value)) {
    operator = advance(state)!.value;
    
    // Parse value
    const valueToken = advance(state);
    if (!valueToken) {
      throw new ExpressionParseError('Expected value after attribute operator');
    }
    
    if (valueToken.type === TokenType.STRING) {
      value = valueToken.value.slice(1, -1); // Remove quotes
    } else if (valueToken.type === TokenType.IDENTIFIER || valueToken.type === TokenType.NUMBER) {
      value = valueToken.value;
    } else {
      throw new ExpressionParseError(`Unexpected token in attribute selector: ${valueToken.value}`);
    }
  }
  
  // Consume closing bracket
  const closeToken = advance(state);
  if (!closeToken || closeToken.value !== ']') {
    throw new ExpressionParseError('Expected closing bracket in attribute selector');
  }
  
  return {
    type: 'attributeSelector',
    attribute: attrToken.value,
    operator,
    value,
    start: openBracket.start,
    end: closeToken.end
  };
}

/**
 * Evaluate template literal expressions
 */
async function evaluateTemplateLiteral(node: any, context: ExecutionContext): Promise<string> {
  let template = node.value;
  
  // First handle $variable patterns (like $1, $window.foo)
  template = await replaceAsyncBatch(template, /\$([a-zA-Z_$][a-zA-Z0-9_.$]*|\d+)/g, async (match: string, varName: string) => {
    try {
      // Handle numeric literals like $1, $2 (return the number as string)
      if (/^\d+$/.test(varName)) {
        return varName;
      }
      
      // Handle property access like $window.foo
      if (varName.includes('.')) {
        const parts = varName.split('.');
        let value = resolveVariable(parts[0], context);
        
        for (let i = 1; i < parts.length; i++) {
          if (value == null) break;
          value = value[parts[i]];
        }
        
        return String(value ?? '');
      }
      
      // Handle simple variables
      const value = resolveVariable(varName, context);
      return String(value ?? '');
    } catch (error) {
      // Return empty string for failed lookups (hyperscript behavior)
      return '';
    }
  });
  
  // Then handle ${expression} patterns
  template = await replaceAsyncBatch(template, /\$\{([^}]+)\}/g, async (match: string, expr: string) => {
    try {
      // Recursively parse and evaluate the interpolated expression
      const result = await parseAndEvaluateExpression(expr, context);
      return String(result);
    } catch (error) {
      // On error, return the literal expression or 'undefined'
      return 'undefined';
    }
  });
  
  return template;
}

/**
 * Helper function to resolve variables from execution context
 */
function resolveVariable(varName: string, context: ExecutionContext): any {
  // Check locals first
  if (context.locals?.has(varName)) {
    return context.locals.get(varName);
  }
  
  // Check context properties
  if (varName === 'me' && context.me) return context.me;
  if (varName === 'you' && context.you) return context.you;
  if (varName === 'it' && context.it) return context.it;
  if (varName === 'result' && context.result) return context.result;
  
  // Check globals (including window)
  if (typeof window !== 'undefined' && varName === 'window') {
    return window;
  }
  
  if (context.globals?.has(varName)) {
    return context.globals.get(varName);
  }
  
  return undefined;
}

/**
 * Helper function to perform async replacements on a string
 */
async function replaceAsyncBatch(str: string, regex: RegExp, replacer: (match: string, ...args: any[]) => Promise<string>): Promise<string> {
  const matches = [];
  let match;
  
  // Find all matches
  while ((match = regex.exec(str)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      length: match[0].length,
      replacement: await replacer(match[0], ...match.slice(1))
    });
  }
  
  // Replace from end to start to preserve indices
  let result = str;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.substring(0, m.index) + m.replacement + result.substring(m.index + m.length);
  }
  
  return result;
}

/**
 * Helper function to reconstruct expression text for error messages
 */
function reconstructExpression(state: ParseState, leftNode?: ASTNode): string {
  // Simple reconstruction - in a more sophisticated implementation,
  // we'd traverse the AST to rebuild the original text
  return state.tokens.map(token => token.value).join(' ');
}