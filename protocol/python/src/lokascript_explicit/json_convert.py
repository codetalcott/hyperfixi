"""JSON conversion for LSE — bidirectional SemanticNode <-> JSON."""

from __future__ import annotations

from typing import Any

from .types import (
    SemanticNode,
    SemanticValue,
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    ExpressionValue,
    FlagValue,
)

# Valid value types for JSON validation
_VALID_VALUE_TYPES = frozenset(
    {"selector", "literal", "reference", "expression", "property-path", "flag"}
)


def validate_json(data: dict[str, Any]) -> list[dict[str, str]]:
    """Validate a SemanticJSON dict. Returns list of diagnostic dicts (empty = valid).

    Each diagnostic has: severity, code, message, and optional suggestion.
    """
    diagnostics: list[dict[str, str]] = []

    # Check action
    action = data.get("action")
    if not action or not isinstance(action, str):
        diagnostics.append(
            {
                "severity": "error",
                "code": "INVALID_ACTION",
                "message": "Missing or invalid 'action' field (must be a non-empty string)",
            }
        )

    # Check roles
    roles = data.get("roles", {})
    if isinstance(roles, dict):
        for role_name, role_value in roles.items():
            if not isinstance(role_value, dict):
                diagnostics.append(
                    {
                        "severity": "error",
                        "code": "INVALID_ROLE_VALUE",
                        "message": f'Role "{role_name}" must be an object with type and value',
                    }
                )
                continue

            vtype = role_value.get("type")
            if vtype not in _VALID_VALUE_TYPES:
                diagnostics.append(
                    {
                        "severity": "error",
                        "code": "INVALID_VALUE_TYPE",
                        "message": f'Role "{role_name}" has invalid type "{vtype}"',
                    }
                )

            if "value" not in role_value and vtype != "expression":
                # expression uses 'raw' instead of 'value' in full-fidelity
                if "raw" not in role_value:
                    diagnostics.append(
                        {
                            "severity": "error",
                            "code": "MISSING_VALUE",
                            "message": f'Role "{role_name}" is missing value field',
                        }
                    )

    # Check trigger
    trigger = data.get("trigger")
    if trigger is not None:
        event = trigger.get("event") if isinstance(trigger, dict) else None
        if not event or not isinstance(event, str):
            diagnostics.append(
                {
                    "severity": "error",
                    "code": "INVALID_TRIGGER",
                    "message": "Trigger must have a non-empty 'event' string",
                }
            )

    return diagnostics


def from_json(data: dict[str, Any]) -> SemanticNode:
    """Convert a SemanticJSON dict to a SemanticNode.

    Accepts both full-fidelity and LLM-simplified formats.
    """
    action = data.get("action", "")
    raw_roles = data.get("roles", {})

    roles: dict[str, SemanticValue] = {}
    for role_name, role_value in raw_roles.items():
        if isinstance(role_value, dict):
            roles[role_name] = _convert_json_value(role_name, role_value)

    # If trigger present, wrap in event handler
    trigger = data.get("trigger")
    if trigger and isinstance(trigger, dict):
        event_name = trigger.get("event", "")
        event_roles: dict[str, SemanticValue] = {
            "event": LiteralValue(value=event_name, dataType="string"),
        }
        body_node = SemanticNode(kind="command", action=action, roles=roles)
        return SemanticNode(
            kind="event-handler", action="on", roles=event_roles, body=[body_node]
        )

    # Check for full-fidelity format with kind
    kind = data.get("kind", "command")

    if kind == "event-handler":
        body_data = data.get("body", [])
        body = [from_json(b) for b in body_data] if body_data else []
        return SemanticNode(kind="event-handler", action=action, roles=roles, body=body)

    if kind == "compound":
        stmts_data = data.get("statements", [])
        stmts = [from_json(s) for s in stmts_data]
        chain_type = data.get("chainType", "then")
        return SemanticNode(
            kind="compound",
            action=action,
            roles=roles,
            statements=stmts,
            chainType=chain_type,
        )

    node = SemanticNode(kind="command", action=action, roles=roles)

    # Deserialize v1.1 conditional fields
    then_data = data.get("thenBranch", [])
    if then_data:
        node.thenBranch = [from_json(t) for t in then_data]
    else_data = data.get("elseBranch", [])
    if else_data:
        node.elseBranch = [from_json(e) for e in else_data]

    # Deserialize v1.1 loop fields
    loop_variant = data.get("loopVariant")
    if loop_variant is not None:
        node.loopVariant = loop_variant
    loop_body_data = data.get("loopBody", [])
    if loop_body_data:
        node.loopBody = [from_json(l) for l in loop_body_data]
    loop_variable = data.get("loopVariable")
    if loop_variable is not None:
        node.loopVariable = loop_variable
    index_variable = data.get("indexVariable")
    if index_variable is not None:
        node.indexVariable = index_variable

    return node


def to_json(node: SemanticNode) -> dict[str, Any]:
    """Convert a SemanticNode to a full-fidelity JSON dict."""
    return node.to_dict()


def _convert_json_value(role_name: str, data: dict[str, Any]) -> SemanticValue:
    """Convert a JSON value object to a SemanticValue."""
    vtype = data.get("type", "literal")
    value = data.get("value", data.get("raw", ""))

    if vtype == "selector":
        sk = data.get("selectorKind")
        return SelectorValue(value=str(value), selectorKind=sk)

    if vtype == "literal":
        if isinstance(value, bool):
            return LiteralValue(value=value, dataType="boolean")
        if isinstance(value, (int, float)):
            return LiteralValue(value=value, dataType="number")
        data_type = data.get("dataType", "string")
        return LiteralValue(value=value, dataType=data_type)

    if vtype == "reference":
        return ReferenceValue(value=str(value))

    if vtype == "expression":
        raw = data.get("raw", data.get("value", ""))
        return ExpressionValue(raw=str(raw))

    if vtype == "flag":
        name = data.get("name", str(value))
        enabled = data.get("enabled", bool(value))
        return FlagValue(name=name, enabled=enabled)

    if vtype == "property-path":
        # Treat as expression for now
        return ExpressionValue(raw=str(value))

    # Fallback
    return LiteralValue(value=str(value), dataType="string")
