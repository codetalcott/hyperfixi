"""
Full hyperscript validation using Node.js CLI.

This is Tier 2 validation that provides complete syntax checking
by calling the hyperfixi CLI tool.

Requires: npm install -g @hyperfixi/cli (or npx hyperfixi)
"""

from __future__ import annotations

import json
import subprocess
from typing import TYPE_CHECKING

from hyperfixi.validator import ValidationResult, validate_basic

if TYPE_CHECKING:
    pass


def validate_full(script: str, *, timeout: float = 5.0) -> ValidationResult:
    """
    Full validation using the hyperfixi CLI.

    Falls back to basic validation if Node.js or the CLI is unavailable.

    Args:
        script: The hyperscript code to validate.
        timeout: Maximum time to wait for CLI response (seconds).

    Returns:
        ValidationResult with full parser validation.
    """
    try:
        result = subprocess.run(
            ["npx", "hyperfixi", "validate", "--json"],
            input=script,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                return ValidationResult(
                    valid=data.get("valid", True),
                    errors=data.get("errors", []),
                    warnings=data.get("warnings", []),
                )
            except json.JSONDecodeError:
                # CLI output wasn't JSON, assume valid
                return ValidationResult(valid=True)

        # Non-zero return code - check if it's a CLI issue or actual validation error
        stderr = result.stderr.strip() if result.stderr else ""

        # If npm can't find the hyperfixi package, fall back to basic validation
        if "npm error" in stderr or "could not determine executable" in stderr:
            return validate_basic(script)

        # Otherwise, parse error output
        try:
            data = json.loads(result.stdout or result.stderr)
            return ValidationResult(
                valid=False,
                errors=data.get("errors", [stderr or "Validation failed"]),
                warnings=data.get("warnings", []),
            )
        except json.JSONDecodeError:
            # Couldn't parse output, return as error
            return ValidationResult(
                valid=False,
                errors=[stderr or "Validation failed"],
            )

    except subprocess.TimeoutExpired:
        # CLI took too long, fall back to basic validation
        return validate_basic(script)

    except FileNotFoundError:
        # Node.js or npx not installed, fall back to basic validation
        return validate_basic(script)

    except Exception as e:
        # Any other error, fall back to basic validation
        return validate_basic(script)


def is_cli_available() -> bool:
    """
    Check if the hyperfixi CLI is available.

    Returns:
        True if the CLI can be executed, False otherwise.
    """
    try:
        result = subprocess.run(
            ["npx", "hyperfixi", "--version"],
            capture_output=True,
            text=True,
            timeout=5.0,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return False
