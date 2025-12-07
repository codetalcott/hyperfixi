# Command Parser Extraction Pattern

**Phase**: 9-3a Day 3
**Date**: 2025-11-24
**Status**: ✅ Pattern Validated

---

## Overview

This document describes the validated pattern for extracting command parsers from the Parser class into standalone, pure-function modules. This pattern enables clean separation of concerns and testability while maintaining 100% backward compatibility.

---

## Pattern Summary

**Before**: Command parser as Parser private method
**After**: Command parser as pure function in dedicated module + Parser delegation

---

## Step-by-Step Extraction Process

### Step 1: Identify Command Parser

**Locate the command parser method in parser.ts**:
```typescript
private parseXXXCommand(identifierNode: IdentifierNode): CommandNode | null {
  // Implementation uses this.peek(), this.advance(), etc.
}
```

**Selection Criteria**:
- Relatively simple (< 100 lines)
- Well-defined functionality
- Uses multiple context methods (good validation)

### Step 2: Create Module File

**File Location**: `src/parser/command-parsers/<category>-commands.ts`

**Categories**:
- `event-commands.ts` - trigger, send
- `dom-commands.ts` - add, remove, toggle, put, show, hide
- `control-flow-commands.ts` - if, repeat, halt
- `data-commands.ts` - set, increment, decrement
- `animation-commands.ts` - measure, transition
- etc.

**Module Template**:
```typescript
/**
 * [Category] Command Parsers
 *
 * Pure function implementations of [category]-related command parsers.
 * These functions use ParserContext for dependency injection, enabling
 * clean separation from the Parser class.
 *
 * Phase 9-3a Day 3: Command Extraction
 * @module parser/command-parsers/[category]-commands
 */

import type { ParserContext, IdentifierNode } from '../parser-types';
import type { ASTNode, CommandNode } from '../../types/core';
import { TokenType } from '../tokenizer';
import { CommandNodeBuilder } from '../command-node-builder';

// Command parser functions...
```

### Step 3: Convert Method to Pure Function

**Conversion Rules**:

1. **Function Signature**:
   ```typescript
   // Before:
   private parseXXXCommand(identifierNode: IdentifierNode): CommandNode | null

   // After:
   export function parseXXXCommand(
     ctx: ParserContext,
     identifierNode: IdentifierNode
   ): CommandNode | null
   ```

2. **Replace `this` with `ctx`**:
   ```typescript
   // Before:
   this.peek()
   this.advance()
   this.parsePrimary()
   this.createIdentifier('name')
   this.getPosition()

   // After:
   ctx.peek()
   ctx.advance()
   ctx.parsePrimary()
   ctx.createIdentifier('name', ctx.getPosition())
   ctx.getPosition()
   ```

3. **Update createIdentifier Calls**:
   ```typescript
   // Before:
   this.createIdentifier('name')

   // After (needs position):
   ctx.createIdentifier('name', ctx.getPosition())
   ```

4. **Keep All Logic Identical**:
   - Same control flow
   - Same argument parsing
   - Same CommandNodeBuilder usage
   - Only change method calls from `this.` to `ctx.`

### Step 4: Add Import to Parser

**Location**: parser.ts imports section (after helper imports)

```typescript
// Phase 9-3a: Import command parser modules
import * as eventCommands from './command-parsers/event-commands';
```

### Step 5: Update Parser Method to Delegate

**Replace the entire method body with delegation**:

```typescript
/**
 * Parse XXX command
 *
 * Phase 9-3a: Delegated to extracted command parser
 */
private parseXXXCommand(identifierNode: IdentifierNode): CommandNode | null {
  return xxxCommands.parseXXXCommand(this.getContext(), identifierNode);
}
```

**Important**: Keep the private method signature unchanged - only the implementation changes.

### Step 6: Run Tests

**Validation Commands**:
```bash
# Parser test suite (must maintain 70/80 baseline)
npm test src/parser/parser.test.ts

# ParserContext tests (must maintain 40/40)
npm test src/parser/parser-context.test.ts

# TypeScript validation
npx tsc --noEmit
```

**Success Criteria**:
- ✅ Parser tests: 70/80 passing (baseline maintained)
- ✅ ParserContext tests: 40/40 passing
- ✅ TypeScript: Zero new errors
- ✅ Zero breaking changes

---

## Complete Example: parseTriggerCommand

### Before Extraction

**File**: `parser.ts` (lines 1081-1145, 65 lines)

```typescript
private parseTriggerCommand(identifierNode: IdentifierNode): CommandNode | null {
  const allArgs: ASTNode[] = [];

  while (
    !this.isAtEnd() &&
    !this.check('then') &&
    !this.check('and') &&
    !this.check('else') &&
    !this.check('end') &&
    !this.checkTokenType(TokenType.COMMAND)
  ) {
    allArgs.push(this.parsePrimary());
  }

  let operationIndex = -1;
  for (let i = 0; i < allArgs.length; i++) {
    const arg = allArgs[i];
    if (
      (arg.type === 'identifier' || arg.type === 'literal' || arg.type === 'keyword') &&
      ((arg as any).name === 'on' || (arg as any).value === 'on')
    ) {
      operationIndex = i;
      break;
    }
  }

  const finalArgs: ASTNode[] = [];

  if (operationIndex === -1) {
    finalArgs.push(...allArgs);
  } else {
    const eventArgs = allArgs.slice(0, operationIndex);
    const targetArgs = allArgs.slice(operationIndex + 1);

    finalArgs.push(...eventArgs);
    finalArgs.push(this.createIdentifier('on'));
    finalArgs.push(...targetArgs);
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...finalArgs)
    .endingAt(this.getPosition())
    .build();
}
```

### After Extraction

**File 1**: `command-parsers/event-commands.ts` (85 lines with docs)

```typescript
/**
 * Parse trigger command
 *
 * Syntax: trigger <event> on <target>
 *
 * @param ctx - Parser context providing access to parser state and methods
 * @param identifierNode - The 'trigger' identifier node
 * @returns CommandNode representing the trigger command
 *
 * Phase 9-3a: Extracted from Parser.parseTriggerCommand
 */
export function parseTriggerCommand(
  ctx: ParserContext,
  identifierNode: IdentifierNode
): CommandNode | null {
  const allArgs: ASTNode[] = [];

  while (
    !ctx.isAtEnd() &&
    !ctx.check('then') &&
    !ctx.check('and') &&
    !ctx.check('else') &&
    !ctx.check('end') &&
    !ctx.checkTokenType(TokenType.COMMAND)
  ) {
    allArgs.push(ctx.parsePrimary());
  }

  let operationIndex = -1;
  for (let i = 0; i < allArgs.length; i++) {
    const arg = allArgs[i];
    if (
      (arg.type === 'identifier' || arg.type === 'literal' || arg.type === 'keyword') &&
      ((arg as any).name === 'on' || (arg as any).value === 'on')
    ) {
      operationIndex = i;
      break;
    }
  }

  const finalArgs: ASTNode[] = [];

  if (operationIndex === -1) {
    finalArgs.push(...allArgs);
  } else {
    const eventArgs = allArgs.slice(0, operationIndex);
    const targetArgs = allArgs.slice(operationIndex + 1);

    finalArgs.push(...eventArgs);
    finalArgs.push(ctx.createIdentifier('on', ctx.getPosition()));
    finalArgs.push(...targetArgs);
  }

  return CommandNodeBuilder.fromIdentifier(identifierNode)
    .withArgs(...finalArgs)
    .endingAt(ctx.getPosition())
    .build();
}
```

**File 2**: `parser.ts` (4 lines - delegation)

```typescript
/**
 * Parse trigger command
 *
 * Phase 9-3a: Delegated to extracted command parser
 */
private parseTriggerCommand(identifierNode: IdentifierNode): CommandNode | null {
  return eventCommands.parseTriggerCommand(this.getContext(), identifierNode);
}
```

**Import in parser.ts**:
```typescript
// Phase 9-3a: Import command parser modules
import * as eventCommands from './command-parsers/event-commands';
```

---

## ParserContext Methods Used

The extracted command parsers use these ParserContext methods:

**Token Navigation**:
- `ctx.isAtEnd()` - Check if at end of tokens
- `ctx.peek()` - Look at current token without consuming
- `ctx.advance()` - Consume current token and move to next
- `ctx.check(value)` - Check if current token matches value
- `ctx.checkTokenType(type)` - Check if current token has type
- `ctx.match(value)` - Check and consume if matches

**Expression Parsing**:
- `ctx.parsePrimary()` - Parse primary expression
- `ctx.parseExpression()` - Parse full expression

**AST Node Creation**:
- `ctx.createIdentifier(name, pos)` - Create identifier node
- `ctx.createLiteral(value, raw, pos)` - Create literal node

**Position Tracking**:
- `ctx.getPosition()` - Get current position info

**Utility**:
- `ctx.isCommand(name)` - Check if string is command
- `ctx.isKeyword(token, keywords)` - Check keyword match

---

## Benefits of This Pattern

1. **Testability**: Command parsers are pure functions that can be unit tested in isolation

2. **Separation of Concerns**: Parser class focuses on orchestration, command parsers handle specific logic

3. **Maintainability**: Each command parser is in its own dedicated module with clear boundaries

4. **Zero Breaking Changes**: Parser API remains identical, changes are internal only

5. **Type Safety**: All context methods are properly typed through ParserContext interface

6. **Progressive Migration**: Can extract commands one at a time without risk

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting Position Parameter

**Problem**:
```typescript
ctx.createIdentifier('name')  // ❌ Missing position
```

**Solution**:
```typescript
ctx.createIdentifier('name', ctx.getPosition())  // ✅ Correct
```

### Pitfall 2: Using Parser-Specific Methods

**Problem**:
```typescript
this.somePrivateMethod()  // ❌ Not available in ctx
```

**Solution**: Only use methods exposed by ParserContext interface

### Pitfall 3: Modifying Parser State Directly

**Problem**:
```typescript
this.current++;  // ❌ Direct state modification
```

**Solution**:
```typescript
ctx.advance();  // ✅ Use context methods
```

### Pitfall 4: Not Testing After Extraction

**Problem**: Assuming extraction worked without validation

**Solution**: Always run full test suite after each extraction

---

## Next Commands to Extract

**Priority Order** (simple to complex):

1. **Event Commands** (simple):
   - ✅ parseTriggerCommand (DONE - Day 3)
   - parseSendCommand

2. **Animation Commands** (medium):
   - parseMeasureCommand
   - parseTransitionCommand

3. **DOM Commands** (medium):
   - parseRemoveCommand
   - parseToggleCommand
   - parseAddCommand
   - parseShowCommand
   - parseHideCommand

4. **Data Commands** (medium):
   - parseIncrementCommand
   - parseDecrementCommand

5. **Control Flow Commands** (complex):
   - parseHaltCommand
   - parseRepeatCommand
   - parseIfCommand

6. **Complex Commands** (save for last):
   - parsePutCommand
   - parseSetCommand

---

## Validation Checklist

For each extraction, verify:

- [ ] Command parser function created in appropriate module
- [ ] Function signature includes `ctx: ParserContext` as first param
- [ ] All `this.` calls replaced with `ctx.`
- [ ] createIdentifier calls include position parameter
- [ ] Import added to parser.ts
- [ ] Parser method updated to delegate
- [ ] TypeScript compiles with zero new errors
- [ ] Parser tests pass (70/80 baseline)
- [ ] ParserContext tests pass (40/40)
- [ ] Zero breaking changes confirmed

---

## Metrics

**Pattern Validated**: 2025-11-24
**First Extraction**: parseTriggerCommand
**Module**: event-commands.ts
**Lines Extracted**: 65 lines → 85 lines (with docs)
**Parser Reduction**: 65 lines → 4 lines (94% reduction)
**Test Results**:
- Parser tests: 70/80 (baseline maintained) ✅
- ParserContext tests: 40/40 ✅
- TypeScript: Zero errors ✅

---

## Conclusion

This pattern successfully enables command parser extraction with:
- ✅ Zero breaking changes
- ✅ Improved testability
- ✅ Better separation of concerns
- ✅ Maintained type safety
- ✅ Progressive migration path

The pattern is validated and ready for extracting the remaining 37 command parsers.

---

**Document Status**: ✅ COMPLETE
**Pattern Status**: ✅ VALIDATED
**Ready for**: Phase 9-3b (Remaining Command Extraction)
**Updated**: 2025-11-24
