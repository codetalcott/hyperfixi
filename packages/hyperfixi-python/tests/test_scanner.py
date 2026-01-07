"""Tests for hyperfixi.scanner module."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from hyperfixi.scanner import (
    Scanner,
    FileUsage,
    AggregatedUsage,
    COMMAND_PATTERN,
    BLOCK_PATTERNS,
    POSITIONAL_PATTERN,
    detect_languages,
    get_optimal_region,
    SUPPORTED_LANGUAGES,
)


class TestFileUsage:
    """Tests for the FileUsage dataclass."""

    def test_empty_usage_is_falsy(self):
        """Empty FileUsage should be falsy."""
        usage = FileUsage()
        assert not usage

    def test_usage_with_commands_is_truthy(self):
        """FileUsage with commands should be truthy."""
        usage = FileUsage(commands={"toggle"})
        assert usage

    def test_usage_with_blocks_is_truthy(self):
        """FileUsage with blocks should be truthy."""
        usage = FileUsage(blocks={"if"})
        assert usage

    def test_usage_with_positional_is_truthy(self):
        """FileUsage with positional should be truthy."""
        usage = FileUsage(positional=True)
        assert usage

    def test_merge_commands(self):
        """Merge should combine commands from both usages."""
        usage1 = FileUsage(commands={"toggle"})
        usage2 = FileUsage(commands={"add"})
        usage1.merge(usage2)
        assert usage1.commands == {"toggle", "add"}

    def test_merge_blocks(self):
        """Merge should combine blocks from both usages."""
        usage1 = FileUsage(blocks={"if"})
        usage2 = FileUsage(blocks={"repeat"})
        usage1.merge(usage2)
        assert usage1.blocks == {"if", "repeat"}

    def test_merge_positional(self):
        """Merge should set positional to True if either has it."""
        usage1 = FileUsage(positional=False)
        usage2 = FileUsage(positional=True)
        usage1.merge(usage2)
        assert usage1.positional is True

    def test_merge_full(self):
        """Merge should combine all fields."""
        usage1 = FileUsage(commands={"toggle"}, blocks={"if"})
        usage2 = FileUsage(commands={"add"}, positional=True)
        usage1.merge(usage2)
        assert usage1.commands == {"toggle", "add"}
        assert usage1.blocks == {"if"}
        assert usage1.positional is True

    def test_to_dict(self):
        """to_dict should return sorted lists."""
        usage = FileUsage(commands={"toggle", "add"}, blocks={"repeat", "if"}, positional=True)
        result = usage.to_dict()
        assert result["commands"] == ["add", "toggle"]
        assert result["blocks"] == ["if", "repeat"]
        assert result["positional"] is True


class TestAggregatedUsage:
    """Tests for the AggregatedUsage dataclass."""

    def test_to_dict(self):
        """to_dict should return file_count."""
        usage = AggregatedUsage(
            commands={"toggle"},
            blocks={"if"},
            positional=True,
            file_usage={"file1.html": FileUsage(), "file2.html": FileUsage()},
        )
        result = usage.to_dict()
        assert result["commands"] == ["toggle"]
        assert result["blocks"] == ["if"]
        assert result["positional"] is True
        assert result["file_count"] == 2


class TestScanner:
    """Tests for the Scanner class."""

    def test_should_scan_html(self):
        """Scanner should scan .html files."""
        scanner = Scanner()
        assert scanner.should_scan(Path("test.html"))
        assert scanner.should_scan(Path("test.HTML"))

    def test_should_scan_htm(self):
        """Scanner should scan .htm files."""
        scanner = Scanner()
        assert scanner.should_scan(Path("test.htm"))

    def test_should_not_scan_py(self):
        """Scanner should not scan .py files."""
        scanner = Scanner()
        assert not scanner.should_scan(Path("test.py"))

    def test_should_not_scan_node_modules(self):
        """Scanner should exclude node_modules."""
        scanner = Scanner()
        assert not scanner.should_scan(Path("node_modules/lib/test.html"))

    def test_should_not_scan_pycache(self):
        """Scanner should exclude __pycache__."""
        scanner = Scanner()
        assert not scanner.should_scan(Path("__pycache__/test.html"))

    def test_custom_include_extensions(self):
        """Scanner should respect custom include_extensions."""
        scanner = Scanner(include_extensions={".vue"})
        assert scanner.should_scan(Path("test.vue"))
        assert not scanner.should_scan(Path("test.html"))

    def test_custom_exclude_patterns(self):
        """Scanner should respect custom exclude_patterns."""
        scanner = Scanner(exclude_patterns=["build"])
        assert not scanner.should_scan(Path("build/test.html"))
        assert scanner.should_scan(Path("templates/test.html"))


class TestExtractHyperscript:
    """Tests for hyperscript extraction."""

    def test_extract_double_quotes(self):
        """Extract from _="..." attribute."""
        scanner = Scanner()
        content = '<button _="on click toggle .active">Click</button>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_single_quotes(self):
        """Extract from _='...' attribute."""
        scanner = Scanner()
        content = "<button _='on click toggle .active'>Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_backticks(self):
        """Extract from _=`...` attribute."""
        scanner = Scanner()
        content = "<button _=`on click toggle .active`>Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_data_hs(self):
        """Extract from data-hs="..." attribute."""
        scanner = Scanner()
        content = '<button data-hs="on click toggle .active">Click</button>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_django_block_tag(self):
        """Extract from {% hs %}...{% endhs %} block."""
        scanner = Scanner()
        content = "<button {% hs %}on click toggle .active{% endhs %}>Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_django_block_tag_multiline(self):
        """Extract multiline from {% hs %}...{% endhs %} block."""
        scanner = Scanner()
        content = """<button {% hs %}
            on click
                toggle .active on me
                toggle .hidden on #menu
        {% endhs %}>Click</button>"""
        scripts = scanner.extract_hyperscript(content)
        assert len(scripts) == 1
        assert "toggle .active on me" in scripts[0]

    def test_extract_django_simple_tag_double_quotes(self):
        """Extract from {% hs_attr "..." %} tag."""
        scanner = Scanner()
        content = '<button {% hs_attr "on click toggle .active" %}>Click</button>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_django_simple_tag_single_quotes(self):
        """Extract from {% hs_attr '...' %} tag."""
        scanner = Scanner()
        content = "<button {% hs_attr 'on click toggle .active' %}>Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_hs_script_tag(self):
        """Extract from {% hs_script "..." %} tag."""
        scanner = Scanner()
        content = '{% hs_script "on keydown[key==\'Escape\'] hide #modal" %}'
        scripts = scanner.extract_hyperscript(content)
        assert "hide #modal" in scripts[0]

    def test_extract_script_tag(self):
        """Extract from <script type="text/hyperscript">."""
        scanner = Scanner()
        content = '<script type="text/hyperscript">on load log "ready"</script>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ['on load log "ready"']

    def test_extract_multiple(self):
        """Extract multiple hyperscript snippets."""
        scanner = Scanner()
        content = '''
            <button _="on click toggle .a">A</button>
            <button _="on click toggle .b">B</button>
        '''
        scripts = scanner.extract_hyperscript(content)
        assert len(scripts) == 2

    def test_extract_empty_returns_empty(self):
        """Extract from content without hyperscript."""
        scanner = Scanner()
        content = "<button onclick=\"foo()\">Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == []


class TestAnalyzeScript:
    """Tests for script analysis."""

    def test_analyze_single_command(self):
        """Detect single command."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click toggle .active")
        assert usage.commands == {"toggle"}

    def test_analyze_multiple_commands(self):
        """Detect multiple commands."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click toggle .active then add .clicked")
        assert usage.commands == {"toggle", "add"}

    def test_analyze_if_block(self):
        """Detect if block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click if me has .active hide me end")
        assert usage.blocks == {"if"}

    def test_analyze_unless_maps_to_if(self):
        """unless should map to if block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click unless me has .disabled toggle .active end")
        assert "if" in usage.blocks

    def test_analyze_repeat_block(self):
        """Detect repeat block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click repeat 3 times add .pulse end")
        assert usage.blocks == {"repeat"}

    def test_analyze_repeat_with_variable(self):
        """Detect repeat with variable."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click repeat :count times add .pulse end")
        assert usage.blocks == {"repeat"}

    def test_analyze_for_each_block(self):
        """Detect for each block."""
        scanner = Scanner()
        usage = scanner.analyze_script("for each item in .items toggle .selected on item end")
        assert usage.blocks == {"for"}

    def test_analyze_for_every_block(self):
        """Detect for every block."""
        scanner = Scanner()
        usage = scanner.analyze_script("for every x in .list log x end")
        assert usage.blocks == {"for"}

    def test_analyze_while_block(self):
        """Detect while block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click while :count < 10 increment :count end")
        assert usage.blocks == {"while"}

    def test_analyze_fetch_block(self):
        """Detect fetch block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click fetch /api/data then put result into #output")
        assert usage.blocks == {"fetch"}

    def test_analyze_async_block(self):
        """Detect async block."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click async wait 1s then toggle .done end")
        assert usage.blocks == {"async"}

    def test_analyze_positional_first(self):
        """Detect first positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click add .active to first in .items")
        assert usage.positional is True

    def test_analyze_positional_last(self):
        """Detect last positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click remove .active from last in .items")
        assert usage.positional is True

    def test_analyze_positional_next(self):
        """Detect next positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click focus next <input/>")
        assert usage.positional is True

    def test_analyze_positional_previous(self):
        """Detect previous positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click focus previous <input/>")
        assert usage.positional is True

    def test_analyze_positional_closest(self):
        """Detect closest positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click toggle .active on closest .card")
        assert usage.positional is True

    def test_analyze_positional_parent(self):
        """Detect parent positional expression."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click remove parent")
        assert usage.positional is True

    def test_analyze_no_positional(self):
        """Script without positional should have positional=False."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click toggle .active")
        assert usage.positional is False

    def test_analyze_combined(self):
        """Detect commands, blocks, and positional together."""
        scanner = Scanner()
        usage = scanner.analyze_script(
            "on click if me has .active hide first in .items end"
        )
        assert usage.commands == {"hide"}
        assert usage.blocks == {"if"}
        assert usage.positional is True


class TestScanContent:
    """Tests for scanning content."""

    def test_scan_content_aggregates(self):
        """scan_content should aggregate usage from all scripts."""
        scanner = Scanner()
        content = '''
            <button _="on click toggle .a">A</button>
            <button _="on click add .b then remove .c">B</button>
        '''
        usage = scanner.scan_content(content)
        assert usage.commands == {"toggle", "add", "remove"}

    def test_scan_content_empty(self):
        """scan_content on empty content returns falsy usage."""
        scanner = Scanner()
        usage = scanner.scan_content("<div>No hyperscript here</div>")
        assert not usage


class TestScanFile:
    """Tests for scanning files."""

    def test_scan_file(self):
        """scan_file should detect usage in file."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir:
            template = Path(tmpdir) / "test.html"
            template.write_text('<button _="on click toggle .active">Click</button>')
            usage = scanner.scan_file(template)
            assert usage.commands == {"toggle"}

    def test_scan_file_nonexistent(self):
        """scan_file on nonexistent file returns empty usage."""
        scanner = Scanner()
        usage = scanner.scan_file(Path("/nonexistent/file.html"))
        assert not usage


class TestScanDirectory:
    """Tests for scanning directories."""

    def test_scan_directory(self):
        """scan_directory should find all templates."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir:
            template1 = Path(tmpdir) / "page1.html"
            template1.write_text('<button _="on click toggle .active">Click</button>')

            template2 = Path(tmpdir) / "page2.html"
            template2.write_text(
                '<button _="on click add .clicked then wait 1s then remove .clicked">'
                "Click</button>"
            )

            results = scanner.scan_directory(Path(tmpdir))
            assert len(results) == 2

            # Check aggregated commands
            all_commands: set[str] = set()
            for usage in results.values():
                all_commands.update(usage.commands)
            assert all_commands == {"toggle", "add", "wait", "remove"}

    def test_scan_directory_nested(self):
        """scan_directory should find templates in subdirectories."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir:
            subdir = Path(tmpdir) / "sub"
            subdir.mkdir()

            template = subdir / "page.html"
            template.write_text('<button _="on click toggle .active">Click</button>')

            results = scanner.scan_directory(Path(tmpdir))
            assert len(results) == 1

    def test_scan_directory_nonexistent(self):
        """scan_directory on nonexistent dir returns empty."""
        scanner = Scanner()
        results = scanner.scan_directory(Path("/nonexistent/dir"))
        assert results == {}

    def test_scan_directory_excludes_patterns(self):
        """scan_directory should exclude patterns."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir:
            # Create template in normal dir
            template = Path(tmpdir) / "page.html"
            template.write_text('<button _="on click toggle .active">Click</button>')

            # Create template in __pycache__ (should be excluded)
            cache = Path(tmpdir) / "__pycache__"
            cache.mkdir()
            excluded = cache / "page.html"
            excluded.write_text('<button _="on click add .cached">Click</button>')

            results = scanner.scan_directory(Path(tmpdir))
            assert len(results) == 1
            # Only the non-excluded file should be found
            assert "toggle" in list(results.values())[0].commands


class TestPatterns:
    """Tests for regex patterns."""

    @pytest.mark.parametrize(
        "command",
        [
            "toggle",
            "add",
            "remove",
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
        ],
    )
    def test_command_pattern_matches(self, command: str):
        """Test all commands are detected."""
        text = f"on click {command} something"
        matches = [m.group(1).lower() for m in COMMAND_PATTERN.finditer(text)]
        assert command in matches

    @pytest.mark.parametrize(
        "block,script",
        [
            ("if", "if me has .active"),
            ("repeat", "repeat 3 times"),
            ("repeat", "repeat :count times"),
            ("repeat", "repeat $count times"),
            ("for", "for each item in .items"),
            ("for", "for every x in .list"),
            ("while", "while :count < 10"),
            ("fetch", "fetch /api/data"),
            ("async", "async do something end"),
        ],
    )
    def test_block_patterns(self, block: str, script: str):
        """Test block patterns match correctly."""
        pattern = BLOCK_PATTERNS[block]
        assert pattern.search(script) is not None

    @pytest.mark.parametrize(
        "expr", ["first", "last", "next", "previous", "closest", "parent"]
    )
    def test_positional_pattern(self, expr: str):
        """Test positional expressions are detected."""
        text = f"{expr} in .items"
        assert POSITIONAL_PATTERN.search(text) is not None


class TestJSXPatterns:
    """Tests for JSX-specific extraction patterns."""

    def test_extract_jsx_template_literal(self):
        """Extract from _={`...`} (JSX template literal)."""
        scanner = Scanner()
        content = '<button _={`on click toggle .active`}>Click</button>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_jsx_double_quotes(self):
        """Extract from _={"..."} (JSX with double quotes)."""
        scanner = Scanner()
        content = '<button _={"on click toggle .active"}>Click</button>'
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_extract_jsx_single_quotes(self):
        """Extract from _={'...'} (JSX with single quotes)."""
        scanner = Scanner()
        content = "<button _={'on click toggle .active'}>Click</button>"
        scripts = scanner.extract_hyperscript(content)
        assert scripts == ["on click toggle .active"]

    def test_jsx_in_vue_component(self):
        """Extract from Vue-style JSX template."""
        scanner = Scanner()
        content = '''
        <template>
          <button _={"on click toggle .active"}>Click</button>
          <div _={`on mouseover add .highlight`}>Hover</div>
        </template>
        '''
        scripts = scanner.extract_hyperscript(content)
        assert len(scripts) == 2
        assert "on click toggle .active" in scripts
        assert "on mouseover add .highlight" in scripts


class TestScanDirectories:
    """Tests for scanning multiple directories."""

    def test_scan_multiple_directories(self):
        """scan_directories should aggregate from all directories."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir1, TemporaryDirectory() as tmpdir2:
            # Create template in first directory
            template1 = Path(tmpdir1) / "page1.html"
            template1.write_text('<button _="on click toggle .active">Click</button>')

            # Create template in second directory
            template2 = Path(tmpdir2) / "page2.html"
            template2.write_text('<button _="on click add .clicked">Click</button>')

            results = scanner.scan_directories([Path(tmpdir1), Path(tmpdir2)])
            assert len(results) == 2

            # Check both files are found
            all_commands: set[str] = set()
            for usage in results.values():
                all_commands.update(usage.commands)
            assert all_commands == {"toggle", "add"}

    def test_scan_directories_empty_list(self):
        """scan_directories with empty list returns empty."""
        scanner = Scanner()
        results = scanner.scan_directories([])
        assert results == {}

    def test_scan_directories_with_overlap(self):
        """scan_directories should handle overlapping paths correctly."""
        scanner = Scanner()
        with TemporaryDirectory() as tmpdir:
            # Create template
            template = Path(tmpdir) / "page.html"
            template.write_text('<button _="on click toggle .active">Click</button>')

            # Scan same directory twice - should not duplicate
            results = scanner.scan_directories([Path(tmpdir), Path(tmpdir)])
            # The dict will naturally deduplicate by path
            assert len(results) == 1


class TestDebugOutput:
    """Tests for debug logging."""

    def test_debug_prints_when_enabled(self, capsys):
        """Scanner with debug=True should print scan results."""
        scanner = Scanner(debug=True)
        scanner.scan_content('<button _="on click toggle .active">Click</button>', "test.html")
        captured = capsys.readouterr()
        assert "[hyperfixi]" in captured.out
        assert "test.html" in captured.out
        assert "toggle" in captured.out

    def test_debug_silent_when_disabled(self, capsys):
        """Scanner with debug=False should not print."""
        scanner = Scanner(debug=False)
        scanner.scan_content('<button _="on click toggle .active">Click</button>', "test.html")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_debug_silent_when_no_usage(self, capsys):
        """Scanner should not print when no hyperscript found."""
        scanner = Scanner(debug=True)
        scanner.scan_content("<div>No hyperscript here</div>", "test.html")
        captured = capsys.readouterr()
        assert captured.out == ""

    def test_debug_prints_file_read_errors(self, capsys):
        """Scanner should log file read errors in debug mode."""
        scanner = Scanner(debug=True)
        scanner.scan_file(Path("/nonexistent/file.html"))
        captured = capsys.readouterr()
        assert "[hyperfixi]" in captured.out
        assert "Error" in captured.out


class TestLanguageDetection:
    """Tests for multilingual language detection."""

    def test_detect_japanese(self):
        """Detect Japanese keywords."""
        detected = detect_languages("on click トグル .active")
        assert "ja" in detected

    def test_detect_korean(self):
        """Detect Korean keywords."""
        detected = detect_languages("on click 토글 .active")
        assert "ko" in detected

    def test_detect_chinese(self):
        """Detect Chinese keywords."""
        detected = detect_languages("on click 切换 .active")
        assert "zh" in detected

    def test_detect_arabic(self):
        """Detect Arabic keywords."""
        detected = detect_languages("عند النقر بدّل .active")
        assert "ar" in detected

    def test_detect_spanish(self):
        """Detect Spanish keywords."""
        detected = detect_languages("on click alternar .active")
        assert "es" in detected

    def test_detect_german(self):
        """Detect German keywords."""
        detected = detect_languages("on click umschalten .active")
        assert "de" in detected

    def test_detect_french(self):
        """Detect French keywords."""
        detected = detect_languages("on click basculer .active")
        assert "fr" in detected

    def test_detect_turkish(self):
        """Detect Turkish keywords."""
        detected = detect_languages("on click değiştir .active")
        assert "tr" in detected

    def test_detect_multiple_languages(self):
        """Detect multiple languages in same script."""
        detected = detect_languages("トグル .active then alternar .open")
        assert "ja" in detected
        assert "es" in detected

    def test_no_detection_for_english(self):
        """English should not be detected (it's the default)."""
        detected = detect_languages("on click toggle .active")
        assert "en" not in detected
        assert len(detected) == 0

    def test_empty_script(self):
        """Empty script should return empty set."""
        detected = detect_languages("")
        assert len(detected) == 0

    def test_word_boundary_matching(self):
        """Short keywords like 'si' should not match inside words."""
        # 'si' is Spanish for 'if', but shouldn't match in 'invisible'
        detected = detect_languages("on click toggle .invisible")
        assert "es" not in detected


class TestOptimalRegion:
    """Tests for optimal region selection."""

    def test_western_languages(self):
        """Western languages should select western region."""
        assert get_optimal_region({"es"}) == "western"
        assert get_optimal_region({"fr", "de"}) == "western"

    def test_east_asian_languages(self):
        """East Asian languages should select east-asian region."""
        assert get_optimal_region({"ja"}) == "east-asian"
        assert get_optimal_region({"ko", "zh"}) == "east-asian"

    def test_mixed_western_east_asian(self):
        """Mixed regions should select priority or all."""
        # Japanese + Spanish = priority covers both
        region = get_optimal_region({"ja", "es"})
        assert region in ("priority", "all")

    def test_priority_languages(self):
        """Priority region languages should select priority."""
        assert get_optimal_region({"ar", "tr"}) == "priority"

    def test_all_languages(self):
        """Languages outside priority should select all."""
        assert get_optimal_region({"sw", "qu"}) == "all"

    def test_empty_languages(self):
        """Empty set should return None."""
        assert get_optimal_region(set()) is None


class TestScannerLanguageDetection:
    """Tests for language detection in Scanner."""

    def test_analyze_script_detects_languages(self):
        """analyze_script should populate detected_languages."""
        scanner = Scanner()
        usage = scanner.analyze_script("on click トグル .active")
        assert "ja" in usage.detected_languages

    def test_merge_aggregates_languages(self):
        """Merge should combine detected_languages."""
        usage1 = FileUsage(detected_languages={"ja"})
        usage2 = FileUsage(detected_languages={"es"})
        usage1.merge(usage2)
        assert usage1.detected_languages == {"ja", "es"}

    def test_to_dict_includes_languages(self):
        """to_dict should include detected_languages."""
        usage = FileUsage(
            commands={"toggle"},
            detected_languages={"ja", "es"},
        )
        result = usage.to_dict()
        assert "detected_languages" in result
        assert result["detected_languages"] == ["es", "ja"]  # sorted


class TestAggregatedUsageLanguages:
    """Tests for language detection in AggregatedUsage."""

    def test_to_dict_includes_languages(self):
        """to_dict should include detected_languages."""
        usage = AggregatedUsage(
            commands={"toggle"},
            detected_languages={"ja", "ko"},
        )
        result = usage.to_dict()
        assert "detected_languages" in result
        assert result["detected_languages"] == ["ja", "ko"]


class TestNewLanguageDetection:
    """Tests for newly added languages (8 additional languages)."""

    def test_detect_italian(self):
        """Detect Italian keywords."""
        detected = detect_languages("on click commutare .active")
        assert "it" in detected

    def test_detect_vietnamese(self):
        """Detect Vietnamese keywords."""
        detected = detect_languages("on click chuyển đổi .active")
        assert "vi" in detected

    def test_detect_polish(self):
        """Detect Polish keywords."""
        detected = detect_languages("on click przełącz .active")
        assert "pl" in detected

    def test_detect_russian(self):
        """Detect Russian keywords (Cyrillic script)."""
        detected = detect_languages("on click переключить .active")
        assert "ru" in detected

    def test_detect_ukrainian(self):
        """Detect Ukrainian keywords (Cyrillic script)."""
        detected = detect_languages("on click перемкнути .active")
        assert "uk" in detected

    def test_detect_hindi(self):
        """Detect Hindi keywords (Devanagari script)."""
        detected = detect_languages("on click टॉगल .active")
        assert "hi" in detected

    def test_detect_bengali(self):
        """Detect Bengali keywords (Bengali script)."""
        detected = detect_languages("on click টগল .active")
        assert "bn" in detected

    def test_detect_thai(self):
        """Detect Thai keywords (Thai script)."""
        detected = detect_languages("on click สลับ .active")
        assert "th" in detected

    def test_detect_tagalog(self):
        """Detect Tagalog keywords."""
        detected = detect_languages("on click palitan .active")
        assert "tl" in detected


class TestNewRegionalBundles:
    """Tests for new regional bundle selections."""

    def test_southeast_asian_region(self):
        """Southeast Asian languages should select southeast-asian region."""
        assert get_optimal_region({"id"}) == "southeast-asian"
        assert get_optimal_region({"vi", "th"}) == "southeast-asian"

    def test_south_asian_region(self):
        """South Asian languages should select south-asian region."""
        assert get_optimal_region({"hi"}) == "south-asian"
        assert get_optimal_region({"hi", "bn"}) == "south-asian"

    def test_slavic_region(self):
        """Slavic languages should select slavic region."""
        assert get_optimal_region({"ru"}) == "slavic"
        assert get_optimal_region({"ru", "uk", "pl"}) == "slavic"

    def test_italian_in_western(self):
        """Italian should be in western region."""
        assert get_optimal_region({"it"}) == "western"
        assert get_optimal_region({"it", "es", "fr"}) == "western"

    def test_vietnamese_in_priority(self):
        """Vietnamese should be in priority region."""
        assert get_optimal_region({"vi", "en"}) in ("southeast-asian", "priority", "all")

    def test_new_languages_need_all_bundle(self):
        """Mixing new non-priority languages should need all bundle."""
        # Tagalog + Hindi spans regions not in priority
        assert get_optimal_region({"tl", "hi"}) == "all"


class TestSupportedLanguagesList:
    """Tests for the SUPPORTED_LANGUAGES list."""

    def test_has_22_languages(self):
        """Should have exactly 22 supported languages."""
        assert len(SUPPORTED_LANGUAGES) == 22

    def test_includes_new_languages(self):
        """Should include all newly added languages."""
        new_languages = ["it", "vi", "pl", "ru", "uk", "hi", "bn", "th", "tl"]
        for lang in new_languages:
            assert lang in SUPPORTED_LANGUAGES, f"{lang} not in SUPPORTED_LANGUAGES"
