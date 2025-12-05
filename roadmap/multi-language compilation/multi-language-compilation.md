# HyperFixi: prospects for multi-language (eg Go, Python) compilation

## Current Architecture Strengths

The codebase has clean separation that makes multi-target compilation feasible

Parser → AST (target-agnostic)
AST → Runtime Execution (currently JS-only)
The key insight: add an AST → Code Generation phase parallel to execution.

## Required Modifications

1. Create an Emitter Interface
// packages/core/src/compiler/emitter.ts
export interface CodeEmitter {
  target: 'javascript' | 'python' | 'go' | 'c';
  
  emitProgram(ast: ProgramNode): string;
  emitCommand(node: CommandNode): string;
  emitExpression(node: ExpressionNode): string;
  emitEventHandler(node: EventHandlerNode): string;
  
  // Target-specific helpers
  emitPreamble(): string;  // imports, headers
  emitPostamble(): string; // main(), cleanup
}

2. Implement Target-Specific Emitters

JavaScript Emitter (simplest - close to source):

class JavaScriptEmitter implements CodeEmitter {
  emitCommand(node: CommandNode): string {
    switch (node.name) {
      case 'set':
        return `${this.emitExpr(node.args[0])} = ${this.emitExpr(node.args[1])};`;
      case 'if':
        return `if (${this.emitExpr(node.condition)}) { ${this.emitBlock(node.then)} }`;
      // ...
    }
  }
}

Python Emitter (requires semantic mapping):

class PythonEmitter implements CodeEmitter {
  emitCommand(node: CommandNode): string {
    switch (node.name) {
      case 'set':
        return `${this.emitExpr(node.args[0])} = ${this.emitExpr(node.args[1])}`;
      case 'repeat':
        // 'repeat 5 times' → 'for _ in range(5):'
        return `for _ in range(${node.count}):\n${this.indent(this.emitBlock(node.body))}`;
      // ...
    }
  }
}

Go Emitter (requires type declarations):

class GoEmitter implements CodeEmitter {
  emitCommand(node: CommandNode): string {
    switch (node.name) {
      case 'set':
        // Needs type inference
        const varType = this.inferType(node.args[1]);
        return `var ${node.args[0].name} ${varType} = ${this.emitExpr(node.args[1])}`;
      // ...
    }
  }
}

C Emitter (most complex - manual memory management):

class CEmitter implements CodeEmitter {
  emitCommand(node: CommandNode): string {
    switch (node.name) {
      case 'set':
        const cType = this.toCType(this.inferType(node.args[1]));
        return `${cType} ${node.args[0].name} = ${this.emitExpr(node.args[1])};`;
      // ...
    }
  }
  
  toCType(hsType: string): string {
    return { 'Int': 'int', 'String': 'char*', 'Number': 'double' }[hsType];
  }
}

3. Expression Compilation (Key Challenge)
The existing expression evaluator is runtime-based. Need a parallel compileExpression():

// packages/core/src/expressions/expression-compiler.ts
export class ExpressionCompiler {
  constructor(private target: CompilationTarget) {}
  
  compile(node: ExpressionNode): CompiledExpression {
    switch (node.type) {
      case 'BinaryExpression':
        return this.compileBinary(node);
      case 'MemberExpression':
        return this.compileMemberAccess(node);
      case 'PossessiveExpression':
        return this.compilePossessive(node);
      // ...
    }
  }
  
  private compileBinary(node: BinaryExpressionNode): CompiledExpression {
    const left = this.compile(node.left);
    const right = this.compile(node.right);
    const op = this.mapOperator(node.operator);
    
    return {
      code: `(${left.code} ${op} ${right.code})`,
      type: this.inferResultType(node.operator, left.type, right.type)
    };
  }
}

4. Type System Extensions
Leverage the existing type-registry.ts but add target type mappings:

// packages/core/src/compiler/type-mapping.ts
export const TYPE_MAPPINGS: Record<HyperscriptType, Record<Target, string>> = {
  'Int': {
    javascript: 'number',
    python: 'int',
    go: 'int64',
    c: 'int64_t'
  },
  'String': {
    javascript: 'string',
    python: 'str',
    go: 'string',
    c: 'char*'
  },
  'element': {
    javascript: 'HTMLElement',
    python: 'Element',  // lxml or similar
    go: '*html.Node',   // golang.org/x/net/html
    c: 'xml_node*'      // libxml2
  }
};

5. DOM Abstraction Layer
For non-JS targets, need DOM library bindings:

Target	DOM Library	Notes
Python	lxml, BeautifulSoup	Server-side DOM
Go	golang.org/x/net/html	Parse/query HTML
C	libxml2	Full DOM implementation
// packages/core/src/compiler/dom-bindings.ts
export interface DOMBinding {
  querySelector(selector: string): string;
  setAttribute(el: string, attr: string, value: string): string;
  addEventListener(el: string, event: string, handler: string): string;
}

export const pythonDOMBinding: DOMBinding = {
  querySelector: (sel) => `doc.cssselect("${sel}")[0]`,
  setAttribute: (el, attr, val) => `${el}.set("${attr}", ${val})`,
  // Python server-side: no event listeners, compile to different pattern
};

6. Compilation Pipeline
// packages/core/src/compiler/compiler.ts
export class HyperscriptCompiler {
  constructor(
    private parser: Parser,
    private emitter: CodeEmitter
  ) {}
  
  compile(source: string): CompilationResult {
    // 1. Parse to AST (existing)
    const ast = this.parser.parse(source);
    
    // 2. Type inference pass (new)
    const typedAst = this.typeInference.analyze(ast);
    
    // 3. Optimization pass (optional)
    const optimizedAst = this.optimizer.optimize(typedAst);
    
    // 4. Code generation (new)
    const code = this.emitter.emitProgram(optimizedAst);
    
    return { code, sourceMap: this.generateSourceMap() };
  }
}

## Major Challenges by Target

Python
DOM Events: No equivalent; compile to Flask/Django view handlers
Async: Map wait to asyncio.sleep()
CSS Selectors: Use lxml's cssselect
Go
Type System: Requires explicit types; need full type inference
DOM: golang.org/x/net/html is query-only; mutations need custom code
Concurrency: Map async to goroutines
C
Memory Management: Need to track allocations/frees
DOM: libxml2 bindings are verbose
String Handling: All string ops need buffer management
No Closures: Event handlers need struct-based state

## Recommended Implementation Path

Phase 1: JavaScript Emitter (~2 weeks work)

Validate the emitter architecture
Static JS output for server-side rendering
Phase 2: Python Emitter (~3 weeks)

Server-side hyperscript for Django/Flask
Template preprocessing
Phase 3: Go Emitter (~4 weeks)

Type inference system critical
HTML manipulation library
Phase 4: C Emitter (~6 weeks)

Most complex due to memory management
Useful for embedded/WASM targets
Example Compilation
Input (Hyperscript):

on click
  set x to 5
  repeat 3 times
    increment x
  log x

Output (JavaScript):

document.addEventListener('click', () => {
  let x = 5;
  for (let i = 0; i < 3; i++) {
    x++;
  }
  console.log(x);
});

Output (Python):

def handle_click():
    x = 5
    for _ in range(3):
        x += 1
    print(x)

Output (Go):

func handleClick() {
    x := 5
    for i := 0; i < 3; i++ {
        x++
    }
    fmt.Println(x)
}

Output (C):

void handle_click() {
    int64_t x = 5;
    for (int i = 0; i < 3; i++) {
        x++;
    }
    printf("%lld\n", x);
}

## Files to Create

packages/core/src/compiler/
├── emitter.ts              # Base emitter interface
├── type-mapping.ts         # Cross-language type mappings
├── expression-compiler.ts  # Expression → code generation
├── targets/
│   ├── javascript.ts       # JS emitter
│   ├── python.ts           # Python emitter
│   ├── go.ts               # Go emitter
│   └── c.ts                # C emitter
├── dom-bindings/
│   ├── browser.ts          # Browser DOM (existing runtime)
│   ├── lxml.ts             # Python lxml bindings
│   ├── gohtml.ts           # Go html package bindings
│   └── libxml2.ts          # C libxml2 bindings
└── compiler.ts             # Main compilation pipeline

The existing architecture with clean AST separation, modular command system, and type registry provides an excellent foundation. The main work is building the code generation layer.