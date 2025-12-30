"""
Hyperscript behavior registry.

Behaviors are reusable hyperscript definitions that can be installed on elements.
This module provides a registry for collecting behaviors defined in Python and
outputting them as hyperscript.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


@dataclass
class Behavior:
    """A registered hyperscript behavior."""

    name: str
    script: str
    description: str = ""

    def to_hyperscript(self) -> str:
        """Convert to hyperscript behavior definition."""
        # Normalize indentation
        lines = self.script.strip().split("\n")
        if len(lines) == 1:
            body = f"    {lines[0]}"
        else:
            # Multi-line: ensure proper indentation
            body = "\n".join(f"    {line.strip()}" for line in lines if line.strip())

        return f"behavior {self.name}\n{body}\nend"


class BehaviorRegistry:
    """
    Registry for hyperscript behaviors.

    Behaviors can be registered via the @behavior decorator or directly
    via register(). All registered behaviors can be output as a script tag
    using get_all() or get_script_tag().

    Example:
        from hyperfixi import behavior

        @behavior("Removable")
        def removable():
            '''on click remove me'''

        @behavior("Toggleable", description="Click to toggle class")
        def toggleable():
            '''on click toggle .active'''

        # In your Django app's ready() method:
        from . import behaviors  # This registers them

        # In template:
        {% hs_behaviors %}  <!-- Outputs all behaviors -->
    """

    _behaviors: dict[str, Behavior] = {}

    @classmethod
    def register(cls, name: str, script: str, description: str = "") -> None:
        """
        Register a behavior.

        Args:
            name: The behavior name (e.g., "Removable").
            script: The hyperscript body (without "behavior X" and "end").
            description: Optional description for documentation.
        """
        cls._behaviors[name] = Behavior(name=name, script=script, description=description)

    @classmethod
    def unregister(cls, name: str) -> None:
        """Remove a registered behavior."""
        cls._behaviors.pop(name, None)

    @classmethod
    def clear(cls) -> None:
        """Clear all registered behaviors."""
        cls._behaviors.clear()

    @classmethod
    def get(cls, name: str) -> Behavior | None:
        """Get a behavior by name."""
        return cls._behaviors.get(name)

    @classmethod
    def get_all(cls) -> str:
        """
        Get all behaviors as hyperscript code.

        Returns:
            String containing all behavior definitions.
        """
        if not cls._behaviors:
            return ""

        return "\n\n".join(b.to_hyperscript() for b in cls._behaviors.values())

    @classmethod
    def get_script_tag(cls) -> str:
        """
        Get all behaviors wrapped in a script tag.

        Returns:
            HTML script tag with all behavior definitions.
        """
        behaviors = cls.get_all()
        if not behaviors:
            return ""

        return f'<script type="text/hyperscript">\n{behaviors}\n</script>'

    @classmethod
    def list_behaviors(cls) -> list[Behavior]:
        """Get all registered behaviors as a list."""
        return list(cls._behaviors.values())


def behavior(
    name: str,
    description: str = "",
) -> Callable[[Callable[[], None]], Callable[[], None]]:
    """
    Decorator for registering hyperscript behaviors.

    The decorated function's docstring becomes the behavior script.

    Args:
        name: The behavior name.
        description: Optional description.

    Returns:
        Decorator function.

    Example:
        @behavior("Removable", description="Click to remove element")
        def removable():
            '''on click remove me'''

        @behavior("Dismissable")
        def dismissable():
            '''
            on click elsewhere
                remove me
            '''
    """

    def decorator(func: Callable[[], None]) -> Callable[[], None]:
        script = func.__doc__
        if script is None:
            raise ValueError(f"Behavior {name} must have a docstring containing the hyperscript")

        BehaviorRegistry.register(name, script.strip(), description)
        return func

    return decorator
