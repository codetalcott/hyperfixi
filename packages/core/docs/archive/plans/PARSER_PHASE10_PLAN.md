# Parser Phase 10: File Organization Plan

## Goal
Reduce parser.ts from 2,985 lines to ~1,000 lines by extracting cohesive method groups into focused modules.

## Current Status (After Phase 9-3b)
- **parser.ts**: 2,985 lines
- **Reduction from original**: 1,713 lines (36.5%)
- **Command parsers**: 17 extracted to 7 modules
- **Dead code removed**: 236 lines

## Phase 10 Target
- **parser.ts target**: ~800-1,200 lines (core orchestration only)
- **Total extraction**: ~1,800-2,200 lines
- **New modules**: 4-5 focused modules
- **Test baseline**: Maintain 70/80 passing (zero regressions)

---

## Method Categorization Analysis

### 1. Expression Parsing Methods (15 methods, ~800-1000 lines)
**Target Module**: `src/parser/expression-parsers.ts`

**Methods to Extract**:
- `parseExpression()` - Entry point for expression parsing
- `parseAssignment()` - Assignment expressions
- `parseLogicalOr()` - Logical OR operations
- `parseLogicalAnd()` - Logical AND operations
- `parseEquality()` - Equality comparisons (==, !=)
- `parseComparison()` - Comparison operations (<, >, <=, >=)
- `parseAddition()` - Addition and subtraction
- `parseMultiplication()` - Multiplication, division, modulo
- `parseUnary()` - Unary operations (not, -)
- `parseImplicitBinary()` - Implicit binary operations
- `parseCall()` - Function/method calls
- `parsePrimary()` - Primary expressions (literals, identifiers, etc.)
- `parseDollarExpression()` - $variable expressions
- `parseMyPropertyAccess()` - 'my' property access
- `parseNavigationFunction()` - Navigation functions (first, last, closest)

**Dependencies**:
- Token navigation methods (check, advance, peek, etc.)
- Node creation methods (createXXX)
- Helper methods (parseHyperscriptSelector, parseObjectLiteral, etc.)

**Estimated Size**: 800-1,000 lines

---

### 2. Node Creation Methods (10 methods, ~100-150 lines)
**Target Module**: `src/parser/node-creators.ts`

**Methods to Extract**:
- `createLiteral()` - Create literal nodes
- `createIdentifier()` - Create identifier nodes
- `createBinaryExpression()` - Create binary expression nodes
- `createUnaryExpression()` - Create unary expression nodes
- `createCallExpression()` - Create call expression nodes
- `createMemberExpression()` - Create member expression nodes
- `createSelector()` - Create selector nodes
- `createPossessiveExpression()` - Create possessive expression nodes
- `createErrorNode()` - Create error nodes
- `createProgramNode()` - Create program nodes

**Dependencies**:
- Token types
- AST node types
- getPosition() method

**Estimated Size**: 100-150 lines

---

### 3. Token Navigation Methods (10 methods, ~100-150 lines)
**Target Module**: `src/parser/token-navigation.ts`

**Methods to Extract**:
- `match()` - Match one of multiple token values
- `matchOperator()` - Match operator token
- `matchTokenType()` - Match token type
- `check()` - Check token value without consuming
- `checkTokenType()` - Check token type without consuming
- `advance()` - Move to next token
- `isAtEnd()` - Check if at end of tokens
- `peek()` - Look at current token
- `previous()` - Look at previous token
- `consume()` - Match and consume token with error

**Dependencies**:
- Token array
- Current position
- addError() method

**Estimated Size**: 100-150 lines

---

### 4. Parsing Helper Methods (8 methods, ~400-600 lines)
**Target Module**: `src/parser/parsing-helpers-extended.ts` (or add to existing)

**Methods to Extract**:
- `parseHyperscriptSelector()` - Parse hyperscript selectors (<button/>)
- `parseObjectLiteral()` - Parse object literals
- `parseCSSObjectLiteral()` - Parse CSS-style object literals
- `parseConstructorCall()` - Parse constructor calls (new X())
- `parseEventHandler()` - Parse event handler definitions (on X)
- `parseBehaviorDefinition()` - Parse behavior definitions (behavior X)
- `parseAttributeOrArrayLiteral()` - Parse @attr or [array]
- `finishCall()` - Finish parsing function call

**Dependencies**:
- Expression parsing methods
- Token navigation methods
- Node creation methods

**Estimated Size**: 400-600 lines

---

### 5. Command Orchestration (Remaining in parser.ts)

**Methods to Keep in parser.ts** (~800-1,200 lines):
- `constructor()` - Class initialization
- `parse()` - Entry point
- `parseCommand()` - Command parsing orchestration
- `parseCommandSequence()` - Sequence parsing
- `parseCommandListUntilEnd()` - Command list parsing
- `parseConditional()` - Conditional expressions
- `parseConditionalBranch()` - Conditional branch parsing
- `getContext()` - ParserContext creation
- `addError()` - Error handling
- `addWarning()` - Warning handling
- `getPosition()` - Position tracking
- `isCommand()` - Command checking
- `isKeyword()` - Keyword checking
- `isCompoundCommand()` - Compound command checking
- `createCommandFromIdentifier()` - Command creation
- `getMultiWordPattern()` - Pattern lookup
- All command delegation stubs (already extracted)

**Estimated Size**: 800-1,200 lines

---

## Extraction Order and Batches

### **Batch 1: Node Creators** (Easiest, no circular dependencies)
**Target**: Extract to `node-creators.ts`
- Least dependencies
- Pure factory functions
- ~100-150 lines
- **Risk**: Low

### **Batch 2: Token Navigation** (Simple, foundational)
**Target**: Extract to `token-navigation.ts`
- Needs access to tokens array and current position
- May need to pass as parameters or use class composition
- ~100-150 lines
- **Risk**: Low-Medium

### **Batch 3: Parsing Helpers** (Medium complexity)
**Target**: Extract to `parsing-helpers-extended.ts`
- Depends on expression parsers and token navigation
- ~400-600 lines
- **Risk**: Medium

### **Batch 4: Expression Parsers** (Complex, many dependencies)
**Target**: Extract to `expression-parsers.ts`
- Depends on token navigation, node creators, and parsing helpers
- Largest extraction
- ~800-1,000 lines
- **Risk**: Medium-High

---

## Technical Approach

### Option A: Keep as Class (Composition Pattern)
```typescript
// parser.ts
export class Parser {
  private nodeCreators: NodeCreators;
  private tokenNav: TokenNavigation;
  private expressionParsers: ExpressionParsers;

  constructor(tokens: Token[]) {
    this.nodeCreators = new NodeCreators();
    this.tokenNav = new TokenNavigation(tokens);
    this.expressionParsers = new ExpressionParsers(this.tokenNav, this.nodeCreators);
  }
}
```

**Pros**:
- Maintains object-oriented structure
- Easy to pass state between components
- Minimal API changes

**Cons**:
- More boilerplate
- Still using classes (not as functional as Phase 9-3b)

### Option B: Pure Function Modules (Recommended)
```typescript
// expression-parsers.ts
export function parseExpression(ctx: ParserContext): ASTNode { ... }
export function parsePrimary(ctx: ParserContext): ASTNode { ... }

// parser.ts
import * as expressionParsers from './expression-parsers';

export class Parser {
  private parseExpression(): ASTNode {
    return expressionParsers.parseExpression(this.getContext());
  }
}
```

**Pros**:
- Consistent with Phase 9-3b command extraction pattern
- More testable
- Better tree-shaking
- Simpler dependency management via ParserContext

**Cons**:
- Requires expanding ParserContext interface
- More delegation methods

**Recommendation**: Use Option B (Pure Function Modules) for consistency with Phase 9-3b.

---

## ParserContext Expansion Required

Current ParserContext provides ~50 methods. Phase 10 will need to add:

**Node Creation Methods** (~10 methods):
```typescript
interface ParserContext {
  // ... existing methods ...

  // Node creators
  createLiteral(value: unknown, raw: string): LiteralNode;
  createIdentifier(name: string, pos?: Position): IdentifierNode;
  createBinaryExpression(...): BinaryExpressionNode;
  createUnaryExpression(...): UnaryExpressionNode;
  createCallExpression(...): CallExpressionNode;
  createMemberExpression(...): MemberExpressionNode;
  createSelector(value: string): SelectorNode;
  createPossessiveExpression(...): PossessiveExpressionNode;
  createErrorNode(): IdentifierNode;
  createProgramNode(statements: ASTNode[]): ASTNode;
}
```

**Parsing Helper Methods** (~8 methods):
```typescript
interface ParserContext {
  // ... existing methods ...

  // Parsing helpers
  parseHyperscriptSelector(): SelectorNode;
  parseObjectLiteral(): ASTNode;
  parseCSSObjectLiteral(): ASTNode;
  parseConstructorCall(): ASTNode;
  parseEventHandler(): EventHandlerNode;
  parseBehaviorDefinition(): BehaviorNode;
  parseAttributeOrArrayLiteral(): ASTNode;
  finishCall(callee: ASTNode): CallExpressionNode;
}
```

**Total New Methods**: ~18 methods (ParserContext will grow from ~50 to ~68 methods)

---

## Success Criteria

### **Batch Completion Criteria**:
- ✅ Parser.ts reduced by target line count
- ✅ New module created with extracted functions
- ✅ ParserContext expanded with required methods
- ✅ Parser.ts delegation stubs added
- ✅ Zero test regressions (70/80 baseline maintained)
- ✅ Zero TypeScript errors
- ✅ Clean commit with descriptive message

### **Phase 10 Completion Criteria**:
- ✅ Parser.ts reduced from 2,985 lines to ~800-1,200 lines
- ✅ 4 new focused modules created
- ✅ ~1,800-2,200 lines extracted
- ✅ Zero regressions throughout
- ✅ Clean, maintainable codebase structure
- ✅ Comprehensive documentation

---

## Risk Mitigation

### **Risk: Circular Dependencies**
- **Mitigation**: Extract in order from least to most dependent
- **Strategy**: Start with node creators (no dependencies)

### **Risk: ParserContext Bloat**
- **Mitigation**: Group related methods in context
- **Strategy**: Consider ParserContext sub-interfaces if it grows too large

### **Risk: Test Regressions**
- **Mitigation**: Run tests after each batch
- **Strategy**: Maintain 70/80 baseline consistently

### **Risk: Performance Impact**
- **Mitigation**: Extracted functions should have similar performance
- **Strategy**: Benchmark if needed (unlikely to be an issue)

---

## Timeline Estimate

- **Batch 1 (Node Creators)**: 30-45 minutes
- **Batch 2 (Token Navigation)**: 45-60 minutes
- **Batch 3 (Parsing Helpers)**: 60-90 minutes
- **Batch 4 (Expression Parsers)**: 90-120 minutes
- **Documentation & Validation**: 30 minutes

**Total Estimated Time**: 4-6 hours of focused work

---

## Next Steps

1. ✅ Create this plan document
2. 🔄 Begin Batch 1: Extract Node Creators
3. ⏳ Begin Batch 2: Extract Token Navigation
4. ⏳ Begin Batch 3: Extract Parsing Helpers
5. ⏳ Begin Batch 4: Extract Expression Parsers
6. ⏳ Final validation and documentation

---

**Plan Created**: 2025-11-24
**Current Status**: Ready to begin Batch 1
**Target Completion**: Phase 10 complete with ~60% parser.ts reduction
