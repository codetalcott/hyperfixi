"""
Jinja2 extension for HyperFixi.

Provides template functions for hyperscript in FastAPI/Starlette applications.

Usage:
    from fastapi import FastAPI
    from fastapi.templating import Jinja2Templates
    from hyperfixi.fastapi import setup_jinja

    app = FastAPI()
    templates = Jinja2Templates(directory="templates")
    setup_jinja(templates.env)

    # Now in templates:
    <button {{ hs("on click toggle .active") }}>Toggle</button>
"""

from __future__ import annotations

import html
from typing import TYPE_CHECKING, Any

from hyperfixi.behaviors import BehaviorRegistry
from hyperfixi.core import hs as hs_core
from hyperfixi.validator import validate_basic

if TYPE_CHECKING:
    from jinja2 import Environment


def hs(script: str, **variables: Any) -> str:
    """
    Generate a hyperscript attribute for Jinja2 templates.

    Args:
        script: The hyperscript code.
        **variables: Values to substitute.

    Returns:
        Complete _="..." attribute string.

    Usage in templates:
        <button {{ hs("on click toggle .active") }}>Toggle</button>
        <button {{ hs("on click fetch /api/user/{id}", id=user.id) }}>Fetch</button>
    """
    script_value = hs_core(script, validate=True, **variables)
    escaped = html.escape(str(script_value), quote=True)
    return f'_="{escaped}"'


def hs_raw(script: str, **variables: Any) -> str:
    """
    Generate just the hyperscript value (without _="...").

    Useful when you need to compose scripts or use a different attribute.

    Usage:
        <button _="{{ hs_raw('on click toggle .active') }}">Toggle</button>
    """
    return str(hs_core(script, validate=True, **variables))


def hs_behaviors() -> str:
    """
    Output all registered behaviors as a script tag.

    Usage:
        {{ hs_behaviors() }}
    """
    return BehaviorRegistry.get_script_tag()


def hs_script(script: str) -> str:
    """
    Output hyperscript in a script tag.

    Usage:
        {{ hs_script("on keydown[key=='Escape'] send closeModal") }}
    """
    escaped = html.escape(script.strip())
    return f'<script type="text/hyperscript">{escaped}</script>'


def hs_validate(script: str) -> bool:
    """
    Validate hyperscript and return True if valid.

    Usage:
        {% if hs_validate(my_script) %}
            <button _="{{ my_script }}">Click</button>
        {% endif %}
    """
    result = validate_basic(script)
    return result.valid


class HyperscriptExtension:
    """
    Jinja2 extension class for HyperFixi.

    Can be used with Jinja2's extension system or manually added to environment.
    """

    def __init__(self, environment: Environment) -> None:
        self.environment = environment
        self._add_globals()

    def _add_globals(self) -> None:
        """Add hyperscript functions to the Jinja2 environment."""
        self.environment.globals.update(
            {
                "hs": hs,
                "hs_raw": hs_raw,
                "hs_behaviors": hs_behaviors,
                "hs_script": hs_script,
                "hs_validate": hs_validate,
            }
        )


def setup_jinja(env: Environment) -> None:
    """
    Set up Jinja2 environment with HyperFixi functions.

    Args:
        env: The Jinja2 Environment to configure.

    Example:
        from fastapi.templating import Jinja2Templates
        from hyperfixi.fastapi import setup_jinja

        templates = Jinja2Templates(directory="templates")
        setup_jinja(templates.env)
    """
    HyperscriptExtension(env)
