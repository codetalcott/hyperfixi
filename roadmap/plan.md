# HyperFixi: Simple & Compatible Hyperscript Implementation

## Philosophy: Simplicity First

This plan abandons complex runtime architectures in favor of **simplicity and
compatibility**. Our goal is to create a drop-in replacement for _hyperscript
that works exactly like the original, with modern TypeScript benefits.

**Core Principle**: Make hyperscript work perfectly, not reinvent it.

## Current Status

- ✅ **Expression System**: 388/388 tests passing (comprehensive evaluation
  engine)
- ✅ **Browser Tests**: 34% official test suite compatibility
- ✅ **Core Infrastructure**: Tokenizer + Parser + API structure complete (Phase
  1 ✅)
- 🚀 **Command System**: PUT command complete (10/10 tests), ADD/REMOVE/TOGGLE in progress
- ❌ **Event System**: Missing event handling (on click, send, trigger)

## Implementation Plan: Get the Basics Right (4-6 weeks)

### Phase 1: Core Infrastructure (Weeks 1-2)

**Goal**: Fix our current expression system gaps and achieve core functionality

**Focus**: The 10 core tests that are failing (0/10 → 8+/10)

**Reference**: `~/projects/_hyperscript/test/core/`

#### Week 1: Core System Foundation

- [ ] **Parser Infrastructure** (`~/projects/_hyperscript/test/core/parser.js`)
  - [ ] Study `~/projects/_hyperscript/src/hyperscript.js` parser implementation
  - [ ] Implement basic hyperscript syntax parsing
  - [ ] Add error recovery and parsing edge cases
  - [ ] Reference: `~/projects/_hyperscript/test/core/tokenizer.js`

- [ ] **Runtime System** (`~/projects/_hyperscript/test/core/runtime.js`)
  - [ ] Study `~/projects/_hyperscript/src/hyperscript.js` runtime patterns
  - [ ] Implement function definition and execution (`def`/`end`)
  - [ ] Add stack trace management and error handling
  - [ ] Reference: `~/projects/_hyperscript/test/core/runtimeErrors.js`

#### Week 2: Core Integration & Testing

- [ ] **API Compatibility** (`~/projects/_hyperscript/test/core/api.js`)
  - [ ] Implement `_hyperscript.processNode()` API
  - [ ] Add element initialization and reprocessing logic
  - [ ] Ensure DOM node processing compatibility

- [ ] **Variable Scoping** (`~/projects/_hyperscript/test/core/scoping.js`)
  - [ ] Study `~/projects/_hyperscript/src/hyperscript.js` variable handling
  - [ ] Implement local, element, and global variable scopes
  - [ ] Add variable hoisting and precedence rules

- [ ] **Validation**: Run all core tests and achieve 8+/10 passing

### Phase 2: Command System (Weeks 3-4)

**Goal**: Implement basic hyperscript commands for DOM manipulation

**Reference**: `~/projects/_hyperscript/test/commands/`

#### Week 3: Essential Commands

- [x] **PUT Command** (`~/projects/_hyperscript/test/commands/put.js`) ✅ **COMPLETE**
  - [x] Study `~/projects/_hyperscript/src/hyperscript.js` put implementation
  - [x] Implement `put X into Y` syntax and behavior
  - [x] Add support for innerHTML, textContent, attributes, styles
  - [x] Add support for `put X before/after Y`, `put X at start/end of Y`
  - [x] **Result**: 10/10 tests passing, all syntax variations working

- [ ] **ADD/REMOVE Commands** (`~/projects/_hyperscript/test/commands/add.js`,
      `~/projects/_hyperscript/test/commands/remove.js`)
  - [ ] Implement `add .class to element` syntax
  - [ ] Implement `remove .class from element` syntax
  - [ ] Add attribute and element manipulation

#### Week 4: Interactive Commands

- [ ] **TOGGLE Command** (`~/projects/_hyperscript/test/commands/toggle.js`)
  - [ ] Implement `toggle .class` syntax and behavior
  - [ ] Add attribute and visibility toggling

- [ ] **SHOW/HIDE Commands** (`~/projects/_hyperscript/test/commands/show.js`,
      `~/projects/_hyperscript/test/commands/hide.js`)
  - [ ] Implement element visibility manipulation
  - [ ] Add CSS display property handling

- [ ] **Validation**: Command compatibility tests passing

### Phase 3: Event System (Weeks 5-6)

**Goal**: Add event handling and communication capabilities

**Reference**: `~/projects/_hyperscript/test/features/`

#### Week 5: Event Handling Foundation

- [ ] **ON Events** (`~/projects/_hyperscript/test/features/on.js`)
  - [ ] Study `~/projects/_hyperscript/src/hyperscript.js` event delegation
  - [ ] Implement `on click` event handling syntax
  - [ ] Add event delegation and bubbling support
  - [ ] Reference: `~/projects/_hyperscript/www/features/on`

- [ ] **Event Context** (`~/projects/_hyperscript/test/core/bootstrap.js`)
  - [ ] Implement `me`, `it`, `event` context variables
  - [ ] Add proper event object handling and propagation

#### Week 6: Event Communication

- [ ] **SEND/TRIGGER Commands**
      (`~/projects/_hyperscript/test/commands/send.js`,
      `~/projects/_hyperscript/test/commands/trigger.js`)
  - [ ] Study `~/projects/_hyperscript/src/hyperscript.js` event sending
  - [ ] Implement `send customEvent to element` syntax
  - [ ] Add `trigger click on element` functionality
  - [ ] Reference: `~/projects/_hyperscript/www/commands/send`

- [ ] **Event Integration Testing**
  - [ ] Test complete event workflows (click → send → receive)
  - [ ] Validate event propagation and stopping
  - [ ] Ensure compatibility with DOM event standards

## Success Metrics (Simple & Clear)

### Functional Completeness

- [ ] **Core Tests**: 8+/10 passing (up from 0/10)
- [ ] **Command Tests**: 15+/20 passing (basic commands working)
- [ ] **Event Tests**: 10+/15 passing (event system functional)
- [ ] **Overall Compatibility**: 70%+ official test suite (up from 34%)

### Quality & Performance

- [ ] **Bundle Size**: <15KB total (much smaller than original 50KB+)
- [ ] **API Compatibility**: 100% backward compatible with _hyperscript
- [ ] **Zero Build Step**: Drop-in replacement requiring no compilation
- [ ] **Error Messages**: Clear, helpful error descriptions

## Reference Resources

### Local _hyperscript Repository: `~/projects/_hyperscript/`

#### Core Implementation

- **Main Source**: `~/projects/_hyperscript/src/hyperscript.js`
- **Core Grammar**: `~/projects/_hyperscript/src/grammar.txt`
- **Runtime System**: Look for `runtime` object in source

#### Test Suite Structure

- **Core Tests**: `~/projects/_hyperscript/test/core/`
  - `api.js` - Main API functionality
  - `bootstrap.js` - Basic hyperscript features
  - `parser.js` - Syntax parsing
  - `runtime.js` - Function execution
  - `runtimeErrors.js` - Error handling
  - `scoping.js` - Variable scoping
  - `security.js` - Security features
  - `sourceInfo.js` - Debug information
  - `tokenizer.js` - Lexical analysis
  - `regressions.js` - Bug fixes

- **Command Tests**: `~/projects/_hyperscript/test/commands/`
  - `add.js` - ADD command testing
  - `put.js` - PUT command testing
  - `remove.js` - REMOVE command testing
  - `send.js` - SEND command testing
  - `show.js` - SHOW command testing
  - `toggle.js` - TOGGLE command testing

- **Feature Tests**: `~/projects/_hyperscript/test/features/`
  - `on.js` - Event handling
  - `fetch.js` - HTTP requests
  - `init.js` - Initialization
  - `set.js` - Variable setting

#### Documentation

- **Website**: `~/projects/_hyperscript/www/`
- **Commands**: `~/projects/_hyperscript/www/commands/`
- **Expressions**: `~/projects/_hyperscript/www/expressions/`
- **Features**: `~/projects/_hyperscript/www/features/`

### Development Process

**Test-Driven Development**:

1. **Study**: Examine failing test in `~/projects/_hyperscript/test/`
2. **Understand**: Read corresponding source in `~/projects/_hyperscript/src/`
3. **Implement**: Write minimal code to make test pass
4. **Validate**: Ensure no regressions in existing functionality

**Reference Pattern**:

- Look at `~/projects/_hyperscript/test/commands/put.js` to understand expected
  PUT behavior
- Study `~/projects/_hyperscript/src/hyperscript.js` for implementation patterns
- Check `~/projects/_hyperscript/www/commands/put` for documentation

## Risk Mitigation

### Scope Creep Prevention

- **No GPU acceleration** - Keep it simple
- **No WebAssembly compilation** - TypeScript is sufficient
- **No complex bundling** - Single file output
- **No framework-specific integrations** - Pure DOM manipulation

### Implementation Risks

- **Parsing Complexity**: Start with simple recursive descent parser
- **Runtime Compatibility**: Reference original implementation heavily
- **Performance**: Optimize only after functionality is complete

## Timeline Summary

| Week | Focus                                   | Deliverable                 |
| ---- | --------------------------------------- | --------------------------- |
| 1    | Parser & Runtime Foundation             | Core infrastructure working |
| 2    | API & Scoping                           | Core tests 8+/10 passing    |
| 3    | Essential Commands (PUT/ADD/REMOVE)     | Basic DOM manipulation      |
| 4    | Interactive Commands (TOGGLE/SHOW/HIDE) | Command system complete     |
| 5    | Event Handling (ON)                     | Event delegation working    |
| 6    | Event Communication (SEND/TRIGGER)      | Full event system           |

**Total Time**: 6 weeks to working, compatible hyperscript implementation

## Success Definition

**Simple Success**: A hyperscript implementation that passes 70%+ of the
official test suite, works as a drop-in replacement for _hyperscript, and
maintains the original's simplicity while providing modern TypeScript benefits.

**No complex architectures, no bleeding-edge performance optimizations** - just
a **simple, reliable, compatible hyperscript implementation** that respects the
original vision.
