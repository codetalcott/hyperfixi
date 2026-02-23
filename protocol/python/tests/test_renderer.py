"""Tests for the LSE renderer."""

from lokascript_explicit.renderer import render_explicit
from lokascript_explicit.parser import parse_explicit
from lokascript_explicit.types import (
    SemanticNode,
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    FlagValue,
)


class TestRenderBasic:
    def test_basic_command(self):
        node = SemanticNode(
            kind="command",
            action="toggle",
            roles={"patient": SelectorValue(value=".active")},
        )
        assert render_explicit(node) == "[toggle patient:.active]"

    def test_multiple_roles(self):
        node = SemanticNode(
            kind="command",
            action="put",
            roles={
                "patient": LiteralValue(value="hello", dataType="string"),
                "destination": SelectorValue(value="#output"),
            },
        )
        result = render_explicit(node)
        assert result.startswith("[")
        assert result.endswith("]")
        assert 'patient:"hello"' in result
        assert "destination:#output" in result

    def test_reference_value(self):
        node = SemanticNode(
            kind="command",
            action="add",
            roles={
                "patient": SelectorValue(value=".clicked"),
                "destination": ReferenceValue(value="me"),
            },
        )
        assert render_explicit(node) == "[add patient:.clicked destination:me]"

    def test_numeric_value(self):
        node = SemanticNode(
            kind="command",
            action="increment",
            roles={
                "destination": SelectorValue(value="#count"),
                "quantity": LiteralValue(value=5, dataType="number"),
            },
        )
        assert render_explicit(node) == "[increment destination:#count quantity:5]"

    def test_boolean_value(self):
        node = SemanticNode(
            kind="command",
            action="set",
            roles={
                "destination": LiteralValue(value="myVar", dataType="string"),
                "goal": LiteralValue(value=True, dataType="boolean"),
            },
        )
        result = render_explicit(node)
        assert "goal:True" in result or "goal:true" in result


class TestRenderFlags:
    def test_enabled_flag(self):
        node = SemanticNode(
            kind="command",
            action="column",
            roles={
                "name": LiteralValue(value="id", dataType="string"),
                "primary-key": FlagValue(name="primary-key", enabled=True),
            },
        )
        result = render_explicit(node)
        assert "+primary-key" in result
        assert "primary-key:" not in result

    def test_disabled_flag(self):
        node = SemanticNode(
            kind="command",
            action="field",
            roles={
                "name": LiteralValue(value="email", dataType="string"),
                "nullable": FlagValue(name="nullable", enabled=False),
            },
        )
        result = render_explicit(node)
        assert "~nullable" in result


class TestRenderCompound:
    def test_compound_then(self):
        node = SemanticNode(
            kind="compound",
            action="compound",
            chainType="then",
            statements=[
                SemanticNode(
                    kind="command",
                    action="add",
                    roles={"patient": SelectorValue(value=".loading")},
                ),
                SemanticNode(
                    kind="command",
                    action="fetch",
                    roles={
                        "source": LiteralValue(value="/api/data", dataType="string")
                    },
                ),
            ],
        )
        result = render_explicit(node)
        assert "[add patient:.loading] then [fetch" in result


class TestRenderEventHandler:
    def test_event_handler_with_body(self):
        body_node = SemanticNode(
            kind="command",
            action="toggle",
            roles={"patient": SelectorValue(value=".active")},
        )
        node = SemanticNode(
            kind="event-handler",
            action="on",
            roles={"event": LiteralValue(value="click", dataType="string")},
            body=[body_node],
        )
        result = render_explicit(node)
        assert 'event:"click"' in result
        assert "body:[toggle patient:.active]" in result


class TestRoundTrip:
    """Parse then render, verify semantic equivalence."""

    CASES = [
        "[toggle patient:.active]",
        "[add patient:.highlight destination:#output]",
        "[increment destination:#count quantity:5]",
        "[wait duration:500ms]",
        "[column name:id +primary-key +not-null]",
        "[field name:email +required ~nullable]",
    ]

    def test_round_trips(self):
        for input_str in self.CASES:
            node = parse_explicit(input_str)
            output = render_explicit(node)
            reparsed = parse_explicit(output)
            assert reparsed.action == node.action, f"Failed for: {input_str}"
            assert reparsed.roles == node.roles, f"Failed for: {input_str}"
