"""Tests for hyperfixi.validator module."""

import pytest

from lokascript.validator import (
    ValidationResult,
    validate_basic,
    validate,
    _count_unescaped,
    VALID_STARTS,
)


class TestValidationResult:
    """Tests for the ValidationResult dataclass."""

    def test_bool_valid(self):
        """Test that valid results are truthy."""
        result = ValidationResult(valid=True)
        assert result
        assert bool(result) is True

    def test_bool_invalid(self):
        """Test that invalid results are falsy."""
        result = ValidationResult(valid=False)
        assert not result
        assert bool(result) is False

    def test_default_lists(self):
        """Test that errors and warnings default to empty lists."""
        result = ValidationResult(valid=True)
        assert result.errors == []
        assert result.warnings == []


class TestValidateBasic:
    """Tests for the validate_basic() function."""

    def test_valid_on_click(self):
        """Test basic on click is valid."""
        result = validate_basic("on click toggle .active")
        assert result.valid
        assert result.errors == []

    def test_valid_multiline(self):
        """Test multiline script is valid."""
        result = validate_basic("""
            on click
                toggle .active on me
                toggle .hidden on #menu
        """)
        assert result.valid

    def test_empty_script(self):
        """Test empty script is invalid."""
        result = validate_basic("")
        assert not result.valid
        assert "Script is empty" in result.errors

    def test_whitespace_only(self):
        """Test whitespace-only script is invalid."""
        result = validate_basic("   \n\t  ")
        assert not result.valid
        assert "Script is empty" in result.errors

    def test_invalid_start(self):
        """Test script with invalid start keyword."""
        result = validate_basic("click toggle .active")
        assert not result.valid
        assert any("must start with valid keyword" in e for e in result.errors)

    def test_unbalanced_single_quotes(self):
        """Test unbalanced single quotes are detected."""
        result = validate_basic("on click set x to 'hello")
        assert not result.valid
        assert "Unbalanced single quotes" in result.errors

    def test_unbalanced_double_quotes(self):
        """Test unbalanced double quotes are detected."""
        result = validate_basic('on click set x to "hello')
        assert not result.valid
        assert "Unbalanced double quotes" in result.errors

    def test_unbalanced_parentheses(self):
        """Test unbalanced parentheses are detected."""
        result = validate_basic("on click call foo(bar")
        assert not result.valid
        assert "Unbalanced parentheses" in result.errors

    def test_unbalanced_brackets(self):
        """Test unbalanced brackets are detected."""
        result = validate_basic("on click set x to [1, 2, 3")
        assert not result.valid
        assert "Unbalanced brackets" in result.errors

    def test_unbalanced_braces(self):
        """Test unbalanced braces are detected."""
        result = validate_basic("on click set x to {foo: bar")
        assert not result.valid
        assert "Unbalanced braces" in result.errors

    def test_balanced_quotes(self):
        """Test balanced quotes are valid."""
        result = validate_basic("on click set x to 'hello' then set y to 'world'")
        assert result.valid

    def test_escaped_quotes(self):
        """Test escaped quotes don't count as unbalanced."""
        result = validate_basic(r"on click set x to 'it\'s fine'")
        assert result.valid

    def test_warning_onclick_typo(self):
        """Test warning for onclick vs on click."""
        result = validate_basic("onclick toggle .active")
        assert not result.valid  # Invalid because doesn't start with keyword
        assert any("on click" in w for w in result.warnings)

    def test_warning_misplaced_on_click(self):
        """Test warning for misplaced 'on click'."""
        result = validate_basic("set x to 1 on click")
        assert any("Did you mean" in w for w in result.warnings)

    def test_valid_starts_coverage(self):
        """Test various valid starting keywords."""
        valid_scripts = [
            "on click toggle .active",
            "def myFunc() return 1 end",
            "init set x to 1",
            "behavior MyBehavior on click log 'hi' end",
            "set x to 1",
            "get x from #element",
            "call myFunc()",
            "fetch /api/data",
            "put 'hello' into #target",
            "add .active to #element",
            "remove .active from #element",
            "toggle .active on #element",
            "trigger click on #button",
            "send myEvent to #target",
            "take .active from .items",
            "log 'hello'",
            "wait 1s",
            "settle",
            "if x > 1 log 'big'",
            "repeat 3 times log 'hi' end",
            "for item in items log item end",
            "while x < 10 increment x end",
            "async do fetch /api end",
            "tell #element add .active end",
            "transition opacity to 0",
            "measure #element",
            "go to url /page",
            "js alert('hi') end",
            "return 42",
            "exit",
            "halt",
            "break",
            "continue",
            "throw 'error message'",
            "install MyBehavior",
        ]
        for script in valid_scripts:
            result = validate_basic(script)
            # Should at least have valid starting keyword
            assert not any("must start with valid keyword" in e for e in result.errors), \
                f"'{script}' should have valid start"


class TestValidate:
    """Tests for the validate() function."""

    def test_basic_validation(self):
        """Test basic validation (default)."""
        result = validate("on click toggle .active")
        assert result.valid



class TestCountUnescaped:
    """Tests for the _count_unescaped helper function."""

    def test_count_simple(self):
        """Test counting simple characters."""
        assert _count_unescaped("hello 'world'", "'") == 2

    def test_count_escaped(self):
        """Test escaped characters are not counted."""
        assert _count_unescaped(r"it\'s fine", "'") == 0

    def test_count_mixed(self):
        """Test mix of escaped and unescaped."""
        assert _count_unescaped(r"'hello' it\'s 'world'", "'") == 4

    def test_count_double_quotes(self):
        """Test counting double quotes."""
        assert _count_unescaped('say "hello" then "bye"', '"') == 4

    def test_count_empty(self):
        """Test empty string."""
        assert _count_unescaped("", "'") == 0

    def test_count_no_matches(self):
        """Test string with no matches."""
        assert _count_unescaped("hello world", "'") == 0
