# LSE fixtures

115 cases in 18 files: what `@lokascript/intent` reads and writes for LSE bracket syntax and
protocol JSON (the specification is in [`protocol/`](../../../protocol/)). Every case runs in
[`src/ir/conformance.test.ts`](../src/ir/conformance.test.ts), which fails on a case shape it does
not know; `@lokascript/framework`'s IR tests read some of the files too.

They were the conformance suite of four reference parsers (TypeScript, Python, Go, Rust), retired on
2026-11-12 (tag `archived/lse-reference-parsers-2026-11-12`). Two expectations changed when the
fixtures moved here, to what the shipped parser does:

- **A bare string has no `dataType`.** `source:/api/users` is `{ type: 'literal', value:
'/api/users' }`; `source:"/api/users"` carries `dataType: 'string'`. The reference parsers gave
  both `string`. (21 role values in 17 cases.)
- **A render keeps the author's spelling.** A bare string is written bare, and roles keep their
  order; the reference renderers quoted every string and one case had its roles sorted. (5
  `roundtrip` cases.)

LSE 3.0 removed the constructs with no producer (`try`, `all`/`race`, `match`, pipe chains,
envelopes and documents) and their 27 cases: 142 → 115.

## Case shapes

| Fields                                  | Checked                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| `input`, `expected`                     | `parseExplicit(input)`: kind, action, each role, nested nodes |
| `input`, `roundtrip`                    | `renderExplicit(parseExplicit(input))` is `roundtrip`         |
| `input`, `expectError`, `errorContains` | `parseExplicit(input)` throws, with that text                 |
| `jsonInput`, `expectedRoundTrip`        | `toProtocolJSON(fromProtocolJSON(jsonInput))` is `jsonInput`  |
| `jsonInput`, `expectValidationError`    | `validateProtocolJSON` reports an error (with `errorCode`)    |
| `node`, `renderOnly`, `rendered`        | `renderExplicit(fromProtocolJSON(node))` is `rendered`        |
| `format: "llm-simplified"`, `input`     | `fromProtocolJSON(input)`: kind, action, the body's action    |

`expected.kind` is the wire format's (`command`, `event-handler`, `compound`): the package's
`conditional` and `loop` nodes are `command` there. The other `expected*` fields on a JSON case
(`expectedArmCount`, `expectedAsyncVariant`, …) restate its `jsonInput` for a reader; the round trip
is the check.
