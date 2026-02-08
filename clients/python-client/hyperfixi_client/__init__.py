"""
LokaScript Python Client Library
A Python client for server-side hyperscript compilation with Django, Flask, and FastAPI integration.
"""

from .client import HyperfixiClient
from .types import (
    CompileRequest,
    CompileResponse,
    ValidateRequest,
    ValidateResponse,
    BatchCompileRequest,
    CompilationOptions,
    ParseContext,
    ScriptMetadata,
    CompilationError,
    CompilationWarning,
    event_attribute,
    escape_attr_value,
)
from .exceptions import (
    HyperfixiError,
    CompilationError as CompilationException,
    ValidationError,
    NetworkError,
    TimeoutError,
)

# Framework integrations
from .integrations.django import DjangoHyperscriptMiddleware, hyperscript_tag
from .integrations.flask import FlaskHyperscriptExtension, hyperscript_filter
from .integrations.fastapi import FastAPIHyperscriptMiddleware, hyperscript_dependency

__version__ = "0.1.0"
__all__ = [
    # Core client
    "HyperfixiClient",
    
    # Types
    "CompileRequest",
    "CompileResponse", 
    "ValidateRequest",
    "ValidateResponse",
    "BatchCompileRequest",
    "CompilationOptions",
    "ParseContext",
    "ScriptMetadata",
    "CompilationError",
    "CompilationWarning",
    "event_attribute",
    "escape_attr_value",

    # Exceptions
    "HyperfixiError",
    "CompilationException",
    "ValidationError", 
    "NetworkError",
    "TimeoutError",
    
    # Framework integrations
    "DjangoHyperscriptMiddleware",
    "hyperscript_tag",
    "FlaskHyperscriptExtension", 
    "hyperscript_filter",
    "FastAPIHyperscriptMiddleware",
    "hyperscript_dependency",
]