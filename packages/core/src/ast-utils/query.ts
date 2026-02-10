/**
 * AST Query Engine
 * Provides CSS-like selector querying for hyperscript ASTs
 *
 * Consolidated from @lokascript/ast-toolkit.
 */

import { findNodes } from './visitor.js';
import type { ASTNode, QueryMatch } from './types.js';

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

    // eslint-disable-next-line no-inner-declarations
    // NOTE: This function must be defined here as it's a closure over parsedSelector,
    // matches, and ancestorStack from the outer loop scope. Extracting it would
    // require passing 3+ additional parameters on every recursive call.
    function traverse(
      node: ASTNode,
      path: string[],
      parent: ASTNode | null,
      siblingIndex: number,
      siblings: ASTNode[]
    ) {
      // Create a context-like object with ancestor access
      const queryContext = {
        getParent: () => parent,
        getPath: () => path,
        getAncestors: () => [...ancestorStack],
        getSiblingIndex: () => siblingIndex,
        getSiblings: () => siblings,
      };

      if (matchesSelector(node, parsedSelector, queryContext)) {
        matches.push({
          node,
          path: [...path],
          matches: extractCaptures(node, parsedSelector, queryContext),
        });
      }

      // Add current node to ancestor stack before visiting children
      ancestorStack.push(node);

      // Visit all children
      for (const [key, value] of Object.entries(node)) {
        if (
          key === 'type' ||
          key === 'start' ||
          key === 'end' ||
          key === 'line' ||
          key === 'column'
        ) {
          continue;
        }

        if (Array.isArray(value)) {
          const childNodes = value.filter(
            (v: any) => v && typeof v === 'object' && typeof v.type === 'string'
          ) as ASTNode[];
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
  const result: ParsedSelector = {
    type: null,
    attributes: [],
    pseudos: [],
    combinator: null,
  };

  selector = selector.trim();

  // Validate selector syntax
  if (/\[\[/.test(selector)) {
    throw new Error(`Invalid selector syntax: "${selector}" - unexpected [[`);
  }
  if (/([>+~])\s*([>+~])/.test(selector)) {
    throw new Error(`Invalid selector syntax: "${selector}" - consecutive combinators`);
  }

  // Handle combinators (>, +, ~, space)
  const combinatorMatch = selector.match(
    /^([^\s>+~]+(?:\[[^\]]*\])*(?::[a-zA-Z-]+(?:\([^)]*\))?)*)\s*([>+~]|\s)\s*(.+)$/
  );
  if (combinatorMatch) {
    const [, left, combinator, right] = combinatorMatch;
    if (combinator && left && right) {
      result.combinator = {
        type: (combinator.trim() || ' ') as any,
        right: parseSingleSelector(right),
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
  const pseudoRegex = /:([a-zA-Z-]+)(?:\(([^)]*(?:\([^)]*\))*[^)]*)\))?/g;
  let pseudoMatch;
  const pseudoRanges: Array<[number, number]> = [];
  while ((pseudoMatch = pseudoRegex.exec(selector)) !== null) {
    const [fullMatch, name, argument] = pseudoMatch;
    result.pseudos.push({
      name: name ?? '',
      argument: argument || null,
    });
    pseudoRanges.push([pseudoMatch.index, pseudoMatch.index + fullMatch.length]);
  }

  // Extract attributes [name="value"] or [name]
  const attributeRegex = /\[([a-zA-Z_][a-zA-Z0-9_-]*)(?:(\^=|\$=|\*=|\|=|~=|!=|=)([^\]]*))?\]/g;
  let attributeMatch;
  while ((attributeMatch = attributeRegex.exec(selector)) !== null) {
    const matchStart = attributeMatch.index;
    const matchEnd = matchStart + attributeMatch[0].length;

    // Skip if this attribute is inside a pseudo selector argument
    const insidePseudo = pseudoRanges.some(
      ([start, end]) => matchStart >= start && matchEnd <= end
    );

    if (insidePseudo) continue;

    const [, name, operator, value] = attributeMatch;
    if (name) {
      result.attributes.push({
        name: name.trim(),
        operator: (operator || 'exists') as any,
        value: value !== undefined ? parseAttributeValue(value.trim()) : null,
      });
    }
  }

  return result;
}

function parseAttributeValue(value: string): any {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }

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
  if (selector.combinator) {
    const rightmost = getRightmostSelector(selector);

    if (!matchesSimpleSelector(node, rightmost)) {
      return false;
    }

    return checkCombinatorChain(node, selector, context);
  }

  return matchesSimpleSelector(node, selector, context);
}

function getRightmostSelector(selector: ParsedSelector): ParsedSelector {
  if (selector.combinator) {
    return getRightmostSelector(selector.combinator.right);
  }
  return selector;
}

function checkCombinatorChain(node: ASTNode, selector: ParsedSelector, context: any): boolean {
  if (!selector.combinator) {
    return true;
  }

  const combinatorType = selector.combinator.type;
  const rightSelector = selector.combinator.right;
  const leftSelector: ParsedSelector = {
    type: selector.type,
    attributes: selector.attributes,
    pseudos: selector.pseudos,
    combinator: null,
  };

  if (rightSelector.combinator) {
    if (!checkCombinatorChain(node, rightSelector, context)) {
      return false;
    }

    const immediateRight: ParsedSelector = {
      type: rightSelector.type,
      attributes: rightSelector.attributes,
      pseudos: rightSelector.pseudos,
      combinator: null,
    };

    return checkCombinatorRelationship(node, combinatorType, leftSelector, context, immediateRight);
  }

  return checkCombinatorRelationship(node, combinatorType, leftSelector, context);
}

function matchesSimpleSelector(node: ASTNode, selector: ParsedSelector, context?: any): boolean {
  if (selector.type && node.type !== selector.type) {
    return false;
  }

  for (const attr of selector.attributes) {
    if (!matchesAttribute(node, attr)) {
      return false;
    }
  }

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
      return (
        typeof value === 'string' && (value === attr.value || value.startsWith(attr.value + '-'))
      );
    case '~=':
      return typeof value === 'string' && value.split(/\s+/).includes(String(attr.value));
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
    case '>': {
      const parent = context.getParent();
      if (!parent) return false;
      if (intermediateSelector) {
        return (
          matchesSimpleSelector(parent, intermediateSelector) &&
          hasAncestorMatching(parent, context, leftSelector)
        );
      }
      return matchesSimpleSelector(parent, leftSelector);
    }
    case '+':
      return hasPreviousSiblingMatching(node, context, leftSelector);
    case '~':
      return hasAnyPreviousSiblingMatching(node, context, leftSelector);
    case ' ':
      if (intermediateSelector) {
        return hasAncestorMatchingWithFurtherAncestor(
          node,
          context,
          intermediateSelector,
          leftSelector
        );
      }
      return hasAncestorMatching(node, context, leftSelector);
    default:
      return false;
  }
}

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
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (matchesSimpleSelector(ancestor, intermediateSelector)) {
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

  const parent = context.getParent();
  if (!parent) return false;

  for (const [, value] of Object.entries(parent)) {
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

  const parent = context.getParent();
  if (!parent) return false;

  for (const [, value] of Object.entries(parent)) {
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
  let searchText = text;
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    searchText = text.slice(1, -1);
  }

  const nodeStr = JSON.stringify(node);
  return nodeStr.includes(searchText);
}

function hasAncestorMatching(node: ASTNode, context: any, selector: ParsedSelector): boolean {
  if (context.getAncestors) {
    const ancestors = context.getAncestors();
    for (const ancestor of ancestors) {
      if (matchesSimpleSelector(ancestor, selector)) {
        return true;
      }
    }
    return false;
  }

  const parent = context.getParent();
  return parent ? matchesSimpleSelector(parent, selector) : false;
}

function hasPreviousSiblingMatching(
  node: ASTNode,
  context: any,
  selector: ParsedSelector
): boolean {
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

function hasAnyPreviousSiblingMatching(
  node: ASTNode,
  context: any,
  selector: ParsedSelector
): boolean {
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

function extractCaptures(
  node: ASTNode,
  selector: ParsedSelector,
  context?: any
): Record<string, any> {
  const captures: Record<string, any> = {};

  const rightmost = getRightmostSelector(selector);
  for (const attr of rightmost.attributes) {
    if (attr.operator === '=' || attr.operator === 'exists') {
      const key = rightmost.type ? `${rightmost.type}[${attr.name}]` : `[${attr.name}]`;
      captures[key] = (node as any)[attr.name];
    }
  }

  if (selector.combinator && context?.getAncestors) {
    const ancestors = context.getAncestors();
    extractCapturesFromCombinatorChain(selector, ancestors, captures);
  }

  return captures;
}

function extractCapturesFromCombinatorChain(
  selector: ParsedSelector,
  ancestors: ASTNode[],
  captures: Record<string, any>
): void {
  if (!selector.combinator) return;

  const leftSelector: ParsedSelector = {
    type: selector.type,
    attributes: selector.attributes,
    pseudos: selector.pseudos,
    combinator: null,
  };

  for (const ancestor of ancestors) {
    if (matchesSimpleSelector(ancestor, leftSelector)) {
      for (const attr of leftSelector.attributes) {
        if (attr.operator === '=' || attr.operator === 'exists') {
          const key = leftSelector.type ? `${leftSelector.type}[${attr.name}]` : `[${attr.name}]`;
          captures[key] = (ancestor as any)[attr.name];
        }
      }
      break;
    }
  }

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

  if (xpath === '//*') {
    return findNodes(ast, () => true);
  }

  const descendantMatch = xpath.match(/^\/\/([a-zA-Z_][a-zA-Z0-9_]*)/);
  if (descendantMatch) {
    const nodeType = descendantMatch[1];
    return findNodes(ast, node => node.type === nodeType);
  }

  throw new Error(`XPath query "${xpath}" not supported in basic implementation`);
}
