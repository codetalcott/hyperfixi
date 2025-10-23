# Implementation Plan: Discriminated Union Type System

**Status**: Strategic Long-Term Plan (Not Currently In Progress)
**Created**: 2025-01-22
**Last Updated**: 2025-01-23
**Current Error Count**: 491 TypeScript errors (down from 650 baseline)

## Overview

This document outlines a **strategic long-term approach** to fundamentally improve HyperFixi's type system using discriminated unions. This addresses the root cause of many TypeScript errors related to the loose `ASTNode` interface.

### Relationship to Current Work

We are currently pursuing **tactical error reduction** (fixing errors incrementally) while preserving this discriminated union approach as the long-term architectural goal. See [TYPESCRIPT_STAGED_FIX_PLAN.md](TYPESCRIPT_STAGED_FIX_PLAN.md) for the staged tactical approach.

**When to implement this plan**: After tactical fixes reduce errors to <100, or if we encounter architectural bottlenecks that require fundamental restructuring.

---

Phase 1: Type System Design (Foundation)
1.1 Create Base Node Types Hierarchy
// packages/core/src/types/ast-nodes.ts (NEW FILE)

/**
 * Base AST Node with required discriminator
 * All specific nodes extend this
 */
interface BaseASTNode {
  readonly type: string;
  readonly line?: number;
  readonly column?: number;
  readonly start?: number;
  readonly end?: number;
  readonly raw?: string;
}

/**
 * Expression Node Types (45+ types identified)
 */

// Literal types
interface LiteralNode extends BaseASTNode {
  readonly type: 'literal' | 'Literal';
  readonly value: string | number | boolean | null;
}

interface StringNode extends BaseASTNode {
  readonly type: 'string';
  readonly value: string;
}

interface NumberNode extends BaseASTNode {
  readonly type: 'number';
  readonly value: number;
}

// Identifier types
interface IdentifierNode extends BaseASTNode {
  readonly type: 'identifier' | 'Identifier';
  readonly name: string;
}

interface KeywordNode extends BaseASTNode {
  readonly type: 'keyword';
  readonly name: string;
}

// Expression types
interface BinaryExpressionNode extends BaseASTNode {
  readonly type: 'binaryExpression' | 'BinaryExpression';
  readonly operator: string;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

interface UnaryExpressionNode extends BaseASTNode {
  readonly type: 'unaryExpression' | 'UnaryExpression';
  readonly operator: string;
  readonly operand: ASTNode;
}

interface MemberExpressionNode extends BaseASTNode {
  readonly type: 'memberExpression' | 'MemberExpression';
  readonly object: ASTNode;
  readonly property: ASTNode;
  readonly computed: boolean;
}

interface CallExpressionNode extends BaseASTNode {
  readonly type: 'callExpression' | 'CallExpression';
  readonly callee: ASTNode;
  readonly arguments: ASTNode[];
}

// Property access types
interface PropertyAccessNode extends BaseASTNode {
  readonly type: 'propertyAccess';
  readonly object: ASTNode;
  readonly property: string | ASTNode;
}

interface PossessiveExpressionNode extends BaseASTNode {
  readonly type: 'possessiveExpression' | 'PossessiveExpression';
  readonly object: ASTNode;
  readonly property: ASTNode;
}

interface PropertyOfExpressionNode extends BaseASTNode {
  readonly type: 'propertyOfExpression';
  readonly property: ASTNode;
  readonly object: ASTNode;
}

// Selector types
interface SelectorNode extends BaseASTNode {
  readonly type: 'selector' | 'Selector';
  readonly value: string;
}

interface CssSelectorNode extends BaseASTNode {
  readonly type: 'cssSelector';
  readonly selector: string;
}

interface QueryReferenceNode extends BaseASTNode {
  readonly type: 'queryReference';
  readonly selector: string;
}

interface AttributeSelectorNode extends BaseASTNode {
  readonly type: 'attributeSelector';
  readonly attribute: string;
  readonly value?: string;
  readonly operator?: string;
}

// Context types
interface ContextReferenceNode extends BaseASTNode {
  readonly type: 'me' | 'it' | 'you' | 'context_var';
  readonly name?: string;
}

interface ContextPossessiveNode extends BaseASTNode {
  readonly type: 'contextPossessive';
  readonly context: 'me' | 'it' | 'you';
  readonly property: string | ASTNode;
}

// Array/Object types
interface ArrayLiteralNode extends BaseASTNode {
  readonly type: 'arrayLiteral';
  readonly elements: ASTNode[];
}

interface ArrayAccessNode extends BaseASTNode {
  readonly type: 'arrayAccess';
  readonly array: ASTNode;
  readonly index: ASTNode;
}

interface ObjectLiteralNode extends BaseASTNode {
  readonly type: 'objectLiteral';
  readonly properties: Array<{
    key: string | ASTNode;
    value: ASTNode;
  }>;
}

// Template types
interface TemplateLiteralNode extends BaseASTNode {
  readonly type: 'templateLiteral' | 'template_literal';
  readonly parts: Array<string | ASTNode>;
}

// Command types
interface CommandNode extends BaseASTNode {
  readonly type: 'command' | 'Command';
  readonly name: string;
  readonly args: ASTNode[];
  readonly modifiers?: Record<string, ASTNode>;
}

interface CommandSequenceNode extends BaseASTNode {
  readonly type: 'CommandSequence';
  readonly commands: CommandNode[];
}

// Block types
interface BlockNode extends BaseASTNode {
  readonly type: 'block';
  readonly body: ASTNode[];
}

// Event types
interface EventHandlerNode extends BaseASTNode {
  readonly type: 'eventHandler' | 'EventHandler';
  readonly event: string;
  readonly body: ASTNode;
  readonly filters?: Record<string, any>;
}

// Special types
interface AsExpressionNode extends BaseASTNode {
  readonly type: 'asExpression';
  readonly expression: ASTNode;
  readonly targetType: string;
}

interface ConditionalExpressionNode extends BaseASTNode {
  readonly type: 'conditionalExpression';
  readonly test: ASTNode;
  readonly consequent: ASTNode;
  readonly alternate?: ASTNode;
}

interface PositionalExpressionNode extends BaseASTNode {
  readonly type: 'positionalExpression';
  readonly position: 'first' | 'last' | 'next' | 'previous';
  readonly target?: ASTNode;
}

interface BracketExpressionNode extends BaseASTNode {
  readonly type: 'bracketExpression';
  readonly expression: ASTNode;
}

interface DollarExpressionNode extends BaseASTNode {
  readonly type: 'dollarExpression';
  readonly expression: ASTNode;
}

interface AttributeAccessNode extends BaseASTNode {
  readonly type: 'attributeAccess';
  readonly object: ASTNode;
  readonly attribute: string;
}

interface ClassReferenceNode extends BaseASTNode {
  readonly type: 'class_reference';
  readonly className: string;
}

interface IdSelectorNode extends BaseASTNode {
  readonly type: 'id_selector';
  readonly id: string;
}

interface ClassSelectorNode extends BaseASTNode {
  readonly type: 'class_selector';
  readonly className: string;
}

interface OperatorNode extends BaseASTNode {
  readonly type: 'operator';
  readonly operator: string;
}

interface UnknownNode extends BaseASTNode {
  readonly type: 'unknown';
  readonly value?: any;
}

interface EOFNode extends BaseASTNode {
  readonly type: 'EOF';
}

// Constructor type
interface ConstructorCallNode extends BaseASTNode {
  readonly type: 'constructorCall' | 'new';
  readonly callee: ASTNode;
  readonly arguments: ASTNode[];
}

/**
 * Discriminated Union of All Node Types
 * This is the key to proper type narrowing
 */
export type ASTNode =
  // Literals
  | LiteralNode
  | StringNode
  | NumberNode
  // Identifiers
  | IdentifierNode
  | KeywordNode
  // Expressions
  | BinaryExpressionNode
  | UnaryExpressionNode
  | MemberExpressionNode
  | CallExpressionNode
  // Properties
  | PropertyAccessNode
  | PossessiveExpressionNode
  | PropertyOfExpressionNode
  // Selectors
  | SelectorNode
  | CssSelectorNode
  | QueryReferenceNode
  | AttributeSelectorNode
  | ClassReferenceNode
  | IdSelectorNode
  | ClassSelectorNode
  // Context
  | ContextReferenceNode
  | ContextPossessiveNode
  // Collections
  | ArrayLiteralNode
  | ArrayAccessNode
  | ObjectLiteralNode
  // Templates
  | TemplateLiteralNode
  // Commands
  | CommandNode
  | CommandSequenceNode
  // Blocks
  | BlockNode
  // Events
  | EventHandlerNode
  // Special
  | AsExpressionNode
  | ConditionalExpressionNode
  | PositionalExpressionNode
  | BracketExpressionNode
  | DollarExpressionNode
  | AttributeAccessNode
  | OperatorNode
  | ConstructorCallNode
  | UnknownNode
  | EOFNode;

// Re-export for compatibility
export type { 
  LiteralNode,
  IdentifierNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  MemberExpressionNode,
  CallExpressionNode,
  PropertyAccessNode,
  PossessiveExpressionNode,
  CommandNode,
  EventHandlerNode,
  // ... all other types
};
1.2 Create Type Guard Utilities
// packages/core/src/types/ast-guards.ts (NEW FILE)

import type { ASTNode, LiteralNode, IdentifierNode, /* ... */ } from './ast-nodes';

/**
 * Type guard utilities for safe AST node type narrowing
 */

// Literal guards
export function isLiteralNode(node: ASTNode): node is LiteralNode {
  return node.type === 'literal' || node.type === 'Literal';
}

export function isStringNode(node: ASTNode): node is StringNode {
  return node.type === 'string';
}

export function isNumberNode(node: ASTNode): node is NumberNode {
  return node.type === 'number';
}

// Identifier guards
export function isIdentifierNode(node: ASTNode): node is IdentifierNode {
  return node.type === 'identifier' || node.type === 'Identifier';
}

export function isKeywordNode(node: ASTNode): node is KeywordNode {
  return node.type === 'keyword';
}

// Expression guards
export function isBinaryExpressionNode(node: ASTNode): node is BinaryExpressionNode {
  return node.type === 'binaryExpression' || node.type === 'BinaryExpression';
}

export function isUnaryExpressionNode(node: ASTNode): node is UnaryExpressionNode {
  return node.type === 'unaryExpression' || node.type === 'UnaryExpression';
}

export function isMemberExpressionNode(node: ASTNode): node is MemberExpressionNode {
  return node.type === 'memberExpression' || node.type === 'MemberExpression';
}

export function isCallExpressionNode(node: ASTNode): node is CallExpressionNode {
  return node.type === 'callExpression' || node.type === 'CallExpression';
}

// Property access guards
export function isPropertyAccessNode(node: ASTNode): node is PropertyAccessNode {
  return node.type === 'propertyAccess';
}

export function isPossessiveExpressionNode(node: ASTNode): node is PossessiveExpressionNode {
  return node.type === 'possessiveExpression' || node.type === 'PossessiveExpression';
}

export function isPropertyOfExpressionNode(node: ASTNode): node is PropertyOfExpressionNode {
  return node.type === 'propertyOfExpression';
}

// Selector guards
export function isSelectorNode(node: ASTNode): node is SelectorNode {
  return node.type === 'selector' || node.type === 'Selector';
}

export function isCssSelectorNode(node: ASTNode): node is CssSelectorNode {
  return node.type === 'cssSelector';
}

export function isQueryReferenceNode(node: ASTNode): node is QueryReferenceNode {
  return node.type === 'queryReference';
}

// Context guards
export function isContextReferenceNode(node: ASTNode): node is ContextReferenceNode {
  return ['me', 'it', 'you', 'context_var'].includes(node.type);
}

export function isContextPossessiveNode(node: ASTNode): node is ContextPossessiveNode {
  return node.type === 'contextPossessive';
}

// Command guards
export function isCommandNode(node: ASTNode): node is CommandNode {
  return node.type === 'command' || node.type === 'Command';
}

export function isCommandSequenceNode(node: ASTNode): node is CommandSequenceNode {
  return node.type === 'CommandSequence';
}

// Collection guards
export function isArrayLiteralNode(node: ASTNode): node is ArrayLiteralNode {
  return node.type === 'arrayLiteral';
}

export function isObjectLiteralNode(node: ASTNode): node is ObjectLiteralNode {
  return node.type === 'objectLiteral';
}

// Template guards
export function isTemplateLiteralNode(node: ASTNode): node is TemplateLiteralNode {
  return node.type === 'templateLiteral' || node.type === 'template_literal';
}

// Special guards
export function isAsExpressionNode(node: ASTNode): node is AsExpressionNode {
  return node.type === 'asExpression';
}

export function isConditionalExpressionNode(node: ASTNode): node is ConditionalExpressionNode {
  return node.type === 'conditionalExpression';
}

// Helper: check if node has specific properties
export function hasProperty<K extends keyof any>(
  node: ASTNode,
  prop: K
): node is ASTNode & Record<K, unknown> {
  return prop in node;
}

// Helper: safe property access
export function getNodeProperty<T = unknown>(
  node: ASTNode,
  prop: string,
  defaultValue?: T
): T | undefined {
  if (hasProperty(node, prop)) {
    return (node as any)[prop] as T;
  }
  return defaultValue;
}
Phase 2: Migration Strategy
2.1 Gradual Migration Path
Step 1: Add New Types Alongside Old
Keep existing ASTNode interface temporarily
Add new discriminated union as StrictASTNode
Create type alias: type ASTNodeLegacy = ASTNode
Step 2: Update High-Impact Files First
Start with runtime.ts (80 errors)
Replace as any with proper type guards
Use helper functions for safe property access
Step 3: Update Parsers
Ensure parser creates nodes matching discriminated union
Add validation that node types are correct
Step 4: Update Expression System
Align expression evaluation with new types
Remove legacy type checking code
Step 5: Final Cutover
Remove old ASTNode interface
Rename StrictASTNode to ASTNode
Clean up temporary compatibility code
2.2 Runtime.ts Migration Example
Before:
// Current code with 77 `as any` assertions
if (arg.type === 'identifier' && (arg as any).name === 'to') {
  toIndex = i;
}
After:
// Using type guards
import { isIdentifierNode, getNodeProperty } from '../types/ast-guards';

if (isIdentifierNode(arg) && arg.name === 'to') {
  toIndex = i;
}
Phase 3: Validation & Testing
3.1 Type-Level Tests
// packages/core/src/types/__tests__/ast-guards.test.ts

import { describe, it, expect } from 'vitest';
import { isIdentifierNode, isMemberExpressionNode } from '../ast-guards';

describe('AST Type Guards', () => {
  it('should correctly identify identifier nodes', () => {
    const node = { type: 'identifier', name: 'foo' };
    expect(isIdentifierNode(node)).toBe(true);
    
    if (isIdentifierNode(node)) {
      // TypeScript should know node.name exists
      expect(node.name).toBe('foo');
    }
  });

  it('should correctly identify member expressions', () => {
    const node = {
      type: 'memberExpression',
      object: { type: 'identifier', name: 'obj' },
      property: { type: 'identifier', name: 'prop' },
      computed: false
    };
    
    expect(isMemberExpressionNode(node)).toBe(true);
    
    if (isMemberExpressionNode(node)) {
      expect(node.object).toBeDefined();
      expect(node.property).toBeDefined();
    }
  });
});
3.2 Runtime Tests
// Ensure existing tests still pass
npm test
npm run test:browser
Phase 4: Benefits & Metrics
Expected Improvements:
Type Safety: ~80 errors in runtime.ts → 0-10 errors
Code Quality: Remove 77 as any assertions
Developer Experience: IntelliSense shows correct properties
Maintainability: Clear contracts for all node types
Refactoring: Safe automated refactoring with TypeScript
Success Metrics:
Total errors: 650 → <100
runtime.ts errors: 80 → <10
parser.ts errors: 22 → <5
as any count: 77 → <10
Test coverage: Maintain 100% pass rate
Phase 5: Timeline & Effort
Week 1: Foundation
Days 1-2: Create ast-nodes.ts and ast-guards.ts
Days 3-4: Write comprehensive tests for type guards
Day 5: Update export structure, ensure builds pass
Week 2: Migration
Days 1-2: Migrate runtime.ts to use type guards
Days 3-4: Migrate parser.ts and expression-parser.ts
Day 5: Review and test integration
Total Effort: ~10-12 days for complete implementation
Risks & Mitigation
Risk 1: Breaking Changes
Mitigation: Gradual migration with compatibility layer
Keep legacy exports until all consumers updated
Risk 2: Missing Node Types
Mitigation: Add UnknownNode type for edge cases
Log warnings when unknown types encountered
Risk 3: Performance Impact
Mitigation: Type guards are simple type checks (zero runtime cost)
Bundle size stays same (types compile away)
Risk 4: Team Coordination
Mitigation: Document migration guide
Pair programming for critical files