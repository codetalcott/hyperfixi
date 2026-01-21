# Implementation Plan: Parser Multi-Word Support + 4 Missing Patterns

**Date:** 2025-01-14
**Purpose:** Complete implementation guide to achieve 100% pattern compatibility
**Estimated Total Time:** 6-9 hours (can be split across multiple sessions)

---

## 🎯 Goals

1. **Fix Parser Multi-Word Command Support** → Enable 5 commands in `_=""` attributes
2. **Implement 4 Missing Patterns** → Complete pattern coverage
3. **Achieve 100% Pattern Compatibility** → All 77 patterns working

**Current:** 88% attribute compatibility (68/77)
**Target:** 100% attribute compatibility (77/77)

---

## 📋 Task Breakdown

### Phase 1: Parser Multi-Word Command Support (4-6 hours)

**Affected Commands:**

- `append <value> to <target>`
- `fetch <url> [as TYPE] [with OPTIONS]`
- `make a <type>`
- `send <event> to <target>`
- `throw <error>` (single word but needs context)

**Files to Modify:**

1. `/packages/core/src/parser/parser.ts` - Add multi-word pattern recognition
2. `/packages/core/src/parser/tokenizer.ts` - Token lookahead (if needed)
3. `/packages/core/src/runtime/runtime.ts` - Update command dispatch
4. `/packages/core/src/runtime/command-adapter.ts` - Enhanced command adapter

---

### Phase 2: Implement Missing Patterns (2-3 hours)

**New Commands:**

1. `put <value> before <target>` - DOM insertion
2. `put <value> after <target>` - DOM insertion
3. `on <event> from <selector>` - Event delegation (may already work)
4. `on mutation of <attribute>` - MutationObserver

**Files to Create:**

1. `/packages/core/src/commands/dom/put-before.ts`
2. `/packages/core/src/commands/dom/put-after.ts`
3. `/packages/core/src/features/event-delegation.ts` (if needed)
4. `/packages/core/src/features/mutation-observer.ts`

---

## 🔧 Phase 1: Parser Multi-Word Command Support

### Step 1.1: Understand Current Parser Flow

**Current Behavior:**

```javascript
// Input: _="on click append 'Hello' to :myvar"
// Parser Output:
{
  type: 'event-handler',
  event: 'click',
  commands: [
    { type: 'command', name: 'append', args: ["'Hello'"] },
    { type: 'command', name: 'to', args: [':myvar'] }  // ❌ WRONG
  ]
}
```

**Desired Behavior:**

```javascript
// Input: _="on click append 'Hello' to :myvar"
// Parser Output:
{
  type: 'event-handler',
  event: 'click',
  commands: [
    {
      type: 'command',
      name: 'append',
      args: ["'Hello'"],
      modifiers: { to: ':myvar' }  // ✅ CORRECT
    }
  ]
}
```

---

### Step 1.2: Identify Multi-Word Patterns

**Command Patterns to Recognize:**

```typescript
interface MultiWordPattern {
  command: string;
  keywords: string[];
  syntax: string;
}

const MULTI_WORD_PATTERNS: MultiWordPattern[] = [
  {
    command: 'append',
    keywords: ['to'],
    syntax: 'append <value> [to <target>]',
  },
  {
    command: 'fetch',
    keywords: ['as', 'with'],
    syntax: 'fetch <url> [as <type>] [with <options>]',
  },
  {
    command: 'make',
    keywords: ['a', 'an'],
    syntax: 'make (a|an) <type>',
  },
  {
    command: 'send',
    keywords: ['to'],
    syntax: 'send <event> to <target>',
  },
  {
    command: 'put',
    keywords: ['into', 'before', 'after', 'at'],
    syntax: 'put <value> (into|before|after|at) <target>',
  },
];
```

---

### Step 1.3: Implement Parser Lookahead

**File:** `/packages/core/src/parser/parser.ts`

**Add method to check for multi-word patterns:**

```typescript
/**
 * Check if current token is start of multi-word command
 * and consume appropriate tokens
 */
private parseMultiWordCommand(commandName: string): CommandNode | null {
  const pattern = this.getMultiWordPattern(commandName);
  if (!pattern) return null;

  const node: CommandNode = {
    type: 'command',
    name: commandName,
    args: [],
    modifiers: {}
  };

  // Parse primary argument(s)
  while (!this.isKeyword(this.currentToken, pattern.keywords)) {
    if (this.isEndOfCommand()) break;
    node.args.push(this.parseExpression());
  }

  // Parse modifiers (keywords + their arguments)
  while (this.isKeyword(this.currentToken, pattern.keywords)) {
    const keyword = this.currentToken.value;
    this.advance(); // consume keyword

    // Get argument for this keyword
    const modifierArg = this.parseExpression();
    node.modifiers[keyword] = modifierArg;
  }

  return node;
}

/**
 * Check if token is a keyword for multi-word commands
 */
private isKeyword(token: Token | null, keywords: string[]): boolean {
  if (!token) return false;
  return keywords.includes(token.value.toLowerCase());
}

/**
 * Check if we've reached end of current command
 */
private isEndOfCommand(): boolean {
  if (!this.currentToken) return true;

  // End on 'then', 'end', newline, or another command keyword
  const endKeywords = ['then', 'end', 'else', 'on'];
  return endKeywords.includes(this.currentToken.value.toLowerCase());
}

/**
 * Get multi-word pattern for command
 */
private getMultiWordPattern(commandName: string): MultiWordPattern | null {
  return MULTI_WORD_PATTERNS.find(p => p.command === commandName) || null;
}
```

---

### Step 1.4: Update Command Parsing

**File:** `/packages/core/src/parser/parser.ts`

**Modify existing parseCommand method:**

```typescript
private parseCommand(): CommandNode {
  const commandToken = this.currentToken;
  if (!commandToken) {
    throw new Error('Expected command');
  }

  const commandName = commandToken.value;
  this.advance();

  // Check if this is a multi-word command
  const multiWordNode = this.parseMultiWordCommand(commandName);
  if (multiWordNode) {
    return multiWordNode;
  }

  // Fall back to standard single-word command parsing
  return this.parseStandardCommand(commandName);
}

private parseStandardCommand(commandName: string): CommandNode {
  // Existing single-word command parsing logic
  const node: CommandNode = {
    type: 'command',
    name: commandName,
    args: []
  };

  // Parse arguments until end of command
  while (!this.isEndOfCommand()) {
    node.args.push(this.parseExpression());
  }

  return node;
}
```

---

### Step 1.5: Update Runtime Command Execution

**File:** `/packages/core/src/runtime/runtime.ts`

**Modify executeCommand to handle modifiers:**

```typescript
private async executeCommand(node: CommandNode, context: ExecutionContext): Promise<unknown> {
  const { name, args, modifiers } = node;

  debug.command(`executeCommand() called:`, {
    name,
    argsLength: args?.length,
    modifiers,
  });

  // Try enhanced command execution first (supports modifiers)
  if (this.hasEnhancedCommand(name)) {
    return this.executeEnhancedCommand(name, args, modifiers, context);
  }

  // Fall back to legacy runtime execution (existing switch statement)
  return this.executeLegacyCommand(name, args, context);
}

/**
 * Execute enhanced command with modifier support
 */
private async executeEnhancedCommand(
  name: string,
  args: any[],
  modifiers: Record<string, any> = {},
  context: ExecutionContext
): Promise<unknown> {
  const factory = ENHANCED_COMMAND_FACTORIES[name];
  if (!factory) {
    throw new Error(`Enhanced command not found: ${name}`);
  }

  const command = factory();

  // Build input from args + modifiers
  const input = this.buildCommandInput(name, args, modifiers, context);

  // Execute command
  const result = await command.execute(input, context);

  return result;
}

/**
 * Build command input from args and modifiers
 */
private buildCommandInput(
  commandName: string,
  args: any[],
  modifiers: Record<string, any>,
  context: ExecutionContext
): any {
  switch (commandName) {
    case 'append': {
      return {
        content: args[0],
        target: modifiers.to,
        toKeyword: modifiers.to ? 'to' : undefined
      };
    }

    case 'fetch': {
      return {
        url: args[0],
        responseType: modifiers.as,
        options: modifiers.with
      };
    }

    case 'make': {
      // 'make a <div/>' - args[0] is the type
      return {
        type: args[0],
        article: modifiers.a || modifiers.an ? (modifiers.a ? 'a' : 'an') : undefined
      };
    }

    case 'send': {
      return {
        event: args[0],
        target: modifiers.to
      };
    }

    case 'put': {
      return {
        value: args[0],
        target: modifiers.into || modifiers.before || modifiers.after || modifiers.at,
        position: modifiers.into ? 'into' :
                 modifiers.before ? 'before' :
                 modifiers.after ? 'after' :
                 modifiers.at ? 'at' : 'into'
      };
    }

    default: {
      // For other commands, just pass args as-is
      return { args, ...modifiers };
    }
  }
}
```

---

### Step 1.6: Update Type Definitions

**File:** `/packages/core/src/types/parser-types.ts` or `/packages/core/src/parser/types.ts`

**Add modifiers to CommandNode:**

```typescript
export interface CommandNode extends ASTNode {
  type: 'command';
  name: string;
  args: any[];
  modifiers?: Record<string, any>; // ← ADD THIS
  target?: any;
  selector?: string;
}
```

---

### Step 1.7: Testing Strategy for Parser Fix

**Create test file:** `/packages/core/src/parser/multi-word-commands.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { Parser } from './parser';

describe('Multi-Word Command Parsing', () => {
  it('should parse append...to command', () => {
    const parser = new Parser();
    const ast = parser.parse('append "Hello" to :myvar');

    expect(ast.commands[0]).toMatchObject({
      type: 'command',
      name: 'append',
      args: ['"Hello"'],
      modifiers: { to: ':myvar' },
    });
  });

  it('should parse fetch...as...with command', () => {
    const parser = new Parser();
    const ast = parser.parse('fetch "/api/data" as json with {method:"POST"}');

    expect(ast.commands[0]).toMatchObject({
      type: 'command',
      name: 'fetch',
      args: ['"/api/data"'],
      modifiers: {
        as: 'json',
        with: '{method:"POST"}',
      },
    });
  });

  it('should parse make a command', () => {
    const parser = new Parser();
    const ast = parser.parse('make a <div/>');

    expect(ast.commands[0]).toMatchObject({
      type: 'command',
      name: 'make',
      args: ['<div/>'],
      modifiers: { a: true },
    });
  });

  it('should parse send...to command', () => {
    const parser = new Parser();
    const ast = parser.parse('send customEvent to #target');

    expect(ast.commands[0]).toMatchObject({
      type: 'command',
      name: 'send',
      args: ['customEvent'],
      modifiers: { to: '#target' },
    });
  });
});
```

**Create browser test:** `/packages/core/multi-word-commands-test.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Multi-Word Commands Test</title>
    <script src="/dist/lokascript-browser.js"></script>
  </head>
  <body>
    <h1>Multi-Word Command Tests</h1>

    <div id="append-target"></div>
    <button
      _="on click
             set :greeting to 'Hello'
             then append ' World' to :greeting
             then put :greeting into #append-target"
    >
      Test Append To
    </button>

    <div id="fetch-target"></div>
    <button
      _="on click
             fetch 'https://jsonplaceholder.typicode.com/todos/1' as json
             then put it.title into #fetch-target"
    >
      Test Fetch As
    </button>

    <div id="send-target" _="on customEvent put 'Event received!' into me"></div>
    <button _="on click send customEvent to #send-target">Test Send To</button>

    <div id="make-target"></div>
    <button
      _="on click
             make a <div.created/>
             then put 'Created!' into it
             then put it into #make-target"
    >
      Test Make A
    </button>
  </body>
</html>
```

---

## 🔧 Phase 2: Implement 4 Missing Patterns

### Pattern 1: `put <value> before <target>`

**File:** `/packages/core/src/commands/dom/put-before.ts`

```typescript
/**
 * Put Before Command Implementation
 * Inserts content before a target element
 *
 * Syntax: put <value> before <target>
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';

export interface PutBeforeCommandInput {
  value: unknown;
  target: string | HTMLElement;
}

export interface PutBeforeCommandOutput {
  inserted: boolean;
  element?: HTMLElement;
}

export class PutBeforeCommand implements CommandImplementation<
  PutBeforeCommandInput,
  PutBeforeCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'put-before',
    description: 'Insert content before a target element',
    examples: ['put "<li>New</li>" before first <li/>', 'put :newElement before #target'],
    syntax: 'put <value> before <target>',
    category: 'dom' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<PutBeforeCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put before command requires value and target',
              suggestions: ['Provide both value and target'],
            },
          ],
          suggestions: ['Provide both value and target'],
        };
      }

      const inputObj = input as any;

      if (inputObj.value === undefined) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put before command requires a value',
              suggestions: ['Provide content to insert'],
            },
          ],
          suggestions: ['Provide content to insert'],
        };
      }

      if (!inputObj.target) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put before command requires a target',
              suggestions: ['Provide target element or selector'],
            },
          ],
          suggestions: ['Provide target element or selector'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          value: inputObj.value,
          target: inputObj.target,
        },
      };
    },
  };

  async execute(
    input: PutBeforeCommandInput,
    context: TypedExecutionContext
  ): Promise<PutBeforeCommandOutput> {
    const { value, target } = input;

    // Resolve target element
    const targetElement = this.resolveTarget(target, context);
    if (!targetElement) {
      throw new Error(`Target element not found: ${target}`);
    }

    // Create content to insert
    const contentElement = this.createContent(value);

    // Insert before target
    targetElement.parentNode?.insertBefore(contentElement, targetElement);

    return {
      inserted: true,
      element: contentElement,
    };
  }

  private resolveTarget(
    target: string | HTMLElement,
    context: TypedExecutionContext
  ): HTMLElement | null {
    if (target instanceof HTMLElement) {
      return target;
    }

    // Handle context references
    if (target === 'me') return context.me as HTMLElement;
    if (target === 'it') return context.it as HTMLElement;
    if (target === 'you') return context.you as HTMLElement;

    // Handle CSS selector
    if (typeof target === 'string') {
      return document.querySelector(target) as HTMLElement;
    }

    return null;
  }

  private createContent(value: unknown): HTMLElement {
    if (value instanceof HTMLElement) {
      return value;
    }

    // Create element from HTML string
    const template = document.createElement('template');
    template.innerHTML = String(value).trim();
    return template.content.firstChild as HTMLElement;
  }
}

export function createPutBeforeCommand(): PutBeforeCommand {
  return new PutBeforeCommand();
}

export default PutBeforeCommand;
```

---

### Pattern 2: `put <value> after <target>`

**File:** `/packages/core/src/commands/dom/put-after.ts`

```typescript
/**
 * Put After Command Implementation
 * Inserts content after a target element
 *
 * Syntax: put <value> after <target>
 */

import type { CommandImplementation, ValidationResult } from '../../types/core';
import type { TypedExecutionContext } from '../../types/command-types';

export interface PutAfterCommandInput {
  value: unknown;
  target: string | HTMLElement;
}

export interface PutAfterCommandOutput {
  inserted: boolean;
  element?: HTMLElement;
}

export class PutAfterCommand implements CommandImplementation<
  PutAfterCommandInput,
  PutAfterCommandOutput,
  TypedExecutionContext
> {
  metadata = {
    name: 'put-after',
    description: 'Insert content after a target element',
    examples: ['put "<li>New</li>" after last <li/>', 'put :newElement after #target'],
    syntax: 'put <value> after <target>',
    category: 'dom' as const,
    version: '2.0.0',
  };

  validation = {
    validate(input: unknown): ValidationResult<PutAfterCommandInput> {
      if (!input || typeof input !== 'object') {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put after command requires value and target',
              suggestions: ['Provide both value and target'],
            },
          ],
          suggestions: ['Provide both value and target'],
        };
      }

      const inputObj = input as any;

      if (inputObj.value === undefined) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put after command requires a value',
              suggestions: ['Provide content to insert'],
            },
          ],
          suggestions: ['Provide content to insert'],
        };
      }

      if (!inputObj.target) {
        return {
          isValid: false,
          errors: [
            {
              type: 'missing-argument',
              message: 'Put after command requires a target',
              suggestions: ['Provide target element or selector'],
            },
          ],
          suggestions: ['Provide target element or selector'],
        };
      }

      return {
        isValid: true,
        errors: [],
        suggestions: [],
        data: {
          value: inputObj.value,
          target: inputObj.target,
        },
      };
    },
  };

  async execute(
    input: PutAfterCommandInput,
    context: TypedExecutionContext
  ): Promise<PutAfterCommandOutput> {
    const { value, target } = input;

    // Resolve target element
    const targetElement = this.resolveTarget(target, context);
    if (!targetElement) {
      throw new Error(`Target element not found: ${target}`);
    }

    // Create content to insert
    const contentElement = this.createContent(value);

    // Insert after target (before next sibling or append if no next sibling)
    if (targetElement.nextSibling) {
      targetElement.parentNode?.insertBefore(contentElement, targetElement.nextSibling);
    } else {
      targetElement.parentNode?.appendChild(contentElement);
    }

    return {
      inserted: true,
      element: contentElement,
    };
  }

  private resolveTarget(
    target: string | HTMLElement,
    context: TypedExecutionContext
  ): HTMLElement | null {
    if (target instanceof HTMLElement) {
      return target;
    }

    // Handle context references
    if (target === 'me') return context.me as HTMLElement;
    if (target === 'it') return context.it as HTMLElement;
    if (target === 'you') return context.you as HTMLElement;

    // Handle CSS selector
    if (typeof target === 'string') {
      return document.querySelector(target) as HTMLElement;
    }

    return null;
  }

  private createContent(value: unknown): HTMLElement {
    if (value instanceof HTMLElement) {
      return value;
    }

    // Create element from HTML string
    const template = document.createElement('template');
    template.innerHTML = String(value).trim();
    return template.content.firstChild as HTMLElement;
  }
}

export function createPutAfterCommand(): PutAfterCommand {
  return new PutAfterCommand();
}

export default PutAfterCommand;
```

---

### Pattern 3: `on <event> from <selector>`

**Investigation Needed:** This may already work via event bubbling!

**Test First:**

```html
<div id="container">
  <button class="action-btn">Click Me</button>
</div>

<div
  _="on click from .action-btn
        log 'Button clicked via delegation!'"
>
  Event Listener Container
</div>
```

**If NOT working, implement event delegation:**

**File:** `/packages/core/src/features/event-delegation.ts`

```typescript
/**
 * Event Delegation Support
 * Allows listening for events from specific child selectors
 *
 * Syntax: on <event> from <selector>
 */

export interface DelegatedEventConfig {
  eventName: string;
  fromSelector: string;
  handler: (event: Event) => void;
}

export class EventDelegation {
  /**
   * Attach delegated event listener
   */
  static attach(element: HTMLElement, config: DelegatedEventConfig): () => void {
    const { eventName, fromSelector, handler } = config;

    const delegatedHandler = (event: Event) => {
      const target = event.target as HTMLElement;

      // Check if target matches selector or is within matching element
      const matchedElement = target.closest(fromSelector);

      if (matchedElement && element.contains(matchedElement)) {
        // Call handler with modified event context
        handler.call(matchedElement, event);
      }
    };

    element.addEventListener(eventName, delegatedHandler);

    // Return cleanup function
    return () => {
      element.removeEventListener(eventName, delegatedHandler);
    };
  }
}
```

**Modify event handler parsing in runtime.ts:**

```typescript
private async executeEventHandler(
  node: EventHandlerNode,
  context: ExecutionContext
): Promise<void> {
  const { event, events, commands, from } = node;  // ← ADD 'from'

  const eventNames = events && events.length > 0 ? events : [event];

  for (const eventName of eventNames) {
    const handler = async (e: Event) => {
      // If 'from' selector specified, check if event matches
      if (from) {
        const target = e.target as HTMLElement;
        const matches = target.closest(from);
        if (!matches || !context.me?.contains(matches)) {
          return; // Event not from specified selector
        }
      }

      // Execute commands
      for (const command of commands) {
        await this.execute(command, { ...context, event: e });
      }
    };

    context.me?.addEventListener(eventName, handler);
  }
}
```

---

### Pattern 4: `on mutation of <attribute>`

**File:** `/packages/core/src/features/mutation-observer.ts`

```typescript
/**
 * MutationObserver Integration
 * Allows listening for attribute changes
 *
 * Syntax: on mutation of <attribute>
 */

export interface MutationObserverConfig {
  attribute: string;
  element: HTMLElement;
  handler: (oldValue: string | null, newValue: string | null) => void;
}

export class AttributeMutationObserver {
  private observer: MutationObserver;
  private config: MutationObserverConfig;

  constructor(config: MutationObserverConfig) {
    this.config = config;

    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === this.config.attribute) {
          const newValue = this.config.element.getAttribute(this.config.attribute);
          this.config.handler(mutation.oldValue, newValue);
        }
      }
    });
  }

  /**
   * Start observing
   */
  observe(): void {
    this.observer.observe(this.config.element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [this.config.attribute],
    });
  }

  /**
   * Stop observing
   */
  disconnect(): void {
    this.observer.disconnect();
  }

  /**
   * Static factory method
   */
  static create(config: MutationObserverConfig): AttributeMutationObserver {
    const observer = new AttributeMutationObserver(config);
    observer.observe();
    return observer;
  }
}
```

**Modify event handler parsing to support mutation:**

```typescript
private async executeEventHandler(
  node: EventHandlerNode,
  context: ExecutionContext
): Promise<void> {
  const { event, commands } = node;

  // Check for mutation event
  if (event === 'mutation') {
    const attribute = node.mutationAttribute;  // ← ADD THIS
    if (!attribute) {
      throw new Error('Mutation event requires attribute specification');
    }

    // Setup mutation observer
    AttributeMutationObserver.create({
      attribute,
      element: context.me as HTMLElement,
      handler: async (oldValue, newValue) => {
        // Execute commands with old/new values in context
        const mutationContext = {
          ...context,
          oldValue,
          newValue
        };

        for (const command of commands) {
          await this.execute(command, mutationContext);
        }
      }
    });

    return;
  }

  // Regular event handling...
  // (existing code)
}
```

**Parser support for mutation syntax:**

```typescript
private parseEventHandler(): EventHandlerNode {
  // ... existing code ...

  // Check for "mutation of <attribute>" syntax
  if (event === 'mutation' && this.currentToken?.value === 'of') {
    this.advance(); // consume 'of'
    const attribute = this.parseExpression(); // get attribute name

    return {
      type: 'event-handler',
      event: 'mutation',
      mutationAttribute: attribute,
      commands: this.parseCommands()
    };
  }

  // ... existing event handler parsing ...
}
```

---

## 📊 Testing Strategy

### Phase 1 Tests (Parser Multi-Word Support)

1. **Unit Tests** - Parser tokenization
   - Test each multi-word pattern individually
   - Test combinations (fetch...as...with)
   - Test edge cases (missing keywords)

2. **Integration Tests** - Runtime execution
   - Test command execution with modifiers
   - Test buildCommandInput for each pattern
   - Test error handling

3. **Browser Tests** - End-to-end
   - Test in `_=""` attributes
   - Test via evalHyperScript API
   - Test in complex scenarios

### Phase 2 Tests (Missing Patterns)

1. **Unit Tests** - Each command
   - Test validation
   - Test execution
   - Test error cases

2. **Browser Tests** - DOM manipulation
   - Test put before/after with real elements
   - Test event delegation scenarios
   - Test mutation observer triggers

---

## 🎯 Implementation Sequence

### Recommended Order

**Session 1: Parser Foundation (2-3 hours)**

1. Implement multi-word pattern recognition
2. Add parser lookahead logic
3. Update CommandNode types
4. Write parser unit tests

**Session 2: Runtime Integration (2-3 hours)** 5. Update runtime command execution 6. Implement buildCommandInput 7. Test with existing commands 8. Fix any integration issues

**Session 3: Missing Patterns (2-3 hours)** 9. Implement put-before and put-after commands 10. Verify event delegation (may already work) 11. Implement mutation observer feature 12. Write comprehensive tests

**Session 4: Testing & Polish (1 hour)** 13. Run full test suite 14. Fix any bugs discovered 15. Update pattern registry to 100% 16. Update documentation

---

## 📋 Files Summary

### Files to Create:

1. `/packages/core/src/commands/dom/put-before.ts`
2. `/packages/core/src/commands/dom/put-after.ts`
3. `/packages/core/src/features/event-delegation.ts` (if needed)
4. `/packages/core/src/features/mutation-observer.ts`
5. `/packages/core/src/parser/multi-word-commands.test.ts`
6. `/packages/core/multi-word-commands-test.html`

### Files to Modify:

1. `/packages/core/src/parser/parser.ts` - Multi-word support
2. `/packages/core/src/runtime/runtime.ts` - Command execution
3. `/packages/core/src/commands/command-registry.ts` - Add new commands
4. `/packages/core/src/types/parser-types.ts` - Add modifiers
5. `/patterns-registry.mjs` - Update to 100%

---

## ✅ Success Criteria

**Parser Fix Complete When:**

- ✅ All 5 multi-word commands work in `_=""` attributes
- ✅ Parser tests pass (15+ test cases)
- ✅ Browser test page shows all green
- ✅ No "Unknown command" errors

**Missing Patterns Complete When:**

- ✅ All 4 patterns have implementations
- ✅ Commands registered and tested
- ✅ Unit tests pass (12+ test cases)
- ✅ Browser demos work

**100% Compatibility Achieved When:**

- ✅ Pattern registry: 77/77 implemented
- ✅ All pattern tests pass
- ✅ Documentation updated
- ✅ No outstanding compatibility issues

---

**Total Estimated Time:** 6-9 hours
**Can be split across:** 3-4 focused sessions
**Final Result:** 100% \_hyperscript pattern compatibility!

---

**Status:** ✅ Implementation Plan Complete
**Next Step:** Begin with Session 1 (Parser Foundation)
**Priority:** High - Unlocks full attribute compatibility

---

**Generated:** 2025-01-14
**By:** Claude Code - Implementation Planning Session
**Purpose:** Complete roadmap to 100% pattern compatibility
