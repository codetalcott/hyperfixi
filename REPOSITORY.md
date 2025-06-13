# Repository Organization

This document provides an overview of the HyperFixi monorepo structure and organization.

## 📁 Directory Structure

```
hyperfixi/                           # Monorepo root
├── packages/                        # Publishable packages
│   ├── core/                        # @hyperfixi/core - Pure hyperscript engine
│   ├── fixi/                        # @hyperfixi/fixi - Utility functions  
│   └── integrated/                  # hyperfixi - Complete solution
├── apps/                            # Applications and demos
│   ├── playground/                  # Interactive testing environment
│   ├── docs-site/                   # Documentation website (planned)
│   └── examples/                    # Example applications (planned)
├── docs/                            # Documentation
│   └── archive/                     # Historical development docs
├── roadmap/                         # Development planning
├── tools/                           # Development utilities
│   ├── debug/                       # Debug scripts and test files
│   ├── legacy/                      # Original research files
│   ├── build/                       # Shared build tools (planned)
│   └── testing/                     # Shared test utilities (planned)
├── package.json                     # Workspace configuration
├── lerna.json                       # Monorepo management
└── README.md                        # Project overview
```

## 📦 Packages

### Core Package (`@hyperfixi/core`)
- **Purpose**: Pure hyperscript expression evaluation engine
- **Size**: ~12KB gzipped
- **Dependencies**: None
- **Features**: Parser, runtime, DOM manipulation, error handling

### Fixi Package (`@hyperfixi/fixi`)  
- **Purpose**: Utility functions for hyperscript expressions
- **Size**: ~8KB gzipped
- **Dependencies**: `@hyperfixi/core`
- **Features**: String, date, array, DOM, performance utilities

### Integrated Package (`hyperfixi`)
- **Purpose**: Complete solution combining core + utilities
- **Size**: ~20KB gzipped  
- **Dependencies**: Both packages above
- **Features**: All features with pre-loaded utilities

## 🛠️ Development Tools

### Debug Tools (`tools/debug/`)
Development debugging utilities from active development:
- Parser debugging scripts
- Browser-based test files
- Event handler debugging
- Test failure analysis tools

### Legacy Files (`tools/legacy/`)
Historical files preserved for reference:
- Original _hyperscript library files
- Database with hyperscript patterns
- JSON data files with commands/expressions
- Research and extraction tools

### Build Tools (`tools/build/`)
Shared build utilities (planned):
- Rollup configurations
- TypeScript compilation settings
- ESLint and Prettier configurations

### Testing Tools (`tools/testing/`)
Shared testing utilities (planned):
- Cross-package integration helpers
- Mock data generators
- Performance testing utilities

## 📚 Documentation

### Active Documentation (`docs/`)
- **README.md** - Documentation overview and navigation
- **Archive** - Historical implementation and design documents

### Package Documentation
- **Core**: `packages/core/docs/` - API reference, examples, coverage
- **Fixi**: `packages/fixi/README.md` - Utility function documentation
- **Integrated**: `packages/integrated/README.md` - Complete usage guide

### Development Planning (`roadmap/`)
- **README.md** - Current roadmap and phase status
- **plan.md** - Detailed development context and planning
- **considerations.md** - Technical decisions and architecture
- **syntax.md** - Language design and patterns
- **sketch.md** - Original project concept (historical)

## 🚀 Applications

### Playground (`apps/playground/`)
Interactive testing environment for hyperscript expressions:
- Real-time expression evaluation
- Example gallery
- Context variable testing
- Performance monitoring

### Documentation Site (`apps/docs-site/`)
Future comprehensive documentation website:
- API documentation
- Interactive examples
- Tutorials and guides
- Performance benchmarks

### Examples (`apps/examples/`)
Example applications demonstrating real-world usage:
- Framework integrations
- Common patterns
- Performance optimizations
- Best practices

## 🔧 Configuration Files

### Root Configuration
- **package.json** - Workspace and dependency management
- **lerna.json** - Monorepo version management and publishing
- **.gitignore** - Version control exclusions
- **CLAUDE.md** - AI development context and guidelines

### Package Configuration
Each package contains:
- **package.json** - Package-specific configuration
- **tsconfig.json** - TypeScript compilation settings
- **rollup.config.mjs** - Build configuration
- **vitest.config.ts** - Testing configuration

## 📋 File Organization Principles

### Clean Separation
- **Packages**: Publishable, production-ready code
- **Apps**: Development and demonstration tools
- **Tools**: Development utilities and historical files
- **Docs**: Documentation and planning

### Historical Preservation
- Debug files preserved in `tools/debug/` for reference
- Original research files in `tools/legacy/`
- Development history in `docs/archive/`

### Future Extensibility
- Framework integrations can be added as new packages
- Additional apps for specialized tools
- Plugin system through package structure

## 🎯 Benefits of This Organization

### Developer Experience
- Clear separation of concerns
- Easy navigation and discovery
- Comprehensive documentation
- Interactive testing environment

### Maintainability  
- Modular architecture
- Historical context preservation
- Clear development workflow
- Automated tooling support

### Scalability
- Independent package versioning
- Tree-shakable modules
- Plugin-ready architecture
- Framework integration points

This organization supports the project's evolution from a research prototype to a production-ready, modular hyperscript ecosystem.