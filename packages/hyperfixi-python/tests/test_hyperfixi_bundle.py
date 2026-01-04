"""Tests for hyperfixi_bundle management command.

These tests require Django to be installed. They will be skipped if Django
is not available.
"""

from __future__ import annotations

import json
import os
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

# Skip all tests in this module if Django is not installed
django = pytest.importorskip("django")

from django.core.management import call_command
from django.test import TestCase, override_settings

# Configure Django settings before importing command
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.settings")
django.setup()


class TestHyperfixiBundleCommand(TestCase):
    """Tests for hyperfixi_bundle management command."""

    def setUp(self):
        """Create a temporary directory with test templates."""
        self.tmpdir = TemporaryDirectory()
        self.template_dir = Path(self.tmpdir.name)

        # Create test templates
        (self.template_dir / "page1.html").write_text(
            '<button _="on click toggle .active">Click</button>'
        )
        (self.template_dir / "page2.html").write_text(
            '<button _="on click add .clicked then remove .old">Click</button>'
        )

    def tearDown(self):
        """Clean up temporary directory."""
        self.tmpdir.cleanup()

    def test_json_output_format(self):
        """Test JSON output contains expected fields."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            stdout=out,
        )
        output = out.getvalue()

        # Parse the JSON portion (skip status messages)
        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert "name" in config
        assert "commands" in config
        assert "globalName" in config
        assert config["globalName"] == "hyperfixi"
        assert "toggle" in config["commands"]
        assert "add" in config["commands"]
        assert "remove" in config["commands"]

    def test_summary_output_format(self):
        """Test summary output is human-readable."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="summary",
            stdout=out,
        )
        output = out.getvalue()

        assert "HyperFixi Bundle Summary" in output
        assert "Commands" in output
        assert "toggle" in output
        assert "npm run generate:bundle" in output

    def test_js_config_output_format(self):
        """Test JS config output is valid JavaScript."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="js-config",
            stdout=out,
        )
        output = out.getvalue()

        assert "const bundleConfig" in output
        assert "name:" in output
        assert "commands:" in output

    def test_output_to_file(self):
        """Test --output writes to file."""
        with TemporaryDirectory() as outdir:
            output_path = Path(outdir) / "bundle-config.json"
            out = StringIO()
            call_command(
                "hyperfixi_bundle",
                str(self.template_dir),
                output=str(output_path),
                stdout=out,
            )

            assert output_path.exists()
            config = json.loads(output_path.read_text())
            assert "commands" in config

    def test_extra_commands_cli(self):
        """Test --extra-commands adds commands."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            extra_commands="fetch,wait",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert "fetch" in config["commands"]
        assert "wait" in config["commands"]

    def test_extra_blocks_cli(self):
        """Test --extra-blocks adds blocks."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            extra_blocks="if,repeat",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert "blocks" in config
        assert "if" in config["blocks"]
        assert "repeat" in config["blocks"]

    def test_htmx_flag(self):
        """Test --htmx adds htmxIntegration."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            htmx=True,
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert config.get("htmxIntegration") is True

    def test_positional_flag(self):
        """Test --positional adds positionalExpressions."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            positional=True,
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert config.get("positionalExpressions") is True

    @override_settings(HYPERFIXI={"EXTRA_COMMANDS": ["fetch"], "HTMX": True})
    def test_django_settings_integration(self):
        """Test HYPERFIXI settings are respected."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        # fetch should be included from settings
        assert "fetch" in config["commands"]
        # htmx should be enabled from settings
        assert config.get("htmxIntegration") is True

    def test_no_usage_warning(self):
        """Test warning when no hyperscript found."""
        with TemporaryDirectory() as empty_dir:
            # Create a file without hyperscript
            (Path(empty_dir) / "empty.html").write_text("<div>No hyperscript</div>")

            out = StringIO()
            call_command(
                "hyperfixi_bundle",
                empty_dir,
                stdout=out,
            )
            output = out.getvalue()

            assert "No hyperscript usage detected" in output

    def test_custom_bundle_name(self):
        """Test --name sets bundle name."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            name="MyCustomBundle",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert config["name"] == "MyCustomBundle"

    def test_detects_blocks(self):
        """Test that blocks are detected from templates."""
        # Add a template with blocks
        (self.template_dir / "with_blocks.html").write_text(
            '<button _="on click if me has .active hide me end">Click</button>'
        )

        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert "blocks" in config
        assert "if" in config["blocks"]

    def test_detects_positional(self):
        """Test that positional expressions are detected."""
        # Add a template with positional
        (self.template_dir / "with_positional.html").write_text(
            '<button _="on click add .active to first in .items">Click</button>'
        )

        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert config.get("positionalExpressions") is True

    def test_meta_includes_file_count(self):
        """Test that _meta includes file count."""
        out = StringIO()
        call_command(
            "hyperfixi_bundle",
            str(self.template_dir),
            format="json",
            stdout=out,
        )
        output = out.getvalue()

        json_start = output.find("{")
        json_end = output.rfind("}") + 1
        config = json.loads(output[json_start:json_end])

        assert "_meta" in config
        assert config["_meta"]["file_count"] == 2
