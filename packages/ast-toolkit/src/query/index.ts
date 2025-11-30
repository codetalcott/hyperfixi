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

    // Track ancestors during traversal
    const ancestorStack: ASTNode[] = [];

    function traverse(node: ASTNode, path: string[], parent: ASTNode | null, siblingIndex: number, siblings: ASTNode[]) {
      // Create a context-like object with ancestor access
      const queryContext = {
        getParent: () => parent,
        getPath: () => path,
        getAncestors: () => [...ancestorStack],
        getSiblingIndex: () => siblingIndex,
        getSiblings: () => siblings
      };

      if (matchesSelector(node, parsedSelector, queryContext)) {
        matches.push({
          node,
          path: [...path],
          matches: extractCaptures(node, parsedSelector, queryContext)
        });
      }

      // Add current node to ancestor stack before visiting children
      ancestorStack.push(node);

      // Visit all children
      for (const [key, value] of Object.entries(node)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'line' || key === 'column') {
          continue;
        }

        if (Array.isArray(value)) {
          const childNodes = value.filter((v: any) => v && typeof v === 'object' && typeof v.type === 'string') as ASTNode[];
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (item && typeof item === 'object' && typeof item.type === 'string') {
              traverse(item, [...path, `${key}/${i}`], node, i, childNodes);
            }
          }
        } else if (value && typeof value === 'object' && typeof (value as any).type === 'string') {
          traverse(value as ASTNode, [...path, key], node, 0, [value as ASTNode]);
        }
      }

      // Remove from ancestor stack when leaving
      ancestorStack.pop();
    }

    traverse(ast, [], null, 0, [ast]);
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

  // Validate selector syntax - check for invalid patterns
  if (/\[\[/.test(selector)) {
    throw new Error(`Invalid selector syntax: "${selector}" - unexpected [[`);
  }
  if (/([>+~])\s*([>+~])/.test(selector)) {
    throw new Error(`Invalid selector syntax: "${selector}" - consecutive combinators`);
  }

  // Handle combinators (>, +, ~, space) - use non-greedy match and be more careful
  // Look for the first combinator from left to right
  const combinatorMatch = selector.match(/^([^\s>+~]+(?:\[[^\]]*\])*(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*([>+~]|\s)\s*(.+)$/);
  if (combinatorMatch) {
    const [, left, combinator, right] = combinatorMatch;
    if (combinator && left && right) {
      result.combinator = {
        type: (combinator.trim() || ' ') as any,
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

  // Extract pseudo selectors FIRST (before attributes)
  // This prevents parsing attributes inside pseudo arguments like :not([name="add"])
  // Use a more sophisticated regex that handles nested brackets
  const pseudoRegex = /:([a-zA-Z-]+)(?:\(([^)]*(?:\([^)]*\))*[^)]*)\))?/g;
  let pseudoMatch;
  const pseudoRanges: Array<[number, number]> = [];
  while ((pseudoMatch = pseudoRegex.exec(selector)) !== null) {
    const [fullMatch, name, argument] = pseudoMatch;
    result.pseudos.push({
      name: name ?? '',
      argument: argument || null
    });
    pseudoRanges.push([pseudoMatch.index, pseudoMatch.index + fullMatch.length]);
  }

  // Extract attributes [name="value"] or [name], but skip those inside pseudo arguments
  // Fixed regex: name is a valid identifier, operator includes ^=, $=, *=, |=, ~=, !=, =
  const attributeRegex = /\[([a-zA-Z_][a-zA-Z0-9_-]*)(?:(\^=|\$=|\*=|\|=|~=|!=|=)([^\]]*))?\]/g;
  let attributeMatch;
  while ((attributeMatch = attributeRegex.exec(selector)) !== null) {
    const matchStart = attributeMatch.index;
    const matchEnd = matchStart + attributeMatch[0].length;

    // Skip if this attribute is inside a pseudo selector argument
    const insidePseudo = pseudoRanges.some(([start, end]) =>
      matchStart >= start && matchEnd <= end
    );

    if (insidePseudo) continue;

    const [, name, operator, value] = attributeMatch;
    if (name) {
      result.attributes.push({
        name: name.trim(),
        operator: (operator || 'exists') as any,
        value: value !== undefined ? parseAttributeValue(value.trim()) : null
      });
    }
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
  // If we have a combinator, the structure is:
  // selector = { type: 'leftType', combinator: { type: '>', right: { type: 'rightType' } } }
  // For 'eventHandler command': selector.type = 'eventHandler', combinator.right.type = 'command'
  // We want to find nodes that match the RIGHTMOST part and have proper ancestor/sibling relationship
  if (selector.combinator) {
    // Get the rightmost selector in the chain
    const rightmost = getRightmostSelector(selector);

    // First check if current node matches the rightmost selector (simple match, no combinator)
    if (!matchesSimpleSelector(node, rightmost)) {
      return false;
    }

    // Now check the combinator chain from right to left
    return checkCombinatorChain(node, selector, context);
  }

  // Simple selector matching
  return matchesSimpleSelector(node, selector, context);
}

/**
 * Get the rightmost selector in a combinator chain
 */
function getRightmostSelector(selector: ParsedSelector): ParsedSelector {
  if (selector.combinator) {
    return getRightmostSelector(selector.combinator.right);
  }
  return selector;
}

/**
 * Check the entire combinator chain from right to left
 */
function checkCombinatorChain(node: ASTNode, selector: ParsedSelector, context: any): boolean {
  if (!selector.combinator) {
    // No combinator, just check simple match (already done in matchesSelector)
    return true;
  }

  // Build the immediate left selector (the part before the rightmost combinator)
  // For "a b c", if selector represents "a b c", we need to check:
  // 1. Current node matches "c"
  // 2. Some ancestor/sibling matches "b" based on combinator type
  // 3. Some ancestor/sibling of that matches "a" based on combinator type

  // Get the combinator type between left and right
  const combinatorType = selector.combinator.type;
  const rightSelector = selector.combinator.right;
  const leftSelector: ParsedSelector = {
    type: selector.type,
    attributes: selector.attributes,
    pseudos: selector.pseudos,
    combinator: null
  };

  // If the right side also has a combinator, we need to recursively check
  if (rightSelector.combinator) {
    // First, verify the right side's combinator chain is satisfied
    if (!checkCombinatorChain(node, rightSelector, context)) {
      return false;
    }

    // Now check the relationship between left and the immediate right
    const immediateRight: ParsedSelector = {
      type: rightSelector.type,
      attributes: rightSelector.attributes,
      pseudos: rightSelector.pseudos,
      combinator: null
    };

    return checkCombinatorRelationship(node, combinatorType, leftSelector, context, immediateRight);
  }

  // Simple case: no further nesting
  return checkCombinatorRelationship(node, combinatorType, leftSelector, context);
}

function matchesSimpleSelector(node: ASTNode, selector: ParsedSelector, context?: any): boolean {
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

  // Check pseudo selectors
  for (const pseudo of selector.pseudos) {
    if (context) {
      if (!matchesPseudo(node, pseudo, context)) {
        return false;
      }
    } else {
      if (!matchesPseudoSimple(node, pseudo)) {
        return false;
      }
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

function checkCombinatorRelationship(
  node: ASTNode,
  combinatorType: string,
  leftSelector: ParsedSelector,
  context: any,
  intermediateSelector?: ParsedSelector
): boolean {
  switch (combinatorType) {
    case '>': // Direct child - parent must match the left side
      const parent = context.getParent();
      if (!parent) return false;
      if (intermediateSelector) {
        // For chained combinator: check if parent matches intermediate
        // and has an ancestor matching left
        return matchesSimpleSelector(parent, intermediateSelector) &&
               hasAncestorMatching(parent, context, leftSelector);
      }
      return matchesSimpleSelector(parent, leftSelector);
    case '+': // Adjacent sibling - previous sibling must match the left side
      return hasPreviousSiblingMatching(node, context, leftSelector);
    case '~': // General sibling - any previous sibling must match the left side
      return hasAnyPreviousSiblingMatching(node, context, leftSelector);
    case ' ': // Descendant - any ancestor must match the left side
      if (intermediateSelector) {
        // For "a b c" where node matches "c", we need to find:
        // 1. An ancestor matching "b" (intermediate)
        // 2. And that ancestor has an ancestor matching "a" (left)
        return hasAncestorMatchingWithFurtherAncestor(node, context, intermediateSelector, leftSelector);
      }
      return hasAncestorMatching(node, context, leftSelector);
    default:
      return false;
  }
}

/**
 * Check if node has an ancestor matching intermediateSelector that itself
 * has an ancestor matching leftSelector
 */
function hasAncestorMatchingWithFurtherAncestor(
  node: ASTNode,
  context: any,
  intermediateSelector: ParsedSelector,
  leftSelector: ParsedSelector
): boolean {
  if (!context.getAncestors) {
    return false;
  }

  const ancestors = context.getAncestors();
  // Ancestors are stored root-first, so we iterate from the end (closest ancestor)
  // to find intermediate, then look earlier (further up) for left
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (matchesSimpleSelector(ancestor, intermediateSelector)) {
      // Found intermediate match (e.g., binaryExpression), now check if any
      // EARLIER ancestor (further up the tree) matches left (e.g., conditional)
      for (let j = i - 1; j >= 0; j--) {
        if (matchesSimpleSelector(ancestors[j], leftSelector)) {
          return true;
        }
      }
    }
  }
  return false;
}

// ============================================================================
// Helper Functions
// ============================================================================

function isFirstChild(node: ASTNode, context: any): boolean {
  if (context.getSiblingIndex) {
    return context.getSiblingIndex() === 0;
  }

  // Fallback: check in parent
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
  if (context.getSiblingIndex && context.getSiblings) {
    const siblings = context.getSiblings();
    return context.getSiblingIndex() === siblings.length - 1;
  }

  // Fallback: check in parent
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
  // Strip quotes from the search text if present
  let searchText = text;
  if ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'"))) {
    searchText = text.slice(1, -1);
  }

  // Check if any property contains the text
  const nodeStr = JSON.stringify(node);
  return nodeStr.includes(searchText);
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
  // Use getAncestors if available, otherwise fall back to getParent
  if (context.getAncestors) {
    const ancestors = context.getAncestors();
    for (const ancestor of ancestors) {
      if (matchesSimpleSelector(ancestor, selector)) {
        return true;
      }
    }
    return false;
  }

  // Fallback: just check direct parent
  const parent = context.getParent();
  return parent ? matchesSimpleSelector(parent, selector) : false;
}

function hasPreviousSiblingMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  if (!context.getSiblings || !context.getSiblingIndex) {
    return false;
  }
  const siblings = context.getSiblings();
  const index = context.getSiblingIndex();
  if (index > 0) {
    const prevSibling = siblings[index - 1];
    return prevSibling ? matchesSimpleSelector(prevSibling, selector) : false;
  }
  return false;
}

function hasAnyPreviousSiblingMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  if (!context.getSiblings || !context.getSiblingIndex) {
    return false;
  }
  const siblings = context.getSiblings();
  const index = context.getSiblingIndex();
  for (let i = 0; i < index; i++) {
    const sibling = siblings[i];
    if (sibling && matchesSimpleSelector(sibling, selector)) {
      return true;
    }
  }
  return false;
}

function extractCaptures(node: ASTNode, selector: ParsedSelector, context?: any): Record<string, any> {
  const captures: Record<string, any> = {};

  // Extract captured attribute values from the matched node (rightmost selector)
  const rightmost = getRightmostSelector(selector);
  for (const attr of rightmost.attributes) {
    if (attr.operator === '=' || attr.operator === 'exists') {
      const key = rightmost.type ? `${rightmost.type}[${attr.name}]` : `[${attr.name}]`;
      captures[key] = (node as any)[attr.name];
    }
  }

  // If there's a combinator, also extract from parent selectors
  if (selector.combinator && context?.getAncestors) {
    const ancestors = context.getAncestors();
    extractCapturesFromCombinatorChain(selector, ancestors, captures);
  }

  return captures;
}

/**
 * Extract captures from the entire combinator chain by matching against ancestors
 */
function extractCapturesFromCombinatorChain(
  selector: ParsedSelector,
  ancestors: ASTNode[],
  captures: Record<string, any>
): void {
  if (!selector.combinator) return;

  // Current selector represents the left part, combinator.right is the next part
  const leftSelector: ParsedSelector = {
    type: selector.type,
    attributes: selector.attributes,
    pseudos: selector.pseudos,
    combinator: null
  };

  // Find an ancestor that matches the left selector
  for (const ancestor of ancestors) {
    if (matchesSimpleSelector(ancestor, leftSelector)) {
      // Extract attributes from this ancestor
      for (const attr of leftSelector.attributes) {
        if (attr.operator === '=' || attr.operator === 'exists') {
          const key = leftSelector.type ? `${leftSelector.type}[${attr.name}]` : `[${attr.name}]`;
          captures[key] = (ancestor as any)[attr.name];
        }
      }
      break; // Found the matching ancestor
    }
  }

  // Recursively process the right side if it has combinators
  if (selector.combinator.right.combinator) {
    extractCapturesFromCombinatorChain(selector.combinator.right, ancestors, captures);
  }
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