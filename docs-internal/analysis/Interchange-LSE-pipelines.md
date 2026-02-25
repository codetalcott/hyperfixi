# Two Separate IR Worlds Today

The monorepo has two pipelines that don't directly talk to each other:

- Pipeline A — InterchangeNode (expression-level AST)

hyperscript source → core/semantic parser → fromCoreAST()/fromSemanticAST()
→ InterchangeNode → AOT compiler (JS codegen), Language Server (LSP)

- Pipeline B — LSE SemanticNode (command-level semantic IR)

24 languages / bracket syntax / LLM JSON → framework parser
→ framework SemanticNode → toProtocolJSON() → LSE wire format
→ domain code generators (SQL, Playwright, React, LLM specs), MCP server
The one crossing point is the AOT compiler's semantic adapter, which goes semantic parser → core-like AST → InterchangeNode, bypassing LSE entirely.

## Would a Converter Be Beneficial?

Strong yes — InterchangeNode → LSE
This is the more valuable direction. Benefits:

AOT compiler could target LSE as an intermediate step. Instead of going directly to JS, it could emit LSE, then use the protocol's multi-language implementations (Go, Rust, Python) to generate code in those runtimes. One codegen path instead of N.

Language server could expose LSE. Hover info could show the LSE bracket form ([toggle patient:.active destination:#button]) — a language-neutral view of what the code means. Useful for multilingual developers.

MCP tools could work on parsed hyperscript. Today the MCP server only works with framework-world inputs. A converter would let you pipe core-parsed hyperscript through MCP's convert_format, validate_explicit, etc.

LLM round-tripping. Parse hyperscript → InterchangeNode → LSE → send to LLM → get LSE back → compile. The LSE format was designed for LLM readability.

## Feasible but lossy — LSE → InterchangeNode

This direction is harder because LSE treats expressions as opaque ({ type: "expression", raw: "x + 1" }) while InterchangeNode has full expression trees (BinaryNode, CallNode, etc.). You'd need to either:

Re-parse raw strings (requires the core parser)
Leave them as LiteralNode wrappers (lossy)
However, this would enable:

Domain DSL outputs feeding into the AOT compiler (compile BDD/SQL/Flow DSLs to JS)
Protocol test fixtures as AOT compiler test inputs
Real gap discovered: v1.2 divergence
The protocol spec (v1.2) has features the framework hasn't caught up to:

try/catch/finally, all/race, match/arms, pipe chains, annotations, diagnostics
The framework's toProtocolJSON() / fromProtocolJSON() can't handle these yet
InterchangeNode also lacks these (no try/catch, match, async coordination, annotations)
Both IRs need v1.2 alignment before a converter would be complete.

## Recommended approach

The highest-value, lowest-risk integration would be a one-way InterchangeNode → LSE converter in the core package:

// packages/core/src/ast-utils/interchange/to-lse.ts
export function toLSE(node: InterchangeNode): SemanticNode { ... }
This would map CommandNode roles directly, collapse expression subtrees to { type: "expression", raw: renderExpr(node) }, and convert control flow nodes to LSE's field-based encoding. The expression collapsing is intentional — LSE deliberately abstracts away expression-level detail.

## InterchangeNode → SemanticNode (LSE) Converter Plan

### Context

The monorepo has two IR pipelines that don't talk to each other:

Pipeline A (InterchangeNode): expression-level AST with 16 node types and full expression trees. Used by AOT compiler, language server.
Pipeline B (SemanticNode/LSE): command-level semantic IR with 5 node kinds and opaque expression values. Used by MCP server, domain DSLs, protocol JSON.

A one-way converter InterchangeNode → SemanticNode bridges these pipelines. This enables:

AOT compiler targeting LSE as intermediate step (one codegen path to Go/Rust/Python via protocol)
Language server showing LSE bracket form in hover info
MCP tools working on parsed hyperscript (pipe core-parsed code through convert_format, validate_explicit, etc.)
LLM round-tripping: parse → InterchangeNode → LSE → send to LLM → get LSE back → compile
Files to create/modify
File Action
packages/framework/src/ir/from-interchange.ts Create — the converter
packages/framework/src/ir/from-interchange.test.ts Create — tests
packages/framework/src/ir/index.ts Edit — add export
packages/mcp-server/src/tools/ir-tools.ts Edit — extend convert_format tool
packages/mcp-server/src/**tests**/ir-tools.test.ts Edit — add interchange tests

### Step 1: Create the converter

File: packages/framework/src/ir/from-interchange.ts

Input typing (structural, no core dependency)
Define a minimal INode interface with type: string discriminant and [key: string]: unknown. This is structurally compatible with InterchangeNode from both core and semantic packages — same pattern used by from-core.ts (interface CoreNode).

Main function: fromInterchangeNode(node: INode): SemanticNode
Switch on node.type:

InterchangeNode type Output Factory
event (EventNode) event-handler createEventHandlerNode()
command (CommandNode) command createCommandNode()
if (IfNode) conditional createConditionalNode()
repeat (RepeatNode) loop (times/forever/while/until) createLoopNode()
foreach (ForEachNode) loop (for) createLoopNode()
while (WhileNode) loop (while) createLoopNode()
Expression nodes (literal, selector, etc.) Wrap in command createCommandNode('get', { patient: value })
Value conversion: convertValue(node: INode): SemanticValue
Direct mappings (no loss):

literal → createLiteral(value, inferDataType(value))
selector → createSelector(value, inferSelectorKind(value)) — infer kind from prefix: #→id, .→class, [→attribute, etc.
identifier where value is known reference (me/you/it/result/event/target/body) → createReference(value)
identifier (other) → createLiteral(value, 'string')
variable → createExpression() with scope prefix (:name, $name, or bare name)
possessive → createPropertyPath(convertValue(object), property)
Collapsed to ExpressionValue (intentionally lossy):

binary → createExpression(renderExpr(node))
unary → createExpression(renderExpr(node))
member → createExpression(renderExpr(node))
call → createExpression(renderExpr(node))
positional → createExpression(renderExpr(node))
Expression renderer: renderExpr(node: INode): string
Recursively stringifies expression trees:

literal → String(value) (quote strings with spaces)
identifier → value
selector → value
variable → scope-prefixed name
binary → ${renderExpr(left)} ${op} ${renderExpr(right)}
unary → ${op} ${renderExpr(operand)}
member → ${renderExpr(object)}.${property} or [${renderExpr(property)}] if computed
possessive → ${renderExpr(object)}'s ${property}
call → ${renderExpr(callee)}(${args.map(renderExpr).join(', ')})
positional → ${position} ${renderExpr(target)}
Role mapping for CommandNode
When roles present (semantic parser path): Convert each Record<string, InterchangeNode> entry via convertValue() → Map<string, SemanticValue>.

When roles absent (core parser path): Infer by command name using the same heuristics as from-core.ts role inference (lines 403-513):

toggle/add/remove/show/hide → patient: args[0], destination: target
put → patient: args[0], destination: target, method (into/before/after)
set → destination: target, source: args[0]
increment/decrement → destination: target, quantity: args[0]
fetch → source: args[0], responseType
wait → duration: args[0]
send/trigger → patient: args[0], destination: target
log → patient: args[0]
Default → patient: args[0], destination: target (if present)
EventModifiers bridging
InterchangeNode EventModifiers.from is string; SemanticNode EventModifiers.from is SemanticValue.

Bridge: inferValueFromString(from) — check prefix for selector kind or known reference.
once, debounce, throttle map directly.
prevent, stop, passive, capture (InterchangeNode-only) → encode as boolean roles on the event handler node.
queue (SemanticNode-only) → left undefined.
IfNode.elseIfBranches handling
InterchangeNode supports elseIfBranches array but ConditionalSemanticNode only has thenBranch/elseBranch. Chain as nested conditionals: each else-if becomes a ConditionalSemanticNode in the previous node's elseBranch.

### Step 2: Create tests

File: packages/framework/src/ir/from-interchange.test.ts

Test groups:

Direct value mappings — all 10 expression node types → SemanticValue
Expression collapsing — binary, unary, member, call, positional → ExpressionValue raw strings
Command conversion — with roles (passthrough), without roles (inference for toggle, put, set, fetch, etc.)
Control flow — if, if/else, if/elseIf/else, repeat (times/forever/while/until), foreach, while
Event handlers — basic event, with modifiers, with body, modifier bridging (from string → SemanticValue)
Round-trip — InterchangeNode → SemanticNode → renderExplicit() → bracket string; → toProtocolJSON() → ProtocolNodeJSON
Edge cases — null input, unknown node types, empty bodies/args, nested compounds
Step 3: Export from IR index
File: packages/framework/src/ir/index.ts

Add:

// Interchange AST → SemanticNode converter
export { fromInterchangeNode } from './from-interchange';
This propagates through packages/framework/src/index.ts (export \* from './ir').

Step 4: Extend MCP convert_format tool
File: packages/mcp-server/src/tools/ir-tools.ts

Import fromInterchangeNode from @lokascript/framework
Add interchange property to convert_format input schema (JSON object with type discriminant)
In handler: when interchange provided, call fromInterchangeNode(), then return both explicit (via renderExplicit()) and protocol (via toProtocolJSON()) representations
Add tests in packages/mcp-server/src/**tests**/ir-tools.test.ts

### Verification

Unit tests: npm test --prefix packages/framework -- --run src/ir/from-interchange.test.ts
Existing IR tests still pass: npm test --prefix packages/framework -- --run src/ir/
MCP tests: npm test --prefix packages/mcp-server -- --run src/**tests**/ir-tools.test.ts
TypeScript: npm run typecheck --prefix packages/framework
Round-trip via MCP tool: Use convert_format with interchange JSON input, verify bracket + protocol output
