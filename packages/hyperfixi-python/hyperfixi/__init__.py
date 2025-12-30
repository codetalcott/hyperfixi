"""
HyperFixi - Django and FastAPI integration for hyperscript.

Provides template tags, view helpers, and validation for hyperscript in Python web frameworks.
"""

from hyperfixi.core import hs
from hyperfixi.validator import validate, validate_basic, ValidationResult
from hyperfixi.behaviors import behavior, BehaviorRegistry

__version__ = "0.1.0"
__all__ = [
    "hs",
    "validate",
    "validate_basic",
    "ValidationResult",
    "behavior",
    "BehaviorRegistry",
]
