"""
Type definitions for LokaScript Python client
"""

from html import escape as _html_escape
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


def event_attribute(meta: Optional["ScriptMetadata"]) -> str:
    """Return the inline event handler attribute name (e.g. ``onclick``,
    ``onsubmit``) for the given script metadata.  Falls back to ``onclick``
    when no event information is available."""
    if meta and meta.events:
        return "on" + meta.events[0]
    return "onclick"


def escape_attr_value(value: str) -> str:
    """Escape a string for safe inclusion inside an HTML attribute value."""
    return _html_escape(value, quote=True)


class CompatibilityMode(str, Enum):
    """Compatibility mode for compiled JavaScript"""
    MODERN = "modern"
    LEGACY = "legacy"


class ParseContext(BaseModel):
    """Context for parsing hyperscript templates"""
    template_vars: Optional[Dict[str, Any]] = Field(default=None, alias="templateVars")
    source_locale: Optional[str] = Field(default=None, alias="sourceLocale")
    target_locale: Optional[str] = Field(default=None, alias="targetLocale")
    preserve_original: Optional[bool] = Field(default=None, alias="preserveOriginal")

    class Config:
        allow_population_by_field_name = True


class CompilationOptions(BaseModel):
    """Options for hyperscript compilation"""
    minify: Optional[bool] = False
    compatibility: Optional[CompatibilityMode] = CompatibilityMode.MODERN
    source_map: Optional[bool] = Field(default=False, alias="sourceMap")
    optimization: Optional[bool] = False
    template_vars: Optional[Dict[str, Any]] = Field(default=None, alias="templateVars")

    class Config:
        allow_population_by_field_name = True


class ScriptMetadata(BaseModel):
    """Metadata about a compiled hyperscript"""
    complexity: int
    dependencies: List[str]
    selectors: List[str]
    events: List[str]
    commands: List[str]
    template_variables: List[str] = Field(alias="templateVariables")

    class Config:
        allow_population_by_field_name = True


class CompilationError(BaseModel):
    """Error that occurred during compilation"""
    type: str
    message: str
    line: int
    column: int
    stack: Optional[str] = None


class CompilationWarning(BaseModel):
    """Warning that occurred during compilation"""
    type: str
    message: str
    line: Optional[int] = None
    column: Optional[int] = None


class Timings(BaseModel):
    """Compilation timing information"""
    total: float
    parse: float
    compile: float
    cache: float


class CompileRequest(BaseModel):
    """Request to compile hyperscript"""
    scripts: Dict[str, str]
    options: Optional[CompilationOptions] = None
    context: Optional[ParseContext] = None


class CompileResponse(BaseModel):
    """Response from hyperscript compilation"""
    compiled: Dict[str, str]
    metadata: Dict[str, ScriptMetadata]
    timings: Timings
    warnings: List[CompilationWarning]
    errors: List[CompilationError]


class ValidateRequest(BaseModel):
    """Request to validate hyperscript"""
    script: str
    context: Optional[ParseContext] = None


class ValidateResponse(BaseModel):
    """Response from hyperscript validation"""
    valid: bool
    errors: List[CompilationError]
    warnings: List[CompilationWarning]
    metadata: Optional[ScriptMetadata] = None


class ScriptDefinition(BaseModel):
    """Definition of a script for batch compilation"""
    id: str
    script: str
    options: Optional[CompilationOptions] = None
    context: Optional[ParseContext] = None


class BatchCompileRequest(BaseModel):
    """Request to compile multiple scripts in batch"""
    definitions: List[ScriptDefinition]


class CacheStats(BaseModel):
    """Cache statistics"""
    hits: int
    misses: int
    hit_ratio: float = Field(alias="hitRatio")
    size: int
    max_size: int = Field(alias="maxSize")

    class Config:
        allow_population_by_field_name = True


class HealthStatus(BaseModel):
    """Health status of the LokaScript service"""
    status: str
    version: str
    uptime: int
    cache: CacheStats
    timestamp: str