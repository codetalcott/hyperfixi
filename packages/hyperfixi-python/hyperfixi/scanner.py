"""
Hyperscript template scanner.

Scans Django templates and other files for hyperscript usage, detecting
which commands, blocks, and positional expressions are used.

Example:
    from hyperfixi.scanner import Scanner

    scanner = Scanner()
    usage = scanner.scan_file(Path("templates/base.html"))
    print(f"Commands: {usage.commands}")
    print(f"Blocks: {usage.blocks}")
    print(f"Positional: {usage.positional}")
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Iterable


@dataclass
class FileUsage:
    """Usage information detected from a single file."""

    commands: set[str] = field(default_factory=set)
    blocks: set[str] = field(default_factory=set)
    positional: bool = False

    def __bool__(self) -> bool:
        """Return True if any usage was detected."""
        return bool(self.commands or self.blocks or self.positional)

    def merge(self, other: FileUsage) -> None:
        """Merge another FileUsage into this one."""
        self.commands.update(other.commands)
        self.blocks.update(other.blocks)
        if other.positional:
            self.positional = True

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "commands": sorted(self.commands),
            "blocks": sorted(self.blocks),
            "positional": self.positional,
        }


@dataclass
class AggregatedUsage:
    """Aggregated usage information across all files."""

    commands: set[str] = field(default_factory=set)
    blocks: set[str] = field(default_factory=set)
    positional: bool = False
    file_usage: dict[str, FileUsage] = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "commands": sorted(self.commands),
            "blocks": sorted(self.blocks),
            "positional": self.positional,
            "file_count": len(self.file_usage),
        }


# Hyperscript extraction patterns
# From _="..." attributes and Django template tags
HYPERSCRIPT_PATTERNS = [
    # Standard attributes
    re.compile(r'_="([^"]*)"'),  # _="..."
    re.compile(r"_='([^']*)'"),  # _='...'
    re.compile(r"_=`([^`]*)`"),  # _=`...` (backticks)
    # JSX patterns (Vue, Svelte, React)
    re.compile(r"_=\{`([^`]+)`\}"),  # _={`...`} (JSX template literal)
    re.compile(r"_=\{['\"]([^'\"]+)['\"]\}"),  # _={"..."} or _={'...'} (JSX)
    # data-hs variant
    re.compile(r'data-hs="([^"]*)"'),  # data-hs="..."
    re.compile(r"data-hs='([^']*)'"),  # data-hs='...'
    # Django block tag
    re.compile(r"\{%\s*hs\s*%\}(.*?)\{%\s*endhs\s*%\}", re.DOTALL),
    # Django simple tags
    re.compile(r'\{%\s*hs_attr\s+"([^"]+)"\s*%\}'),  # {% hs_attr "..." %}
    re.compile(r"\{%\s*hs_attr\s+'([^']+)'\s*%\}"),  # {% hs_attr '...' %}
    re.compile(r'\{%\s*hs_script\s+"([^"]+)"\s*%\}'),  # {% hs_script "..." %}
    re.compile(r"\{%\s*hs_script\s+'([^']+)'\s*%\}"),  # {% hs_script '...' %}
    # Script tags
    re.compile(
        r'<script[^>]*type=["\']?text/hyperscript["\']?[^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    ),
]

# Command detection pattern (21 commands from vite-plugin scanner.ts)
# These are the commands that can be tree-shaken in bundle generation
COMMAND_PATTERN = re.compile(
    r"\b(toggle|add|remove|removeClass|show|hide|set|get|put|append|"
    r"take|increment|decrement|log|send|trigger|wait|transition|go|call|"
    r"focus|blur|return)\b",
    re.IGNORECASE,
)

# Block detection patterns
# Each block has specific syntax requirements
BLOCK_PATTERNS: dict[str, re.Pattern[str]] = {
    "if": re.compile(r"\bif\b", re.IGNORECASE),
    "unless": re.compile(r"\bunless\b", re.IGNORECASE),  # maps to 'if' block
    "repeat": re.compile(
        r"\brepeat\s+(\d+|:\w+|\$\w+|[\w.]+)\s+times?\b", re.IGNORECASE
    ),
    "for": re.compile(r"\bfor\s+(each|every)\b", re.IGNORECASE),
    "while": re.compile(r"\bwhile\b", re.IGNORECASE),
    "fetch": re.compile(r"\bfetch\b", re.IGNORECASE),
    "async": re.compile(r"\basync\b", re.IGNORECASE),
}

# Positional expression pattern
# These expressions require the positional expression module
POSITIONAL_PATTERN = re.compile(
    r"\b(first|last|next|previous|closest|parent)\b", re.IGNORECASE
)

# Valid commands for validation (lowercase)
VALID_COMMANDS = {
    "toggle",
    "add",
    "remove",
    "removeclass",
    "show",
    "hide",
    "set",
    "get",
    "put",
    "append",
    "take",
    "increment",
    "decrement",
    "log",
    "send",
    "trigger",
    "wait",
    "transition",
    "go",
    "call",
    "focus",
    "blur",
    "return",
}

# Valid blocks for validation
VALID_BLOCKS = {"if", "repeat", "for", "while", "fetch", "async"}


class Scanner:
    """
    Scanner class for detecting hyperscript usage in files.

    Example:
        scanner = Scanner()
        usage = scanner.scan_file(Path("templates/base.html"))
        print(f"Commands: {usage.commands}")

        # Scan entire directory
        results = scanner.scan_directory(Path("templates"))
        for path, usage in results.items():
            print(f"{path}: {usage.commands}")
    """

    def __init__(
        self,
        *,
        include_extensions: set[str] | None = None,
        exclude_patterns: list[str] | None = None,
        debug: bool = False,
    ) -> None:
        """
        Initialize the scanner.

        Args:
            include_extensions: File extensions to scan (default: .html, .htm, .txt, .xml)
            exclude_patterns: Directory/file patterns to exclude
            debug: Enable debug logging
        """
        self.include_extensions = include_extensions or {
            ".html",
            ".htm",
            ".txt",
            ".xml",
            ".jinja",
            ".jinja2",
        }
        self.exclude_patterns = exclude_patterns or [
            "__pycache__",
            ".git",
            "node_modules",
            ".venv",
            "venv",
            "site-packages",
        ]
        self.debug = debug

    def should_scan(self, path: Path) -> bool:
        """Check if a file should be scanned."""
        if path.suffix.lower() not in self.include_extensions:
            return False

        path_str = str(path)
        for pattern in self.exclude_patterns:
            if pattern in path_str:
                return False

        return True

    def extract_hyperscript(self, content: str) -> list[str]:
        """
        Extract all hyperscript snippets from content.

        Handles various attribute formats and Django template tags.

        Args:
            content: The file content to scan

        Returns:
            List of hyperscript code snippets found
        """
        scripts: list[str] = []

        for pattern in HYPERSCRIPT_PATTERNS:
            for match in pattern.finditer(content):
                script = match.group(1).strip()
                if script:
                    scripts.append(script)

        return scripts

    def analyze_script(self, script: str) -> FileUsage:
        """
        Analyze a hyperscript snippet for commands, blocks, and expressions.

        Args:
            script: The hyperscript code to analyze

        Returns:
            FileUsage with detected commands, blocks, and positional flag
        """
        usage = FileUsage()

        # Detect commands
        for match in COMMAND_PATTERN.finditer(script):
            usage.commands.add(match.group(1).lower())

        # Detect blocks
        for block_name, pattern in BLOCK_PATTERNS.items():
            if pattern.search(script):
                # 'unless' uses the same implementation as 'if'
                if block_name == "unless":
                    usage.blocks.add("if")
                else:
                    usage.blocks.add(block_name)

        # Detect positional expressions
        if POSITIONAL_PATTERN.search(script):
            usage.positional = True

        return usage

    def scan_content(self, content: str, file_path: str = "<string>") -> FileUsage:
        """
        Scan content for hyperscript usage.

        Args:
            content: The file content to scan
            file_path: Path for debug logging

        Returns:
            FileUsage with detected usage
        """
        usage = FileUsage()

        scripts = self.extract_hyperscript(content)
        for script in scripts:
            script_usage = self.analyze_script(script)
            usage.merge(script_usage)

        if self.debug and usage:
            print(
                f"[hyperfixi] Scanned {file_path}: "
                f"commands={sorted(usage.commands)}, "
                f"blocks={sorted(usage.blocks)}, "
                f"positional={usage.positional}"
            )

        return usage

    def scan_file(self, path: Path) -> FileUsage:
        """
        Scan a single file for hyperscript usage.

        Args:
            path: Path to the file

        Returns:
            FileUsage with detected usage
        """
        try:
            content = path.read_text(encoding="utf-8")
            return self.scan_content(content, str(path))
        except Exception as e:
            if self.debug:
                print(f"[hyperfixi] Error reading {path}: {e}")
            return FileUsage()

    def scan_directory(self, directory: Path) -> dict[str, FileUsage]:
        """
        Scan all template files in a directory.

        Args:
            directory: Directory to scan

        Returns:
            Dict mapping file paths to their usage
        """
        results: dict[str, FileUsage] = {}

        if not directory.exists():
            return results

        for path in directory.rglob("*"):
            if path.is_file() and self.should_scan(path):
                usage = self.scan_file(path)
                if usage:
                    results[str(path)] = usage

        return results

    def scan_directories(self, directories: Iterable[Path]) -> dict[str, FileUsage]:
        """
        Scan multiple directories for hyperscript usage.

        Args:
            directories: Directories to scan

        Returns:
            Dict mapping file paths to their usage
        """
        results: dict[str, FileUsage] = {}

        for directory in directories:
            dir_results = self.scan_directory(directory)
            results.update(dir_results)

        return results
