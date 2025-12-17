# Analysis Scripts

Scripts for analyzing the HyperFixi codebase, patterns, and bundle size.

## Directory Structure

```
scripts/
├── analysis/           # Analysis and extraction scripts (this directory)
│   ├── analyze-*.mjs   # Codebase analysis scripts
│   ├── extract-*.mjs   # Pattern extraction scripts
│   └── measure-*.mjs   # Bundle measurement scripts
└── testing/            # Pattern testing scripts
    ├── test-*.mjs      # Pattern test runners
    └── generate-*.mjs  # Test generators
```

## Output Location

All analysis scripts output to `analysis-output/` (gitignored):
- `analysis-output/reports/` - JSON analysis reports
- `analysis-output/docs/` - Generated markdown documentation

## Available Scripts

### Codebase Analysis

| Script | Purpose |
|--------|---------|
| `analyze-comprehensive.mjs` | Full codebase analysis (commands, expressions, helpers) |
| `analyze-primitives.mjs` | Analyze shared primitives and code reuse opportunities |
| `analyze-semantic-usage.mjs` | Analyze semantic parser usage patterns |
| `measure-bundle-size.mjs` | Measure and report bundle sizes |

### Pattern Extraction

| Script | Purpose |
|--------|---------|
| `extract-official-patterns.mjs` | Extract patterns from official _hyperscript |
| `extract-patterns-from-docs.mjs` | Extract patterns from documentation |
| `extract-patterns-from-lsp.mjs` | Extract patterns from LSP server |
| `analyze-extracted-patterns.mjs` | Analyze extracted patterns |
| `analyze-all-patterns.mjs` | Comprehensive pattern analysis |

## Usage

```bash
# Run from project root
node scripts/analysis/analyze-comprehensive.mjs

# Output goes to analysis-output/
ls analysis-output/reports/
```

## Adding New Scripts

1. Create script in `scripts/analysis/`
2. Output JSON to `analysis-output/reports/`
3. Output markdown to `analysis-output/docs/`
4. Update this README
