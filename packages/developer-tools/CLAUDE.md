# Developer Tools - CLAUDE.md

This package provides CLI tools, code generators, and development utilities for HyperFixi projects.

## Package Overview

- **CLI**: Command-line interface for project scaffolding, building, analyzing
- **Generator**: Code generation from schemas and templates
- **Analyzer**: Static analysis of hyperscript usage patterns
- **Builder**: Project building and visual builder server
- **Dev Server**: Development server with live reload

## Key Commands

```bash
# Run tests
npm test --prefix packages/developer-tools

# Run specific test file
npm test --prefix packages/developer-tools -- --run src/generator.test.ts

# Type check
npm run typecheck --prefix packages/developer-tools

# Build
npm run build --prefix packages/developer-tools
```

## Main Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI command definitions and routing |
| `src/generator.ts` | Project scaffolding and code generation |
| `src/analyzer.ts` | Hyperscript usage analysis |
| `src/builder.ts` | Project builder and VisualBuilderServer |
| `src/dev-server.ts` | Development server with hot reload |
| `src/types.ts` | Type definitions |

## Code Generation

The `generateCode` function supports both string templates and schema-based generation:

```typescript
// String template API
const result = await generateCode('Hello {{name}}', { name: 'World' });

// Schema-based API (component, page, form, list)
const result = await generateCode({
  type: 'component',
  name: 'my-button',
  schema: {
    template: '<button>Click me</button>',
    events: ['click'],
    commands: ['toggle'],
  },
});
```

## Project Templates

Available templates in `createProject()`:
- `basic` - Simple HyperFixi project
- `multi-tenant` - Multi-tenant project with tenant isolation
- `analytics` - Project with analytics integration
- `full-stack` - Full-stack project with Express server
- `api` - API-only project
- `static` - Static site

## Testing Notes

- Tests use `vitest` with `happy-dom` environment
- Mocks are in individual test files
- Some tests require properly mocked `http`, `ws`, and `fs-extra`
- Coverage thresholds target 90% (currently commented out)

## Known Issues

- `VisualBuilderServer` tests expect public methods (`addComponent`, `getComponent`, etc.) that are currently only available via HTTP routes
- Some test utilities have TypeScript type mismatches
