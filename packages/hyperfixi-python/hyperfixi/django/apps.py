"""
Django app configuration for HyperFixi.
"""

from django.apps import AppConfig


class HyperfixiConfig(AppConfig):
    """Configuration for the hyperfixi Django app."""

    name = "hyperfixi.django"
    verbose_name = "HyperFixi"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """
        Called when Django starts.

        Loads behaviors from Django settings if configured.
        """
        from django.conf import settings

        from hyperfixi.behaviors import BehaviorRegistry

        # Load behaviors from settings if configured
        hyperfixi_settings = getattr(settings, "HYPERFIXI", {})
        behaviors = hyperfixi_settings.get("BEHAVIORS", {})

        for name, script in behaviors.items():
            BehaviorRegistry.register(name, script)
