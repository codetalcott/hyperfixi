# A comprehensive, step-by-step plan to architect, design, and build the integrated Fixi.js and Hyperscript library using our new, improved syntax

This plan is structured in phases, moving from project setup to a final, publishable library.

---

### **Phase 0: Foundation & Project Setup**

The goal of this phase is to create a professional, modern TypeScript project environment configured for building a tree-shakable library.

* **Step 1: Initialize the Project**
    * Create a new directory: `mkdir hyperscript-fixi`
    * Initialize a Node.js project: `npm init -y`
    * Install core dependencies: `npm install fixi.js hyperscript.org`
    * Install development dependencies: `npm install -D typescript rollup @rollup/plugin-typescript @rollup/plugin-node-resolve rollup-plugin-terser`

* **Step 2: Configure TypeScript**
    * Create a `tsconfig.json` file.
    * Configure it for modern, tree-shakable library output:
        ```json
        {
          "compilerOptions": {
            "target": "ES2020",
            "module": "ESNext",
            "moduleResolution": "node",
            "declaration": true, // Generates .d.ts files
            "outDir": "./dist",
            "strict": true,
            "esModuleInterop": true,
            "skipLibCheck": true,
            "forceConsistentCasingInFileNames": true
          },
          "include": ["src/**/*"],
          "exclude": ["node_modules", "dist"]
        }
        ```

* **Step 3: Configure the Bundler (Rollup)**
    * Create a `rollup.config.mjs` file.
    * Set up configurations to output multiple formats (ESM for bundlers, UMD for browsers):
        ```javascript
        import typescript from '@rollup/plugin-typescript';
        import { nodeResolve } from '@rollup/plugin-node-resolve';
        import terser from '@rollup/plugin-terser';

        export default {
          input: 'src/index.ts',
          output: [
            {
              file: 'dist/hyperscript-fixi.mjs', // For modern bundlers
              format: 'es',
              sourcemap: true,
            },
            {
              file: 'dist/hyperscript-fixi.min.js', // For <script> tags
              format: 'umd',
              name: 'hyperscriptFixi', // Global variable name
              plugins: [terser()],
              sourcemap: true,
            },
          ],
          plugins: [nodeResolve(), typescript()],
        };
        ```

* **Step 4: Set Up Project Structure**
    * `src/`: Main source code will live here.
    * `dist/`: Bundled output will go here (ignored by git).
    * `examples/`: HTML files for manual testing and demonstration.

---

### **Phase 1: The Parser - Teaching Hyperscript Our Syntax**

This is the most critical design phase. We'll implement the logic that understands our `fetch` command's grammar.

* **Step 5: Create the Main Entry Point (`src/index.ts`)**
    * This file will import Hyperscript and register our custom command.

* **Step 6: Design the Command Registration**
    * In `src/index.ts`, use Hyperscript's `addCommand` API.
        ```typescript
        import { _hyperscript } from 'hyperscript.org';

        _hyperscript.addCommand('fetch', (parser, runtime, tokens) => {
          // Our parsing logic will go here
        });
        ```

* **Step 7: Implement the Syntax Parser**
    * Inside the `addCommand` callback, implement a state machine to parse the tokens.
    * **Parse URL:** The first argument is always the URL. Use `parser.parseElementExpression()` to allow for dynamic URLs.
    * **Detect Syntax Form:** "Peek" at the next token.
        * If it's `with`, branch to the "Extended Syntax" parser.
        * If it's a placement keyword (`replace`, `put`, `append`, `prepend`), `and`, or `then`, branch to the "Shorthand Syntax" parser.
    * **Build the Shorthand Parser:**
        * If the token is `and`, consume it.
        * Parse the placement keyword (e.g., `tokens.matchToken('replace')`).
        * If placement is `put`, consume the next token (`into`).
        * If placement is `append` or `prepend`, consume the next token (`to`).
        * Parse the target CSS selector using `parser.parseElementExpression()`.
    * **Build the Extended Parser:**
        * Consume the `with` token.
        * Loop: Parse option keys (`method`, `body`, etc.), consume the colon, and parse the option value with `parser.parseElementExpression()`. Store these in an `options` object. Continue until `then` or the end of the expression.
    * **Parser Output:** The parser should create a single, structured `command` object that contains all the parsed information (e.g., `{ url, placement, target, options: { method, body, ... } }`).

---

### **Phase 2: The Runtime - Making the `fetch` Command Work**

With the syntax parsed, we now execute the logic by wrapping Fixi.js.

* **Step 8: Implement the Runtime Logic**
    * The parser, upon completion, calls `runtime.addStep()`. The function passed to `addStep` is what executes when the event fires.
    * This function will receive the `command` object created by the parser.

* **Step 9: Translate Our Syntax to Fixi.js Options**
    * Inside the runtime step, import `doRequest` from `fixi.js`.
    * Create a `fixiOptions` object.
    * Map the parsed `command` object to `fixiOptions`:
        * `fixiOptions.url = command.url`
        * `fixiOptions.method = command.options.method || 'GET'`
        * `fixiOptions.body = command.options.body`
        * Translate our placement keywords to Fixi's `swap` option:
            * `put into` -> `swap: 'innerHTML'`
            * `replace` -> `swap: 'outerHTML'`
            * `append to` -> `swap: 'beforeend'`
            * `prepend to` -> `swap: 'afterbegin'`
        * `fixiOptions.target = command.target`

* **Step 10: Execute the Request and Handle the Result**
    * Call `const response = await doRequest(fixiOptions)`.
    * Make the server's response available to subsequent `then` clauses in Hyperscript by calling `runtime.setIt(response)`.

---

### **Phase 3: Advanced Features & Error Handling**

Make the library robust and unlock the advanced event-driven patterns.

* **Step 11: Implement Error Handling**
    * Wrap the `doRequest` call in a `try...catch` block.
    * On failure, `send` a custom DOM event like `fixi:error` from the element, including the error details. This makes failures observable: `<div _="on click fetch /bad/url on fixi:error log it.detail">`.

* **Step 12: Implement Event Broadcasting**
    * Add `broadcast` or `trigger` as a recognized option in the extended syntax parser.
    * In the runtime, if this option is present, `send` the specified custom event to the specified target (e.g., `body`) after a successful fetch. Pass the response as a detail.

---

### **Phase 4: Developer Experience (DX) & Tooling**

A library is only as good as its types and its ease of use.

* **Step 13: Create TypeScript Definitions for Users**
    * Create a file `src/types.d.ts`.
    * Use `declare global` to augment Hyperscript's namespace, providing autocomplete and type safety for the `fetch` command in supported editors.
        ```typescript
        declare global {
          namespace Hyperscript {
            interface Commands {
              fetch(url: string, ...args: any[]): Promise<any>;
            }
          }
        }
        ```

---

### **Phase 5: Documentation & Deployment**

Package and present the library for the world.

* **Step 14: Write Comprehensive Documentation**
    * Create a high-quality `README.md`.
    * Include:
        * A compelling introduction.
        * Installation and usage instructions.
        * A detailed **Syntax Guide** covering both shorthand and extended forms with clear examples.
        * An **API / Options** table.
        * A section on **Advanced Patterns** (error handling, event broadcasting).

* **Step 15: Publish to npm**
    * Ensure `package.json` has the correct `main`, `module`, and `types` fields pointing to the `dist/` files.
    * Run `npm publish` to share your creation with the community.

## Overview

## Integrating Fixi.js and Hyperscript: A Modular, Tree-Shakable Approach

For developers seeking a lightweight, modern, and highly modular approach to front-end development, integrating the minimalist power of Fixi.js with the expressive syntax of Hyperscript in a TypeScript environment presents a compelling solution. This combination allows for declarative HTML-based interactions with robust, tree-shakable JavaScript, ensuring that final application bundles are as small as possible.

This guide outlines a strategy for a modular TypeScript integration of Fixi.js and Hyperscript, focusing on a unified syntax and effective tree-shaking.

---

### Core Concepts: Simplicity and Modularity

**Fixi.js** is a minimalist library, inspired by htmx, that provides a set of HTML attributes for making AJAX requests and updating the DOM. Its simplicity is its strength, with a small API surface consisting of `fx-` prefixed attributes.

**Hyperscript** offers a clean, English-like syntax for handling events and manipulating the DOM directly within HTML. It is designed to be extensible and can be readily integrated with other libraries.

The goal of this integration is to leverage Hyperscript as the primary interface for controlling Fixi.js's features, creating a more cohesive and readable syntax while maintaining the modular nature of both libraries.

---

### A Unified and Integrated Syntax

A key aspect of this integration is to move away from using Fixi.js's `fx-` attributes directly and instead use Hyperscript's event handling and command structure to trigger Fixi.js functionality. This promotes a more consistent and expressive coding style.

**Proposed Syntax:**

Instead of the standard Fixi.js approach:

```html
<button fx-action="/clicked" fx-trigger="click" fx-target="#result">
  Click Me
</button>
```

The integrated syntax would utilize Hyperscript's `on` event handler to call a custom command that wraps Fixi.js's core `doRequest` function:

```html
<button _="on click call fixi.get('/clicked') then put it into #result">
  Click Me
</button>
```

This approach offers several advantages:

* **Readability:** The Hyperscript version is arguably more explicit and easier to understand for those familiar with the syntax.
* **Flexibility:** Hyperscript's feature set, such as conditionals and loops, can be combined with Fixi.js actions.
* **Consistency:** All client-side logic is handled through a single, consistent syntax.

---

### Achieving Modularity and Tree-Shaking

To ensure that unused code is eliminated from the final bundle, the integration must be structured around ES modules and a clear separation of concerns.

#### **1. Modular Fixi.js Wrapper:**

Create a set of TypeScript modules that wrap the core functionalities of Fixi.js. Each module should correspond to a specific feature, such as GET requests, POST requests, or different swapping behaviors.

```typescript
// src/fixi-modules/http.ts
import { doRequest } from 'fixi.js';

export function get(url: string, target: string) {
  // Logic to create and dispatch a GET request using doRequest
}

export function post(url: string, body: any, target: string) {
  // Logic to create and dispatch a POST request
}
```

#### **2. Custom Hyperscript Commands:**

Develop custom Hyperscript commands that utilize these modular Fixi.js wrappers. This is the bridge between the two libraries.

```typescript
// src/hyperscript-commands/fixi-commands.ts
import * as fixiHttp from '../fixi-modules/http';
import { _hyperscript } from 'hyperscript.org';

_hyperscript.addCommand('get', (parser, runtime, tokens) => {
  if (tokens.matchToken('from')) {
    const url = parser.parseElementExpression();
    // ... parsing logic for target, etc.
    runtime.addStep(async () => {
      const urlValue = await url.evaluate();
      fixiHttp.get(urlValue, /* target */);
    });
  }
});
```

#### **3. Smart Imports and Tree-Shaking Configuration:**

The application's entry point will only import the specific Hyperscript commands and Fixi.js modules that are actually used.

```typescript
// src/main.ts
import 'hyperscript.org';
import './hyperscript-commands/fixi-commands'; // Imports all fixi commands
```

To enable effective tree-shaking, your project's `package.json` should include the `sideEffects` flag:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "sideEffects": false
}
```

This tells bundlers like Webpack or Rollup that your modules do not have side effects, allowing them to safely prune any unused imported modules.

---

### Strong Typing with TypeScript

A significant benefit of this approach is the ability to provide strong typing for the integrated syntax. By defining types for the custom Hyperscript commands and the data being passed, developers can catch errors during development rather than at runtime.

```typescript
// src/types.ts
declare global {
  namespace Hyperscript {
    interface Commands {
      get: (url: string) => Promise<void>;
      post: (url: string, body: object) => Promise<void>;
      put: (selector: string) => { into: (target: string) => void };
    }
  }
}
```

By extending the Hyperscript namespace, you can provide autocompletion and type-checking within your editor for the custom commands, enhancing the developer experience.

By following this modular and integrated approach, you can create a powerful, lightweight, and modern web development stack that combines the best of Fixi.js and Hyperscript in a type-safe and highly optimized package.