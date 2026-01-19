# Changelog

All notable changes to @hyperfixi/semantic will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
