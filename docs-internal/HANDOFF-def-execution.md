# `def` execution — findings and what shipped

**Status:** implemented. `RuntimeBase.installFunction`, covered by
`packages/core/src/runtime/def-execution.test.ts`.

Follow-up to the 2.9.1 downstream-report arc. The report listed
`def … catch … end` as "parsed and silently dropped" and expected the fix to
mirror #768's `on`-handler work. Both halves of that framing were wrong, which is
why this was scoped as a spike first.

---

## What was actually broken

`def` was not silently dropped. It **threw**.

```
parse('def greet(n) return n end')  ->  success, DefNode with params/body
runtime.execute(defNode, ctx)       ->  rejects: "Unknown AST node type: def"
ctx.globals.has('greet')            ->  false
```

`RuntimeBase.execute()`'s switch had no `def` case, and `Runtime` does not
override `execute()`, so a `DefNode` fell to `default:` → `evaluateExpression` →
`evaluateAST`, which throws on the unknown type. On a page the attribute
processor caught that into a `console.error` naming an internal node type —
telling an author nothing about `def` being unimplemented.

The parser half of #768's shared `parseErrorAndFinallyBlocks()` was real, and
`DefNode` did carry `errorSymbol` / `errorHandler` / `finallyHandler` with
passing tests for that shape. **The syntax looked supported and nothing executed
it.** So the task was never "wire catch/finally onto def" — it was "make `def`
execute at all."

Secondary consequence, now fixed: in a `Program`, `executeProgram` buckets event
handlers first, so a handler alongside a `def` **did** register — and then the
`def` threw, aborting every statement after it.

---

## No other path installed a top-level def

| Probe | Result |
| ----- | ------ |
| `case 'def'` across `packages/` | only `ast-utils/generator.ts` and `semantic/src/ast-builder` — codegen, not execution |
| `'def'` in `compatibility/`, `api/`, `dom/`, `core/` | none |
| `features/def` / `DefFeature` consumers | only `src/index.ts` re-exports plus its own tests |
| `def` in `parser/hybrid/` | none — the hybrid parser cannot parse `def` at all |
| `registerNodeEvaluator` | only the extension mechanism; nothing registers `'def'` |

**One place `def` already worked:** inside a `worker` feature.
`packages/realtime/src/worker.ts` hand-rolls its own def parsing into a
`workerFeature` node's `defs[]` and never touches `DefNode` (its comment says so:
"core's parseDefFeature is not exposed on ParserContext"). Unrelated code path,
left alone.

---

## `features/def.ts` — bypassed, not reused

1574 lines, two parallel implementations, zero production callers. Not adaptable:

- **`DefFeature.executeFunction`** is a hand-rolled mini-interpreter branching on
  **string** args (`args.indexOf('to')`, `args[0] === 'global'`), not the
  `CommandNode`s the real parser emits.
- **`TypedDefFeatureImplementation.executeCatchBlock`** builds a `_catchContext`,
  marks it unused with an eslint-disable, and `return 'handled';` — the literal
  string. `executeFinallyBlock` is `if (!func.finallyBlock) return; return;`.
- Its catch shape is `{parameter, body}`, not
  `{errorSymbol, errorHandler, finallyHandler}`.

It is now marked `@deprecated` (module docblock + the `src/index.ts` export
block). Deleting it is semver-visible — four public exports — so that belongs in
the next breaking-change batch.

---

## What upstream does, and where we deliberately diverge

Read from the vendored `node_modules/hyperscript.org/dist/_hyperscript.js`:

| Question | Upstream | Us |
| -------- | -------- | -- |
| namespaced `def utils.foo()` | splits on `.`, `assignToNamespace` walks/creates **nested objects** (`utils = { foo: fn }`) | installs under the **flat key** `"utils.foo"` |
| what `me` binds to | the element the def was declared on (`makeContext(source, feature, target, null)`) | inherits the declaring context |
| install target | `assignToNamespace(elt, …)`: `null` or `<body>` → `#globalScope`, which **is** `self`/`window`; any other element → per-element storage inherited down the DOM via `addFeatures`' ancestor walk | **`context.globals`** |
| caller context | passed as a trailing argument (`arguments[args.length]`), plus `func.hyperfunc` / `hypername` markers | not modelled |
| return | sync `ctx.meta.returnValue` if returned, else a Promise | always async |

**The install-target divergence is the deliberate one.** Upstream puts
body-level defs on the real `window`. We use `context.globals` instead — which
`evaluateIdentifier` already resolves (locals → globals → context props →
globalThis) and which `createEventHandler` passes **by reference**, so a handler
registered earlier still sees a def installed later. The trade: no global
namespace pollution, no teardown problem, and jsdom test isolation is preserved;
the cost is that `window.myFunc` does not exist, so external JS cannot call a
hyperscript def, and a page mixing hyperfixi with real `_hyperscript` will not
share function scope.

This is reversible in the compatible direction: the per-element half, and an
opt-in `globalThis` assignment, can be added later without changing what already
works.

---

## What shipped

`RuntimeBase.installFunction`, dispatched from a new `case 'def'`:

- fresh `locals` per call, seeded from the declaring scope, so parameter binding
  never leaks back out
- parameters bound positionally; an unpassed parameter is `undefined`
- body delegated to the existing `executeCommandSequenceWithResult`, which
  already converts the `return` signal to `ok(returnValue)` — that is the whole
  of return handling
- error handling in **exactly** #768's shape, because upstream shares one
  `parseErrorAndFinally` between `on` and `def` and the two must not drift: the
  error binds as a local under the author's symbol, a handled error does **not**
  propagate, `finally` runs on both paths, and control-flow signals never route
  to `catch`

Plus a **phase 0** in `executeProgram`: defs install before init blocks run. A
`def` is a declaration and an `init` is executable code that may call it — the
same reasoning that already puts handler registration ahead of init.

20 tests in `src/runtime/def-execution.test.ts`, including the three that matter
most: `call greet('x')` from hyperscript reaching the def, a def calling another
def, and the return value surfacing as `it`/`result`.

---

## Known gaps (all deliberate, none blocking)

- Namespaced defs are flat keys, so `call utils.calc()` works but `utils` is not
  a traversable object.
- No caller-context trailing argument, no `hyperfunc`/`hypername` markers.
- No per-element scoping or ancestor-walk inheritance.
- The hybrid and lite bundles still cannot parse `def` at all — unchanged, and
  consistent with how they treat `catch`/`finally`.
