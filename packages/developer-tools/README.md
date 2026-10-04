# @lokascript/developer-tools

CLI tools and APIs for LokaScript development, including project scaffolding, code analysis, visual building, and profiling.

## Features

- **CLI Commands** - Full-featured command-line interface (`lokascript` / `hfx`)
- **Project Scaffolding** - Create projects from templates (basic, multi-tenant, analytics)
- **Code Analyzer** - Static analysis with issue detection and suggestions
- **Visual Builder** - Web-based component builder with live preview
- **Development Server** - Live reload with WebSocket support
- **Bundle Analyzer** - Analyze build output for optimization opportunities
- **Performance Profiler** - Profile hyperscript execution and identify bottlenecks
- **Version Migration** - Migrate between LokaScript versions with backup support

## Installation

```bash
npm install @lokascript/developer-tools
```

## Quick Start

### CLI Usage

```bash
# Create a new project
npx lokascript create my-app

# Analyze code
npx lokascript analyze ./src

# Start development server
npx lokascript dev

# Build for production
npx lokascript build

# Start visual builder
npx lokascript builder
```

### Programmatic API

```typescript
import {
  analyzeProject,
  createProject,
  startDevServer,
  BundleAnalyzer,
  HyperScriptProfiler,
} from '@lokascript/developer-tools';

// Analyze a project
const results = await analyzeProject('./src', { recursive: true });

// Create a new project
await createProject('my-app', { template: 'basic', features: ['i18n'] });

// Start dev server
const server = await startDevServer({ port: 3000, livereload: true });
```

## CLI Command Reference

| Command                     | Description              | Options                               |
| --------------------------- | ------------------------ | ------------------------------------- |
| `create <name>`             | Create new project       | `--template`, `--typescript`, `--git` |
| `generate:component <name>` | Generate component       | `--category`, `--typescript`          |
| `analyze [path]`            | Analyze hyperscript code | `--format`, `--output`, `--recursive` |
| `dev`                       | Start dev server         | `--port`, `--host`, `--no-livereload` |
| `build`                     | Build for production     | `--output`, `--minify`, `--sourcemap` |
| `builder`                   | Start visual builder     | `--port`, `--no-open`                 |
| `test`                      | Run tests                | `--watch`, `--coverage`, `--browser`  |
| `migrate <from> <to>`       | Version migration        | `--dry-run`, `--backup`               |
| `doctor`                    | Check project health     | -                                     |
| `template list`             | List templates           | -                                     |
| `template create <name>`    | Create template          | `--description`                       |

## API Reference

### Analyzer

```typescript
import { analyzeProject, analyzeFile, generateReport } from '@lokascript/developer-tools';

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
import { createProject, createComponent, createTemplate } from '@lokascript/developer-tools';

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
import { VisualBuilderServer } from '@lokascript/developer-tools';

const builder = new VisualBuilderServer({
  port: 8000,
  livereload: true,
  components: [/* your component definitions */],
});

await builder.start();
```

### Bundle Analyzer

```typescript
import { BundleAnalyzer, analyzeBundle } from '@lokascript/developer-tools';

// Analyze esbuild output
const analysis = await analyzeBundle(esbuildMetafile);

console.log(analysis.size.gzipped);
console.log(analysis.recommendations);

// Generate treemap for visualization
const treemap = new BundleAnalyzer().generateTreemap(analysis);
```

### Profiler

```typescript
import { HyperScriptProfiler, profile } from '@lokascript/developer-tools';

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

### Migrator

```typescript
import { LokaScriptMigrator, migrate } from '@lokascript/developer-tools';

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
import { BuilderStorage, createProject } from '@lokascript/developer-tools';

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
} from '@lokascript/developer-tools';

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
