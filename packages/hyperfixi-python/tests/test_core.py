"""Tests for hyperfixi.core module."""

import pytest

from hyperfixi.core import hs, hs_attr, escape_hyperscript


class TestHs:
    """Tests for the hs() function."""

    def test_simple_script(self):
        """Test basic script generation."""
        result = hs("on click toggle .active")
        assert result == "on click toggle .active"

    def test_variable_substitution(self):
        """Test variable substitution."""
        result = hs("on click fetch /api/user/{id}", id=123)
        assert result == "on click fetch /api/user/123"

    def test_multiple_variables(self):
        """Test multiple variable substitution."""
        result = hs("on click fetch /api/{model}/{id}", model="user", id=456)
        assert result == "on click fetch /api/user/456"

    def test_html_escaping(self):
        """Test that variables are HTML escaped."""
        result = hs("on click set x to '{value}'", value="<script>alert(1)</script>")
        assert "&lt;script&gt;" in result
        assert "<script>" not in result

    def test_multiline_script(self):
        """Test multi-line script generation."""
        result = hs("""
            on click
                toggle .active on me
                toggle .hidden on #menu
        """)
        assert "on click" in result
        assert "toggle .active" in result

    def test_no_validation(self):
        """Test disabling validation."""
        # This would normally warn, but with validate=False it passes
        result = hs("invalid script", validate=False)
        assert result == "invalid script"


class TestHsAttr:
    """Tests for the hs_attr() function."""

    def test_attribute_generation(self):
        """Test that hs_attr generates a complete attribute."""
        result = hs_attr("on click toggle .active")
        assert result == '_="on click toggle .active"'

    def test_escaping_in_attribute(self):
        """Test that quotes are properly escaped."""
        result = hs_attr("on click set x to 'hello'")
        assert result == "_=\"on click set x to &#x27;hello&#x27;\""


class TestEscapeHyperscript:
    """Tests for the escape_hyperscript() function."""

    def test_escape_quotes(self):
        """Test escaping quotes."""
        result = escape_hyperscript("set x to 'hello'")
        assert "&#x27;" in result

    def test_escape_double_quotes(self):
        """Test escaping double quotes."""
        result = escape_hyperscript('set x to "hello"')
        assert "&quot;" in result

    def test_escape_html(self):
        """Test escaping HTML entities."""
        result = escape_hyperscript("set x to <div>")
        assert "&lt;" in result
        assert "&gt;" in result
