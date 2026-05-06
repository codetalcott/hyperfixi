# Contributing

Welcome to the LokaScript contributor guide. This section covers architecture, development setup, and how to contribute.

## Quick Links

- [GitHub Repository](https://github.com/codetalcott/lokascript)
- [Issue Tracker](https://github.com/codetalcott/lokascript/issues)
- [MIT License](https://github.com/codetalcott/lokascript/blob/main/LICENSE)

## Architecture Overview

LokaScript is a monorepo with 22 packages:

```
hyperfixi/
├── packages/
│   ├── core/           # Main runtime (43 commands)
│   ├── semantic/       # Multilingual parser (13 languages)
│   ├── i18n/           # Grammar transformation
│   ├── vite-plugin/    # Build tool integration
│   └── ...             # 18 more packages
├── apps/
│   ├── docs-site/      # This documentation
│   └── profile-editor/ # Language profile editor
└── examples/           # Live demos
```

## Development Setup

```bash
# Clone the repository
git clone https://github.com/codetalcott/lokascript.git
cd hyperfixi

# Install dependencies
npm install

# Run tests
npm run test:core        # Core package tests (2700+)
npm run test:semantic    # Semantic parser tests (730+)

# Start development server
npm run dev              # http://localhost:3000
```

## Key Commands

```bash
# Quick validation after changes
npm run test:quick --prefix packages/core

# Full test suite
npm run test:comprehensive --prefix packages/core

# TypeScript check
npm run typecheck --prefix packages/core

# Build browser bundles
npm run build:browser --prefix packages/core
```

## Key Areas

- **Core Package**: Main runtime with 43 commands and expression parser
- **Semantic Package**: Multilingual parser supporting 23 languages
- **i18n Package**: Grammar transformation for SOV/VSO languages
- **Vite Plugin**: Automatic bundle generation based on usage

## Code Style

- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional commits for version history

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `npm run test:quick --prefix packages/core`
5. Submit PR with description of changes

All PRs require passing tests and code review before merge.
