# @hyperfixi/developer-tools

CLI tools and APIs for HyperFixi development, including project scaffolding, code analysis, visual building, and debugging.

## Features

- **CLI Commands** - Full-featured command-line interface (`hyperfixi` / `hfx`)
- **Project Scaffolding** - Create projects from templates (basic, multi-tenant, analytics)
- **Code Analyzer** - Static analysis with issue detection and suggestions
- **Visual Builder** - Web-based component builder with live preview
- **Development Server** - Live reload with WebSocket support
- **Bundle Analyzer** - Analyze build output for optimization opportunities
- **Performance Profiler** - Profile hyperscript execution and identify bottlenecks
- **Debugger** - WebSocket-based debugging with breakpoints and variable inspection
- **Version Migration** - Migrate between HyperFixi versions with backup support

## Installation

```bash
npm install @hyperfixi/developer-tools
```

## Quick Start

### CLI Usage

```bash
# Create a new project
npx hyperfixi create my-app

# Analyze code
npx hyperfixi analyze ./src

# Start development server
npx hyperfixi dev

# Build for production
npx hyperfixi build

# Start visual builder
npx hyperfixi builder
```

### Programmatic API

```typescript
import {
  analyzeProject,
  createProject,
  startDevServer,
  BundleAnalyzer,
  HyperScriptProfiler,
} from '@hyperfixi/developer-tools';

// Analyze a project
const results = await analyzeProject('./src', { recursive: true });

// Create a new project
await createProject('my-app', { template: 'basic', features: ['i18n'] });

// Start dev server
const server = await startDevServer({ port: 3000, livereload: true });
```

## CLI Command Reference

| Command | Description | Options |
|---------|-------------|---------|
| `create <name>` | Create new project | `--template`, `--typescript`, `--git` |
| `generate:component <name>` | Generate component | `--category`, `--typescript` |
| `analyze [path]` | Analyze hyperscript code | `--format`, `--output`, `--recursive` |
| `dev` | Start dev server | `--port`, `--host`, `--no-livereload` |
| `build` | Build for production | `--output`, `--minify`, `--sourcemap` |
| `builder` | Start visual builder | `--port`, `--no-open` |
| `test` | Run tests | `--watch`, `--coverage`, `--browser` |
| `migrate <from> <to>` | Version migration | `--dry-run`, `--backup` |
| `doctor` | Check project health | - |
| `template list` | List templates | - |
| `template create <name>` | Create template | `--description` |

## API Reference

### Analyzer

```typescript
import { analyzeProject, analyzeFile, generateReport } from '@hyperfixi/developer-tools';

// Analyze entire project
const results = await analyzeProject('./src', {
  recursive: true,
  include: ['**/*.html'],
  exclude: ['node_modules/**'],
});

// Analyze single file
const fileResult = await analyzeFile('./index.html');

// Generate report
const report = generateReport(results, { format: 'detailed' });
```

### Generator

```typescript
import { createProject, createComponent, createTemplate } from '@hyperfixi/developer-tools';

// Create project with features
await createProject('my-app', {
  template: 'multi-tenant',
  features: ['analytics', 'i18n'],
  typescript: true,
  testing: true,
});

// Generate component
await createComponent('button', {
  category: 'interactive',
  typescript: true,
});
```

### Visual Builder

```typescript
import { VisualBuilderServer } from '@hyperfixi/developer-tools';

const builder = new VisualBuilderServer({
  port: 8000,
  livereload: true,
  components: [/* your component definitions */],
});

await builder.start();
```

### Bundle Analyzer

```typescript
import { BundleAnalyzer, analyzeBundle } from '@hyperfixi/developer-tools';

// Analyze esbuild output
const analysis = await analyzeBundle(esbuildMetafile);

console.log(analysis.size.gzipped);
console.log(analysis.recommendations);

// Generate treemap for visualization
const treemap = new BundleAnalyzer().generateTreemap(analysis);
```

### Profiler

```typescript
import { HyperScriptProfiler, profile } from '@hyperfixi/developer-tools';

// Quick profile
const result = await profile('on click toggle .active');

console.log(result.duration);
console.log(result.recommendations);

// Compare multiple snippets
const profiler = new HyperScriptProfiler({ iterations: 100 });
const comparison = await profiler.compare([
  { name: 'approach-a', code: 'toggle .active' },
  { name: 'approach-b', code: 'add .active then remove .active' },
]);
```

### Debugger

```typescript
import { HyperScriptDebugger, createDebugger } from '@hyperfixi/developer-tools';

const debugger = createDebugger({ port: 9229 });

// Start debug session
const session = await debugger.startSession();

// Set breakpoints
debugger.setBreakpoint({ file: 'index.html', line: 10, enabled: true });

// Listen for events
debugger.on('paused', (event) => {
  console.log('Paused at:', event.data.callStack);
});
```

### Migrator

```typescript
import { HyperFixiMigrator, migrate } from '@hyperfixi/developer-tools';

// Simple migration
const result = await migrate('0.1.0', '0.2.0', {
  dryRun: true,
  backup: true,
});

console.log(`Changed ${result.filesChanged} files`);
console.log(result.warnings);
```

### Builder Storage

```typescript
import { BuilderStorage, createProject } from '@hyperfixi/developer-tools';

const storage = new BuilderStorage();

// Save project
const project = createProject('My Components', {
  components: [/* ... */],
});
await storage.saveProject(project);

// List projects
const projects = await storage.listProjects();

// Export project
const html = await storage.exportProject(project.id, 'html');
```

## Quick Start Helpers

For rapid prototyping, use the quick-start helpers:

```typescript
import {
  quickStartAnalyzer,
  quickStartBuilder,
  quickStartGenerator,
} from '@hyperfixi/developer-tools';

// Analyzer with health scoring
const analyzer = quickStartAnalyzer();
const health = await analyzer.getHealthScore();
console.log(`Grade: ${health.grade}, Score: ${health.score}/100`);

// Builder with component factories
const builder = quickStartBuilder();
builder.addComponent(builder.createButtonComponent('submit-btn', 'Submit'));
await builder.start();

// Generator with templates
const generator = quickStartGenerator();
await generator.createBasicProject('my-project');
```

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT
