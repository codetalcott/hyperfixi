# Changelog

All notable changes to @lokascript/i18n will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Superseded by the root changelog.** Every package in this monorepo publishes
> in lockstep at the root version, and the entries below use an older
> per-package numbering that no published version ever matched. They are kept
> for the migration notes they carry; they are not a record of recent releases.
> **For anything since, see
> [the monorepo CHANGELOG](https://github.com/codetalcott/hyperfixi/blob/main/CHANGELOG.md)**
> and [GitHub Releases](https://github.com/codetalcott/hyperfixi/releases).
>
> In particular, the 1.0.0 entry below headlines a "grammar transformation
> engine". **That engine was removed in 3.0.0.** This package is per-language
> vocabulary now — dictionaries, locale detection and grammar profiles;
> `translate` lives in `@lokascript/semantic`.

## [1.0.0] - 2025-01-19

### Added

- Grammar transformation engine for natural word order in 13 languages
- Language profiles with word order rules (SVO, SOV, VSO)
- Semantic role markers (destination, source, patient, style, instrument, manner)
- Support for agglutinative languages with join tokens (Turkish: -i, Japanese: を, Korean: 을/를)
- Dictionary validation system with coverage reports
- Runtime locale switching with automatic detection
- SSR integration with server-side locale detection
- CLDR-compliant pluralization rules for complex languages
- Locale-aware formatting (numbers, dates, currency, units)
- Vite and Webpack plugin integration
- Language detection from hyperscript code content
- Comprehensive test suite (424+ tests passing)

### Supported Languages

- English (SVO), Spanish (SVO), French (SVO), German (SVO/V2), Portuguese (SVO)
- Japanese (SOV), Korean (SOV), Turkish (SOV)
- Arabic (VSO)
- Chinese (SVO), Indonesian (SVO), Quechua (SOV), Swahili (SVO)

### Features

- Transform hyperscript to match native language grammar
- Handle possessive markers and case systems
- Support for different grammatical structures (prepositional vs postpositional)
- Bidirectional text support (Arabic, Hebrew)
- Conflict resolution with priority-based keyword mapping
- Translation validation with detailed error reporting

### Breaking Changes from 0.x

- Grammar transformer API standardized
- Language profile structure reorganized
- Plugin configuration format updated

### Notes

- This is the first stable release after extensive linguistic validation
- Grammar transformations preserve semantic meaning across languages
- All language profiles include native speaker review where available
