/**
 * AST Query Engine
 * Provides CSS-like selector querying for hyperscript ASTs
 */

import { findNodes, ASTVisitor, visit } from '../visitor/index.js';
import type { ASTNode, QueryMatch } from '../types.js';

// ============================================================================
// Query Types
// ============================================================================

interface AttributeSelector {
  name: string;
  operator: '=' | '!=' | '^=' | '$=' | '*=' | '|=' | '~=' | 'exists';
  value: any;
}

interface PseudoSelector {
  name: string;
  argument: string | null;
}

interface ParsedSelector {
  type: string | null;
  attributes: AttributeSelector[];
  pseudos: PseudoSelector[];
  combinator: {
    type: '>' | '+' | '~' | ' ';
    right: ParsedSelector;
  } | null;
}

// ============================================================================
// Main Query Functions
// ============================================================================

/**
 * Query for the first matching node
 */
export function query(ast: ASTNode | null, selector: string): QueryMatch | null {
  const matches = queryAll(ast, selector);
  return matches.length > 0 ? matches[0]! : null;
}

/**
 * Query for all matching nodes
 */
export function queryAll(ast: ASTNode | null, selector: string): QueryMatch[] {
  if (!ast) return [];
  
  // Handle multiple selectors (comma-separated)
  const selectorParts = selector.split(',').map(s => s.trim());
  const allMatches: QueryMatch[] = [];
  
  for (const selectorPart of selectorParts) {
    const parsedSelector = parseSingleSelector(selectorPart);
    const matches: QueryMatch[] = [];
    
    const visitor = new ASTVisitor({
      enter(node, context) {
        if (matchesSelector(node, parsedSelector, context)) {
          matches.push({
            node,
            path: context.getPath(),
            matches: extractCaptures(node, parsedSelector)
          });
        }
      }
    });
    
    visit(ast, visitor);
    allMatches.push(...matches);
  }
  
  return allMatches;
}

// ============================================================================
// Selector Parsing
// ============================================================================

/**
 * Parse a CSS-like selector string into a structured representation
 */
export function parseSelector(selector: string): ParsedSelector {
  return parseSingleSelector(selector.trim());
}

function parseSingleSelector(selector: string): ParsedSelector {
  // Simple regex-based parser for CSS-like selectors
  const result: ParsedSelector = {
    type: null,
    attributes: [],
    pseudos: [],
    combinator: null
  };
  
  // Remove leading/trailing whitespace
  selector = selector.trim();
  
  // Handle combinators (>, +, ~, space)
  const combinatorMatch = selector.match(/^(.+?)\s*([>+~]|\s)\s*(.+)$/);
  if (combinatorMatch) {
    const [, left, combinator, right] = combinatorMatch;
    if (combinator && left && right) {
      result.combinator = {
        type: combinator.trim() || ' ' as any,
        right: parseSingleSelector(right)
      };
      selector = left.trim();
    }
  }
  
  // Extract type (everything before first [ or :)
  const typeMatch = selector.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)/);
  if (typeMatch) {
    result.type = typeMatch[1] ?? null;
    selector = selector.substring(typeMatch[0].length);
  }
  
  // Extract attributes [name="value"] or [name]
  const attributeRegex = /\[([^=\]]+)(?:([=!^$*|~]=?)([^\]]*))?\]/g;
  let attributeMatch;
  while ((attributeMatch = attributeRegex.exec(selector)) !== null) {
    const [, name, operator = 'exists', value] = attributeMatch;
    if (name) {
      result.attributes.push({
        name: name.trim(),
        operator: operator === '=' ? '=' : operator as any,
        value: value ? parseAttributeValue(value.trim()) : null
      });
    }
  }
  
  // Extract pseudo selectors :name or :name(arg)
  const pseudoRegex = /:([a-zA-Z-]+)(?:\(([^)]*)\))?/g;
  let pseudoMatch;
  while ((pseudoMatch = pseudoRegex.exec(selector)) !== null) {
    const [, name, argument] = pseudoMatch;
    result.pseudos.push({
      name: name ?? '',
      argument: argument || null
    });
  }
  
  return result;
}

function parseAttributeValue(value: string): any {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || 
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Try to parse as number
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }
  
  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value === 'undefined') return undefined;
  
  return value;
}

// ============================================================================
// Selector Matching
// ============================================================================

function matchesSelector(node: ASTNode, selector: ParsedSelector, context: any): boolean {
  // If we have a combinator, we need to match the left side first
  if (selector.combinator) {
    // This is the target node (right side of combinator)
    // We need to find if there's a matching ancestor/sibling for the left side
    const leftSide = {
      type: selector.type,
      attributes: selector.attributes,
      pseudos: selector.pseudos,
      combinator: null
    };
    
    // Check if current node matches the right side
    if (!matchesSimpleSelector(node, leftSide)) {
      return false;
    }
    
    // Check combinator relationship
    return checkCombinator(node, selector.combinator, context);
  }
  
  // Simple selector matching
  return matchesSimpleSelector(node, selector);
}

function matchesSimpleSelector(node: ASTNode, selector: ParsedSelector): boolean {
  // Check type
  if (selector.type && node.type !== selector.type) {
    return false;
  }
  
  // Check attributes
  for (const attr of selector.attributes) {
    if (!matchesAttribute(node, attr)) {
      return false;
    }
  }
  
  // Check pseudo selectors (simplified for now)
  for (const pseudo of selector.pseudos) {
    if (!matchesPseudoSimple(node, pseudo)) {
      return false;
    }
  }
  
  return true;
}

function matchesAttribute(node: ASTNode, attr: AttributeSelector): boolean {
  const value = (node as any)[attr.name];
  
  switch (attr.operator) {
    case 'exists':
      return value !== undefined;
    case '=':
      return value === attr.value;
    case '!=':
      return value !== attr.value;
    case '^=':
      return typeof value === 'string' && value.startsWith(String(attr.value));
    case '$=':
      return typeof value === 'string' && value.endsWith(String(attr.value));
    case '*=':
      return typeof value === 'string' && value.includes(String(attr.value));
    case '|=':
      return typeof value === 'string' && 
             (value === attr.value || value.startsWith(attr.value + '-'));
    case '~=':
      return typeof value === 'string' && 
             value.split(/\s+/).includes(String(attr.value));
    default:
      return false;
  }
}

function matchesPseudo(node: ASTNode, pseudo: PseudoSelector, context: any): boolean {
  switch (pseudo.name) {
    case 'first-child':
      return isFirstChild(node, context);
    case 'last-child':
      return isLastChild(node, context);
    case 'has':
      return hasDescendant(node, pseudo.argument!);
    case 'not':
      return !matchesSelector(node, parseSelector(pseudo.argument!), context);
    case 'contains':
      return containsText(node, pseudo.argument!);
    default:
      return false;
  }
}

function matchesPseudoSimple(node: ASTNode, pseudo: PseudoSelector): boolean {
  switch (pseudo.name) {
    case 'has':
      return hasDescendant(node, pseudo.argument!);
    case 'not':
      return !matchesSimpleSelector(node, parseSelector(pseudo.argument!));
    case 'contains':
      return containsText(node, pseudo.argument!);
    default:
      return false;
  }
}

function checkCombinator(node: ASTNode, combinator: ParsedSelector['combinator'], context: any): boolean {
  if (!combinator) return true;
  
  switch (combinator.type) {
    case '>': // Direct child - parent must match the right side
      const parent = context.getParent();
      return parent ? matchesSimpleSelector(parent, combinator.right) : false;
    case '+': // Adjacent sibling
      return hasAdjacentSiblingMatching(node, context, combinator.right);
    case '~': // General sibling
      return hasGeneralSiblingMatching(node, context, combinator.right);
    case ' ': // Descendant - any ancestor must match the right side
      return hasAncestorMatching(node, context, combinator.right);
    default:
      return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function isFirstChild(node: ASTNode, context: any): boolean {
  const parent = context.getParent();
  if (!parent) return false;
  
  // Find the array that contains this node
  for (const [key, value] of Object.entries(parent)) {
    if (Array.isArray(value) && value.length > 0 && value[0] === node) {
      return true;
    }
  }
  return false;
}

function isLastChild(node: ASTNode, context: any): boolean {
  const parent = context.getParent();
  if (!parent) return false;
  
  // Find the array that contains this node
  for (const [key, value] of Object.entries(parent)) {
    if (Array.isArray(value) && value.length > 0 && value[value.length - 1] === node) {
      return true;
    }
  }
  return false;
}

function hasDescendant(node: ASTNode, selector: string): boolean {
  const descendants = findNodes(node, () => true);
  const parsedSelector = parseSelector(selector);
  
  return descendants.some(descendant => 
    matchesSelector(descendant, parsedSelector, { getParent: () => null })
  );
}

function containsText(node: ASTNode, text: string): boolean {
  // Check if any property contains the text
  const nodeStr = JSON.stringify(node);
  return nodeStr.includes(text);
}

function isAdjacentSibling(node: ASTNode, parent: ASTNode, selector: ParsedSelector): boolean {
  // Find siblings and check if previous sibling matches selector
  for (const [key, value] of Object.entries(parent)) {
    if (Array.isArray(value)) {
      const index = value.indexOf(node);
      if (index > 0) {
        const prevSibling = value[index - 1];
        if (typeof prevSibling === 'object' && prevSibling.type) {
          return matchesSelector(prevSibling, selector, { getParent: () => parent });
        }
      }
    }
  }
  return false;
}

function isGeneralSibling(node: ASTNode, parent: ASTNode, selector: ParsedSelector): boolean {
  // Find siblings and check if any previous sibling matches selector
  for (const [key, value] of Object.entries(parent)) {
    if (Array.isArray(value)) {
      const index = value.indexOf(node);
      if (index >= 0) {
        for (let i = 0; i < index; i++) {
          const sibling = value[i];
          if (typeof sibling === 'object' && sibling.type) {
            if (matchesSelector(sibling, selector, { getParent: () => parent })) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}

function hasAncestorMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  let currentParent = context.getParent();
  
  while (currentParent) {
    if (matchesSimpleSelector(currentParent, selector)) {
      return true;
    }
    // Move up the tree - this is simplified, real implementation would need proper context chain
    currentParent = null; // For now, just check direct parent
  }
  
  return false;
}

function hasAdjacentSiblingMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  // Simplified implementation
  return false;
}

function hasGeneralSiblingMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  // Simplified implementation
  return false;
}

function extractCaptures(node: ASTNode, selector: ParsedSelector): Record<string, any> {
  const captures: Record<string, any> = {};
  
  // Extract captured attribute values
  for (const attr of selector.attributes) {
    if (attr.operator === '=' || attr.operator === 'exists') {
      const key = selector.type ? `${selector.type}[${attr.name}]` : `[${attr.name}]`;
      captures[key] = (node as any)[attr.name];
    }
  }
  
  return captures;
}

// ============================================================================
// XPath-style Queries (Basic Implementation)
// ============================================================================

/**
 * Basic XPath-style query support
 */
export function queryXPath(ast: ASTNode | null, xpath: string): ASTNode[] {
  if (!ast) return [];
  
  // Very basic XPath implementation for common patterns
  if (xpath === '//*') {
    return findNodes(ast, () => true);
  }
  
  // //nodetype pattern
  const descendantMatch = xpath.match(/^\/\/([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (descendantMatch) {
    const nodeType = descendantMatch[1];
    return findNodes(ast, node => node.type === nodeType);
  }
  
  // More complex XPath would need a proper XPath parser
  throw new Error(`XPath query "${xpath}" not supported in basic implementation`);
}