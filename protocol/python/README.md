# lokascript-explicit (Python)

Reference parser for the LokaScript Explicit Syntax (LSE) protocol.

Zero external dependencies — uses only Python standard library.

## Install

```bash
pip install lokascript-explicit
```

Or for development:

```bash
pip install -e ".[dev]"
```

## Usage

### Python API

```python
from lokascript_explicit import parse_explicit, render_explicit, to_json, from_json

# Parse bracket syntax
node = parse_explicit('[toggle patient:.active destination:#button]')
print(node.action)  # "toggle"
print(node.roles['patient'].value)  # ".active"

# Render back to bracket syntax
text = render_explicit(node)
print(text)  # "[toggle patient:.active destination:#button]"

# Convert to JSON dict
data = to_json(node)
print(data)
# {"kind": "command", "action": "toggle", "roles": {"patient": {"type": "selector", "value": ".active"}, ...}}

# Convert from JSON dict
node2 = from_json(data)
```

### CLI

```bash
# Parse: bracket syntax -> JSON
echo '[toggle patient:.active]' | python -m lokascript_explicit parse

# Render: JSON -> bracket syntax
echo '{"kind":"command","action":"toggle","roles":{"patient":{"type":"selector","value":".active"}}}' | python -m lokascript_explicit render

# Validate: check syntax (exit 0 = valid, exit 1 = error)
echo '[toggle patient:.active]' | python -m lokascript_explicit validate

# Convert: auto-detect format, output the other
echo '[toggle patient:.active]' | python -m lokascript_explicit convert
```

### Streaming

The CLI handles multi-line input (one statement per line):

```bash
cat commands.lse | python -m lokascript_explicit parse
```

Comments (`#` or `//`) and blank lines are skipped.

## Tests

```bash
pip install -e ".[dev]"
pytest tests/ -v
```

The conformance tests (`tests/test_conformance.py`) run against shared fixtures in `../test-fixtures/` to ensure cross-language compatibility.

## Spec

See [../spec/](../spec/) for the formal ABNF grammar and protocol documentation.
