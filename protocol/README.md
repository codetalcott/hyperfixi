# LokaScript Explicit Syntax (LSE)

LSE is the notation and the JSON wire format of the role-labeled tree (`SemanticNode`) that
`@lokascript/semantic` and the domain DSLs parse to and render from:

```text
[toggle patient:.active destination:#button]
[select patient:name source:users condition:age>25]
[on event:click body:[toggle patient:.active]]
```

It has one implementation, [`@lokascript/intent`](../packages/intent/) (re-exported by
`@lokascript/framework` and `@lokascript/semantic`), and this directory is its specification.

> **Status (2026-11-12).** LSE was written up as a standalone protocol, with reference parsers in
> TypeScript, Python, Go and Rust. Nothing outside this repository implemented or consumed it, the
> four parsers had no importers, and their conformance suite did not run in full on the parser that
> ships. They are retired (tag `archived/lse-reference-parsers-2026-11-12`), the fixtures moved to
> [`packages/intent/fixtures/`](../packages/intent/fixtures/), and all of them run on `@lokascript/intent`.
> The grammar and the wire format are unchanged.

## Scope

**LSE carries commands and simple handlers** (owner decision, 2026-11-12): one command, a chain of
them, an `if` or a loop around commands, and an event handler around those (in bracket syntax a
body holds one command). It is not an
encoding of whole hyperscript programs and will not grow into one. A whole program travels as
hyperscript text, which the engine validates and `translate()` moves between 24 languages (on the
corpus below, 27,330 of 28,032 round trips carried in full, the rest refused, none silent). A tool
that wants a whole behaviour as a tree should read the engine's syntax tree, not LSE.

The writers enforce the boundary: what is outside it is refused, not written in part (see
[What LSE cannot carry](#what-lse-cannot-carry)).

## What LSE is for

- **Explicit input.** When natural-language hyperscript is ambiguous, bracket syntax names each
  role. MCP `validate_and_compile` and the compilation service accept it.
- **Reading a parse.** `renderExplicit(parse(code, lang))` shows what the parser understood.
- **Structured output from an LLM.** The compact JSON form (`{ action, roles, trigger }`) is what
  `<lse-intent>` executes and what the `lse` MCP toolset validates. See
  [docs/llm-guide.md](docs/llm-guide.md).
- **The domain DSLs' common tree.** SQL, flow, voice and the others use the same node with their
  own action and role names. See [docs/vocabularies.md](docs/vocabularies.md) and
  [docs/defining-vocabularies.md](docs/defining-vocabularies.md).

People do not write it by hand in a codebase: write hyperscript, or the DSL's own syntax.

## What LSE cannot carry

LSE is not a full encoding of hyperscript. Measured on 1,166 scripts the engine accepts (upstream's
test suite and the reference examples), scoring each semantic parse against what comes back from
the encoding (2026-11-12):

| Encoding       | Carried in full | Only a value's type changed | Refused |
| -------------- | --------------- | --------------------------- | ------- |
| Protocol JSON  | 603             | 178                         | 385     |
| Bracket syntax | 232             | 158                         | 776     |

What is refused, and why:

- **Node kinds with no wire node:** `feature` (`init`, `live`, `when`, `socket`), `def`, `behavior`.
- **Clauses with no field:** an event handler's `from` and `every` modifiers (the compact
  `trigger` form carries `once`, `debounce`, `throttle` and `queue`; the verbose form, for a handler
  of several commands, carries none), `catch`/`finally` on a handler, parameter names, a selector's
  `in` scope.
- **Bracket syntax only:** a value of several words that is not a string (`it matches .x`: there is
  no expression delimiter), more than one command in a `body:`, `then:` or `loop-body:` (a
  structural role holds one command).

"Only a value's type changed" is the documented flattening of a property path to an expression in
JSON, and, in bracket syntax, the parser's classification of each bare value (the syntax is
untyped): the text is the same, and no command, role or value is missing.

Expressions are opaque. Three in ten role values in those scripts (965 of 3,332) are `expression` values whose
`raw` text is hyperscript; a consumer that needs more than the text needs a hyperscript parser.

**The writers refuse rather than truncate.** `toProtocolJSON(node)` and `renderExplicit(node)` throw
a `LossyEncodingError` (`losses`: each part with no place in the encoding, `partial`: what would
have been written) for a node they cannot carry in full, and `{ lossy: 'allow' }` returns the
partial encoding.

## Using it

```typescript
import {
  parseExplicit,
  renderExplicit,
  toProtocolJSON,
  fromProtocolJSON,
} from '@lokascript/intent';

const node = parseExplicit('[toggle patient:.active destination:#button]');
node.action; // "toggle"
node.roles.get('patient'); // { type: 'selector', value: '.active', … }

renderExplicit(node); // "[toggle patient:.active destination:#button]"
fromProtocolJSON(toProtocolJSON(node)); // the same node
```

## Emitting LSE

1. **Format**: `[action role:value ...]`: brackets, the action first, then `role:value` pairs.
2. **Roles**: the vocabulary's (for hyperscript: `patient`, `destination`, `source`, `condition`,
   `instrument`, `quantity`, …).
3. **Values**: selectors (`.class`, `#id`), literals (`'string'`, `42`, `true`), references (`me`,
   `it`, `result`).
4. **Selector literals**: `<...selector.../>` for a selector with a space, a combinator or a comma
   (`patient:<ul > li/>`), and for an attribute selector in a structural role
   (`condition:<[data-active]/>`).
5. **Flags**: `+flag` for true, `~flag` for false.
6. **Nesting**: `body:[...]` for event handlers, conditionals, loops and block commands. In a
   structural role a `[...]` value is always one nested command.

```text
[toggle patient:.active destination:#menu]
[on event:click body:[add patient:.highlight destination:me]]
[fetch source:/api/users destination:#user-list]
[toggle patient:<.list > li/>]
```

## Specification

- [spec/README.md](spec/README.md): the syntax in prose
- [spec/lokascript-explicit-syntax.abnf](spec/lokascript-explicit-syntax.abnf): the grammar (v3.0.0)
- [spec/wire-format.md](spec/wire-format.md): the JSON representation
- [spec/lse-wire-format.schema.json](spec/lse-wire-format.schema.json): its JSON Schema
- [`packages/intent/fixtures/`](../packages/intent/fixtures/): 115 cases, run by
  `npm test --prefix packages/intent`

### Breaking changes in 3.0.0

Version 3.0 removed what had no producer, to match the scope above:

- **`try`** (`catch:` / `finally:`, `catchBranch` / `finallyBranch`), **`all` / `race`**
  (`asyncVariant`, `asyncBody`), **`match`** (`arms`, `defaultArm`) and **pipe chains** (`|>`,
  `chainType: "pipe"`).
- **Documents and envelopes**: the `#!lse` version header, multi-line documents, and the
  `{ lseVersion, nodes }` envelope. LSE is one statement at a time.
- `fromProtocolJSON` refuses JSON that has one of these and `validateProtocolJSON` reports it
  (`REMOVED_IN_LSE_3`); `parseExplicit` rejects text after a statement's closing bracket
  (`[a x:1] zzz [b y:2]` used to read as one command).

What stays: commands, chains (`then`, `and`, `async`, `sequential`), `if`, loops, event handlers,
block commands (`body:`), annotations and diagnostics.

### Breaking changes in 2.0.0

- **Selector literals.** `<...selector.../>` is the only way to write a selector containing a
  space, a combinator (`> + ~`) or a comma.
- **Structural roles no longer guess.** In `body`, `then`, `else`, `condition`, `loop-body`,
  `variable`, `catch` and `finally`, a value starting with `[` is always a nested command. Write
  `<[data-active]/>` for an attribute selector there.
- **Renderer wraps.** A selector that would not round-trip bare is written wrapped:
  `patient:[data-active]` renders as `patient:<[data-active]/>`.
