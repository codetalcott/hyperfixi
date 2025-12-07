# Phase 9-1 Day 2: Module Boundary Design

**Date**: 2025-11-23
**Status**: 🔄 In Progress
**Goal**: Design clean interfaces and module boundaries for parser modularization

---

## Executive Summary

This document defines the TypeScript interfaces, module structure, and state management strategy for the modularized parser. The design ensures clean separation of concerns while maintaining backward compatibility.

---

## 1. Core Design Principles

### Principle 1: Separation of Concerns
- **Parser orchestration** (main parser.ts) separate from **command parsing logic** (command modules)
- **Shared utilities** (helpers/) independent of specific command implementations
- **State management** centralized in ParserContext

### Principle 2: Backward Compatibility
- Existing `parse()` function signature unchanged
- All commands continue to return CommandNode
- Zero breaking changes for external consumers

### Principle 3: Stateless Command Parsers
- Command parsers receive context, don't modify parser state directly
- State changes flow through ParserContext interface
- Easy to test in isolation

### Principle 4: Type Safety
- All interfaces strictly typed
- Generic types for flexibility
- No `any` types in public APIs

---

## 2. TypeScript Interfaces

### 2.1 ParserContext Interface

**Purpose**: Shared context passed to all command parsers

```typescript
/**
 * ParserContext - Shared state and utilities for command parsers
 *
 * This interface provides command parsers with access to:
 * - Token stream navigation
 * - AST node creation
 * - Error reporting
 * - Position tracking
 */
export interface ParserContext {
  // Token Stream Access
  tokens: Token[];
  current: number;

  // Token Navigation
  advance(): Token;
  peek(): Token;
  previous(): Token;
  consume(expected: string | TokenType, message: string): Token;
  check(value: string): boolean;
  checkTokenType(type: TokenType): boolean;
  match(...types: Array<string | TokenType>): boolean;
  matchTokenType(type: TokenType): boolean;
  matchOperator(operator: string): boolean;
  isAtEnd(): boolean;

  // AST Node Creation
  createIdentifier(name: string): IdentifierNode;
  createLiteral(value: unknown, raw: string): LiteralNode;
  createSelector(value: string): SelectorNode;
  createBinaryExpression(left: ASTNode, operator: string, right: ASTNode): BinaryExpressionNode;
  createUnaryExpression(operator: string, operand: ASTNode): UnaryExpressionNode;
  createMemberExpression(object: ASTNode, property: ASTNode, computed: boolean): MemberExpressionNode;
  createPossessiveExpression(object: ASTNode, property: ASTNode): PossessiveExpressionNode;
  createCallExpression(callee: ASTNode, args: ASTNode[]): CallExpressionNode;
  createErrorNode(): ErrorNode;

  // Expression Parsing
  parseExpression(): ASTNode;
  parsePrimary(): ASTNode;
  parseCall(): ASTNode;
  parseLogicalOr(): ASTNode;
  parseLogicalAnd(): ASTNode;
  parseEquality(): ASTNode;
  parseComparison(): ASTNode;
  parseAddition(): ASTNode;
  parseMultiplication(): ASTNode;

  // Command-Specific Parsing
  parseCommandSequence(): ASTNode;
  parseCommandListUntilEnd(): ASTNode[];

  // Position Tracking
  getPosition(): { start: number; end: number; line: number; column: number };

  // Error Handling
  addError(message: string): void;
  addWarning(warning: string): void;

  // Utility Functions
  isCommand(name: string): boolean;
  isCompoundCommand(name: string): boolean;
  isKeyword(name: string): boolean;
  getMultiWordPattern(commandName: string): MultiWordPattern | null;
}
```

### 2.2 CommandParserFunction Type

**Purpose**: Standard signature for command parser functions

```typescript
/**
 * CommandParserFunction - Standard signature for command parsers
 *
 * @param token - The command token that triggered this parser
 * @param context - Shared parser context
 * @returns Parsed command node
 */
export type CommandParserFunction = (
  token: Token,
  context: ParserContext
) => CommandNode;

/**
 * Alternative signature for compound commands (using IdentifierNode)
 */
export type CompoundCommandParserFunction = (
  identifierNode: IdentifierNode,
  context: ParserContext
) => CommandNode | null;
```

### 2.3 HelperFunction Types

**Purpose**: Type definitions for helper utilities

```typescript
/**
 * Token navigation helper
 */
export type TokenNavigationFunction = (context: ParserContext) => Token | boolean;

/**
 * AST node creator helper
 */
export type ASTNodeCreatorFunction = (...args: any[]) => ASTNode;

/**
 * Expression parser helper
 */
export type ExpressionParserFunction = (context: ParserContext) => ASTNode;
```

### 2.4 MultiWordPattern Interface

**Purpose**: Pattern definition for multi-word commands

```typescript
/**
 * MultiWordPattern - Defines structure of multi-word commands
 *
 * Example: "fetch URL as json" has keywords ["as"]
 */
export interface MultiWordPattern {
  /**
   * Command name (e.g., "fetch")
   */
  command: string;

  /**
   * Keywords that can appear as modifiers (e.g., ["as", "with"])
   */
  keywords: string[];

  /**
   * Optional: Minimum number of arguments required
   */
  minArgs?: number;

  /**
   * Optional: Maximum number of arguments allowed
   */
  maxArgs?: number;
}
```

---

## 3. Module Structure Design

### 3.1 Helper Modules

#### helpers/token-helpers.ts

**Responsibility**: Token stream navigation and manipulation

**Exports**:
```typescript
/**
 * Token navigation utilities
 */
export function advance(context: ParserContext): Token;
export function peek(context: ParserContext): Token;
export function previous(context: ParserContext): Token;
export function consume(
  context: ParserContext,
  expected: string | TokenType,
  message: string
): Token;
export function check(context: ParserContext, value: string): boolean;
export function checkTokenType(context: ParserContext, type: TokenType): boolean;
export function match(context: ParserContext, ...types: Array<string | TokenType>): boolean;
export function matchTokenType(context: ParserContext, type: TokenType): boolean;
export function matchOperator(context: ParserContext, operator: string): boolean;
export function isAtEnd(context: ParserContext): boolean;
```

**Size Estimate**: ~250 lines
**Dependencies**: TokenType enum, Token interface

#### helpers/ast-helpers.ts

**Responsibility**: AST node creation

**Exports**:
```typescript
/**
 * AST node creation utilities
 */
export function createIdentifier(name: string, position?: Position): IdentifierNode;
export function createLiteral(value: unknown, raw: string, position?: Position): LiteralNode;
export function createSelector(value: string, position?: Position): SelectorNode;
export function createBinaryExpression(
  left: ASTNode,
  operator: string,
  right: ASTNode,
  position?: Position
): BinaryExpressionNode;
export function createUnaryExpression(
  operator: string,
  operand: ASTNode,
  position?: Position
): UnaryExpressionNode;
export function createMemberExpression(
  object: ASTNode,
  property: ASTNode,
  computed: boolean,
  position?: Position
): MemberExpressionNode;
export function createPossessiveExpression(
  object: ASTNode,
  property: ASTNode,
  position?: Position
): PossessiveExpressionNode;
export function createCallExpression(
  callee: ASTNode,
  args: ASTNode[],
  position?: Position
): CallExpressionNode;
export function createErrorNode(position?: Position): ErrorNode;
export function createProgramNode(statements: ASTNode[], position?: Position): ProgramNode;
```

**Size Estimate**: ~200 lines
**Dependencies**: AST type definitions

#### helpers/parsing-helpers.ts

**Responsibility**: Common parsing patterns and utilities

**Exports**:
```typescript
/**
 * Parsing utility functions
 */
export function getPosition(context: ParserContext): Position;
export function getMultiWordPattern(commandName: string): MultiWordPattern | null;
export function isCommand(name: string): boolean;
export function isCompoundCommand(name: string): boolean;
export function isKeyword(name: string): boolean;
export function isKeyword(token: Token, keywords: string[]): boolean;

/**
 * Expression parsing helpers
 * Note: These delegate to the expression parser, don't duplicate logic
 */
export function parseExpression(context: ParserContext): ASTNode;
export function parsePrimary(context: ParserContext): ASTNode;
export function parseCall(context: ParserContext): ASTNode;

/**
 * Command sequence parsing
 */
export function parseCommandSequence(context: ParserContext): ASTNode;
export function parseCommandListUntilEnd(context: ParserContext): ASTNode[];
```

**Size Estimate**: ~300 lines
**Dependencies**: CommandClassification, expression-parser

---

### 3.2 Command Modules

#### General Structure

Each command module follows this pattern:

```typescript
/**
 * {Category} Commands Module
 *
 * Parsers for {category} commands: {list of commands}
 */

import type { ParserContext, CommandParserFunction } from '../types';
import type { Token, IdentifierNode, CommandNode } from '../../types/ast';

/**
 * Parse {command1} command
 *
 * Syntax: {command1} {syntax pattern}
 * Example: {example usage}
 */
export function parse{Command1}(token: Token, context: ParserContext): CommandNode {
  // Implementation
}

/**
 * Parse {command2} command
 * ...
 */
export function parse{Command2}(token: Token, context: ParserContext): CommandNode {
  // Implementation
}

// ... more parsers
```

#### command-parsers/dom-commands.ts

**Responsibility**: DOM manipulation commands

**Commands**: put, add, remove, toggle, hide, show, make (7 commands)

**Exports**:
```typescript
export function parsePutCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseAddCommand(token: Token, context: ParserContext): CommandNode;
export function parseRemoveCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseToggleCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseHideCommand(token: Token, context: ParserContext): CommandNode;
export function parseShowCommand(token: Token, context: ParserContext): CommandNode;
export function parseMakeCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~700 lines

#### command-parsers/control-flow-commands.ts

**Responsibility**: Control flow and loop commands

**Commands**: if, unless, repeat, break, continue, halt, return, exit, throw (9 commands)

**Exports**:
```typescript
export function parseIfCommand(token: Token, context: ParserContext): CommandNode;
export function parseUnlessCommand(token: Token, context: ParserContext): CommandNode;
export function parseRepeatCommand(token: Token, context: ParserContext): CommandNode;
export function parseBreakCommand(token: Token, context: ParserContext): CommandNode;
export function parseContinueCommand(token: Token, context: ParserContext): CommandNode;
export function parseHaltCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseReturnCommand(token: Token, context: ParserContext): CommandNode;
export function parseExitCommand(token: Token, context: ParserContext): CommandNode;
export function parseThrowCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~800 lines

#### command-parsers/data-commands.ts

**Responsibility**: Data manipulation and variable commands

**Commands**: set, increment, decrement, bind, persist, default (6 commands)

**Exports**:
```typescript
export function parseSetCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseIncrementCommand(token: Token, context: ParserContext): CommandNode;
export function parseDecrementCommand(token: Token, context: ParserContext): CommandNode;
export function parseBindCommand(token: Token, context: ParserContext): CommandNode;
export function parsePersistCommand(token: Token, context: ParserContext): CommandNode;
export function parseDefaultCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~600 lines

#### command-parsers/event-commands.ts

**Responsibility**: Event handling commands

**Commands**: send, trigger (2 commands)

**Exports**:
```typescript
export function parseSendCommand(token: Token, context: ParserContext): CommandNode;
export function parseTriggerCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
```

**Size Estimate**: ~350 lines

#### command-parsers/async-commands.ts

**Responsibility**: Asynchronous operation commands

**Commands**: wait, fetch (2 commands)

**Exports**:
```typescript
export function parseWaitCommand(token: Token, context: ParserContext): CommandNode;
export function parseFetchCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~400 lines

#### command-parsers/animation-commands.ts

**Responsibility**: Animation and transition commands

**Commands**: transition, measure, settle, take (4 commands)

**Exports**:
```typescript
export function parseTransitionCommand(token: Token, context: ParserContext): CommandNode;
export function parseMeasureCommand(identifierNode: IdentifierNode, context: ParserContext): CommandNode | null;
export function parseSettleCommand(token: Token, context: ParserContext): CommandNode;
export function parseTakeCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~500 lines

#### command-parsers/execution-commands.ts

**Responsibility**: Function execution commands

**Commands**: call, async, js, pseudo-command (4 commands)

**Exports**:
```typescript
export function parseCallCommand(token: Token, context: ParserContext): CommandNode;
export function parseAsyncCommand(token: Token, context: ParserContext): CommandNode;
export function parseJsCommand(token: Token, context: ParserContext): CommandNode;
export function parsePseudoCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~400 lines

#### command-parsers/utility-commands.ts

**Responsibility**: Utility and helper commands

**Commands**: log, tell, copy, pick, beep (5 commands)

**Exports**:
```typescript
export function parseLogCommand(token: Token, context: ParserContext): CommandNode;
export function parseTellCommand(token: Token, context: ParserContext): CommandNode;
export function parseCopyCommand(token: Token, context: ParserContext): CommandNode;
export function parsePickCommand(token: Token, context: ParserContext): CommandNode;
export function parseBeepCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~400 lines

#### command-parsers/template-commands.ts

**Responsibility**: Template rendering commands

**Commands**: render (1 command)

**Exports**:
```typescript
export function parseRenderCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~400 lines

#### command-parsers/behavior-commands.ts

**Responsibility**: Behavior installation commands

**Commands**: install (1 command)

**Exports**:
```typescript
export function parseInstallCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~200 lines

#### command-parsers/navigation-commands.ts

**Responsibility**: Navigation commands

**Commands**: go (1 command)

**Exports**:
```typescript
export function parseGoCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~200 lines

#### command-parsers/content-commands.ts

**Responsibility**: Content manipulation commands

**Commands**: append (1 command)

**Exports**:
```typescript
export function parseAppendCommand(token: Token, context: ParserContext): CommandNode;
```

**Size Estimate**: ~200 lines

#### command-parsers/index.ts (Barrel Export)

**Purpose**: Centralized export point for all command parsers

```typescript
/**
 * Command Parsers - Barrel Export
 *
 * Provides centralized access to all command parser functions
 */

// DOM Commands
export * from './dom-commands';

// Control Flow Commands
export * from './control-flow-commands';

// Data Commands
export * from './data-commands';

// Event Commands
export * from './event-commands';

// Async Commands
export * from './async-commands';

// Animation Commands
export * from './animation-commands';

// Execution Commands
export * from './execution-commands';

// Utility Commands
export * from './utility-commands';

// Template Commands
export * from './template-commands';

// Behavior Commands
export * from './behavior-commands';

// Navigation Commands
export * from './navigation-commands';

// Content Commands
export * from './content-commands';
```

---

## 4. State Management Strategy

### 4.1 Parser State (Main parser.ts)

**Mutable State** (stays in main parser):
```typescript
class Parser {
  private tokens: Token[];
  private current: number = 0;
  private errors: ParseError[] = [];
  private warnings: string[] = [];

  // ... other state
}
```

**Rationale**: The parser owns the token stream and error collection

### 4.2 ParserContext Creation

**Strategy**: Create context object that provides controlled access to parser state

```typescript
class Parser {
  /**
   * Create ParserContext for command parsers
   *
   * This method creates a context object that command parsers can use
   * without direct access to Parser private state
   */
  private createContext(): ParserContext {
    return {
      // Provide access to tokens (read-only from command perspective)
      tokens: this.tokens,
      current: this.current,

      // Bind token navigation methods to maintain 'this' context
      advance: () => this.advance(),
      peek: () => this.peek(),
      previous: () => this.previous(),
      consume: (expected, message) => this.consume(expected, message),
      check: (value) => this.check(value),
      checkTokenType: (type) => this.checkTokenType(type),
      match: (...types) => this.match(...types),
      matchTokenType: (type) => this.matchTokenType(type),
      matchOperator: (op) => this.matchOperator(op),
      isAtEnd: () => this.isAtEnd(),

      // AST node creation
      createIdentifier: (name) => this.createIdentifier(name),
      createLiteral: (value, raw) => this.createLiteral(value, raw),
      // ... other creators

      // Expression parsing
      parseExpression: () => this.parseExpression(),
      parsePrimary: () => this.parsePrimary(),
      // ... other parsers

      // Position tracking
      getPosition: () => this.getPosition(),

      // Error handling
      addError: (message) => this.addError(message),
      addWarning: (warning) => this.addWarning(warning),

      // Utilities
      isCommand: (name) => this.isCommand(name),
      isCompoundCommand: (name) => this.isCompoundCommand(name),
      isKeyword: (name) => this.isKeyword(name),
      getMultiWordPattern: (name) => this.getMultiWordPattern(name),
    };
  }
}
```

### 4.3 State Mutation Flow

**Flow**:
1. Main parser creates ParserContext
2. Parser calls command parser with context
3. Command parser uses context methods
4. Context methods modify parser state
5. Command parser returns CommandNode
6. Main parser continues

**Example**:
```typescript
// In main parser.ts
private parseCommand(): CommandNode {
  const commandToken = this.previous();
  const context = this.createContext();

  // Delegate to command-specific parser
  if (commandToken.value === 'put') {
    const identifierNode = this.createIdentifier(commandToken.value);
    return parsePutCommand(identifierNode, context);
  }

  // ... other commands
}

// In command-parsers/dom-commands.ts
export function parsePutCommand(
  identifierNode: IdentifierNode,
  context: ParserContext
): CommandNode | null {
  // Use context to navigate tokens
  const target = context.parseExpression();

  // Check for 'into' keyword
  if (!context.check('into')) {
    context.addError("Expected 'into' in put command");
    return context.createErrorNode();
  }
  context.advance(); // consume 'into'

  const destination = context.parseExpression();

  // Return command node
  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(target, destination)
    .endingAt(context.getPosition())
    .build();
}
```

---

## 5. Dependency Management

### 5.1 Module Dependencies

**Dependency Hierarchy** (top-to-bottom):
```
parser.ts (main orchestrator)
  ├── command-parsers/ (category modules)
  │   └── helpers/ (shared utilities)
  │       └── types/ (type definitions)
  ├── expression-parser.ts (expression parsing)
  ├── tokenizer.ts (token generation)
  └── parser-constants.ts (constants)
```

**Rules**:
- **No circular dependencies**: Command parsers depend on helpers, not vice versa
- **Helpers are stateless**: All state flows through ParserContext
- **Command parsers are independent**: No cross-references between command modules

### 5.2 Import Patterns

**Helper Modules**:
```typescript
// helpers/token-helpers.ts
import type { ParserContext } from '../types';
import type { Token, TokenType } from '../../types/ast';

// No imports from command-parsers/
// No imports from parser.ts
```

**Command Modules**:
```typescript
// command-parsers/dom-commands.ts
import type { ParserContext } from '../types';
import type { Token, IdentifierNode, CommandNode } from '../../types/ast';
import { CommandNodeBuilder } from '../command-node-builder';

// No imports from other command modules
// No imports from parser.ts directly
```

**Main Parser**:
```typescript
// parser.ts
import { parsePutCommand, parseAddCommand, ... } from './command-parsers';
import { advance, peek, consume, ... } from './helpers/token-helpers';
import { createIdentifier, createLiteral, ... } from './helpers/ast-helpers';
import { parseExpression, parsePrimary, ... } from './expression-parser';
```

---

## 6. Backward Compatibility

### 6.1 Public API (Unchanged)

```typescript
/**
 * Parse hyperscript code into AST
 *
 * @param input - Hyperscript source code
 * @returns Parse result with AST or errors
 */
export function parse(input: string): ParseResult {
  const parser = new Parser(input);
  return parser.parse();
}
```

**Guarantee**: This signature remains unchanged after modularization

### 6.2 Re-exports (For Internal Use)

```typescript
// parser.ts
// Re-export command parsers for backward compatibility (if needed)
export { parsePutCommand } from './command-parsers/dom-commands';
// ... other parsers if externally used
```

**Strategy**: Only re-export if external code depends on specific parsers

---

## 7. Module Responsibilities Matrix

| Module | Responsibilities | Dependencies | Size |
|--------|-----------------|--------------|------|
| **parser.ts** | Main orchestration, command routing, context creation | All modules | ~1,000 lines |
| **helpers/token-helpers.ts** | Token navigation, stream management | TokenType, Token | ~250 lines |
| **helpers/ast-helpers.ts** | AST node creation | AST types | ~200 lines |
| **helpers/parsing-helpers.ts** | Common patterns, utilities | CommandClassification | ~300 lines |
| **command-parsers/dom-commands.ts** | DOM command parsing | helpers, types | ~700 lines |
| **command-parsers/control-flow-commands.ts** | Control flow parsing | helpers, types | ~800 lines |
| **command-parsers/data-commands.ts** | Data command parsing | helpers, types | ~600 lines |
| **command-parsers/event-commands.ts** | Event command parsing | helpers, types | ~350 lines |
| **command-parsers/async-commands.ts** | Async command parsing | helpers, types | ~400 lines |
| **command-parsers/animation-commands.ts** | Animation parsing | helpers, types | ~500 lines |
| **command-parsers/execution-commands.ts** | Execution parsing | helpers, types | ~400 lines |
| **command-parsers/utility-commands.ts** | Utility parsing | helpers, types | ~400 lines |
| **command-parsers/template-commands.ts** | Template parsing | helpers, types | ~400 lines |
| **command-parsers/behavior-commands.ts** | Behavior parsing | helpers, types | ~200 lines |
| **command-parsers/navigation-commands.ts** | Navigation parsing | helpers, types | ~200 lines |
| **command-parsers/content-commands.ts** | Content parsing | helpers, types | ~200 lines |

**Total**: ~6,900 lines (vs 4,698 lines before, includes new structure overhead)

---

## 8. Testing Strategy

### 8.1 Unit Testing

**Helper Modules**:
```typescript
// helpers/__tests__/token-helpers.test.ts
describe('Token Helpers', () => {
  it('should advance token cursor', () => {
    const context = createMockContext();
    const token = advance(context);
    expect(token).toBe(context.tokens[1]);
  });

  // ... more tests
});
```

**Command Modules**:
```typescript
// command-parsers/__tests__/dom-commands.test.ts
describe('DOM Commands', () => {
  it('should parse put command', () => {
    const context = createMockContext();
    const result = parsePutCommand(identifierNode, context);
    expect(result.name).toBe('put');
  });

  // ... more tests
});
```

### 8.2 Integration Testing

**Main Parser**:
```typescript
// parser.test.ts
describe('Parser (Modular)', () => {
  it('should parse put command end-to-end', () => {
    const result = parse('put "Hello" into #output');
    expect(result.success).toBe(true);
    expect(result.node.type).toBe('program');
  });

  // ... more tests
});
```

---

## 9. Migration Path

### 9.1 Extraction Order

**Phase 9-2**: Helper Extraction
1. Extract token-helpers.ts
2. Extract ast-helpers.ts
3. Extract parsing-helpers.ts
4. Update parser.ts to use helpers
5. Test: All tests passing

**Phase 9-3**: Command Extraction (Priority Order)
1. DOM commands (most refactored, easiest)
2. Event commands (small, simple)
3. Async commands (small, simple)
4. Control flow commands (complex, high value)
5. Data commands (complex, critical)
6. Remaining 7 modules (decreasing priority)

### 9.2 Validation Checkpoints

**After Each Module**:
- ✅ TypeScript compiles (npx tsc --noEmit)
- ✅ All parser tests pass
- ✅ Bundle builds successfully
- ✅ Bundle size unchanged (±5%)

---

## 10. Next Steps (Day 3)

### Test Infrastructure Tasks

1. **Review existing parser tests**
   - Identify test coverage gaps
   - Plan new tests for modules

2. **Create test strategy document**
   - Unit test approach
   - Integration test approach
   - Mock context creation

3. **Capture baseline test results**
   - Run all parser tests
   - Document passing/failing counts
   - Establish regression baseline

---

## Conclusion

**Day 2 Status**: ✅ Module boundaries designed, interfaces defined, state management planned

**Key Decisions**:
1. ✅ **ParserContext interface** provides clean abstraction
2. ✅ **Stateless command parsers** enable easy testing
3. ✅ **Category-based modules** align with domain logic
4. ✅ **Helper extraction first** establishes foundation
5. ✅ **Backward compatible** public API maintained

**Ready for Implementation**: Module design complete, ready for Day 3 test planning or Phase 9-2 extraction

---

**Phase 9-1 Day 2 Status**: 🔄 In Progress → ✅ COMPLETE (upon approval)
**Next**: Day 3 - Test Infrastructure Planning
**Updated**: 2025-11-23
