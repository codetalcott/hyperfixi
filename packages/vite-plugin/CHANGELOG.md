# Changelog

All notable changes to @hyperfixi/vite-plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-19

### Added

- Zero-config Vite plugin for automatic hyperscript bundle generation
- Automatic detection of `_="..."` attributes in HTML, Vue, Svelte, JSX/TSX files
- Command usage scanning and analysis
- Block command detection (if, repeat, for, while, async, fetch, etc.)
- Positional expression detection (first, last, next, previous, etc.)
- htmx compatibility mode
- Multilingual keyword detection for 23 languages
- Custom keyword registration API
- Bundle size optimization with tree-shaking
- HMR (Hot Module Replacement) support
- Debug mode with verbose logging
- Configuration options for extra commands and features

### Features

- Scans project files for hyperscript usage
- Generates minimal bundle with only used commands
- Supports custom command additions via config
- Detects block commands automatically
- Handles multilingual hyperscript (if enabled)
- Framework-agnostic (works with any Vite project)
- Real-time bundle regeneration on file changes

### Configuration Options

```javascript
hyperfixi({
  extraCommands: ['fetch', 'send'], // Always include these
  extraBlocks: ['if', 'repeat'], // Always include these blocks
  positional: true, // Include positional expressions
  htmx: true, // Enable htmx compatibility
  languages: ['en', 'ja', 'es'], // Multilingual support
  debug: true, // Verbose logging
});
```

### Performance

- Typical bundle sizes: 8-28KB (depending on commands used)
- Fast scanning: < 100ms for typical projects
- Incremental updates via HMR

### Compatibility

- Vite 4, 5, 6, 7+ supported
- Node.js 18+ required

### Notes

- This is the first stable 1.0 release
- API is stable and ready for production use
- Breaking changes from 0.x: Configuration format standardized
