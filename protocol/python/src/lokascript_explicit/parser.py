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


# Structural role names whose bracket-enclosed values are nested commands.
#
# In these roles a value starting with '[' is ALWAYS a nested command; write an
# attribute selector as a selector literal ('<[data-active]/>'). Prior to v2.0 the
# parser guessed from the inner content, which silently dropped zero-argument
# commands -- '[halt]' is both a valid command and a valid attribute selector.
_STRUCTURAL_ROLES = frozenset(
    {"body", "then", "else", "condition", "loop-body", "variable", "catch", "finally"}
)

_COMBINATOR_CHARS = (" ", ">", "+", "~", ",")

_ESCAPES = {"\\": "\\", '"': '"', "'": "'", "n": "\n", "r": "\r", "t": "\t"}


def _has_unquoted_combinator(value: str) -> bool:
    """Whether a combinator appears outside any quoted span."""
    quote = ""
    for ch in value:
        if quote:
            if ch == quote:
                quote = ""
            continue
        if ch in ('"', "'"):
            quote = ch
            continue
        if ch in _COMBINATOR_CHARS:
            return True
    return False


def infer_selector_kind(value: str) -> str | None:
    """Infer a selector's kind.

    Combinators are tested first, so '.a > .b' is 'complex' rather than 'class'.
    A combinator inside a quoted span does not count, so '[aria-label="Close menu"]'
    is 'attribute'.
    """
    if not value:
        return None
    if _has_unquoted_combinator(value):
        return "complex"

    first = value[0]
    if first == "#":
        return "id"
    if first == ".":
        return "class"
    if first == "[":
        return "attribute"
    if first == "*":
        return "element"
    return None


def unescape_string(s: str) -> str:
    r"""Expand the escape sequences defined by the grammar: \\ \" \' \n \r \t"""
    if "\\" not in s:
        return s

    out: list[str] = []
    i = 0
    while i < len(s):
        if s[i] == "\\" and i + 1 < len(s) and s[i + 1] in _ESCAPES:
            out.append(_ESCAPES[s[i + 1]])
            i += 2
            continue
        out.append(s[i])
        i += 1
    return "".join(out)


def is_explicit_syntax(text: str) -> bool:
    """Check if input is explicit bracket syntax."""
    trimmed = text.strip()
    return trimmed.startswith("[") and trimmed.endswith("]")


def parse_explicit(
    text: str,
    *,
    reference_set: frozenset[str] | set[str] | None = None,
    max_input_length: int | None = None,
) -> SemanticNode:
    """Parse explicit bracket syntax into a SemanticNode.

    Args:
        text: The input string, e.g. '[toggle patient:.active]'
        reference_set: Custom set of valid reference names.
            Defaults to DEFAULT_REFERENCES.
        max_input_length: Maximum input length in characters. If set,
            inputs exceeding this length are rejected. Recommended for
            server-side use to prevent resource exhaustion.

    Returns:
        A SemanticNode representing the parsed command.

    Raises:
        ParseError: If the input is malformed.
    """
    if max_input_length is not None and len(text) > max_input_length:
        raise ParseError(
            f"Input length {len(text)} exceeds maximum allowed length {max_input_length}"
        )

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

        # In a structural role, '[...]' is always a nested command.
        if role_name in _STRUCTURAL_ROLES and value_str.startswith("["):
            roles[role_name] = ExpressionValue(raw=value_str)
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

    # Build command node, extracting structural roles into top-level fields
    node = SemanticNode(kind="command", action=command, roles=roles)

    # Extract conditional branches (v1.1)
    _extract_structural_branch(node, roles, "then", "thenBranch", reference_set=refs)
    _extract_structural_branch(node, roles, "else", "elseBranch", reference_set=refs)

    # Extract loop fields (v1.1)
    _extract_structural_branch(node, roles, "loop-body", "loopBody", reference_set=refs)
    lv = roles.get("loopVariant")
    if lv is not None and isinstance(lv, LiteralValue) and isinstance(lv.value, str):
        node.loopVariant = lv.value
        roles.pop("loopVariant", None)
    lvar = roles.get("loopVariable")
    if lvar is not None and isinstance(lvar, LiteralValue) and isinstance(lvar.value, str):
        node.loopVariable = lvar.value
        roles.pop("loopVariable", None)
    ivar = roles.get("indexVariable")
    if ivar is not None and isinstance(ivar, LiteralValue) and isinstance(ivar.value, str):
        node.indexVariable = ivar.value
        roles.pop("indexVariable", None)

    return node


def _extract_structural_branch(
    node: SemanticNode,
    roles: dict[str, SemanticValue],
    role_name: str,
    field_name: str,
    *,
    reference_set: frozenset[str] | set[str] | None = None,
) -> None:
    """Extract a structural role into a top-level array field on the node."""
    value = roles.get(role_name)
    if value is None or not isinstance(value, ExpressionValue) or not value.raw:
        return
    parsed = parse_explicit(value.raw, reference_set=reference_set)
    setattr(node, field_name, [parsed])
    roles.pop(role_name, None)


def _tokenize(content: str) -> list[str]:
    """Tokenize explicit syntax content.

    Splits on spaces at bracket-depth 0, outside quoted strings, and outside
    selector literals ('<...selector.../>'). The branch order is normative: the
    string check precedes the selector check, so a '/>' inside a quoted string
    does not close the literal. A '<' opens a selector literal only at the start
    of a value -- when the token buffer is empty or ends with ':' -- so a stray
    '<' in a plain value cannot swallow the following token.

    '[' and ']' inside a selector literal never change bracket_depth; the
    closing '/>' already delimits them.
    """
    tokens: list[str] = []
    current = ""
    in_string = False
    string_char = ""
    in_selector = False
    bracket_depth = 0

    for i, char in enumerate(content):
        if in_string:
            current += char
            # A quote closes the string only if preceded by an even number of backslashes
            if char == string_char:
                num_backslashes = 0
                j = i - 1
                while j >= 0 and content[j] == "\\":
                    num_backslashes += 1
                    j -= 1
                if num_backslashes % 2 == 0:
                    in_string = False
            continue

        if char in ('"', "'"):
            in_string = True
            string_char = char
            current += char
            continue

        if in_selector:
            current += char
            if char == ">" and current.endswith("/>"):
                in_selector = False
            continue

        if char == "<" and (not current or current.endswith(":")):
            in_selector = True
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
    1. Selector literal (<...selector.../>)
    2. Selector (#, ., [, @, *)
    3. String literal ("..." or '...')
    4. Boolean (true/false)
    5. Reference (me, you, it, ...)
    6. Duration (500ms, 2s, ...)
    7. Number (42, 3.14, ...)
    8. Plain value (fallback -> string literal)
    """
    # 1. Selector literal -- the delimiters force selector interpretation, so a
    #    bare tag name or an attribute selector with a space both land here.
    if value_str and value_str[0] == "<":
        if not value_str.endswith("/>"):
            raise ParseError(
                f"Unterminated selector literal: {value_str!r}. Expected a closing '/>'"
            )
        inner = value_str[1:-2]
        if not inner:
            raise ParseError(f"Empty selector literal: {value_str!r}")
        return SelectorValue(value=inner, selectorKind=infer_selector_kind(inner))

    # 2. CSS selector
    if value_str and value_str[0] in ("#", ".", "[", "@", "*"):
        return SelectorValue(value=value_str, selectorKind=infer_selector_kind(value_str))

    # 3. String literal -- escapes are expanded here and re-applied on render, so
    #    a value containing a quote survives parse -> render -> parse unchanged.
    if value_str and value_str[0] in ('"', "'"):
        inner = value_str[1:-1]
        return LiteralValue(value=unescape_string(inner), dataType="string")

    # 4. Boolean
    if value_str == "true":
        return LiteralValue(value=True, dataType="boolean")
    if value_str == "false":
        return LiteralValue(value=False, dataType="boolean")

    # 5. Reference (case-insensitive lookup)
    lower_ref = value_str.lower()
    if is_valid_reference(lower_ref, reference_set):
        return ReferenceValue(value=lower_ref)

    # 6. Duration
    dur_match = _DURATION_RE.match(value_str)
    if dur_match:
        return LiteralValue(value=value_str, dataType="duration")

    # 7. Number
    num_match = _NUMBER_RE.match(value_str)
    if num_match:
        num = float(num_match.group(1))
        # Use int if it's a whole number
        if num == int(num):
            num = int(num)
        return LiteralValue(value=num, dataType="number")

    # 8. Fallback: plain string
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
