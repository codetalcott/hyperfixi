"""Tests for hyperfixi.behaviors module."""

import pytest

from hyperfixi.behaviors import Behavior, BehaviorRegistry, behavior


class TestBehavior:
    """Tests for the Behavior dataclass."""

    def test_simple_behavior(self):
        """Test basic behavior creation."""
        b = Behavior(name="Removable", script="on click remove me")
        assert b.name == "Removable"
        assert b.script == "on click remove me"
        assert b.description == ""

    def test_behavior_with_description(self):
        """Test behavior with description."""
        b = Behavior(
            name="Toggleable",
            script="on click toggle .active",
            description="Click to toggle active class"
        )
        assert b.description == "Click to toggle active class"

    def test_to_hyperscript_single_line(self):
        """Test converting single-line behavior to hyperscript."""
        b = Behavior(name="Removable", script="on click remove me")
        result = b.to_hyperscript()
        assert result == "behavior Removable\n    on click remove me\nend"

    def test_to_hyperscript_multiline(self):
        """Test converting multi-line behavior to hyperscript."""
        b = Behavior(
            name="Dismissable",
            script="""on click elsewhere
                remove me"""
        )
        result = b.to_hyperscript()
        assert "behavior Dismissable" in result
        assert "on click elsewhere" in result
        assert "remove me" in result
        assert result.endswith("end")


class TestBehaviorRegistry:
    """Tests for the BehaviorRegistry class."""

    def setup_method(self):
        """Clear registry before each test."""
        BehaviorRegistry.clear()

    def test_register_behavior(self):
        """Test registering a behavior."""
        BehaviorRegistry.register("Removable", "on click remove me")
        b = BehaviorRegistry.get("Removable")
        assert b is not None
        assert b.name == "Removable"
        assert b.script == "on click remove me"

    def test_register_with_description(self):
        """Test registering with description."""
        BehaviorRegistry.register(
            "Toggleable",
            "on click toggle .active",
            "Click to toggle"
        )
        b = BehaviorRegistry.get("Toggleable")
        assert b.description == "Click to toggle"

    def test_unregister_behavior(self):
        """Test unregistering a behavior."""
        BehaviorRegistry.register("Removable", "on click remove me")
        BehaviorRegistry.unregister("Removable")
        assert BehaviorRegistry.get("Removable") is None

    def test_unregister_nonexistent(self):
        """Test unregistering non-existent behavior doesn't error."""
        BehaviorRegistry.unregister("NonExistent")  # Should not raise

    def test_clear(self):
        """Test clearing all behaviors."""
        BehaviorRegistry.register("A", "on click log 'a'")
        BehaviorRegistry.register("B", "on click log 'b'")
        BehaviorRegistry.clear()
        assert BehaviorRegistry.list_behaviors() == []

    def test_get_nonexistent(self):
        """Test getting non-existent behavior returns None."""
        assert BehaviorRegistry.get("NonExistent") is None

    def test_get_all_empty(self):
        """Test get_all with empty registry."""
        assert BehaviorRegistry.get_all() == ""

    def test_get_all_single(self):
        """Test get_all with single behavior."""
        BehaviorRegistry.register("Removable", "on click remove me")
        result = BehaviorRegistry.get_all()
        assert "behavior Removable" in result
        assert "on click remove me" in result
        assert "end" in result

    def test_get_all_multiple(self):
        """Test get_all with multiple behaviors."""
        BehaviorRegistry.register("A", "on click log 'a'")
        BehaviorRegistry.register("B", "on click log 'b'")
        result = BehaviorRegistry.get_all()
        assert "behavior A" in result
        assert "behavior B" in result

    def test_get_script_tag_empty(self):
        """Test get_script_tag with empty registry."""
        assert BehaviorRegistry.get_script_tag() == ""

    def test_get_script_tag(self):
        """Test get_script_tag output."""
        BehaviorRegistry.register("Removable", "on click remove me")
        result = BehaviorRegistry.get_script_tag()
        assert result.startswith('<script type="text/hyperscript">')
        assert result.endswith("</script>")
        assert "behavior Removable" in result

    def test_list_behaviors(self):
        """Test listing all behaviors."""
        BehaviorRegistry.register("A", "on click log 'a'")
        BehaviorRegistry.register("B", "on click log 'b'")
        behaviors = BehaviorRegistry.list_behaviors()
        assert len(behaviors) == 2
        names = [b.name for b in behaviors]
        assert "A" in names
        assert "B" in names


class TestBehaviorDecorator:
    """Tests for the @behavior decorator."""

    def setup_method(self):
        """Clear registry before each test."""
        BehaviorRegistry.clear()

    def test_decorator_basic(self):
        """Test basic decorator usage."""
        @behavior("Removable")
        def removable():
            """on click remove me"""

        b = BehaviorRegistry.get("Removable")
        assert b is not None
        assert b.script == "on click remove me"

    def test_decorator_with_description(self):
        """Test decorator with description."""
        @behavior("Toggleable", description="Click to toggle class")
        def toggleable():
            """on click toggle .active"""

        b = BehaviorRegistry.get("Toggleable")
        assert b.description == "Click to toggle class"

    def test_decorator_multiline(self):
        """Test decorator with multiline docstring."""
        @behavior("Dismissable")
        def dismissable():
            """
            on click elsewhere
                remove me
            """

        b = BehaviorRegistry.get("Dismissable")
        assert "on click elsewhere" in b.script
        assert "remove me" in b.script

    def test_decorator_returns_function(self):
        """Test that decorator returns the original function."""
        @behavior("Test")
        def my_func():
            """on click log 'test'"""

        # The function should still be callable
        assert callable(my_func)

    def test_decorator_no_docstring_error(self):
        """Test that missing docstring raises error."""
        with pytest.raises(ValueError, match="must have a docstring"):
            @behavior("NoDocs")
            def no_docs():
                pass

    def test_decorator_strips_whitespace(self):
        """Test that docstring whitespace is stripped."""
        @behavior("Whitespace")
        def whitespace():
            """   on click log 'hi'   """

        b = BehaviorRegistry.get("Whitespace")
        assert b.script == "on click log 'hi'"
