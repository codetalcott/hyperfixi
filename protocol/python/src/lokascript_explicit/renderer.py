"""LSE Renderer — serializes SemanticNode to bracket syntax."""

from __future__ import annotations

import json as _json
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

    # Conditional branches (v1.1)
    if node.thenBranch:
        branch_parts = [render_explicit(n) for n in node.thenBranch]
        parts.append(f"then:{' '.join(branch_parts)}")
    if node.elseBranch:
        branch_parts = [render_explicit(n) for n in node.elseBranch]
        parts.append(f"else:{' '.join(branch_parts)}")

    # Loop fields (v1.1)
    if node.loopVariant is not None:
        parts.append(f"loopVariant:{node.loopVariant}")
    if node.loopBody:
        body_parts = [render_explicit(n) for n in node.loopBody]
        parts.append(f"loop-body:{' '.join(body_parts)}")
    if node.loopVariable is not None:
        import json as _json
        parts.append(f"loopVariable:{_json.dumps(node.loopVariable)}")
    if node.indexVariable is not None:
        import json as _json
        parts.append(f"indexVariable:{_json.dumps(node.indexVariable)}")

    return f"[{' '.join(parts)}]"


def _needs_selector_wrap(value: str) -> bool:
    """Whether a selector must be wrapped in '<.../>' to survive a re-parse.

    A bare token re-classifies as a selector only if it starts with one of
    '# . @ *'. A space would split the token, and a leading '[' in a structural
    role would re-parse as a nested command -- so both must wrap. '.a>.b' needs
    no wrapping: it has no space and keeps its leading '.'.
    """
    if " " in value:
        return True
    return value[0] not in ("#", ".", "@", "*")


def _value_to_string(value: SemanticValue) -> str:
    """Convert a semantic value to its explicit syntax string form."""
    if value.type == "literal":
        v = value.value  # type: ignore[union-attr]
        # Bool check must come before str check (bool is a subclass of int in Python)
        if isinstance(v, bool):
            return "true" if v else "false"
        if isinstance(v, str):
            dt = getattr(value, "dataType", None)
            # Quote strings that are explicitly typed as string or contain spaces.
            # json.dumps escapes backslashes, quotes and control characters -- a raw
            # f'"{v}"' would emit an unparseable literal for a value containing '"'.
            if dt == "string" or (isinstance(v, str) and re.search(r"\s", v)):
                return _json.dumps(v)
            return v
        return str(v)

    if value.type == "selector":
        s = value.value  # type: ignore[union-attr]
        if not s:
            return s
        return f"<{s}/>" if _needs_selector_wrap(s) else s

    if value.type == "reference":
        return value.value  # type: ignore[union-attr]

    if value.type == "expression":
        return value.raw  # type: ignore[union-attr]

    if value.type == "flag":
        return value.name  # type: ignore[union-attr]

    return str(getattr(value, "value", ""))
