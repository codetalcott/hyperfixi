"""
Django template tags for HyperFixi.

Usage:
    {% load hyperfixi %}

    <!-- Block tag (recommended) -->
    <button {% hs %}on click toggle .active{% endhs %}>Toggle</button>

    <!-- With Django variables -->
    <button {% hs %}on click fetch /api/user/{{ user.id }}{% endhs %}>Fetch</button>

    <!-- Multi-line -->
    <button {% hs %}
        on click
            toggle .active on me
            toggle .hidden on #menu
    {% endhs %}>Toggle Menu</button>

    <!-- Store in variable -->
    {% hs as my_script %}on click toggle .active{% endhs %}
    <button _="{{ my_script }}">Click</button>

    <!-- Output all registered behaviors -->
    {% hs_behaviors %}

    <!-- Simple tag for single-line scripts -->
    <button {% hs_attr "on click toggle .active" %}>Click</button>
"""

from __future__ import annotations

import html
from typing import TYPE_CHECKING

from django import template
from django.utils.safestring import mark_safe

from hyperfixi.behaviors import BehaviorRegistry
from hyperfixi.validator import validate_basic

if TYPE_CHECKING:
    from django.template import Context

register = template.Library()


@register.simple_block_tag(takes_context=True)
def hs(context: Context, content: str) -> str:
    """
    Block tag for hyperscript with rendered content.

    The content between {% hs %} and {% endhs %} is rendered first
    (so Django variables work), then processed and returned as an
    _="..." attribute.

    Usage:
        <button {% hs %}on click toggle .active{% endhs %}>Click</button>

        <!-- Django variables are rendered first -->
        <button {% hs %}on click fetch /api/user/{{ user.id }}{% endhs %}>

        <!-- Multi-line works too -->
        <button {% hs %}
            on click
                toggle .active on me
        {% endhs %}>Toggle</button>

        <!-- Store in variable with 'as' -->
        {% hs as script %}on click toggle .active{% endhs %}
        <button _="{{ script }}">Click</button>
    """
    # Content is already rendered by Django (variables substituted)
    script = content.strip()

    # Normalize whitespace for multi-line scripts
    lines = script.split("\n")
    if len(lines) > 1:
        # Remove common leading whitespace
        non_empty = [line for line in lines if line.strip()]
        if non_empty:
            min_indent = min(len(line) - len(line.lstrip()) for line in non_empty)
            script = "\n".join(
                line[min_indent:] if len(line) > min_indent else line.strip()
                for line in lines
            ).strip()

    # Basic validation (non-blocking, just for development feedback)
    # Could add debug mode that raises errors
    validation = validate_basic(script)
    if not validation.valid:
        # In DEBUG mode, we could add a comment with errors
        # For now, pass through and let the browser show errors
        pass

    # Escape for HTML attribute
    escaped = html.escape(script, quote=True)

    return mark_safe(f'_="{escaped}"')


@register.simple_tag
def hs_attr(script: str) -> str:
    """
    Simple tag for single-line hyperscript.

    Returns a complete _="..." attribute.

    Usage:
        <button {% hs_attr "on click toggle .active" %}>Click</button>
    """
    escaped = html.escape(script.strip(), quote=True)
    return mark_safe(f'_="{escaped}"')


@register.simple_tag
def hs_behaviors() -> str:
    """
    Output all registered behaviors as a script tag.

    Behaviors are registered via the @behavior decorator or in Django settings.

    Usage:
        <!-- In base.html <head> -->
        <script src="hyperscript.js"></script>
        {% hs_behaviors %}

        <!-- Now behaviors are available -->
        <div _="install Removable">Click to remove</div>
    """
    return mark_safe(BehaviorRegistry.get_script_tag())


@register.simple_tag
def hs_script(script: str) -> str:
    """
    Output hyperscript in a script tag.

    Useful for global event handlers or init scripts.

    Usage:
        {% hs_script "on keydown[key=='Escape'] send closeModal to .modal" %}
    """
    escaped = html.escape(script.strip())
    return mark_safe(f'<script type="text/hyperscript">{escaped}</script>')


@register.filter
def as_hyperscript(value: str) -> str:
    """
    Filter to convert a string to a hyperscript attribute value.

    Usage:
        {{ my_script|as_hyperscript }}
    """
    return html.escape(str(value).strip(), quote=True)
