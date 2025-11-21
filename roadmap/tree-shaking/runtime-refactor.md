The current Runtime class violates the **Open-Closed Principle**: it is modified every time a new command is added, and it tightly couples the execution engine to the specific command implementations.

Extracting a RuntimeBase is the correct strategy to enable tree-shaking. To do this effectively, we must invert the dependencies so the Runtime doesn't "know" about specific commands.

Here is an architectural blueprint and refactoring plan to achieve a tree-shakable Runtime.

### **The Architectural Shift**

Currently, our architecture looks like this (dependency arrows point *down*):

Code snippet

graph TD  
    UserCode \--\> Runtime  
    Runtime \--\> HideCommand  
    Runtime \--\> ShowCommand  
    Runtime \--\> FetchCommand  
    Runtime \--\> ...20 others...

**Result:** Even if UserCode only uses "Hide", the bundler includes "Fetch" because Runtime imports it.

We need to shift to this **Dependency Injection** model:

Code snippet

graph TD  
    UserCode \--\> RuntimeBase  
    UserCode \--\> CommandRegistry  
    UserCode \--\> HideCommand  
    CommandRegistry \--\> HideCommand  
    RuntimeBase \--\> CommandRegistry

**Result:** If UserCode doesn't import "Fetch", it never ends up in the bundle.

---

### **Step 1: Extract RuntimeBase**

Create a new class RuntimeBase that contains **only** the logic required to traverse the AST and manage context. It must have **zero** command imports.

**File:** core/runtime-base.ts

TypeScript

import { EnhancedCommandRegistry } from './command-adapter';  
// Import ONLY types and core logic  
import type { ASTNode, ExecutionContext, CommandNode } from '../types/base-types';  
import { ExpressionEvaluator } from '../core/expression-evaluator';

export interface RuntimeConfig {  
    // The registry is now passed IN, not created internally  
    registry: EnhancedCommandRegistry;  
    expressionEvaluator?: ExpressionEvaluator;  
}

export class RuntimeBase {  
  protected registry: EnhancedCommandRegistry;  
  protected expressionEvaluator: ExpressionEvaluator;

  constructor(config: RuntimeConfig) {  
    this.registry \= config.registry;  
    this.expressionEvaluator \= config.expressionEvaluator || new ExpressionEvaluator();  
  }

  // 1\. GENERIC Execute Wrapper  
  async execute(node: ASTNode, context: ExecutionContext): Promise\<unknown\> {  
     // ... logic to switch on node.type (program, block, etc.) ...  
     // When a 'command' node is found, delegate to generic handler:  
     if (node.type \=== 'command') {  
         return this.executeCommand(node as CommandNode, context);  
     }  
     // ...  
  }

  // 2\. GENERIC Command Execution (No switch statements\!)  
  protected async executeCommand(node: CommandNode, context: ExecutionContext): Promise\<unknown\> {  
    const { name, args, modifiers } \= node;  
    const commandName \= name.toLowerCase();

    // Check registry  
    if (this.registry.has(commandName)) {  
        const adapter \= await this.registry.getAdapter(commandName);  
          
        // MOVED LOGIC: The adapter itself should handle argument processing  
        // We pass the raw Context and AST info to the adapter.  
        return await adapter.execute(context, { args, modifiers });  
    }

    throw new Error(\`Unknown command: ${name}\`);  
  }  
}

### **Step 2: Refactor Command Adapters (The Hard Part)**

Our current Runtime.ts contains specific logic for parsing arguments (e.g., buildCommandInputFromModifiers lines 470-580). This logic prevents tree-shaking because Runtime has to know how fetch works vs how append works.

You must move this logic **into the Command definitions**.

**Example: Moving append logic**

Current: Runtime.ts parses append X to Y.  
Refactored: AppendCommand.ts parses itself.

TypeScript

// commands/dom/append.ts  
export const createAppendCommand \= () \=\> ({  
  name: 'append',  
  // The execute method now accepts the generic AST/Input  
  execute: async (context, input) \=\> {  
    let content, target;  

    // Logic moved from Runtime.ts to here  
    if (input.modifiers && input.modifiers.to) {  
       content \= await context.evaluate(input.args\[0\]);  
       target \= await context.evaluate(input.modifiers.to);  
    } else {  
       // Fallback logic  
    }  
      
    // Actual DOM append logic...  
  }  
});

### **Step 3: Create the "Batteries-Included" Runtime**

To maintain backward compatibility and existing test suites, you recreate the original Runtime class by extending RuntimeBase and pre-loading it.

**File:** runtime.ts (The original file, significantly smaller)

TypeScript

import { RuntimeBase } from './core/runtime-base';  
import { EnhancedCommandRegistry } from './command-adapter';

// Import all commands here (This file is NOT tree-shakable, which is fine)  
import { createHideCommand } from '../commands/dom/hide';  
import { createShowCommand } from '../commands/dom/show';  
// ... other imports

export class Runtime extends RuntimeBase {  
  constructor(options: RuntimeOptions \= {}) {  
    // 1\. Create Registry  
    const registry \= new EnhancedCommandRegistry();

    // 2\. Register Defaults (The "Bloat" stays here, isolated)  
    registry.register(createHideCommand());  
    registry.register(createShowCommand());  
    // ... register all others

    // 3\. Initialize Base  
    super({   
        registry,   
        // options...   
    });  
  }  
}

### **Step 4: How the User gets Tree-Shaking**

Now, a user who wants a minimal bundle performs the following:

TypeScript

// user-app.ts  
import { RuntimeBase } from 'hyperscript/core/runtime-base';  
import { EnhancedCommandRegistry } from 'hyperscript/core/command-adapter';

// Import ONLY what is needed  
import { createShowCommand } from 'hyperscript/commands/dom/show';

const registry \= new EnhancedCommandRegistry();  
registry.register(createShowCommand());

// This runtime has NO code related to fetch, transition, put, etc.  
const myRuntime \= new RuntimeBase({ registry });

### **Specific Refactoring Tasks for runtime.ts**

To achieve this, you need to address specific blocks in Our uploaded file:

1. **Remove buildCommandInputFromModifiers (Lines 471-579):**  
   * Move the specific case 'append', case 'fetch', etc., logic into the respective command factory files.  
2. **Remove executeEnhancedCommand massive if/else block (Lines 610-1150):**  
   * This section does manual argument parsing (e.g., checking for me, toggle patterns).  
   * **Action:** Create a utility ArgumentResolver class or helper functions that Commands can use, but remove the hardcoded command names from Runtime.  
3. **Remove Legacy Command Methods (Lines 1210-1260 & 1480+):**  
   * executeHideCommand, executeShowCommand, executeWaitCommand should be deleted from RuntimeBase.  
   * Ensure the createHideCommand implementation covers all logic currently in executeHideCommand.  
4. **Event Handlers (Lines 1288-1445):**  
   * executeEventHandler is mostly generic, but it has specific logic for mutation and change.  
   * **Strategy:** Keep this in RuntimeBase for now as it relies on DOM APIs (MutationObserver) rather than other heavy modules. It's "Core" enough.

### **Next Steps**

Complete the **draft RuntimeBase.ts** (roadmap/tree-shaking/RuntimeBase.ts) with the specific AST traversal logic extracted.

Design Decisions:

Inversion of Control: The EnhancedCommandRegistry is now injected via the constructor options. The Base doesn't know what is in the registry, only how to ask it for an adapter.

Removal of Argument Parsing: I have removed buildCommandInputFromModifiers and the massive executeEnhancedCommand switch block. The RuntimeBase now passes the raw AST args and modifiers directly to the Command Adapter. The Command Adapter is now responsible for parsing its own arguments.

Preserved DOM Glue: I kept executeEventHandler and installBehaviorOnElement because they are fundamental to how Hyperscript interacts with the DOM, regardless of which specific commands are loaded.
