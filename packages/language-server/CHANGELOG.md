# Changelog

All notable changes to `@lokascript/language-server` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-05

### Added

- **Go to Definition**: Jump to behavior and function definitions with Ctrl+Click or F12
- **Find References**: Find all usages of a symbol with Shift+F12
- **Document Formatting**: Format hyperscript code with consistent indentation
- **Single-quote support**: HTML attributes with `_='...'` now work correctly
- **CRLF support**: Windows line endings are handled correctly in position mapping
- **Error logging**: All catch blocks now log errors for easier debugging

### Improved

- HTML extraction now supports both double and single quoted attributes
- Position mapping correctly handles all line ending types (LF, CRLF, CR)
- Better error messages in diagnostics
- Comprehensive test coverage (138 tests)

### Fixed

- Position mapping for multiline hyperscript attributes
- Cursor position calculation with different line endings

## [0.1.0] - Initial Release

### Added

- **Diagnostics**: Real-time error detection and warnings
- **Completions**: Context-aware keyword and selector suggestions
- **Hover**: Documentation on hover for commands and keywords
- **Document Symbols**: Outline view showing event handlers, behaviors, and functions
- **Code Actions**: Quick fixes for common issues
- **Multilingual support**: Works with 21 human languages via `@lokascript/semantic`
- **HTML support**: Extracts hyperscript from `_="..."` attributes and `<script type="text/hyperscript">` tags
