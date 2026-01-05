# Contributing

Welcome to the HyperFixi contributor guide. This section covers architecture, development setup, and how to contribute.

## Quick Links

- [GitHub Repository](https://github.com/hyperfixi/hyperfixi)
- [Issue Tracker](https://github.com/hyperfixi/hyperfixi/issues)
- [MIT License](https://github.com/hyperfixi/hyperfixi/blob/main/LICENSE)

## Architecture Overview

HyperFixi is a monorepo with 22 packages:

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
│   └── patterns-browser/  # Pattern testing
└── examples/           # Live demos
```

## Development Setup

```bash
# Clone the repository
git clone https://github.com/hyperfixi/hyperfixi.git
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

## Contributor Guides

### Architecture
- [Monorepo Structure](/en/contributing/architecture) - Package organization
- [Parser Design](/en/contributing/parser) - How the parser works
- [Runtime System](/en/contributing/runtime) - Command execution

### Development
- [Setting Up](/en/contributing/setup) - Development environment
- [Testing Guide](/en/contributing/testing) - Writing and running tests
- [Adding Commands](/en/contributing/adding-commands) - Create new commands
- [Adding Languages](/en/contributing/adding-languages) - i18n language support

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
