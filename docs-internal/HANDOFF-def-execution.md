# `def` is parsed and then throws — spike findings

**Status:** investigation complete, decision pending. No behavior changed by this spike;
it adds `packages/core/src/runtime/def-execution.test.ts`, which pins current behavior.

Follow-up to the 2.9.1 downstream-report arc. The report listed `def … catch … end` as
"parsed and silently dropped" and expected the fix to mirror #768's `on`-handler work.
That framing turned out to be wrong in a way that changes the shape of the job.

---

## What actually happens

`def` is not silently dropped. It **throws**.

```
parse('def greet(n) return n end')  ->  success, DefNode with params/body
runtime.execute(defNode, ctx)       ->  rejects: "Unknown AST node type: def"
ctx.globals.has('greet')            ->  false
```

`RuntimeBase.execute()`'s switch handles `command`, `eventHandler`, `event`, `behavior`,
`Program`, `initBlock`, `block`, `sequence`, `CommandSequence`, `objectLiteral`,
`templateLiteral` and `memberExpression`. There is no `def` case, and `Runtime` does not
override `execute()`. A `DefNode` falls to `default:` → `evaluateExpression` →
`evaluateAST`, which throws on the unknown type.

On a page, `attribute-processor` catches that into a `console.error` naming an internal
node type — which tells an author nothing about `def` being unimplemented.

Consequence worth noting: in a `Program`, `executeProgram` buckets event handlers first
and runs them before other statements, so a handler alongside a `def` **does** register —
and then the `def` throws, aborting every statement after it.

So the parser half of #768's shared `parseErrorAndFinallyBlocks()` is real and `DefNode`
does carry `errorSymbol` / `errorHandler` / `finallyHandler`, with passing tests for that
shape in `hyperscript-parser.test.ts`. The syntax looks supported. Nothing executes it.

**The task is not "wire catch/finally onto def". It is "make `def` execute at all."**

---

## No other path installs a top-level def

| Probe | Result |
| ----- | ------ |
| `case 'def'` across `packages/` | only `ast-utils/generator.ts` and `semantic/src/ast-builder` — both codegen/rendering, neither executes |
| `'def'` in `compatibility/`, `api/`, `dom/`, `core/` | none (one unrelated `"abc" < "def"` string comparison) |
| `features/def` / `DefFeature` / `TypedDefFeature` consumers | only `src/index.ts` re-exports, plus its own 3 test files |
| `def` in `parser/hybrid/` | none — the hybrid parser cannot parse `def` at all |
| `registerNodeEvaluator` | only the extension mechanism; nothing registers `'def'` |

**One place `def` does work:** inside a `worker` feature. `packages/realtime/src/worker.ts`
hand-rolls its own def parsing into a `workerFeature` node's `defs[]` and never touches
`DefNode` (its comment says so explicitly: "core's parseDefFeature is not exposed on
ParserContext"). That confirms the gap is specifically top-level `def` reaching
`RuntimeBase.execute`, and is a second, unrelated implementation of the same syntax.

---

## `features/def.ts` — verdict: **bypass**

1574 lines, two parallel implementations, zero production callers. It cannot be adapted
cheaply, and the evidence is not marginal:

- **`DefFeature.executeFunction`** is a hand-rolled mini-interpreter branching on **string**
  args — `const toIndex = args.indexOf('to')`, `if (args[0] === 'global')` — not the
  `CommandNode`s the real parser emits. It cannot execute a real `DefNode.body`.
- **`TypedDefFeatureImplementation.executeCatchBlock`** builds a `_catchContext`, marks it
  unused with an eslint-disable, and `return 'handled';` — the literal string.
  `executeFinallyBlock` is `if (!func.finallyBlock) return; return;`. Both are stubs.
- Its catch shape is `{parameter, body}`, not the parser's
  `{errorSymbol, errorHandler, finallyHandler}`, so even the data model needs translating.

Confirmed no consumer outside `packages/core` imports `TypedDefFeatureImplementation`,
`createDefFeature` or `enhancedDefImplementation`.

**Do not delete it in the same PR** — `src/index.ts` re-exports it publicly, so removal is
semver-visible. File it as its own cleanup: drop the module and the `index.ts` exports in a
breaking-change batch.

---

## Options

### A — thin `case 'def'` in `RuntimeBase.execute` (recommended)

Install an async closure into `context.globals` that copies `context.locals`, binds
`params[i] = args[i]`, delegates the body to the existing `executeCommandSequenceWithResult`
(which already converts the `return` signal to `ok(returnValue)`), and wraps it in the exact
try/catch/finally shape #768 put in `createEventHandler` — including
`if (!errorHandler || isControlFlowError(e)) throw e;` and
`fnContext.locals.set(errorSymbol, e)`.

`context.globals` works because `createEventHandler` snapshots `locals` but passes `globals`
by reference, and `evaluateIdentifier` resolves locals → globals → context props →
`globalThis`. So a `def` registered in `executeProgram`'s later bucket is still visible to a
handler bound in the earlier one.

~1 day, medium risk. Also widen `DefNode`'s three error fields from `CommandNode[]` to
`ASTNode[]` to match `EventHandlerNode`.

**Open questions it must answer first** (these are the real risk, not the plumbing):
namespaced `def utils.foo()` (the parser emits the dotted name as one string), what `me`
binds to inside the body, `def` nested in a `behavior`, and whether functions are
per-document or per-element.

### A′ — same, but onto `globalThis` (upstream semantics)

Same size, higher risk: global collisions, no teardown, and it breaks the jsdom test
isolation the rest of the suite relies on. Only if interop with a real `_hyperscript` page
is a requirement.

### B — adapt `TypedDefFeatureImplementation`

2–3 days, high risk, and the end state is A wearing a 1574-line coat. Rejected — see above.

### C — loud rejection stopgap

```ts
case 'def':
  throw new Error("'def' functions are parsed but not yet executable — see #NNN");
```

~10 lines, near-zero risk. This is the same trade just made for `catch`/`finally` in the
hybrid bundles: it converts an opaque internal error into a statement about what the engine
supports. **Ship this if the answer is "not now"** — it costs almost nothing and stops the
current message from misleading.

---

## Recommendation

Answer the four open questions under A, then implement A. If they can't be answered soon,
land C in the meantime — the status quo error message is actively misleading, and C is
cheap enough that it doesn't compete with A for effort.
