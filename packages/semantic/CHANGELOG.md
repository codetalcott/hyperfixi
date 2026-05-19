# Changelog

All notable changes to @lokascript/semantic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-05-19

### BREAKING CHANGES

This release removes several long-deprecated APIs. All replacements have been
in the package for multiple minor versions; see migration recipes below.

#### Removed: SemanticAnalyzer family

The `SemanticAnalyzer` interface, `SemanticAnalyzerImpl` class,
`createSemanticAnalyzer()` factory, `SemanticAnalysisResult` type, and the
helper functions `shouldUseSemanticResult` and `rolesToCommandArgs` have been
removed from `@lokascript/semantic` (and the `/core` subpath). The replacement
is `parseSemantic()` / `parseWithConfidence()`, which return a
`ParseWithConfidenceResult` carrying the same data on `result.node`.

```ts
// before
import { createSemanticAnalyzer } from '@lokascript/semantic';
const analyzer = createSemanticAnalyzer();
const result = analyzer.analyze('toggle .active', 'en');
console.log(result.command?.name, result.command?.roles);

// after
import { parseSemantic } from '@lokascript/semantic';
const result = parseSemantic('toggle .active', 'en');
console.log(result.node?.action, result.node?.roles);
```

`parseWithConfidence` (and `parseSemantic`) now uses the same strategy
`SemanticAnalyzer.analyze()` used: it tries the full parser first and only
falls back to pattern matching when the full parser fails. Result shape gained
an optional `tokensConsumed` field for parser-integration consumers.

If you previously relied on `analyzer.supportsLanguage(lang)` or
`analyzer.supportedLanguages()`, use the registry primitives directly:

```ts
import { isLanguageRegistered, getRegisteredLanguages } from '@lokascript/semantic';
```

#### Removed: languageProfiles family

The `languageProfiles` Record and the functions `getProfile`,
`getSupportedLanguages`, and `isLanguageSupported` from
`generators/language-profiles.ts` have been removed. Two replacements depending
on use case:

- **Build-time tooling that needs every defined profile** (grammar generation,
  translation sync, documentation): use the new `KNOWN_PROFILES` static
  manifest:

  ```ts
  import { KNOWN_PROFILES } from '@lokascript/semantic';
  for (const [code, profile] of Object.entries(KNOWN_PROFILES)) { … }
  ```

- **Runtime checks for currently-loaded languages**: use the registry:

  ```ts
  import {
    tryGetProfile,
    getRegisteredLanguages,
    isLanguageRegistered,
  } from '@lokascript/semantic';
  ```

`tryGetProfile()` matches the old `getProfile()` signature
(`(code) => LanguageProfile | undefined`) and additionally supports language
variant fallback (e.g., `es-MX` → `es`).

#### Removed: allPatterns / getAllPatterns / buildAllPatterns / getGeneratedPatterns

Use `getPatternsForLanguage(code)` for the per-language pattern list.
Callers needing every language can iterate `getRegisteredLanguages()`.

#### Removed: deprecated re-export aliases

`getGeneratorLanguages` and `isGeneratorLanguageSupported` aliases have been
removed; no consumers used them.

#### Removed: Cache module is now generic

`SemanticCache` is still exported but its value type is now `unknown` instead
of `SemanticAnalysisResult` (which was removed). The cache no longer has a
default consumer; it remains a generic LRU helper.

### Added

- `KNOWN_PROFILES` — static manifest of all 25 defined language profiles
  (24 languages including Hebrew + the `es-MX` variant), available from both
  `@lokascript/semantic` and `@lokascript/semantic/core`.
- `parseWithConfidence` (and the `parseSemantic` alias) is now re-exported
  from `@lokascript/semantic/core`.
- `ParseWithConfidenceResult.tokensConsumed` — populated when a pattern match
  succeeds; required for parser-integration consumers.
- `isLanguageRegistered` is now exported from the main `@lokascript/semantic`
  entry (previously only from `/core`).

### Changed

- Bumped to v3.0.0 to reflect the removed deprecated APIs.
- `scripts/generate-indexes.ts` now auto-generates `generators/known-profiles.ts`
  alongside `language-profiles.ts`, so adding a new profile is still a one-place
  change.

## [1.0.0] - 2025-01-19

### Added

- Semantic-first multilingual parser for 23 languages
- Language tokenizers: Arabic, Bengali, Chinese, English, French, German, Hindi, Indonesian, Italian, Japanese, Korean, Malay, Polish, Portuguese, Quechua, Russian, Spanish, Swahili, Tagalog, Thai, Turkish, Ukrainian, Vietnamese
- Semantic role mapping (agent, patient, instrument, destination, source, etc.)
- Confidence scoring system for parse results
- Language-agnostic intermediate representation
- Morphological normalization for agglutinative languages
- Regional bundle options (English-only: 20KB, Western: 30KB, East Asian: 24KB, All: 61KB)
- CLI tool for adding new languages
- Keyword sync system for vite-plugin integration
- Comprehensive test suite (730+ tests passing)
- Pattern generation from command schemas
- Custom keyword registration API

### Features

- Parse hyperscript from any of 23 supported languages
- Translate between languages with semantic preservation
- Graceful fallback to traditional parser when confidence is low
- Type-safe language profiles with grammar rules
- Support for SVO, SOV, and VSO word orders
- Agglutinative suffix handling (Turkish, Japanese, Korean)
- Non-Latin script support (Arabic, Chinese, Japanese, Korean, Thai, etc.)

### Notes

- This is the first stable release after extensive testing
- All 23 languages have been validated with native speaker input where available
- Breaking changes from 0.x: API signatures standardized, bundle structure reorganized
