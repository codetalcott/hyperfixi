"""LSE Renderer — serializes SemanticNode to bracket syntax."""

from __future__ import annotations

import re

from .types import SemanticNode, SemanticValue, FlagValue


def render_explicit(node: SemanticNode) -> str:
    """Render a SemanticNode as explicit bracket syntax.

    Args:
        node: The semantic node to render.

    Returns:
        A string like '[toggle patient:.active destination:#button]'.
    """
    # Handle compound nodes
    if node.kind == "compound":
        rendered = [render_explicit(stmt) for stmt in node.statements]
        chain = node.chainType or "then"
        return f" {chain} ".join(rendered)

    parts: list[str] = [node.action]

    # Add roles
    for role, value in node.roles.items():
        if isinstance(value, FlagValue) or value.type == "flag":
            # Flag rendering
            prefix = "+" if value.enabled else "~"  # type: ignore[union-attr]
            parts.append(f"{prefix}{value.name}")  # type: ignore[union-attr]
        else:
            parts.append(f"{role}:{_value_to_string(value)}")

    # Handle event handler body
    if node.kind == "event-handler" and node.body:
        body_parts = [render_explicit(n) for n in node.body]
        parts.append(f"body:{' '.join(body_parts)}")

    return f"[{' '.join(parts)}]"


def _value_to_string(value: SemanticValue) -> str:
    """Convert a semantic value to its explicit syntax string form."""
    if value.type == "literal":
        v = value.value  # type: ignore[union-attr]
        # Bool check must come before str check (bool is a subclass of int in Python)
        if isinstance(v, bool):
            return "true" if v else "false"
        if isinstance(v, str):
            dt = getattr(value, "dataType", None)
            # Quote strings that are explicitly typed as string or contain spaces
            if dt == "string" or (isinstance(v, str) and re.search(r"\s", v)):
                return f'"{v}"'
            return v
        return str(v)

    if value.type == "selector":
        return value.value  # type: ignore[union-attr]

    if value.type == "reference":
        return value.value  # type: ignore[union-attr]

    if value.type == "expression":
        return value.raw  # type: ignore[union-attr]

    if value.type == "flag":
        return value.name  # type: ignore[union-attr]

    return str(getattr(value, "value", ""))
