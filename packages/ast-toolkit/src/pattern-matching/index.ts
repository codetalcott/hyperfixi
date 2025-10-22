/**
 * Pattern Matching Engine for AST Analysis
 * Supports wildcard matching, variable binding, and pattern extraction
 */

import { findNodes, ASTVisitor, visit } from '../visitor/index.js';
import type { ASTNode, PatternMatch, PatternTemplate } from '../types.js';

// ============================================================================
// Pattern Types
// ============================================================================

interface PatternToken {
  type: 'keyword' | 'variable' | 'wildcard' | 'literal';
  value: string;
}

interface ParsedPattern {
  tokens: PatternToken[];
  variables: Set<string>;
  structure: PatternStructure;
}

interface PatternStructure {
  type: string;
  properties: Record<string, PatternStructure | PatternToken | PatternStructure[]>;
}

interface MatchOptions {
  partial?: boolean;
  minConfidence?: number;
  ignoreOrder?: boolean;
}

interface PatternConstraints {
  [variable: string]: (value: any) => boolean;
}

// Pattern cache for performance
const patternCache = new Map<string, ParsedPattern>();

// ============================================================================
// Main Pattern Matching Functions
// ============================================================================

/**
 * Match a pattern against an AST node
 */
export function matchPattern(
  ast: ASTNode, 
  pattern: string, 
  options: MatchOptions = {}
): PatternMatch | null {
  const parsedPattern = parsePattern(pattern);
  const bindings: Record<string, any> = {};
  
  const confidence = calculatePatternMatch(ast, parsedPattern, bindings, options);
  
  if (confidence > (options.minConfidence || 0.7)) {
    return {
      pattern,
      node: ast,
      bindings,
      confidence
    };
  }
  
  return null;
}

/**
 * Simple wildcard matching (faster, less precise)
 */
export function matchWildcard(ast: ASTNode, pattern: string): boolean {
  const patternTokens = pattern.split(/\s+/);
  const astString = astToString(ast);
  
  // Convert wildcards to regex
  const regexPattern = patternTokens
    .map(token => token === '*' ? '\\S+' : escapeRegex(token))
    .join('\\s+');
  
  return new RegExp(regexPattern, 'i').test(astString);
}

/**
 * Parse a pattern string into a structured representation
 */
export function parsePattern(pattern: string): ParsedPattern {
  // Check cache first
  if (patternCache.has(pattern)) {
    return patternCache.get(pattern)!;
  }
  
  const tokens: PatternToken[] = [];
  const variables = new Set<string>();
  const words = pattern.split(/\s+/);
  
  for (const word of words) {
    if (word.startsWith('$')) {
      const variable = word.substring(1);
      tokens.push({ type: 'variable', value: variable });
      variables.add(variable);
    } else if (word === '*') {
      tokens.push({ type: 'wildcard', value: '*' });
    } else if (isKeyword(word)) {
      tokens.push({ type: 'keyword', value: word });
    } else {
      tokens.push({ type: 'literal', value: word });
    }
  }
  
  const structure = buildPatternStructure(tokens);
  const parsed = { tokens, variables, structure };
  
  // Cache the result
  patternCache.set(pattern, parsed);
  
  return parsed;
}

/**
 * Extract common patterns from multiple ASTs
 */
export function extractPatterns(
  asts: ASTNode[], 
  options: { minOccurrences?: number; minConfidence?: number } = {}
): Array<{
  pattern: string;
  occurrences: number;
  bindings: Record<string, any>[];
  confidence: number;
}> {
  const patternMap = new Map<string, {
    count: number;
    bindings: Record<string, any>[];
    confidence: number;
  }>();
  
  // Common hyperscript patterns to check
  const commonPatterns = [
    'on $event add $class to $target',
    'on $event remove $class from $target',
    'on $event toggle $class on $target',
    'set $variable to $value',
    'if $condition then $action',
    'on $event $command $argument',
    '$command $argument to $target'
  ];
  
  for (const pattern of commonPatterns) {
    const matches: Record<string, any>[] = [];
    let totalConfidence = 0;
    
    for (const ast of asts) {
      const match = matchPattern(ast, pattern, { minConfidence: options.minConfidence || 0.6 });
      if (match) {
        matches.push(match.bindings);
        totalConfidence += match.confidence;
      }
    }
    
    if (matches.length >= (options.minOccurrences || 2)) {
      patternMap.set(pattern, {
        count: matches.length,
        bindings: matches,
        confidence: totalConfidence / matches.length
      });
    }
  }
  
  // Sort by frequency and confidence
  return Array.from(patternMap.entries())
    .map(([pattern, data]) => ({
      pattern,
      occurrences: data.count,
      bindings: data.bindings,
      confidence: data.confidence
    }))
    .sort((a, b) => b.occurrences - a.occurrences || b.confidence - a.confidence);
}

/**
 * Create a reusable pattern matcher with constraints
 */
export function createPatternMatcher(
  pattern: string, 
  constraints: PatternConstraints = {}
): {
  match: (ast: ASTNode) => PatternMatch | null;
  pattern: string;
} {
  const parsedPattern = parsePattern(pattern);
  
  return {
    pattern,
    match(ast: ASTNode): PatternMatch | null {
      const bindings: Record<string, any> = {};
      const confidence = calculatePatternMatch(ast, parsedPattern, bindings);
      
      if (confidence > 0.7) {
        // Check constraints
        for (const [variable, constraint] of Object.entries(constraints)) {
          if (variable in bindings && !constraint(bindings[variable])) {
            return null;
          }
        }
        
        return {
          pattern,
          node: ast,
          bindings,
          confidence
        };
      }
      
      return null;
    }
  };
}

// ============================================================================
// Pattern Matching Implementation
// ============================================================================

function calculatePatternMatch(
  ast: ASTNode, 
  pattern: ParsedPattern, 
  bindings: Record<string, any>,
  options: MatchOptions = {}
): number {
  // Simple structural matching based on pattern tokens
  const astString = astToString(ast);
  const patternString = pattern.tokens.map(t => t.value).join(' ');
  
  // Try to match the pattern against the AST string representation
  return matchTokensToAst(ast, pattern.tokens, bindings, options);
}

function matchTokensToAst(
  ast: ASTNode,
  tokens: PatternToken[],
  bindings: Record<string, any>,
  options: MatchOptions
): number {
  const astValues = extractAstValues(ast);
  let matchedTokens = 0;
  let tokenIndex = 0;
  
  for (const value of astValues) {
    if (tokenIndex >= tokens.length) break;

    const token = tokens[tokenIndex];
    if (!token) break;

    switch (token.type) {
      case 'keyword':
        if (value === token.value) {
          matchedTokens++;
          tokenIndex++;
        }
        break;
      
      case 'literal':
        if (value === token.value) {
          matchedTokens++;
          tokenIndex++;
        }
        break;
      
      case 'variable':
        bindings[token.value] = value;
        matchedTokens++;
        tokenIndex++;
        break;
      
      case 'wildcard':
        matchedTokens++;
        tokenIndex++;
        break;
    }
  }
  
  return tokens.length > 0 ? matchedTokens / tokens.length : 0;
}

function extractAstValues(ast: ASTNode): string[] {
  const values: string[] = [];
  
  const visitor = new ASTVisitor({
    enter(node) {
      // Extract meaningful values from node
      if ((node as any).name) values.push((node as any).name);
      if ((node as any).value) values.push(String((node as any).value));
      if ((node as any).event) values.push((node as any).event);
      if ((node as any).operator) values.push((node as any).operator);
    }
  });
  
  visit(ast, visitor);
  return values;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildPatternStructure(tokens: PatternToken[]): PatternStructure {
  // Simple structure building - could be enhanced
  return {
    type: 'pattern',
    properties: {
      tokens: tokens
    }
  };
}

function isKeyword(word: string): boolean {
  const keywords = new Set([
    'on', 'add', 'remove', 'toggle', 'set', 'to', 'from', 'if', 'then', 'else', 'end',
    'and', 'or', 'not', 'in', 'with', 'for', 'while', 'repeat', 'until', 'log',
    'call', 'send', 'trigger', 'wait', 'go', 'put', 'take', 'make', 'hide', 'show'
  ]);
  
  return keywords.has(word.toLowerCase());
}

function astToString(ast: ASTNode): string {
  // Convert AST to a searchable string representation
  const parts: string[] = [];
  
  const visitor = new ASTVisitor({
    enter(node) {
      if (node.type) parts.push(node.type);
      if ((node as any).name) parts.push((node as any).name);
      if ((node as any).value) parts.push(String((node as any).value));
      if ((node as any).event) parts.push((node as any).event);
      if ((node as any).operator) parts.push((node as any).operator);
    }
  });
  
  visit(ast, visitor);
  return parts.join(' ');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Pattern Templates
// ============================================================================

/**
 * Apply a pattern template to generate new code
 */
export function applyPatternTemplate(
  template: PatternTemplate,
  bindings: Record<string, any>
): string {
  let result = template.template;
  
  // Replace variables with bindings
  for (const [variable, value] of Object.entries(bindings)) {
    const placeholder = `$${variable}`;
    result = result.replace(new RegExp(escapeRegex(placeholder), 'g'), String(value));
  }
  
  return result;
}

/**
 * Create a pattern template from a pattern and template string
 */
export function createPatternTemplate(
  pattern: string,
  template: string,
  constraints?: PatternConstraints
): PatternTemplate {
  return {
    pattern,
    template,
    constraints
  };
}

/**
 * Find and replace patterns in an AST using templates
 */
export function transformWithPatterns(
  ast: ASTNode,
  templates: PatternTemplate[]
): ASTNode {
  // This would need to be integrated with the transformation API
  // For now, return the original AST
  return ast;
}