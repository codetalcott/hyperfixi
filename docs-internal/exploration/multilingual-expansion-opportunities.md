# LokaScript Multilingual System: Expansion Opportunities

> Exploration document: New directions for the semantic layer architecture

## Executive Summary

LokaScript's semantic layer provides a **language-neutral intermediate representation (IR)** that currently enables bidirectional translation between 24 human languages. This same architecture can be extended to:

1. **Programming language code generation** (Python, JavaScript, Go, etc.)
2. **Visual/block-based programming interfaces**
3. **Natural language interfaces** (voice, chat)
4. **IDE tooling** (language servers, autocomplete)
5. **Testing and documentation generation**

The key insight: the `SemanticNode` → `Renderer` pattern is already target-agnostic.

---

## Current Architecture (Recap)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INPUT LAYER                                   │
│  24 Languages: en, es, ja, ko, ar, zh, de, fr, pt, ru, ...          │
│  Surface syntax varies by language (SVO/SOV/VSO word order)          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SEMANTIC LAYER                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  SemanticNode (language-neutral IR)                           │  │
│  │  • action: ActionType (toggle, add, remove, put, set, etc.)   │  │
│  │  • roles: Map<SemanticRole, SemanticValue>                    │  │
│  │  • 16 universal roles: patient, destination, source, etc.     │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       OUTPUT LAYER                                   │
│  Currently: 24 language renderers                                    │
│  Opportunity: Programming language renderers                         │
└─────────────────────────────────────────────────────────────────────┘
```

### The Key Abstraction: SemanticNode

```typescript
interface SemanticNode {
  kind: 'command' | 'event-handler' | 'conditional' | 'compound' | 'loop';
  action: ActionType;  // 'toggle', 'add', 'set', 'fetch', etc.
  roles: Map<SemanticRole, SemanticValue>;
  // Roles: patient, destination, source, condition, quantity, etc.
}
```

This is the **universal representation** that captures intent without language-specific syntax.

---

## Opportunity 1: Programming Language Code Generation

### Concept

Generate executable code in Python, JavaScript, TypeScript, Go, etc. from hyperscript:

```
Hyperscript (any of 24 languages)
       ↓
  SemanticNode (IR)
       ↓
  PythonRenderer / GoRenderer / etc.
       ↓
  Executable code
```

### Example: Python Renderer

```typescript
// packages/semantic/src/renderers/python.ts

class PythonRenderer implements CodeRenderer {
  render(node: SemanticNode): string {
    switch (node.action) {
      case 'toggle':
        return this.renderToggle(node);
      case 'add':
        return this.renderAdd(node);
      case 'set':
        return this.renderSet(node);
      // ... 45 actions
    }
  }

  private renderToggle(node: SemanticNode): string {
    const patient = node.roles.get('patient');
    const dest = node.roles.get('destination') ?? { type: 'reference', value: 'me' };

    // For web: generate DOM manipulation
    if (patient?.type === 'selector' && patient.selectorKind === 'class') {
      const className = patient.value.slice(1); // Remove .
      const element = this.renderValue(dest);
      return `${element}.classList.toggle('${className}')`;
    }
    // For data: generate dict manipulation
    // ...
  }
}
```

### Input/Output Examples

| Input (Hyperscript) | SemanticNode | Python Output |
|---------------------|--------------|---------------|
| `toggle .active on #btn` | `{action: 'toggle', roles: {patient: '.active', destination: '#btn'}}` | `document.querySelector('#btn').classList.toggle('active')` |
| `set x to 10` | `{action: 'set', roles: {patient: 'x', source: 10}}` | `x = 10` |
| `put "hello" into #msg` | `{action: 'put', roles: {patient: 'hello', destination: '#msg'}}` | `document.querySelector('#msg').textContent = "hello"` |
| `fetch /api/users as json` | `{action: 'fetch', roles: {destination: '/api/users', responseType: 'json'}}` | `response = requests.get('/api/users').json()` |

### Architecture for Python Package

```
packages/
└── python-codegen/
    ├── src/
    │   ├── renderer.ts        # SemanticNode → Python code
    │   ├── runtime-adapter.ts # Python runtime stubs (DOM simulation, etc.)
    │   ├── type-inference.ts  # Infer Python types from semantic values
    │   └── frameworks/
    │       ├── selenium.ts    # Browser automation via Selenium
    │       ├── playwright.ts  # Browser automation via Playwright
    │       ├── flask.ts       # Web templating
    │       └── pywebview.ts   # Desktop apps
    └── tests/
```

### Use Cases

1. **Browser automation scripts** - Write tests in natural language, generate Selenium/Playwright
2. **Data science notebooks** - Hyperscript for UI, Python for computation
3. **Cross-platform apps** - Same hyperscript runs in browser or desktop (via pywebview)
4. **Learning tool** - Students see hyperscript AND equivalent Python

---

## Opportunity 2: JavaScript/TypeScript Code Generation

### Concept

Generate idiomatic JS/TS instead of interpreted hyperscript for:
- **Build-time compilation** (zero runtime overhead)
- **Type-safe output** with TypeScript definitions
- **Framework integration** (React, Vue, Svelte)

### Example: React Component Generation

```typescript
// Input: on click toggle .active on me
// Output:
function MyComponent() {
  const [active, setActive] = useState(false);

  return (
    <button
      className={active ? 'active' : ''}
      onClick={() => setActive(!active)}
    >
      Click me
    </button>
  );
}
```

### Architecture

```
packages/
└── js-codegen/
    ├── src/
    │   ├── renderer.ts         # SemanticNode → JS/TS
    │   ├── frameworks/
    │   │   ├── vanilla.ts      # Plain DOM manipulation
    │   │   ├── react.ts        # React hooks/components
    │   │   ├── vue.ts          # Vue composition API
    │   │   ├── svelte.ts       # Svelte reactivity
    │   │   └── alpine.ts       # Alpine.js directives
    │   └── optimizers/
    │       ├── dead-code.ts    # Remove unused branches
    │       └── inline.ts       # Inline simple operations
    └── vite-plugin/            # Build-time transformation
```

---

## Opportunity 3: Bidirectional Code Understanding

### Concept

Not just hyperscript → Python, but also Python → SemanticNode:

```
Python code → PythonParser → SemanticNode → Any language
```

This enables:
- **Code migration** between languages/frameworks
- **Documentation generation** from existing code
- **Accessibility** - explain code in any human language

### Example: Python to Hyperscript

```python
# Input
button.classList.toggle('active')

# Parsed to SemanticNode
{ action: 'toggle', roles: { patient: '.active', destination: 'button' } }

# Rendered in Japanese
# ボタン の .active を 切り替え
```

### Architecture

```typescript
// packages/python-parser/src/parser.ts

class PythonSemanticParser {
  parse(code: string): SemanticNode[] {
    const ast = parsePython(code); // Use existing Python parser
    return this.extractSemantics(ast);
  }

  private extractSemantics(ast: PythonAST): SemanticNode[] {
    // Pattern match on AST structures
    // classList.toggle() → toggle command
    // element.textContent = ... → put command
    // fetch().json() → fetch command
  }
}
```

---

## Opportunity 4: Visual/Block-Based Programming

### Concept

Use SemanticNode as the interchange format for block-based editors:

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Blocks    │ ←→  │ SemanticNode │ ←→  │  Text Editor  │
│  (Blockly)  │     │     (IR)     │     │ (24 languages)│
└─────────────┘     └──────────────┘     └───────────────┘
```

### Benefits

1. **Accessibility** - Visual programming for those who prefer it
2. **Learning** - Switch between blocks and text as skill develops
3. **Multilingual** - Blocks render labels in any of 24 languages

### Architecture

```
packages/
└── block-editor/
    ├── src/
    │   ├── blocks/              # Block definitions from CommandSchemas
    │   │   ├── generator.ts     # Auto-generate blocks from schemas
    │   │   └── i18n.ts          # Multilingual block labels
    │   ├── serializers/
    │   │   ├── to-semantic.ts   # Blocks → SemanticNode
    │   │   └── from-semantic.ts # SemanticNode → Blocks
    │   └── ui/
    │       └── BlocklyAdapter.ts
    └── tests/
```

### Example Block Definition (Auto-Generated)

```typescript
// Generated from toggleSchema
Blockly.Blocks['toggle'] = {
  init: function() {
    this.appendValueInput('patient')
        .setCheck('Selector')
        .appendField(i18n('toggle')); // "toggle" / "切り替え" / "alternar"
    this.appendValueInput('destination')
        .setCheck(['Selector', 'Reference'])
        .appendField(i18n('on')); // "on" / "に" / "en"
    this.setColour(160);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};
```

---

## Opportunity 5: Natural Language Chat Interface

### Concept

Use LLMs + semantic layer for conversational programming:

```
User: "Make the button turn blue when I click it"
      ↓
LLM → SemanticNode extraction
      ↓
{ action: 'add', roles: { patient: '.blue', destination: '#button', event: 'click' } }
      ↓
Rendered: "on click add .blue to #button"
```

### Architecture

```
packages/
└── chat-interface/
    ├── src/
    │   ├── intent-extractor.ts  # LLM prompt templates
    │   ├── semantic-validator.ts # Validate LLM output against schemas
    │   ├── clarification.ts     # Generate clarifying questions
    │   └── feedback-loop.ts     # Learn from corrections
    └── prompts/
        └── extraction.txt       # Few-shot examples
```

### Example Prompt Template

```
You are a hyperscript assistant. Extract semantic commands from user requests.

User: "Hide the modal when clicking outside"
Output: { action: 'hide', roles: { patient: '#modal', event: 'click', destination: 'elsewhere' } }

User: "Show a loading spinner while fetching data"
Output: [
  { action: 'add', roles: { patient: '.loading', destination: '#spinner' } },
  { action: 'fetch', roles: { destination: '/api/data' } },
  { action: 'remove', roles: { patient: '.loading', destination: '#spinner' } }
]
```

---

## Opportunity 6: IDE Language Server

### Concept

Build a Language Server Protocol (LSP) implementation for 24-language hyperscript:

- **Autocomplete** in any language
- **Hover documentation** with translations
- **Go to definition** across languages
- **Rename refactoring**

### Architecture

```
packages/
└── language-server/
    ├── src/
    │   ├── server.ts            # LSP server implementation
    │   ├── completions/
    │   │   ├── keyword.ts       # Language-specific keywords
    │   │   ├── selector.ts      # CSS selector completion
    │   │   └── context.ts       # Context-aware suggestions
    │   ├── hover/
    │   │   ├── documentation.ts # Multi-language docs
    │   │   └── translation.ts   # Show translations on hover
    │   └── diagnostics/
    │       ├── semantic.ts      # Semantic validation
    │       └── suggestions.ts   # Did-you-mean for keywords
    └── tests/
```

### Example: Multilingual Autocomplete

```
User types: "クリック で tog"
                     ↑
Autocomplete shows:
  • 切り替え (toggle) - Toggle class/attribute
  • トグル (toggle) - Toggle class/attribute [alias]
```

---

## Opportunity 7: Test Generation

### Concept

Generate test cases from hyperscript using semantic understanding:

```typescript
// Input: on click toggle .active on #button

// Generated test (Playwright)
test('clicking button toggles active class', async ({ page }) => {
  await page.click('#button');
  await expect(page.locator('#button')).toHaveClass(/active/);
  await page.click('#button');
  await expect(page.locator('#button')).not.toHaveClass(/active/);
});
```

### Architecture

```
packages/
└── test-generator/
    ├── src/
    │   ├── analyzer.ts          # Extract testable behaviors from semantic nodes
    │   ├── generators/
    │   │   ├── playwright.ts
    │   │   ├── cypress.ts
    │   │   └── testing-library.ts
    │   └── assertions/          # Map actions to assertions
    │       ├── toggle.ts        # Toggle → class presence check
    │       ├── put.ts           # Put → content check
    │       └── fetch.ts         # Fetch → network mock
    └── tests/
```

---

## Opportunity 8: Cross-Framework Migration

### Concept

Migrate between frameworks using SemanticNode as intermediate:

```
React code → SemanticParser → SemanticNode → VueRenderer → Vue code
```

### Example

```jsx
// React input
<button onClick={() => setActive(!active)} className={active ? 'active' : ''}>

// SemanticNode (inferred)
{ action: 'toggle', roles: { patient: '.active', event: 'click' } }

// Vue output
<button @click="active = !active" :class="{ active }">

// Svelte output
<button on:click={() => active = !active} class:active>
```

---

## Implementation Roadmap

### Phase 1: Python Code Generator (High Impact)

1. Create `packages/python-codegen/`
2. Implement renderer for top 15 commands (toggle, add, remove, put, set, fetch, etc.)
3. Add Selenium/Playwright adapters for browser automation
4. Write comprehensive tests

**Estimated effort:** Medium
**Impact:** High - enables browser automation in Python

### Phase 2: JavaScript AOT Compiler

1. Create `packages/js-codegen/`
2. Build-time transformation via Vite plugin
3. Framework adapters (React, Vue, Svelte)
4. Performance benchmarks

**Estimated effort:** Medium-High
**Impact:** High - zero-runtime overhead option

### Phase 3: Block Editor

1. Create `packages/block-editor/`
2. Auto-generate blocks from CommandSchemas
3. Multilingual block labels
4. Integration with existing editors (Blockly, Scratch-like)

**Estimated effort:** High
**Impact:** Medium - accessibility, education

### Phase 4: Language Server

1. Create `packages/language-server/`
2. Implement LSP for completion, hover, diagnostics
3. VS Code extension
4. JetBrains plugin

**Estimated effort:** High
**Impact:** High - developer experience

### Phase 5: Bidirectional Translation

1. Python → SemanticNode parser
2. JavaScript → SemanticNode parser
3. Code documentation generation
4. Migration tooling

**Estimated effort:** Very High
**Impact:** Medium - niche use cases

---

## Technical Considerations

### 1. Semantic Fidelity

Not all hyperscript concepts map cleanly to other languages:

| Hyperscript | Challenge | Solution |
|-------------|-----------|----------|
| `me` reference | Context-dependent | Explicit element parameter |
| `wait 2s` | Async model differs | async/await or callbacks |
| `transition` | CSS animation | Framework-specific APIs |
| `behavior` | No direct equivalent | Class/mixin patterns |

### 2. DOM vs Non-DOM Targets

Hyperscript is DOM-centric. For non-browser targets:

- **Python CLI:** Generate console-based equivalents
- **Data processing:** Map DOM operations to data structures
- **API servers:** Generate route handlers from fetch patterns

### 3. Type Safety

The semantic layer can infer types:

```typescript
// SemanticValue types map to target language types
type TypeMapping = {
  'selector': { python: 'Element', typescript: 'Element' },
  'literal/string': { python: 'str', typescript: 'string' },
  'literal/number': { python: 'int | float', typescript: 'number' },
  'reference/me': { python: 'self', typescript: 'this' },
};
```

---

## Open Questions

1. **Scope control:** How much of hyperscript to support in each target?
2. **Runtime dependencies:** Pure code generation vs. runtime helpers?
3. **Ecosystem integration:** Package managers, build tools, IDEs?
4. **Community involvement:** Which targets are most requested?

---

## Conclusion

The semantic layer architecture positions LokaScript as more than a hyperscript implementation—it's a **universal DSL compiler infrastructure** for DOM manipulation across human and programming languages. The key insight is that the SemanticNode IR is inherently target-agnostic.

Priority recommendations:

1. **Python code generator** - Highest impact for automation/testing
2. **JavaScript AOT compiler** - Performance-critical use cases
3. **Language server** - Developer experience improvement

Each builds on the existing architecture without requiring fundamental changes.
