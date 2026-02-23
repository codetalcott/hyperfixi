"""LokaScript Explicit Syntax (LSE) — reference parser."""

from .parser import parse_explicit, is_explicit_syntax
from .renderer import render_explicit
from .json_convert import to_json, from_json, validate_json
from .types import (
    SemanticNode,
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    ExpressionValue,
    FlagValue,
    SemanticValue,
)
from .references import DEFAULT_REFERENCES, is_valid_reference

__version__ = "1.0.0"

__all__ = [
    "parse_explicit",
    "is_explicit_syntax",
    "render_explicit",
    "to_json",
    "from_json",
    "validate_json",
    "SemanticNode",
    "SelectorValue",
    "LiteralValue",
    "ReferenceValue",
    "ExpressionValue",
    "FlagValue",
    "SemanticValue",
    "DEFAULT_REFERENCES",
    "is_valid_reference",
]
