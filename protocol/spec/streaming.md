# Streaming Convention

LSE supports streaming via a line-delimited format, similar to JSONL (JSON Lines).

## Format

One bracket command per line, separated by `LF` (`\n`).

```
[toggle patient:.active destination:#button]
[add patient:.loading destination:me]
[fetch source:/api/data method:GET]
```

## Rules

1. Each non-empty, non-comment line contains exactly one statement (bracket command or compound)
2. Lines are separated by `LF` (U+000A). `CR LF` is accepted but `LF` is canonical
3. Blank lines (empty or whitespace-only) are ignored
4. Comment lines start with `//` or `#` (after optional leading whitespace)
5. Leading and trailing whitespace on each line is trimmed before parsing
6. A trailing `LF` at end of file is optional

## Comments

```
# This is a comment
// This is also a comment
[toggle patient:.active]  # Inline comments are NOT supported
```

Comments are full-line only. Inline comments (after a statement on the same line) are NOT part of the spec — the `#` would be part of the statement text.

## MIME Type

```
Content-Type: application/vnd.lokascript.explicit-stream
```

For single statements (not streaming):

```
Content-Type: application/vnd.lokascript.explicit
```

## File Extension

`.lse` — LokaScript Explicit

## Example: Streaming Over HTTP

```http
POST /compile HTTP/1.1
Content-Type: application/vnd.lokascript.explicit-stream

[add patient:.loading destination:me]
[fetch source:/api/users method:GET]
[remove patient:.loading destination:me]
```

## Example: Pipe Through CLI

```bash
cat commands.lse | lse parse --stream | jq '.action'
```

## Compound Statements in Streams

Compound statements occupy a single line:

```
[add patient:.loading] then [fetch source:/api/data] then [remove patient:.loading]
```

Multi-line compound statements are NOT supported in the streaming format. Each line is parsed independently.
