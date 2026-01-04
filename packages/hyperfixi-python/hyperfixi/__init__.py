"""
HyperFixi - Django and FastAPI integration for hyperscript.

Provides template tags, view helpers, validation, and template scanning
for hyperscript in Python web frameworks.
"""

from hyperfixi.core import hs
from hyperfixi.validator import validate, validate_basic, ValidationResult
from hyperfixi.behaviors import behavior, BehaviorRegistry
from hyperfixi.scanner import Scanner, FileUsage, AggregatedUsage
from hyperfixi.aggregator import Aggregator

__version__ = "0.1.0"
__all__ = [
    # Core
    "hs",
    # Validation
    "validate",
    "validate_basic",
    "ValidationResult",
    # Behaviors
    "behavior",
    "BehaviorRegistry",
    # Scanner
    "Scanner",
    "FileUsage",
    "AggregatedUsage",
    "Aggregator",
]
