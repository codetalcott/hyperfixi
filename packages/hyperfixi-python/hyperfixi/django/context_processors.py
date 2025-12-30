"""
Django context processors for HyperFixi.

Add common hyperscript utilities to all templates.

Usage in settings.py:
    TEMPLATES = [{
        'OPTIONS': {
            'context_processors': [
                # ...
                'hyperfixi.django.context_processors.hyperscript',
            ],
        },
    }]

Then in templates (no {% load %} needed):
    <button _="{{ hs_toggle_active }}">Toggle</button>
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from hyperfixi.core import hs

if TYPE_CHECKING:
    from django.http import HttpRequest


def hyperscript(request: HttpRequest) -> dict[str, str]:
    """
    Add common hyperscript utilities to all templates.

    Returns a dictionary of pre-built hyperscript snippets that can be
    used directly in templates without {% load hyperfixi %}.

    Available context variables:
        - hs_toggle_active: Toggle .active class
        - hs_toggle_hidden: Toggle .hidden class
        - hs_remove_me: Remove the element
        - hs_remove_parent: Remove closest parent
        - hs_close_modal: Trigger closeModal event
        - hs_submit_form: Submit closest form
        - hs_focus_next: Focus next input
        - hs_copy_to_clipboard: Copy element text to clipboard
    """
    return {
        # Basic toggles
        "hs_toggle_active": hs("on click toggle .active"),
        "hs_toggle_hidden": hs("on click toggle .hidden"),
        "hs_toggle_open": hs("on click toggle .open"),
        "hs_toggle_expanded": hs("on click toggle [aria-expanded]"),
        # Removal
        "hs_remove_me": hs("on click remove me"),
        "hs_remove_parent": hs("on click remove closest parent"),
        "hs_remove_closest_item": hs("on click remove closest .item"),
        # Events
        "hs_close_modal": hs("on click trigger closeModal"),
        "hs_submit_form": hs("on click trigger submit on closest <form/>"),
        "hs_focus_next": hs("on click focus() on next <input/>"),
        # Clipboard
        "hs_copy_to_clipboard": hs(
            "on click writeText(my innerText) on navigator.clipboard then add .copied to me"
        ),
        # Loading states
        "hs_loading_state": hs(
            "on click add .loading to me then wait 100ms then remove .loading from me"
        ),
    }
