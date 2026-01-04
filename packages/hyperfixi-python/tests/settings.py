"""Minimal Django settings for testing hyperfixi management commands."""

SECRET_KEY = "test-secret-key-not-for-production"
DEBUG = True

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "hyperfixi.django",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [],
        },
    }
]

# Default empty HYPERFIXI settings
HYPERFIXI = {}

USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
