# 🔄 Command Enhancement Pattern

## 📋 What We Achieved with HideCommand

The hide command demonstrates the complete enhanced TypeScript pattern:

```typescript
export class HideCommand implements TypedCommandImplementation<
  HideCommandInput,     // ← Zod-validated input type
  HTMLElement[],        // ← Specific output type  
  TypedExecutionContext // ← Enhanced context
> {
  // Rich metadata for LLM agents
  readonly metadata: CommandMetadata = { /* ... */ };
  readonly documentation: LLMDocumentation = { /* ... */ };
  
  // Type-safe execution with structured results
  async execute(context, target): Promise<EvaluationResult<HTMLElement[]>>
  
  // Runtime validation with helpful suggestions  
  validate(args): ValidationResult
}
```

## 🎯 Systematic Application Strategy

### Phase 1: DOM Commands (High Impact, Low Complexity)
**Priority: Immediate** - These are core functionality

1. **ShowCommand** - Mirror of HideCommand
2. **ToggleCommand** - Combines hide/show logic  
3. **AddCommand** - CSS class manipulation
4. **RemoveCommand** - CSS class removal

### Phase 2: Event Commands (Medium Impact, Medium Complexity)
**Priority: Next** - Essential for interactivity

5. **TriggerCommand** - Event dispatching
6. **SendCommand** - Custom event creation
7. **OnCommand** - Event listener attachment

### Phase 3: Async Commands (High Impact, High Complexity)
**Priority: After DOM/Events** - More complex validation

8. **FetchCommand** - HTTP requests with typing
9. **WaitCommand** - Timing and delays

### Phase 4: Navigation & Control (Lower Priority)
**Priority: Last** - More specialized use cases

10. **GoCommand** - Navigation logic
11. **IfCommand** - Conditional execution
12. **RepeatCommand** - Loop control

## 🛠 Command Enhancement Template

### 1. Input Schema Definition
```typescript
// Define precise input types with Zod
const ShowCommandInputSchema = z.tuple([
  z.union([
    z.instanceof(HTMLElement),
    z.array(z.instanceof(HTMLElement)),
    z.string(), // CSS selector
    z.null(),
    z.undefined()
  ]).optional()
]);

type ShowCommandInput = z.infer<typeof ShowCommandInputSchema>;
```

### 2. Enhanced Command Class
```typescript
export class ShowCommand implements TypedCommandImplementation<
  ShowCommandInput,
  HTMLElement[],
  TypedExecutionContext
> {
  readonly name = 'show' as const;
  readonly syntax = 'show [<target-expression>]';
  readonly description = 'Shows previously hidden elements by restoring display';
  readonly inputSchema = ShowCommandInputSchema;
  readonly outputType = 'element-list' as const;
  
  readonly metadata: CommandMetadata = {
    category: 'dom-manipulation',
    complexity: 'simple',
    sideEffects: ['dom-mutation'],
    examples: [
      {
        code: 'show me',
        description: 'Show the current element',
        expectedOutput: []
      }
    ],
    relatedCommands: ['hide', 'toggle']
  };

  readonly documentation: LLMDocumentation = {
    summary: 'Shows HTML elements by restoring their display property',
    parameters: [
      {
        name: 'target',
        type: 'element',
        description: 'Element(s) to show. If omitted, shows the current element',
        optional: true,
        examples: ['me', '<#modal/>', '<.hidden/>']
      }
    ],
    returns: {
      type: 'element-list',
      description: 'Array of elements that were shown',
      examples: [[]]
    },
    examples: [
      {
        title: 'Show hidden modal',
        code: 'on click show <#modal/>',
        explanation: 'Click to reveal a hidden modal dialog',
        output: []
      }
    ],
    seeAlso: ['hide', 'toggle'],
    tags: ['dom', 'visibility', 'css']
  };
}
```

### 3. Factory Function with Bundle Annotation
```typescript
/**
 * @llm-bundle-size 2KB
 * @llm-description Type-safe show command with validation
 */
export function createShowCommand(options?: ShowCommandOptions): ShowCommand {
  return new ShowCommand(options);
}
```

## 🎨 Command-Specific Patterns

### DOM Manipulation Commands
```typescript
// Common pattern for element manipulation
interface DOMCommandMetadata extends CommandMetadata {
  category: 'dom-manipulation';
  sideEffects: ['dom-mutation'];
  relatedCommands: string[]; // Other DOM commands
}

// Common input pattern
const DOMTargetSchema = z.union([
  z.instanceof(HTMLElement),
  z.array(z.instanceof(HTMLElement)),
  z.string(), // CSS selector
  z.null(),
  z.undefined()
]);
```

### Event Commands
```typescript
// Event-specific metadata
interface EventCommandMetadata extends CommandMetadata {
  category: 'event-handling';
  sideEffects: ['event-emission'];
  eventTypes: string[]; // Supported event types
}

// Event input schema
const EventCommandSchema = z.tuple([
  z.string(), // Event type
  z.record(z.unknown()).optional(), // Event data
  z.instanceof(HTMLElement).optional() // Target element
]);
```

### Async Commands
```typescript
// Async-specific metadata
interface AsyncCommandMetadata extends CommandMetadata {
  category: 'async-operation';
  sideEffects: ['network-request' | 'timer-creation'];
  timeout?: number;
}

// Promise-based output
type AsyncCommandOutput<T> = Promise<EvaluationResult<T>>;
```

## 🔧 Implementation Tools

### 1. Command Generator Script
```typescript
// tools/generate-command.ts
interface CommandSpec {
  name: string;
  category: CommandCategory;
  inputTypes: string[];
  outputType: string;
  complexity: 'simple' | 'medium' | 'complex';
  sideEffects: SideEffect[];
}

function generateCommand(spec: CommandSpec): string {
  return `
// Auto-generated command boilerplate
export class ${spec.name}Command implements TypedCommandImplementation<
  ${spec.name}CommandInput,
  ${spec.outputType},
  TypedExecutionContext
> {
  // ... generated implementation
}`;
}
```

### 2. Validation Test Generator
```typescript
// tools/generate-tests.ts
function generateCommandTests(commandName: string): string {
  return `
Deno.test("${commandName} Command - Should validate inputs", () => {
  const command = new ${commandName}Command();
  // ... generated validation tests
});

Deno.test("${commandName} Command - Should execute correctly", async () => {
  const command = new ${commandName}Command();
  // ... generated execution tests
});`;
}
```

### 3. Documentation Generator
```typescript
// tools/generate-docs.ts
function generateLLMDocumentation(command: TypedCommandImplementation): LLMDocumentation {
  return {
    summary: `Generated from ${command.name} command`,
    parameters: extractParameters(command.inputSchema),
    returns: inferReturnType(command.outputType),
    examples: generateExamples(command.metadata.examples),
    seeAlso: command.metadata.relatedCommands,
    tags: inferTags(command.metadata.category)
  };
}
```

## 📊 Migration Strategy

### Step 1: Create Enhanced Base Classes
```typescript
// src/commands/base/enhanced-command.ts
export abstract class EnhancedDOMCommand<TInput, TOutput> 
  implements TypedCommandImplementation<TInput, TOutput> {
  
  abstract readonly name: string;
  abstract readonly inputSchema: z.ZodSchema<TInput>;
  
  // Common DOM command functionality
  protected resolveTargets(context: TypedExecutionContext, target: unknown): HTMLElement[] {
    // Shared implementation
  }
  
  protected dispatchDOMEvent(element: HTMLElement, eventName: string, detail: unknown): void {
    // Shared event dispatching
  }
}
```

### Step 2: Systematic Command Updates
```typescript
// Update priority order:
// 1. ShowCommand (most similar to HideCommand)
// 2. ToggleCommand (combines hide/show)
// 3. AddCommand, RemoveCommand (class manipulation)
// 4. TriggerCommand, SendCommand (event handling)
// 5. Remaining commands based on usage frequency
```

### Step 3: Validation & Testing
```typescript
// src/commands/__tests__/enhanced-commands.test.ts
const ALL_ENHANCED_COMMANDS = [
  HideCommand,
  ShowCommand,
  ToggleCommand,
  // ... etc
];

// Test consistency across all commands
for (const CommandClass of ALL_ENHANCED_COMMANDS) {
  Deno.test(`${CommandClass.name} - Follows enhanced pattern`, () => {
    const command = new CommandClass();
    
    // Test required properties exist
    assertExists(command.metadata);
    assertExists(command.documentation);
    assertExists(command.inputSchema);
    assertEquals(typeof command.validate, 'function');
    assertEquals(typeof command.execute, 'function');
  });
}
```

## 🎯 Benefits of Systematic Application

### For LLM Agents
- **Consistent interfaces** across all commands
- **Predictable validation patterns** for reliable code generation
- **Rich metadata** for understanding command relationships
- **Bundle size optimization** hints for efficient imports

### For Developers  
- **Type safety** throughout the command system
- **IntelliSense support** for all command parameters
- **Comprehensive documentation** embedded in code
- **Tree-shakeable imports** for optimal bundle sizes

### For Maintenance
- **Consistent patterns** reduce cognitive overhead
- **Automated testing** ensures quality across commands
- **Documentation generation** keeps docs in sync
- **Clear migration path** for future enhancements

## 🚀 Implementation Timeline

**Week 1**: ShowCommand, ToggleCommand (DOM commands)
**Week 2**: AddCommand, RemoveCommand (class manipulation)  
**Week 3**: TriggerCommand, SendCommand (event handling)
**Week 4**: FetchCommand, WaitCommand (async operations)
**Week 5**: Navigation & Control commands
**Week 6**: Testing, documentation, and refinement

This systematic approach ensures all commands benefit from the enhanced TypeScript integration while maintaining consistency and quality across the entire command system.