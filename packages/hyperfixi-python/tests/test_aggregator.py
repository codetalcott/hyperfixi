"""Tests for hyperfixi.aggregator module."""

from __future__ import annotations

import pytest

from hyperfixi.scanner import FileUsage
from hyperfixi.aggregator import Aggregator


class TestAggregator:
    """Tests for the Aggregator class."""

    def test_add_file(self):
        """Adding a file should track its usage."""
        aggregator = Aggregator()
        usage = FileUsage(commands={"toggle"})
        changed = aggregator.add("test.html", usage)
        assert changed is True
        assert aggregator.has_usage()

    def test_add_empty_file(self):
        """Adding empty usage should still work."""
        aggregator = Aggregator()
        usage = FileUsage()
        aggregator.add("test.html", usage)
        assert not aggregator.has_usage()

    def test_add_same_usage_returns_false(self):
        """Adding identical usage should return False."""
        aggregator = Aggregator()
        usage = FileUsage(commands={"toggle"})
        aggregator.add("test.html", usage)
        changed = aggregator.add("test.html", usage)
        assert changed is False

    def test_add_different_usage_returns_true(self):
        """Adding different usage for same file should return True."""
        aggregator = Aggregator()
        usage1 = FileUsage(commands={"toggle"})
        usage2 = FileUsage(commands={"toggle", "add"})
        aggregator.add("test.html", usage1)
        changed = aggregator.add("test.html", usage2)
        assert changed is True

    def test_add_different_blocks_returns_true(self):
        """Adding different blocks should return True."""
        aggregator = Aggregator()
        usage1 = FileUsage(blocks={"if"})
        usage2 = FileUsage(blocks={"if", "repeat"})
        aggregator.add("test.html", usage1)
        changed = aggregator.add("test.html", usage2)
        assert changed is True

    def test_add_different_positional_returns_true(self):
        """Adding different positional should return True."""
        aggregator = Aggregator()
        usage1 = FileUsage(positional=False)
        usage2 = FileUsage(positional=True)
        aggregator.add("test.html", usage1)
        changed = aggregator.add("test.html", usage2)
        assert changed is True


class TestAggregatorGetUsage:
    """Tests for get_usage method."""

    def test_aggregates_commands(self):
        """get_usage should aggregate commands from all files."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(commands={"toggle", "add"}))
        aggregator.add("file2.html", FileUsage(commands={"remove", "show"}))
        usage = aggregator.get_usage()
        assert usage.commands == {"toggle", "add", "remove", "show"}

    def test_aggregates_blocks(self):
        """get_usage should aggregate blocks from all files."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(blocks={"if"}))
        aggregator.add("file2.html", FileUsage(blocks={"repeat"}))
        usage = aggregator.get_usage()
        assert usage.blocks == {"if", "repeat"}

    def test_aggregates_positional(self):
        """get_usage should OR positional from all files."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(positional=False))
        aggregator.add("file2.html", FileUsage(positional=True))
        usage = aggregator.get_usage()
        assert usage.positional is True

    def test_all_false_positional(self):
        """get_usage should return False if no file has positional."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(positional=False))
        aggregator.add("file2.html", FileUsage(positional=False))
        usage = aggregator.get_usage()
        assert usage.positional is False

    def test_includes_file_usage(self):
        """get_usage should include per-file usage."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(commands={"toggle"}))
        aggregator.add("file2.html", FileUsage(commands={"add"}))
        usage = aggregator.get_usage()
        assert len(usage.file_usage) == 2
        assert "file1.html" in usage.file_usage
        assert "file2.html" in usage.file_usage

    def test_caches_result(self):
        """get_usage should cache result."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        usage1 = aggregator.get_usage()
        usage2 = aggregator.get_usage()
        assert usage1 is usage2

    def test_invalidates_cache_on_add(self):
        """add should invalidate cache."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(commands={"toggle"}))
        usage1 = aggregator.get_usage()
        aggregator.add("file2.html", FileUsage(commands={"add"}))
        usage2 = aggregator.get_usage()
        assert usage1 is not usage2


class TestAggregatorRemove:
    """Tests for remove method."""

    def test_remove_file(self):
        """Removing a tracked file should return True."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        removed = aggregator.remove("test.html")
        assert removed is True
        assert not aggregator.has_usage()

    def test_remove_nonexistent_file(self):
        """Removing untracked file should return False."""
        aggregator = Aggregator()
        removed = aggregator.remove("nonexistent.html")
        assert removed is False

    def test_remove_invalidates_cache(self):
        """remove should invalidate cache."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        usage1 = aggregator.get_usage()
        aggregator.remove("test.html")
        usage2 = aggregator.get_usage()
        assert usage1 is not usage2

    def test_remove_updates_aggregation(self):
        """remove should update aggregated usage."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(commands={"toggle"}))
        aggregator.add("file2.html", FileUsage(commands={"add"}))
        aggregator.remove("file1.html")
        usage = aggregator.get_usage()
        assert usage.commands == {"add"}


class TestAggregatorLoadFromScan:
    """Tests for load_from_scan method."""

    def test_load_from_scan(self):
        """load_from_scan should replace all tracking."""
        aggregator = Aggregator()
        aggregator.add("old.html", FileUsage(commands={"toggle"}))

        scan_results = {
            "new1.html": FileUsage(commands={"add"}),
            "new2.html": FileUsage(commands={"remove"}),
        }
        aggregator.load_from_scan(scan_results)

        assert aggregator.get_file_count() == 2
        files = aggregator.get_files()
        assert "old.html" not in files
        assert "new1.html" in files
        assert "new2.html" in files

    def test_load_from_scan_invalidates_cache(self):
        """load_from_scan should invalidate cache."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        usage1 = aggregator.get_usage()

        aggregator.load_from_scan({"new.html": FileUsage(commands={"add"})})
        usage2 = aggregator.get_usage()

        assert usage1 is not usage2


class TestAggregatorHasUsage:
    """Tests for has_usage method."""

    def test_has_usage_with_commands(self):
        """has_usage should return True if commands exist."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        assert aggregator.has_usage()

    def test_has_usage_with_blocks(self):
        """has_usage should return True if blocks exist."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(blocks={"if"}))
        assert aggregator.has_usage()

    def test_has_usage_with_positional(self):
        """has_usage should return True if positional is True."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(positional=True))
        assert aggregator.has_usage()

    def test_has_usage_empty(self):
        """has_usage should return False if empty."""
        aggregator = Aggregator()
        assert not aggregator.has_usage()

    def test_has_usage_only_empty_files(self):
        """has_usage should return False if all files are empty."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage())
        assert not aggregator.has_usage()


class TestAggregatorGetSummary:
    """Tests for get_summary method."""

    def test_get_summary(self):
        """get_summary should return sorted lists."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage(commands={"toggle", "add"}, positional=True))
        aggregator.add("file2.html", FileUsage(blocks={"repeat", "if"}))

        summary = aggregator.get_summary()

        assert summary["commands"] == ["add", "toggle"]
        assert summary["blocks"] == ["if", "repeat"]
        assert summary["positional"] is True
        assert summary["file_count"] == 2

    def test_get_summary_empty(self):
        """get_summary on empty aggregator."""
        aggregator = Aggregator()
        summary = aggregator.get_summary()
        assert summary["commands"] == []
        assert summary["blocks"] == []
        assert summary["positional"] is False
        assert summary["file_count"] == 0


class TestAggregatorClear:
    """Tests for clear method."""

    def test_clear(self):
        """clear should remove all tracking."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        aggregator.clear()
        assert not aggregator.has_usage()
        assert aggregator.get_file_count() == 0

    def test_clear_invalidates_cache(self):
        """clear should invalidate cache."""
        aggregator = Aggregator()
        aggregator.add("test.html", FileUsage(commands={"toggle"}))
        usage1 = aggregator.get_usage()
        aggregator.clear()
        usage2 = aggregator.get_usage()
        assert usage1 is not usage2


class TestAggregatorFileTracking:
    """Tests for file tracking methods."""

    def test_get_file_count(self):
        """get_file_count should return number of tracked files."""
        aggregator = Aggregator()
        aggregator.add("file1.html", FileUsage())
        aggregator.add("file2.html", FileUsage())
        assert aggregator.get_file_count() == 2

    def test_get_files(self):
        """get_files should return sorted list of paths."""
        aggregator = Aggregator()
        aggregator.add("b.html", FileUsage())
        aggregator.add("a.html", FileUsage())
        files = aggregator.get_files()
        assert files == ["a.html", "b.html"]
