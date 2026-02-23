# Conformance Test Fixtures

Language-independent test cases for LSE parsers. Each fixture file is a JSON array of test cases.

## Fixture Format

### Parse Tests

```json
{
  "id": "basic-001",
  "description": "Human-readable description",
  "input": "[toggle patient:.active]",
  "expected": {
    "kind": "command",
    "action": "toggle",
    "roles": {
      "patient": { "type": "selector", "value": ".active" }
    }
  }
}
```

### Round-Trip Tests

```json
{
  "id": "rt-001",
  "description": "Round-trip: parse then render",
  "input": "[toggle patient:.active]",
  "expected": { ... },
  "roundtrip": "[toggle patient:.active]"
}
```

The `roundtrip` field is the expected output of `render(parse(input))`. This may differ from `input` (e.g., strings get quoted on render).

### Error Tests

```json
{
  "id": "error-001",
  "description": "Missing brackets",
  "input": "toggle patient:.active",
  "expectError": true,
  "errorContains": "brackets"
}
```

`errorContains` is a case-insensitive substring match against the error message.

## Running Conformance Tests

Each language implementation includes a conformance test runner that loads these fixtures:

- **Python**: `pytest tests/test_conformance.py`
- **Go**: `go test -run TestConformance`
- **Rust**: `cargo test conformance`
- **TypeScript**: `npx vitest run protocol/typescript/conformance.test.ts`

## Fixture Files

| File              | Contents                                |
| ----------------- | --------------------------------------- |
| `basic.json`      | Simple commands with common role types  |
| `selectors.json`  | All selector prefixes: #, ., [], @, \*  |
| `literals.json`   | Strings, numbers, booleans, durations   |
| `references.json` | Built-in references: me, you, it, etc.  |
| `flags.json`      | Boolean flags: +enabled, ~disabled      |
| `nested.json`     | Event handlers with body:[...]          |
| `compound.json`   | Chained statements with then/and/async  |
| `round-trip.json` | Parse -> render identity tests          |
| `errors.json`     | Invalid inputs that must produce errors |
