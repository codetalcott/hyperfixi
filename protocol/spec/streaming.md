# Streaming Convention

LSE supports streaming via a line-delimited format, similar to JSONL (JSON Lines).

## Format

One bracket command per line, separated by `LF` (`\n`).

```
[toggle patient:.active destination:#button]
[add patient:.loading destination:me]
[fetch source:/api/data method:GET]
```

## Version Header (v1.2)

An optional version header may appear as the first line of a streaming document:

```
#!lse 1.2
[toggle patient:.active destination:#button]
[add patient:.loading destination:me]
```

The `#!lse <version>` shebang declares which LSE version the document uses. Because it starts with `#`, v1.0/v1.1 parsers treat it as a comment and ignore it gracefully.

Parsers that recognize the version header MAY use it for feature detection (e.g., whether diagnostics or pipe operators are supported).

## Rules

1. Each non-empty, non-comment line contains exactly one statement (bracket command or compound)
2. Lines are separated by `LF` (U+000A). `CR LF` is accepted but `LF` is canonical
3. Blank lines (empty or whitespace-only) are ignored
4. Comment lines start with `//` or `#` (after optional leading whitespace)
5. Leading and trailing whitespace on each line is trimmed before parsing
6. A trailing `LF` at end of file is optional
7. An optional `#!lse <version>` header on the first line declares the LSE version (v1.2)
8. Zero or more `@name` or `@name(value)` annotations may precede a statement on the same line (v1.2)

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

## Annotations (v1.2)

Annotations prefix a statement on the same line, separated by whitespace:

```
@timeout(5s) @retry(3) [fetch source:/api/users destination:#list]
@deprecated [toggle patient:.active]
@permission(admin) @doc("Removes a user record") [remove patient:#user destination:users]
```

Annotation syntax: `@name` or `@name(value)`. The value may be a string, duration, number, or a plain identifier. Multiple annotations on one statement are written left-to-right; their order is preserved in the wire format.

Parsers MUST parse and preserve annotations. Tools MAY silently ignore annotations they do not recognize. Unknown annotation names are not an error.

## Compound Statements in Streams

Compound statements occupy a single line:

```
[add patient:.loading] then [fetch source:/api/data] then [remove patient:.loading]
```

Multi-line compound statements are NOT supported in the streaming format. Each line is parsed independently.
