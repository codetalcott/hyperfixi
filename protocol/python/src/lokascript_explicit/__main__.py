"""CLI for LokaScript Explicit Syntax.

Usage:
    python -m lokascript_explicit parse      < input.lse     # bracket -> JSON
    python -m lokascript_explicit render     < input.json    # JSON -> bracket
    python -m lokascript_explicit validate   < input.lse     # check syntax
    python -m lokascript_explicit convert    < input         # auto-detect, output other format
"""

from __future__ import annotations

import json
import sys

from .parser import parse_explicit, is_explicit_syntax, ParseError
from .renderer import render_explicit
from .json_convert import from_json, to_json


def _parse_cmd(lines: str) -> None:
    """Parse bracket syntax, output JSON."""
    for line in lines.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("#"):
            continue
        try:
            node = parse_explicit(line)
            print(json.dumps(node.to_dict(), ensure_ascii=False))
        except ParseError as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)


def _render_cmd(lines: str) -> None:
    """Read JSON, output bracket syntax."""
    for line in lines.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            node = from_json(data)
            print(render_explicit(node))
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)


def _validate_cmd(lines: str) -> None:
    """Validate bracket syntax, exit 0 if valid, 1 if not."""
    errors = []
    for line in lines.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("//") or line.startswith("#"):
            continue
        try:
            parse_explicit(line)
        except ParseError as e:
            errors.append({"line": line, "error": str(e)})

    if errors:
        for err in errors:
            print(json.dumps(err), file=sys.stderr)
        sys.exit(1)
    else:
        print("valid")


def _convert_cmd(lines: str) -> None:
    """Auto-detect format and output the other."""
    text = lines.strip()
    if not text:
        return

    # Use is_explicit_syntax for robust detection
    if is_explicit_syntax(text.splitlines()[0]):
        # It's bracket syntax -> parse to JSON
        _parse_cmd(text)
    else:
        # It's JSON -> render to bracket syntax
        _render_cmd(text)


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(1)

    cmd = sys.argv[1]
    text = sys.stdin.read()

    if cmd == "parse":
        _parse_cmd(text)
    elif cmd == "render":
        _render_cmd(text)
    elif cmd == "validate":
        _validate_cmd(text)
    elif cmd == "convert":
        _convert_cmd(text)
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        print(__doc__, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
