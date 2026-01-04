"""
Hyperscript usage aggregator.

Collects and aggregates hyperscript usage across all scanned files.

Example:
    from hyperfixi.scanner import Scanner
    from hyperfixi.aggregator import Aggregator

    scanner = Scanner()
    aggregator = Aggregator()

    # Scan files and aggregate
    for template in templates:
        usage = scanner.scan_file(template)
        aggregator.add(str(template), usage)

    # Get aggregated usage
    usage = aggregator.get_usage()
    print(f"All commands: {usage.commands}")
"""

from __future__ import annotations

from hyperfixi.scanner import FileUsage, AggregatedUsage


class Aggregator:
    """
    Aggregator class for collecting usage across files.

    Maintains a cache of file usage and provides aggregated statistics.
    Supports incremental updates with change detection.

    Example:
        aggregator = Aggregator()
        aggregator.add("page1.html", FileUsage(commands={"toggle"}))
        aggregator.add("page2.html", FileUsage(commands={"add", "remove"}))

        usage = aggregator.get_usage()
        assert usage.commands == {"toggle", "add", "remove"}
    """

    def __init__(self) -> None:
        """Initialize an empty aggregator."""
        self._file_usage: dict[str, FileUsage] = {}
        self._cached_usage: AggregatedUsage | None = None

    def add(self, file_path: str, usage: FileUsage) -> bool:
        """
        Add or update usage for a file.

        Args:
            file_path: Path to the file
            usage: Detected usage for the file

        Returns:
            True if the overall usage changed
        """
        existing = self._file_usage.get(file_path)

        if existing:
            if (
                existing.commands == usage.commands
                and existing.blocks == usage.blocks
                and existing.positional == usage.positional
            ):
                return False

        self._file_usage[file_path] = usage
        self._cached_usage = None
        return True

    def remove(self, file_path: str) -> bool:
        """
        Remove a file from tracking.

        Args:
            file_path: Path to the file to remove

        Returns:
            True if the file was being tracked
        """
        if file_path in self._file_usage:
            del self._file_usage[file_path]
            self._cached_usage = None
            return True
        return False

    def get_usage(self) -> AggregatedUsage:
        """
        Get aggregated usage across all files.

        Returns cached result if available.

        Returns:
            AggregatedUsage with combined commands, blocks, and positional flag
        """
        if self._cached_usage is not None:
            return self._cached_usage

        commands: set[str] = set()
        blocks: set[str] = set()
        positional = False

        for usage in self._file_usage.values():
            commands.update(usage.commands)
            blocks.update(usage.blocks)
            if usage.positional:
                positional = True

        self._cached_usage = AggregatedUsage(
            commands=commands,
            blocks=blocks,
            positional=positional,
            file_usage=dict(self._file_usage),
        )

        return self._cached_usage

    def load_from_scan(self, scanned_files: dict[str, FileUsage]) -> None:
        """
        Load usage from a project scan.

        Replaces all current tracking with the scanned results.

        Args:
            scanned_files: Dict mapping file paths to their usage
        """
        self._file_usage = dict(scanned_files)
        self._cached_usage = None

    def has_usage(self) -> bool:
        """
        Check if any hyperscript usage has been detected.

        Returns:
            True if any commands, blocks, or positional expressions found
        """
        usage = self.get_usage()
        return bool(usage.commands or usage.blocks or usage.positional)

    def get_summary(self) -> dict:
        """
        Get summary for logging.

        Returns:
            Dict with commands, blocks, positional, and file_count
        """
        usage = self.get_usage()
        return {
            "commands": sorted(usage.commands),
            "blocks": sorted(usage.blocks),
            "positional": usage.positional,
            "file_count": len(self._file_usage),
        }

    def clear(self) -> None:
        """Clear all tracked usage."""
        self._file_usage.clear()
        self._cached_usage = None

    def get_file_count(self) -> int:
        """Get number of files being tracked."""
        return len(self._file_usage)

    def get_files(self) -> list[str]:
        """Get list of tracked file paths."""
        return sorted(self._file_usage.keys())
