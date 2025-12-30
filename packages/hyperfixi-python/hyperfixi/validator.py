"""
Hyperscript validation utilities.

Provides basic regex-based validation (Tier 1) that catches ~80% of common errors
without requiring external dependencies.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Result of hyperscript validation."""

    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.valid


# Valid hyperscript starting keywords
VALID_STARTS = (
    "on ",
    "def ",
    "init",
    "behavior ",
    "set ",
    "get ",
    "call ",
    "fetch ",
    "put ",
    "add ",
    "remove ",
    "toggle ",
    "trigger ",
    "send ",
    "take ",
    "log ",
    "wait ",
    "settle",
    "if ",
    "repeat ",
    "for ",
    "while ",
    "async ",
    "tell ",
    "transition ",
    "measure ",
    "go ",
    "js ",
    "return ",
    "exit",
    "halt",
    "break",
    "continue",
    "throw ",
    "install ",
)


def validate_basic(script: str) -> ValidationResult:
    """
    Basic regex-based validation (~80% error detection).

    This validation catches common errors without requiring Node.js or
    any external dependencies. It's fast and suitable for runtime use.

    Args:
        script: The hyperscript code to validate.

    Returns:
        ValidationResult with valid flag, errors, and warnings.

    Examples:
        >>> result = validate_basic("on click toggle .active")
        >>> result.valid
        True

        >>> result = validate_basic("onclick toggle .active")
        >>> result.valid
        False
        >>> result.errors
        ["Script must start with valid keyword..."]
    """
    errors: list[str] = []
    warnings: list[str] = []

    script = script.strip()

    if not script:
        errors.append("Script is empty")
        return ValidationResult(valid=False, errors=errors, warnings=warnings)

    # Check for valid starting keyword
    starts_valid = any(script.startswith(kw) for kw in VALID_STARTS)
    if not starts_valid:
        preview = script[:30] + "..." if len(script) > 30 else script
        errors.append(f"Script must start with valid keyword, got: '{preview}'")

    # Check balanced single quotes (accounting for escaped quotes)
    single_quotes = _count_unescaped(script, "'")
    if single_quotes % 2 != 0:
        errors.append("Unbalanced single quotes")

    # Check balanced double quotes
    double_quotes = _count_unescaped(script, '"')
    if double_quotes % 2 != 0:
        errors.append("Unbalanced double quotes")

    # Check balanced parentheses
    if script.count("(") != script.count(")"):
        errors.append("Unbalanced parentheses")

    # Check balanced brackets
    if script.count("[") != script.count("]"):
        errors.append("Unbalanced brackets")

    # Check balanced braces
    if script.count("{") != script.count("}"):
        errors.append("Unbalanced braces")

    # Warnings for common mistakes
    if " on click" in script and not script.startswith("on "):
        warnings.append("Did you mean 'on click' at the start?")

    if "onclick" in script.lower() and "on click" not in script:
        warnings.append("Use 'on click' (with space), not 'onclick'")

    if "behavior " in script and not script.endswith("end") and "end\n" not in script:
        if script.count("behavior ") > 0 and "end" not in script:
            warnings.append("Behavior definition should end with 'end'")

    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
    )


def validate(script: str, *, full: bool = False) -> ValidationResult:
    """
    Validate hyperscript code.

    Args:
        script: The hyperscript code to validate.
        full: If True, attempt full validation via Node.js CLI (Tier 2).
              Falls back to basic validation if Node.js is unavailable.

    Returns:
        ValidationResult with valid flag, errors, and warnings.
    """
    if full:
        try:
            from hyperfixi.cli_validator import validate_full

            return validate_full(script)
        except ImportError:
            pass  # Fall through to basic validation

    return validate_basic(script)


def _count_unescaped(text: str, char: str) -> int:
    """Count unescaped occurrences of a character."""
    count = 0
    escaped = False
    for c in text:
        if escaped:
            escaped = False
        elif c == "\\":
            escaped = True
        elif c == char:
            count += 1
    return count
