"""Tests for the LSE parser."""

import pytest

from lokascript_explicit.parser import parse_explicit, is_explicit_syntax, ParseError
from lokascript_explicit.types import (
    SelectorValue,
    LiteralValue,
    ReferenceValue,
    FlagValue,
)


class TestIsExplicitSyntax:
    def test_detects_bracket_syntax(self):
        assert is_explicit_syntax("[toggle patient:.active]") is True
        assert is_explicit_syntax("  [toggle patient:.active]  ") is True

    def test_rejects_non_bracket(self):
        assert is_explicit_syntax("toggle .active") is False
        assert is_explicit_syntax("[incomplete") is False
        assert is_explicit_syntax("incomplete]") is False
        assert is_explicit_syntax("") is False


class TestParseBasic:
    def test_basic_command(self):
        node = parse_explicit("[toggle patient:.active destination:#button]")
        assert node.kind == "command"
        assert node.action == "toggle"
        assert node.roles["patient"] == SelectorValue(value=".active")
        assert node.roles["destination"] == SelectorValue(value="#button")

    def test_command_name_lowercased(self):
        node = parse_explicit("[Toggle patient:.active]")
        assert node.action == "toggle"

    def test_selector_values(self):
        node = parse_explicit("[add patient:.highlight destination:#output]")
        assert node.roles["patient"].type == "selector"
        assert node.roles["patient"].value == ".highlight"

    def test_string_literal(self):
        node = parse_explicit('[put patient:"hello world" destination:#output]')
        assert node.roles["patient"] == LiteralValue(
            value="hello world", dataType="string"
        )

    def test_boolean_true(self):
        node = parse_explicit("[set destination:myVar goal:true]")
        assert node.roles["goal"] == LiteralValue(value=True, dataType="boolean")

    def test_boolean_false(self):
        node = parse_explicit("[set destination:myVar goal:false]")
        assert node.roles["goal"] == LiteralValue(value=False, dataType="boolean")

    def test_numeric_integer(self):
        node = parse_explicit("[increment destination:count quantity:5]")
        assert node.roles["quantity"] == LiteralValue(value=5, dataType="number")

    def test_numeric_decimal(self):
        node = parse_explicit("[set destination:ratio goal:3.14]")
        assert node.roles["goal"] == LiteralValue(value=3.14, dataType="number")

    def test_duration_ms(self):
        node = parse_explicit("[wait duration:500ms]")
        assert node.roles["duration"] == LiteralValue(
            value="500ms", dataType="duration"
        )

    def test_duration_s(self):
        node = parse_explicit("[wait duration:2s]")
        assert node.roles["duration"] == LiteralValue(value="2s", dataType="duration")

    def test_reference_me(self):
        node = parse_explicit("[add patient:.active destination:me]")
        assert node.roles["destination"] == ReferenceValue(value="me")

    def test_reference_case_insensitive(self):
        node = parse_explicit("[add patient:.active destination:Me]")
        assert node.roles["destination"] == ReferenceValue(value="me")

    def test_plain_string_fallback(self):
        node = parse_explicit("[fetch source:/api/users responseType:json]")
        assert node.roles["source"] == LiteralValue(
            value="/api/users", dataType="string"
        )
        assert node.roles["responseType"] == LiteralValue(
            value="json", dataType="string"
        )

    def test_custom_domain_roles(self):
        node = parse_explicit(
            "[deploy destination:production source:main manner:rolling]"
        )
        assert node.action == "deploy"
        assert node.roles["destination"] == LiteralValue(
            value="production", dataType="string"
        )


class TestParseEventHandler:
    def test_event_handler_with_body(self):
        node = parse_explicit("[on event:click body:[toggle patient:.active]]")
        assert node.kind == "event-handler"
        assert node.action == "on"
        assert len(node.body) == 1
        assert node.body[0].kind == "command"
        assert node.body[0].action == "toggle"


class TestParseFlags:
    def test_enabled_flag(self):
        node = parse_explicit("[column name:id +primary-key]")
        assert node.roles["primary-key"] == FlagValue(
            name="primary-key", enabled=True
        )

    def test_disabled_flag(self):
        node = parse_explicit("[field name:email ~nullable]")
        assert node.roles["nullable"] == FlagValue(name="nullable", enabled=False)

    def test_multiple_flags(self):
        node = parse_explicit("[column name:id type:uuid +primary-key +not-null]")
        assert node.roles["primary-key"] == FlagValue(
            name="primary-key", enabled=True
        )
        assert node.roles["not-null"] == FlagValue(name="not-null", enabled=True)

    def test_mixed_flags(self):
        node = parse_explicit("[field name:email +required ~nullable]")
        assert node.roles["required"] == FlagValue(name="required", enabled=True)
        assert node.roles["nullable"] == FlagValue(name="nullable", enabled=False)

    def test_flags_only(self):
        node = parse_explicit("[widget +draggable +resizable]")
        assert node.roles["draggable"] == FlagValue(name="draggable", enabled=True)
        assert node.roles["resizable"] == FlagValue(name="resizable", enabled=True)


class TestParseErrors:
    def test_missing_brackets(self):
        with pytest.raises(ParseError, match="brackets"):
            parse_explicit("toggle patient:.active")

    def test_empty_brackets(self):
        with pytest.raises(ParseError, match="Empty"):
            parse_explicit("[]")

    def test_whitespace_brackets(self):
        with pytest.raises(ParseError, match="Empty"):
            parse_explicit("[  ]")

    def test_missing_colon(self):
        with pytest.raises(ParseError, match="role:value"):
            parse_explicit("[toggle active]")

    def test_missing_event_role(self):
        with pytest.raises(ParseError, match="event"):
            parse_explicit("[on body:[toggle patient:.active]]")

    def test_empty_flag_name_plus(self):
        with pytest.raises(ParseError, match="Empty flag"):
            parse_explicit("[column name:id +]")

    def test_empty_flag_name_tilde(self):
        with pytest.raises(ParseError, match="Empty flag"):
            parse_explicit("[column name:id ~]")


class TestCustomReferences:
    def test_custom_reference_set(self):
        node = parse_explicit(
            "[add patient:.active destination:self]",
            reference_set=frozenset({"self", "parent"}),
        )
        assert node.roles["destination"] == ReferenceValue(value="self")

    def test_default_refs_not_in_custom_set(self):
        node = parse_explicit(
            "[add patient:.active destination:me]",
            reference_set=frozenset({"self"}),
        )
        # 'me' is NOT in custom set, so it becomes a string literal
        assert node.roles["destination"] == LiteralValue(value="me", dataType="string")
