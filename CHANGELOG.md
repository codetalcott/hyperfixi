# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Changes for next release go here._

## [2.3.0] - 2026-03-17

### Added

- **Lazy behavior resolver**: `install X` just works — behaviors resolve on demand without manual registration
- **Hyperscript-native behaviors**: Behaviors defined as hyperscript source strings via patterns-reference schemas
- **Dynamic class selectors**: `.{varName}` syntax in `toggle`, `add`, and `remove` resolves variables as CSS class names
- **Variable/expression durations**: `wait` command now accepts variable and expression durations (e.g., `wait feedbackDuration ms`)
- **Behavior schema sources**: Single source of truth for behavior schemas in patterns-reference

### Fixed

- **Parser**: `js()` single-quote parsing, `set the X.Y` dotted property chains (e.g., `event.detail.result`), improved `set` error messages
- **Parser**: Namespaced events (`custom:activate`) and `trigger`/`on` inside `repeat` blocks in behaviors
- **Parser**: Adjacent dot after keywords treated as property access, not CSS selector
- **Behaviors**: Clipboard `wait feedbackDuration`, AutoDismiss wait timing, Removable confirm dialog
- **Browser**: Resolver bundle timing and Playwright test stability
- **CI**: Behaviors package added to build pipeline, artifact upload, and pre-publish-check build order

## [2.2.1] - 2026-03-16

### Fixed

- Parser: adjacent dot after keywords treated as property access, not CSS selector
- Dependency updates (build-tools group)

## [2.2.0] - 2026-03-15

### Fixed

- Dependency security: resolved 27 of 33 Dependabot vulnerabilities
- CI: copy examples gallery into repo, remove external clone dependency
- CI: suppress already-published errors in publish dry run

## [2.1.0] - 2026-02-20

### Added

- **domain-llm**: Expanded from 4 to 8 languages (added Korean, Chinese, Turkish, French) — 68 tests
- **domain-flow**: Expanded from 4 to 8 languages (added Korean, Chinese, Turkish, French) — 108 tests
- **domain-flow**: First npm publication as `@lokascript/domain-flow`

### Changed

- All 7 domain DSLs now consistently support 8 languages (en, es, ja, ar, ko, zh, tr, fr)
- MCP server registry updated for new domain languages

### Fixed

- Resolved test failures in 4 packages (19 tests)
- Scoped `first .X in me` to context element instead of document
- Property target bugs: disabled on button, tabIndex as number

## [2.0.0] - 2026-02-15

### Changed

- **Rebrand**: Renamed from LokaScript to HyperFixi for engine packages (`@lokascript/core` → `@hyperfixi/core`)
- Multilingual packages remain under `@lokascript/*` scope
- Synchronized all package versions to 2.0.0

## [1.4.0] - 2026-02-10

### Added

- **Language Server & VSCode Extension**: Full LSP with Go to Definition, Find References, multilingual hover, syntax highlighting, and HTML region extraction
- **AOT Compiler** (internal): Ahead-of-time compiler with 45 command codegens, expression transforms, 4 optimization passes, and 533 tests
- **Compilation Service** (internal): HTTP service for multilingual compilation with React renderer, test generation, and semantic diffing
- **Hyperscript Adapter** (@lokascript/hyperscript-adapter): Multilingual preprocessor plugin for original \_hyperscript with 24 per-language bundles
- **Semantic**: Russian/Ukrainian normalizers, improved SOV pass rates (JA 99%, KO 96%, TR 96%)
- **Vite Plugin**: htmx/fixi attribute scanning for zero-config support, hybrid-plus bundle commands

### Changed

- **Monorepo cleanup**: Moved experimental packages (analytics, server-integration, multi-tenant, ssr-support, siren) to `experiments/`
- **Code audits**: Comprehensive audits across core (+58 tests), runtime (+34 tests), behaviors (+66 tests), expressions (9 security fixes), validation (+20 tests), features (+19 tests), i18n (+33 tests)
- **Semantic refactoring**: Modularized tokenizer, split pattern generator by word order, eliminated all `as any` casts
- **CI**: Consolidated workflows, switched to OIDC trusted publishing, upgraded to Node 24 LTS
- **Test count**: 4046 → 8100+ tests

### Fixed

- Runtime correctness: GC fix, timeout handling, expression security hardening
- Browser test timeouts and false CI failures
- TypeScript errors across 6 packages for clean workspace typecheck
- Debug console.log leak in set command

## [1.3.0] - 2026-01-23

_Synchronized version release. See git history for details._

## [1.2.0] - 2026-01-21

_Synchronized version release. See git history for details._

## [1.0.0] - 2026-01-19

### Added

- **Initial Release**: First public release of LokaScript
- **Core Package** (@lokascript/core): Full hyperscript runtime with 43 commands
- **Semantic Package** (@lokascript/semantic): Multilingual parsing for 23 languages
- **I18n Package** (@lokascript/i18n): Grammar transformation for SOV/VSO/SVO word orders
- **Vite Plugin** (@lokascript/vite-plugin): Zero-config Vite integration
- **MCP Server** (@lokascript/mcp-server): Model Context Protocol server for LLM integration
- **Browser Bundles**: 7 size-optimized bundles (lite, lite-plus, hybrid-complete, hybrid-hx, minimal, standard, full)
- **23 Language Support**: English, Spanish, Japanese, Korean, Arabic, Chinese, French, German, Portuguese, Indonesian, Turkish, Swahili, Quechua, and more
- **4046 Tests**: Comprehensive test suite with >95% coverage
- **Etymology**: "LokaScript" from Sanskrit "loka" (world/realm/universe) reflecting multilingual scope

### Changed

- **Rebrand**: Project renamed from HyperFixi to LokaScript
- **NPM Organization**: Published under @lokascript/\* scope
- **Browser API**: Primary global changed to window.lokascript (with window.hyperfixi backward compatibility)
- **Lifecycle Events**: Renamed to lokascript:_ prefix (dual dispatch with hyperfixi:_ for compatibility)

### Fixed

- Workspace dependency resolution using wildcard versions (\*)
- TypeScript compilation across all 20+ packages
- Build system for browser bundles

### Backward Compatibility

- window.hyperfixi available as deprecated alias to window.lokascript
- hyperfixi:_ events still dispatched alongside lokascript:_ events
- File names kept for compatibility (e.g., hyperfixi-browser.js)

### Documentation

- Complete rebrand of all README files
- Updated CLAUDE.md with project context
- NPM organization setup guide
- Version management documentation

### Security

- npm access token stored in GitHub Secrets
- 2FA recommended for npm organization

[Unreleased]: https://github.com/codetalcott/hyperfixi/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/codetalcott/hyperfixi/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/codetalcott/hyperfixi/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/codetalcott/hyperfixi/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/codetalcott/hyperfixi/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/codetalcott/hyperfixi/compare/v1.4.0...v2.0.0
[1.4.0]: https://github.com/codetalcott/hyperfixi/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/codetalcott/hyperfixi/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/codetalcott/hyperfixi/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/codetalcott/hyperfixi/releases/tag/v1.0.0
