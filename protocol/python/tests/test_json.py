"""Tests for JSON conversion."""

from lokascript_explicit.json_convert import validate_json, from_json, to_json
from lokascript_explicit.types import (
    SemanticNode,
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    FlagValue,
)


class TestValidateJSON:
    def test_valid_input(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
        }
        assert validate_json(data) == []

    def test_missing_action(self):
        data = {"roles": {}}
        diags = validate_json(data)
        assert len(diags) == 1
        assert diags[0]["code"] == "INVALID_ACTION"

    def test_invalid_role_value(self):
        data = {"action": "toggle", "roles": {"patient": "not-an-object"}}
        diags = validate_json(data)
        assert any(d["code"] == "INVALID_ROLE_VALUE" for d in diags)

    def test_invalid_value_type(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "unknown", "value": ".active"}},
        }
        diags = validate_json(data)
        assert any(d["code"] == "INVALID_VALUE_TYPE" for d in diags)

    def test_missing_value_field(self):
        data = {"action": "toggle", "roles": {"patient": {"type": "selector"}}}
        diags = validate_json(data)
        assert any(d["code"] == "MISSING_VALUE" for d in diags)

    def test_valid_trigger(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": "click"},
        }
        assert validate_json(data) == []

    def test_invalid_trigger(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": ""},
        }
        diags = validate_json(data)
        assert any(d["code"] == "INVALID_TRIGGER" for d in diags)

    def test_flag_type_valid(self):
        data = {
            "action": "column",
            "roles": {"primary-key": {"type": "flag", "value": True}},
        }
        assert validate_json(data) == []


class TestFromJSON:
    def test_basic_command(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
        }
        node = from_json(data)
        assert node.kind == "command"
        assert node.action == "toggle"
        assert node.roles["patient"].type == "selector"

    def test_selector_values(self):
        data = {
            "action": "add",
            "roles": {
                "patient": {"type": "selector", "value": ".highlight"},
                "destination": {"type": "selector", "value": "#output"},
            },
        }
        node = from_json(data)
        assert node.roles["destination"] == SelectorValue(value="#output")

    def test_literal_values(self):
        data = {
            "action": "put",
            "roles": {
                "patient": {"type": "literal", "value": "hello"},
                "quantity": {"type": "literal", "value": 42},
                "flag": {"type": "literal", "value": True},
            },
        }
        node = from_json(data)
        assert node.roles["patient"].value == "hello"
        assert node.roles["quantity"].value == 42
        assert node.roles["flag"].value is True

    def test_reference_values(self):
        data = {
            "action": "add",
            "roles": {"destination": {"type": "reference", "value": "me"}},
        }
        node = from_json(data)
        assert node.roles["destination"] == ReferenceValue(value="me")

    def test_expression_values(self):
        data = {
            "action": "set",
            "roles": {"goal": {"type": "expression", "value": "x + 1"}},
        }
        node = from_json(data)
        assert node.roles["goal"].type == "expression"

    def test_trigger_wraps_event_handler(self):
        data = {
            "action": "toggle",
            "roles": {"patient": {"type": "selector", "value": ".active"}},
            "trigger": {"event": "click"},
        }
        node = from_json(data)
        assert node.kind == "event-handler"
        assert node.action == "on"
        assert len(node.body) == 1
        assert node.body[0].action == "toggle"

    def test_full_fidelity_event_handler(self):
        data = {
            "kind": "event-handler",
            "action": "on",
            "roles": {
                "event": {"type": "literal", "value": "click", "dataType": "string"}
            },
            "body": [
                {
                    "kind": "command",
                    "action": "toggle",
                    "roles": {"patient": {"type": "selector", "value": ".active"}},
                }
            ],
        }
        node = from_json(data)
        assert node.kind == "event-handler"
        assert len(node.body) == 1

    def test_compound_node(self):
        data = {
            "kind": "compound",
            "action": "compound",
            "chainType": "then",
            "statements": [
                {
                    "kind": "command",
                    "action": "add",
                    "roles": {"patient": {"type": "selector", "value": ".loading"}},
                },
                {
                    "kind": "command",
                    "action": "fetch",
                    "roles": {
                        "source": {
                            "type": "literal",
                            "value": "/api/data",
                            "dataType": "string",
                        }
                    },
                },
            ],
        }
        node = from_json(data)
        assert node.kind == "compound"
        assert node.chainType == "then"
        assert len(node.statements) == 2


class TestToJSON:
    def test_basic_command(self):
        node = SemanticNode(
            kind="command",
            action="toggle",
            roles={"patient": SelectorValue(value=".active")},
        )
        result = to_json(node)
        assert result["action"] == "toggle"
        assert result["roles"]["patient"] == {"type": "selector", "value": ".active"}

    def test_multiple_types(self):
        node = SemanticNode(
            kind="command",
            action="set",
            roles={
                "destination": LiteralValue(value="count", dataType="string"),
                "goal": LiteralValue(value=42, dataType="number"),
            },
        )
        result = to_json(node)
        assert result["roles"]["destination"]["value"] == "count"
        assert result["roles"]["goal"]["value"] == 42

    def test_reference(self):
        node = SemanticNode(
            kind="command",
            action="add",
            roles={
                "patient": SelectorValue(value=".active"),
                "destination": ReferenceValue(value="me"),
            },
        )
        result = to_json(node)
        assert result["roles"]["destination"] == {"type": "reference", "value": "me"}

    def test_flag_to_json(self):
        node = SemanticNode(
            kind="command",
            action="column",
            roles={
                "name": LiteralValue(value="id", dataType="string"),
                "primary-key": FlagValue(name="primary-key", enabled=True),
            },
        )
        result = to_json(node)
        assert result["roles"]["primary-key"] == {
            "type": "flag",
            "name": "primary-key",
            "enabled": True,
        }


class TestRoundTripJSON:
    def test_command_round_trip(self):
        original = {
            "action": "toggle",
            "roles": {
                "patient": {"type": "selector", "value": ".active"},
                "destination": {"type": "selector", "value": "#button"},
            },
        }
        node = from_json(original)
        result = to_json(node)
        assert result["action"] == "toggle"
        assert result["roles"]["patient"]["type"] == "selector"
        assert result["roles"]["patient"]["value"] == ".active"
