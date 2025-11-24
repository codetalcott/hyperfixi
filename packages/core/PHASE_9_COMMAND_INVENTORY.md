# Phase 9-1: Command Parser Inventory

**Date**: 2025-11-23
**Status**: 🔄 In Progress
**File**: packages/core/src/parser/parser.ts (4,698 lines)

---

## Executive Summary

This document provides a complete inventory of all command parsers in parser.ts, their locations, categories, and dependencies. This analysis forms the foundation for Phase 9 parser modularization.

---

## Parser File Statistics

**Total Lines**: 4,698
**Command Parsers**: 13+ identified
**Helper Functions**: ~30+ utility functions
**Imports**: 6 major dependencies
**Exports**: 4 public functions

---

## Command Parser Functions (Line Numbers)

### Primary Command Parsers

| Line | Function | Command | Category | Complexity |
|------|----------|---------|----------|------------|
| 670 | `parsePutCommand` | put | DOM | Medium |
| 732 | `parseSetCommand` | set | Data | High |
| 1006 | `parseHaltCommand` | halt | Control Flow | Low |
| 1044 | `parseMeasureCommand` | measure | Animation | Medium |
| 1133 | `parseTriggerCommand` | trigger | Events | Medium |
| 1346 | `parseRepeatCommand` | repeat | Control Flow | High |
| 1550 | `parseWaitCommand` | wait | Async | Medium |
| 1703 | `parseInstallCommand` | install | Behaviors | Medium |
| 1806 | `parseTransitionCommand` | transition | Animation | Medium |
| 1898 | `parseAddCommand` | add | DOM | Medium |
| 1938 | `parseIfCommand` | if | Control Flow | High |
| 2168 | `parseRemoveCommand` | remove | DOM | Low |
| 2202 | `parseToggleCommand` | toggle | DOM | Low |

### Generic Parser Functions (Infrastructure)

| Line | Function | Purpose | Notes |
|------|----------|---------|-------|
| 641 | `parseCompoundCommand` | Multi-word command routing | Infrastructure |
| 2239 | `parseRegularCommand` | Single-word command routing | Infrastructure |
| 3773 | `parseMultiWordCommand` | Multi-word command parsing | Infrastructure |
| 3840 | `parseCommand` | Main command dispatcher | Core |
| 3695 | `_parseFullCommand` | Complete command parsing | Core |
| 3607 | `parseCommandSequence` | Command sequence handling | Core |
| 1215 | `parseCommandListUntilEnd` | Block parsing | Helper |

---

## Commands by Category

### DOM Commands (7 commands)
**Estimated Lines**: ~600 total

1. **put** (line 670) - `parsePutCommand`
   - Complexity: Medium
   - Dependencies: Expression parser, position tracking
   - Variants: into, before, after, at start/end of

2. **add** (line 1898, 2136) - `parseAddCommand`, `_parseAddCommand`
   - Complexity: Medium
   - Dependencies: Class/attribute parsing
   - Variants: class, attribute, style

3. **remove** (line 2168) - `parseRemoveCommand`
   - Complexity: Low
   - Dependencies: Target expression parsing
   - Variants: class, attribute, element

4. **toggle** (line 2202) - `parseToggleCommand`
   - Complexity: Low
   - Dependencies: Target expression parsing
   - Variants: class, attribute

5. **hide** - *Not found in primary list, check parseRegularCommand*
   - Location: TBD (likely in parseRegularCommand switch)

6. **show** - *Not found in primary list, check parseRegularCommand*
   - Location: TBD (likely in parseRegularCommand switch)

7. **make** - *Not found in primary list, check parseRegularCommand*
   - Location: TBD (likely in parseRegularCommand switch)

### Control Flow Commands (8 commands)
**Estimated Lines**: ~700 total

1. **if** (line 1938) - `parseIfCommand`
   - Complexity: High
   - Dependencies: Expression evaluator, block parsing
   - Variants: single-line, multi-line, with else

2. **repeat** (line 1346) - `parseRepeatCommand`
   - Complexity: High
   - Dependencies: Loop variant detection, block parsing
   - Variants: for, in, while, until, forever, times, event-driven (7 variants)

3. **halt** (line 1006) - `parseHaltCommand`
   - Complexity: Low
   - Dependencies: Bubbling control
   - Variants: halt the event

4. **break** - *Not in primary list, check parseRegularCommand*
5. **continue** - *Not in primary list, check parseRegularCommand*
6. **return** - *Not in primary list, check parseRegularCommand*
7. **exit** - *Not in primary list, check parseRegularCommand*
8. **unless** - *Not in primary list, check parseRegularCommand*
9. **throw** - *Not in primary list, check parseRegularCommand*

### Data Commands (6 commands)
**Estimated Lines**: ~500 total

1. **set** (line 732) - `parseSetCommand`
   - Complexity: High
   - Dependencies: Variable assignment, expression parsing
   - Variants: variable, property, attribute

2. **increment** - *Not in primary list, check parseRegularCommand*
3. **decrement** - *Not in primary list, check parseRegularCommand*
4. **bind** - *Not in primary list, check parseRegularCommand*
5. **persist** - *Not in primary list, check parseRegularCommand*
6. **default** - *Not in primary list, check parseRegularCommand*

### Event Commands (2 commands)
**Estimated Lines**: ~300 total

1. **trigger** (line 1133) - `parseTriggerCommand`
   - Complexity: Medium
   - Dependencies: Event creation, target parsing
   - Variants: trigger event on target

2. **send** - *Not in primary list, check parseRegularCommand*

### Async Commands (2 commands)
**Estimated Lines**: ~400 total

1. **wait** (line 1550) - `parseWaitCommand`
   - Complexity: Medium
   - Dependencies: Time parsing, condition parsing
   - Variants: wait time, wait for event, wait until condition

2. **fetch** - *Not in primary list, check parseRegularCommand*

### Animation Commands (4 commands)
**Estimated Lines**: ~500 total

1. **transition** (line 1806) - `parseTransitionCommand`
   - Complexity: Medium
   - Dependencies: CSS property parsing
   - Variants: transition property

2. **measure** (line 1044) - `parseMeasureCommand`
   - Complexity: Medium
   - Dependencies: Measurement parsing
   - Variants: measure element

3. **settle** - *Not in primary list, check parseRegularCommand*
4. **take** - *Not in primary list, check parseRegularCommand*

### Template Commands (1 command)
**Estimated Lines**: ~400 total

1. **render** - *Not in primary list, check parseRegularCommand*

### Behavior Commands (1 command)
**Estimated Lines**: ~200 total

1. **install** (line 1703) - `parseInstallCommand`
   - Complexity: Medium
   - Dependencies: Behavior parsing
   - Variants: install behavior

### Execution Commands (2 commands)
**Estimated Lines**: ~400 total

1. **call** - *Not in primary list, check parseRegularCommand*
2. **pseudo-command** - *Not in primary list, check parseRegularCommand*

### Utility Commands (5 commands)
**Estimated Lines**: ~400 total

1. **log** - *Not in primary list, check parseRegularCommand*
2. **tell** - *Not in primary list, check parseRegularCommand*
3. **copy** - *Not in primary list, check parseRegularCommand*
4. **pick** - *Not in primary list, check parseRegularCommand*
5. **beep** - *Not in primary list, check parseRegularCommand*

### Navigation Commands (1 command)
**Estimated Lines**: ~200 total

1. **go** - *Not in primary list, check parseRegularCommand*

---

## Parser Architecture Pattern

### Two-Tier Command Parsing

**Tier 1: Dedicated Parser Functions**
- Complex commands with many variants
- Located at specific line numbers in parser.ts
- Examples: `parseIfCommand`, `parseRepeatCommand`, `parseSetCommand`

**Tier 2: Generic Parser (parseRegularCommand)**
- Simpler commands
- Handled via switch statement in `parseRegularCommand` (line 2239)
- Examples: hide, show, break, continue, fetch, send, etc.

**Action Required**: Search `parseRegularCommand` to find all Tier 2 commands

---

## Helper Function Analysis

### Token Management (Found so far)

| Line | Function | Purpose |
|------|----------|---------|
| 4512 | `peek()` | Look ahead at next token |
| 4524 | `consume(expected, message)` | Consume expected token |

**Action Required**: Complete scan for all helper functions

### Missing Helper Categories (To Find)

- [ ] AST node creation helpers
- [ ] Expression parsing helpers
- [ ] Position tracking helpers
- [ ] Error handling helpers
- [ ] Modifier parsing helpers

---

## Import/Export Analysis

### Imports (Identified)

```typescript
import { tokenize, TokenType } from './tokenizer';
import type { /* AST types */ } from '../types/ast';
import { debug } from '../utils/debug';
import { CommandNodeBuilder } from './command-node-builder';
import { TokenConsumer } from './token-consumer';
```

### Exports (To Verify)

- `parse()` - Main public function
- Possibly other public APIs

**Action Required**: Complete import/export mapping

---

## Dependency Patterns

### Common Dependencies (Preliminary)

1. **Expression Parser** - Nearly all commands use expression parsing
2. **Token Consumer** - All commands consume tokens
3. **CommandNodeBuilder** - Phase 2 refactored commands use this
4. **Position Tracking** - All commands track start/end positions
5. **Error Handling** - All commands report parse errors

### Cross-Command Dependencies (To Map)

- Which commands call other parsers?
- Which commands share utility functions?
- Which commands have similar parsing patterns?

**Action Required**: Create complete dependency graph

---

## Next Steps

### Immediate Actions

1. ✅ **Complete command inventory**
   - Search `parseRegularCommand` for Tier 2 commands
   - Map all ~43 command parsers

2. ⏳ **Complete helper function scan**
   - Find all utility functions
   - Categorize by purpose
   - Identify shared vs command-specific

3. ⏳ **Create dependency graph**
   - Map which commands call which helpers
   - Identify circular dependencies
   - Plan extraction order

4. ⏳ **Complete import/export map**
   - Document all imports
   - Document all exports
   - Identify external dependencies

### Day 1 Deliverables

- ✅ This command inventory document (in progress)
- ⏳ Complete command list (all 43 parsers)
- ⏳ Helper function catalog
- ⏳ Dependency graph
- ⏳ Import/export map

---

## Notes

**Parser Structure Insight**: The parser uses a two-tier system:
- **Tier 1**: Complex commands get dedicated parser functions (13 found so far)
- **Tier 2**: Simpler commands handled via `parseRegularCommand` switch statement (30 remaining)

This structure will inform our modularization strategy - we may want to extract both tiers for each category.

**Phase 2 Refactoring Impact**: 13 commands already refactored with CommandNodeBuilder pattern, which should make extraction easier.

---

**Status**: 🔄 Day 1 in progress - Command inventory partially complete
**Next**: Search `parseRegularCommand` to find remaining 30 command parsers
**Updated**: 2025-11-23
