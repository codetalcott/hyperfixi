"""
Django management command to validate hyperscript in templates.

Usage:
    python manage.py hyperfixi_check
    python manage.py hyperfixi_check --full  # Use Node.js CLI for full validation
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import TYPE_CHECKING

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.template import engines

from hyperfixi.validator import validate, validate_basic

if TYPE_CHECKING:
    from argparse import ArgumentParser


# Patterns to find hyperscript in templates
HYPERSCRIPT_PATTERNS = [
    # _="..." attribute
    re.compile(r'_="([^"]*)"'),
    re.compile(r"_='([^']*)'"),
    # data-hs="..." attribute
    re.compile(r'data-hs="([^"]*)"'),
    re.compile(r"data-hs='([^']*)'"),
    # {% hs %}...{% endhs %} block
    re.compile(r"\{%\s*hs\s*%\}(.*?)\{%\s*endhs\s*%\}", re.DOTALL),
    # {% hs_attr "..." %}
    re.compile(r'\{%\s*hs_attr\s+"([^"]+)"\s*%\}'),
    re.compile(r"\{%\s*hs_attr\s+'([^']+)'\s*%\}"),
]


class Command(BaseCommand):
    """Validate hyperscript in Django templates."""

    help = "Validate hyperscript in all Django templates"

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--full",
            action="store_true",
            help="Use Node.js CLI for full validation (requires hyperfixi to be installed)",
        )
        parser.add_argument(
            "--verbose",
            "-v",
            action="count",
            default=0,
            help="Increase verbosity",
        )
        parser.add_argument(
            "paths",
            nargs="*",
            type=str,
            help="Specific template files or directories to check",
        )

    def handle(self, *args, **options) -> None:
        full_validation = options["full"]
        verbose = options["verbose"]
        paths = options["paths"]

        self.stdout.write("Checking hyperscript in templates...\n")

        # Get template directories
        template_dirs = self._get_template_dirs(paths)

        if not template_dirs:
            raise CommandError("No template directories found")

        if verbose:
            self.stdout.write(f"Checking directories: {template_dirs}\n")

        # Find all template files
        template_files = self._find_template_files(template_dirs)

        if not template_files:
            self.stdout.write(self.style.WARNING("No template files found"))
            return

        self.stdout.write(f"Found {len(template_files)} template files\n")

        # Check each file
        errors_found = 0
        warnings_found = 0
        scripts_checked = 0

        for template_path in template_files:
            try:
                content = template_path.read_text()
            except Exception as e:
                self.stderr.write(f"Error reading {template_path}: {e}\n")
                continue

            # Find all hyperscript in the file
            scripts = self._extract_hyperscript(content)

            for script, line_hint in scripts:
                scripts_checked += 1

                # Skip scripts with unresolved template variables
                if "{{" in script or "{%" in script:
                    if verbose > 1:
                        self.stdout.write(
                            f"  Skipping (has template vars): {script[:50]}...\n"
                        )
                    continue

                # Validate
                result = validate(script, full=full_validation)

                if not result.valid:
                    errors_found += 1
                    self.stderr.write(
                        self.style.ERROR(f"\n{template_path}:{line_hint}")
                    )
                    self.stderr.write(f"  Script: {script[:80]}...\n")
                    for error in result.errors:
                        self.stderr.write(self.style.ERROR(f"  ERROR: {error}\n"))

                for warning in result.warnings:
                    warnings_found += 1
                    if verbose:
                        self.stdout.write(
                            self.style.WARNING(f"  WARNING ({template_path}): {warning}\n")
                        )

        # Summary
        self.stdout.write(f"\nChecked {scripts_checked} hyperscript snippets\n")

        if errors_found:
            self.stderr.write(
                self.style.ERROR(f"Found {errors_found} errors, {warnings_found} warnings\n")
            )
            raise CommandError(f"Validation failed with {errors_found} errors")
        elif warnings_found:
            self.stdout.write(
                self.style.WARNING(f"Found {warnings_found} warnings\n")
            )
        else:
            self.stdout.write(self.style.SUCCESS("All hyperscript is valid!\n"))

    def _get_template_dirs(self, paths: list[str]) -> list[Path]:
        """Get template directories to check."""
        if paths:
            return [Path(p) for p in paths]

        dirs = []

        # Get from Django settings
        for engine in engines.all():
            for template_dir in engine.dirs:
                dirs.append(Path(template_dir))

            # Also check app template directories
            if hasattr(engine, "engine") and hasattr(engine.engine, "dirs"):
                for template_dir in engine.engine.dirs:
                    dirs.append(Path(template_dir))

        # Check TEMPLATES setting directly
        for template_config in settings.TEMPLATES:
            for dir_path in template_config.get("DIRS", []):
                dirs.append(Path(dir_path))

        return [d for d in dirs if d.exists()]

    def _find_template_files(self, dirs: list[Path]) -> list[Path]:
        """Find all template files in the given directories."""
        files = []
        extensions = {".html", ".htm", ".txt", ".xml"}

        for dir_path in dirs:
            if dir_path.is_file():
                if dir_path.suffix in extensions:
                    files.append(dir_path)
            else:
                for ext in extensions:
                    files.extend(dir_path.rglob(f"*{ext}"))

        return sorted(set(files))

    def _extract_hyperscript(self, content: str) -> list[tuple[str, int]]:
        """Extract all hyperscript from template content."""
        scripts = []

        for pattern in HYPERSCRIPT_PATTERNS:
            for match in pattern.finditer(content):
                script = match.group(1)
                # Estimate line number
                line_num = content[: match.start()].count("\n") + 1
                scripts.append((script.strip(), line_num))

        return scripts
