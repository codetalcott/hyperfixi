"""
Core hyperscript generation functions.
"""

from __future__ import annotations

import html
import re
from typing import Any

# Try to import Django's mark_safe, fall back to a no-op wrapper
try:
    from django.utils.safestring import mark_safe
except ImportError:
    def mark_safe(s: str) -> str:
        """Fallback when Django is not installed."""
        return s


def hs(script: str, *, validate: bool = True, **variables: Any) -> str:
    """
    Generate hyperscript with variable substitution.

    Variables use {name} syntax (single braces) to avoid conflicts with
    hyperscript's own syntax.

    Args:
        script: The hyperscript code with optional {variable} placeholders.
        validate: Whether to run basic validation (default: True).
        **variables: Values to substitute into the script.

    Returns:
        A safe string suitable for use in templates.

    Examples:
        # In views.py
        context = {
            'toggle_script': hs("on click toggle .active"),
            'fetch_script': hs("on click fetch /api/user/{id}", id=request.user.id),
        }

        # In templates
        <button _="{{ toggle_script }}">Click</button>

        # Multi-line
        hs('''
            on click
                toggle .active on me
                toggle .hidden on #menu
        ''')
    """
    result = script

    # Substitute variables safely (escape HTML entities)
    for key, value in variables.items():
        escaped_value = html.escape(str(value))
        result = result.replace(f"{{{key}}}", escaped_value)

    # Basic validation if enabled
    if validate:
        from hyperfixi.validator import validate_basic
        validation = validate_basic(result)
        if not validation.valid:
            # In debug mode, we could raise an error
            # For now, just pass through (validation errors will show in browser)
            pass

    return mark_safe(result)


def hs_attr(script: str, *, validate: bool = True, **variables: Any) -> str:
    """
    Generate a complete hyperscript attribute (_="...").

    This is useful when you want the full attribute, not just the value.

    Args:
        script: The hyperscript code.
        validate: Whether to run basic validation.
        **variables: Values to substitute into the script.

    Returns:
        A safe string like '_="on click toggle .active"'

    Example:
        <button {{ hs_attr("on click toggle .active") }}>Click</button>
    """
    script_value = hs(script, validate=validate, **variables)
    # Escape the script for use in an HTML attribute
    escaped = html.escape(str(script_value), quote=True)
    return mark_safe(f'_="{escaped}"')


def escape_hyperscript(script: str) -> str:
    """
    Escape a hyperscript string for safe inclusion in HTML attributes.

    This handles the tricky escaping needed when hyperscript contains
    quotes or other special characters.

    Args:
        script: Raw hyperscript code.

    Returns:
        Escaped string safe for HTML attribute values.
    """
    return html.escape(script, quote=True)
