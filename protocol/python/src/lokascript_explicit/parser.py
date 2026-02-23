"""LSE Parser — parses [command role:value +flag ...] bracket syntax."""

from __future__ import annotations

import re
from typing import Optional

from .types import (
    SemanticNode,
    SemanticValue,
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    ExpressionValue,
    FlagValue,
)
from .references import DEFAULT_REFERENCES, is_valid_reference

# Duration regex: optional negative, digits, optional decimal, mandatory suffix
_DURATION_RE = re.compile(r"^(-?\d+(?:\.\d+)?)(ms|s|m|h)$")
# Number regex: optional negative, digits, optional decimal, no suffix
_NUMBER_RE = re.compile(r"^(-?\d+(?:\.\d+)?)$")


class ParseError(Exception):
    """Raised when explicit syntax is malformed."""

    pass


def is_explicit_syntax(text: str) -> bool:
    """Check if input is explicit bracket syntax."""
    trimmed = text.strip()
    return trimmed.startswith("[") and trimmed.endswith("]")


def parse_explicit(
    text: str,
    *,
    reference_set: frozenset[str] | set[str] | None = None,
) -> SemanticNode:
    """Parse explicit bracket syntax into a SemanticNode.

    Args:
        text: The input string, e.g. '[toggle patient:.active]'
        reference_set: Custom set of valid reference names.
            Defaults to DEFAULT_REFERENCES.

    Returns:
        A SemanticNode representing the parsed command.

    Raises:
        ParseError: If the input is malformed.
    """
    refs = reference_set if reference_set is not None else DEFAULT_REFERENCES

    trimmed = text.strip()

    if not trimmed.startswith("[") or not trimmed.endswith("]"):
        raise ParseError(
            "Explicit syntax must be wrapped in brackets: [command role:value ...]"
        )

    content = trimmed[1:-1].strip()
    if not content:
        raise ParseError("Empty explicit statement")

    tokens = _tokenize(content)
    if not tokens:
        raise ParseError("No command specified in explicit statement")

    command = tokens[0].lower()
    roles: dict[str, SemanticValue] = {}

    for i in range(1, len(tokens)):
        token = tokens[i]

        # Boolean flag: +name or ~name
        if token.startswith("+") or token.startswith("~"):
            enabled = token.startswith("+")
            flag_name = token[1:]
            if not flag_name:
                raise ParseError(f'Empty flag name: "{token}"')
            roles[flag_name] = FlagValue(name=flag_name, enabled=enabled)
            continue

        # Role:value pair
        colon_idx = token.find(":")
        if colon_idx == -1:
            raise ParseError(
                f'Invalid role format: "{token}". Expected role:value or +flag'
            )

        role_name = token[:colon_idx]
        value_str = token[colon_idx + 1 :]

        # Handle nested explicit syntax for body
        if role_name == "body" and value_str.startswith("["):
            nested_end = _find_matching_bracket(token, colon_idx + 1)
            nested_syntax = token[colon_idx + 1 : nested_end + 1]
            roles[role_name] = ExpressionValue(raw=nested_syntax)
            continue

        value = _parse_value(value_str, refs)
        roles[role_name] = value

    # Build appropriate node type
    if command == "on":
        event_value = roles.get("event")
        if event_value is None:
            raise ParseError("Event handler requires event role: [on event:click ...]")

        # Parse body if present
        body: list[SemanticNode] = []
        body_value = roles.get("body")
        if body_value is not None and isinstance(body_value, ExpressionValue):
            body.append(parse_explicit(body_value.raw, reference_set=refs))

        # Remove body from roles (structural, not semantic)
        roles.pop("body", None)

        return SemanticNode(kind="event-handler", action="on", roles=roles, body=body)

    return SemanticNode(kind="command", action=command, roles=roles)


def _tokenize(content: str) -> list[str]:
    """Tokenize explicit syntax content.

    Splits on spaces, but respects quoted strings and bracket nesting.
    """
    tokens: list[str] = []
    current = ""
    in_string = False
    string_char = ""
    bracket_depth = 0

    for i, char in enumerate(content):
        if in_string:
            current += char
            if char == string_char and (i == 0 or content[i - 1] != "\\"):
                in_string = False
            continue

        if char in ('"', "'"):
            in_string = True
            string_char = char
            current += char
            continue

        if char == "[":
            bracket_depth += 1
            current += char
            continue

        if char == "]":
            bracket_depth -= 1
            current += char
            continue

        if char == " " and bracket_depth == 0:
            if current:
                tokens.append(current)
                current = ""
            continue

        current += char

    if current:
        tokens.append(current)

    return tokens


def _parse_value(
    value_str: str, reference_set: frozenset[str] | set[str]
) -> SemanticValue:
    """Parse a value string into a SemanticValue.

    Detection priority:
    1. Selector (#, ., [, @, *)
    2. String literal ("..." or '...')
    3. Boolean (true/false)
    4. Reference (me, you, it, ...)
    5. Duration (500ms, 2s, ...)
    6. Number (42, 3.14, ...)
    7. Plain value (fallback -> string literal)
    """
    # 1. CSS selector
    if value_str and value_str[0] in ("#", ".", "[", "@", "*"):
        return SelectorValue(value=value_str)

    # 2. String literal
    if value_str and value_str[0] in ('"', "'"):
        inner = value_str[1:-1]
        return LiteralValue(value=inner, dataType="string")

    # 3. Boolean
    if value_str == "true":
        return LiteralValue(value=True, dataType="boolean")
    if value_str == "false":
        return LiteralValue(value=False, dataType="boolean")

    # 4. Reference (case-insensitive lookup)
    lower_ref = value_str.lower()
    if is_valid_reference(lower_ref, reference_set):
        return ReferenceValue(value=lower_ref)

    # 5. Duration
    dur_match = _DURATION_RE.match(value_str)
    if dur_match:
        return LiteralValue(value=value_str, dataType="duration")

    # 6. Number
    num_match = _NUMBER_RE.match(value_str)
    if num_match:
        num = float(num_match.group(1))
        # Use int if it's a whole number
        if num == int(num):
            num = int(num)
        return LiteralValue(value=num, dataType="number")

    # 7. Fallback: plain string
    return LiteralValue(value=value_str, dataType="string")


def _find_matching_bracket(s: str, start: int) -> int:
    """Find the matching closing bracket starting from position `start`."""
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "[":
            depth += 1
        elif s[i] == "]":
            depth -= 1
            if depth == 0:
                return i
    return len(s) - 1
