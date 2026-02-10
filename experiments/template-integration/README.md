# LokaScript Template Integration

Template compiler that processes embedded hyperscript with component integration for server-side rendering and client-side hydration.

## Features

- **Template Parsing** - Parse HTML templates with embedded hyperscript and template variables
- **Component Integration** - Seamless integration with `@lokascript/component-schema` components
- **Template Compilation** - Compile templates to optimized HTML and hyperscript
- **Variable Substitution** - Support for `{{variable}}` template syntax with custom delimiters
- **Directive System** - Extensible directive system for conditional rendering and loops
- **Caching** - Intelligent compilation caching for better performance
- **Performance Monitoring** - Built-in performance tracking and optimization
- **Bundle Creation** - Create optimized bundles for deployment

## Installation

```bash
npm install @lokascript/template-integration
# or
yarn add @lokascript/template-integration
# or
pnpm add @lokascript/template-integration
```

## Quick Start

### Basic Template Compilation

```typescript
import { compileTemplate, renderTemplate } from '@lokascript/template-integration';

// Simple template with variables
const template = `
  <div class="greeting">
    <h1>Hello, {{name}}!</h1>
    <p>Welcome to {{siteName}}</p>
  </div>
`;

// Compile template
const compiled = await compileTemplate(template);

// Render with context
const rendered = await renderTemplate(template, {
  variables: {
    name: 'Alice',
    siteName: 'My Awesome Site',
  },
});

console.log(rendered);
// Output: <div class="greeting"><h1>Hello, Alice!</h1><p>Welcome to My Awesome Site</p></div>
```

### Template with Hyperscript

```typescript
import { LokaScriptTemplateEngine } from '@lokascript/template-integration';

const engine = new LokaScriptTemplateEngine();

const template = `
  <div class="interactive-card" _="init add .loaded">
    <h2>{{title}}</h2>
    <button _="on click toggle .expanded on .card">Toggle Details</button>
    <div class="details" _="init hide">
      <p>{{description}}</p>
    </div>
  </div>
`;

const compiled = await engine.compile(template);

console.log(compiled.hyperscript);
// Output: ["init add .loaded", "on click toggle .expanded on .card", "init hide"]

console.log(compiled.variables);
// Output: ["title", "description"]
```

### Component Integration

```typescript
import { createComponent } from '@lokascript/component-schema';
import { LokaScriptTemplateEngine } from '@lokascript/template-integration';

const engine = new LokaScriptTemplateEngine();

// Create a reusable component
const alertComponent = createComponent('alert', 'Alert Component', 'on click remove me');

alertComponent.template = {
  html: `
    <div class="alert alert-{{type}}">
      <span class="message">{{message}}</span>
      <button class="close" _="on click remove closest .alert">×</button>
    </div>
  `,
  variables: {
    type: {
      type: 'string',
      default: 'info',
      description: 'Alert type (info, warning, error, success)',
    },
    message: {
      type: 'string',
      required: true,
      description: 'Alert message',
    },
  },
};

// Register component
await engine.registerComponent(alertComponent);

// Use component in template
const template = `
  <div class="page">
    <h1>Dashboard</h1>
    <alert type="success" message="Welcome back!" />
    <alert type="warning" message="Your session expires in 5 minutes" />
  </div>
`;

const rendered = await engine.compileAndRender(template);
console.log(rendered);
```

## Template Syntax

### Variables

Use `{{variableName}}` syntax for variable substitution:

```html
<div>
  <h1>{{pageTitle}}</h1>
  <p>User: {{user.name}} ({{user.email}})</p>
  <span>Price: ${{product.price | currency}}</span>
</div>
```

### Custom Delimiters

```typescript
const engine = new LokaScriptTemplateEngine({
  delimiters: { start: '[[', end: ']]' },
});

const template = '<div>Hello [[name]]!</div>';
```

### Hyperscript Attributes

Embed hyperscript directly in HTML attributes:

```html
<!-- Standard hyperscript attribute -->
<button _="on click toggle .active">Toggle</button>

<!-- Alternative attribute names -->
<div data-hyperscript="on mouseover add .hover">Hover me</div>
<span hx-script="on click log 'clicked'">Click me</span>
```

### Directives

Use directives for conditional rendering and loops:

```html
<!-- Conditional rendering -->
<div hf-if="user.isAdmin">Admin panel</div>
<div v-if="showContent">Content</div>

<!-- Component directive -->
<div hf-component="user-card" userId="123"></div>
```

## Component System

### Registering Components

```typescript
import { createComponent } from '@lokascript/component-schema';

const cardComponent = createComponent('card', 'Card Component', 'on click toggle .expanded');

cardComponent.template = {
  html: `
    <div class="card {{class}}">
      <div class="card-header">
        <h3>{{title}}</h3>
      </div>
      <div class="card-body">
        {{children}}
      </div>
    </div>
  `,
  variables: {
    title: { type: 'string', required: true, description: 'Card title' },
    class: { type: 'string', default: '', description: 'Additional CSS classes' },
  },
};

await engine.registerComponent(cardComponent);
```

### Using Components

```html
<card title="My Card" class="highlight">
  <p>This content goes in the card body</p>
  <button>Action Button</button>
</card>
```

### Component Dependencies

```typescript
const modalComponent = createComponent('modal', 'Modal', 'on show add .visible');
modalComponent.dependencies = {
  css: ['modal.css'],
  javascript: ['modal.js'],
  components: ['button'], // Depends on button component
};
```

## Advanced Features

### Custom Directives

```typescript
engine.addDirective('repeat', {
  async process(directive, context) {
    const count = parseInt(directive.expression);
    const nodes = [];

    for (let i = 0; i < count; i++) {
      if (directive.children) {
        nodes.push(...directive.children);
      }
    }

    return nodes;
  },
  validate(directive) {
    if (!directive.expression || isNaN(parseInt(directive.expression))) {
      return ['Expression must be a valid number'];
    }
    return [];
  },
});

// Usage: <span hf-repeat="3">Hello </span>
// Output: Hello Hello Hello
```

### Performance Monitoring

```typescript
import { TemplatePerformanceMonitor } from '@lokascript/template-integration';

const monitor = new TemplatePerformanceMonitor();

const endTiming = monitor.startTiming('template-compilation');
await engine.compile(template);
endTiming();

const stats = monitor.getStats('template-compilation');
console.log(`Average compilation time: ${stats?.average}ms`);
```

### Template Bundling

```typescript
const templates = {
  home: '<div>Welcome to {{siteName}}</div>',
  about: '<div>About {{siteName}}</div>',
  contact: '<div>Contact: {{email}}</div>',
};

const bundle = await engine.createBundle(templates, {
  minify: true,
  target: 'browser',
});

console.log(bundle.html); // Combined HTML
console.log(bundle.hyperscript); // Combined hyperscript
console.log(bundle.css); // All CSS dependencies
console.log(bundle.javascript); // All JS dependencies
```

### Hot Reload (Development)

```typescript
// Development mode with hot reload
const devEngine = new LokaScriptTemplateEngine({
  development: true,
});

// Hot reload a template
const updated = await devEngine.hotReload(newTemplate, 'template-id');
```

## Template Context

### Basic Context

```typescript
const context = {
  variables: {
    user: { name: 'John', role: 'admin' },
    config: { theme: 'dark', lang: 'en' },
  },
};
```

### Extended Context

```typescript
const context = {
  variables: {
    /* template variables */
  },
  components: {
    /* component instances */
  },
  functions: {
    /* custom functions */
  },
  request: {
    url: '/current-page',
    headers: { 'user-agent': '...' },
    params: { id: '123' },
    query: { search: 'term' },
  },
  user: {
    id: 'user123',
    roles: ['user', 'premium'],
    permissions: ['read', 'write'],
  },
};
```

## API Reference

### LokaScriptTemplateEngine

Main template engine class.

#### Methods

- `compile(template, options?)` - Compile template to executable form
- `render(compiled, context?)` - Render compiled template with context
- `compileAndRender(template, context?, options?)` - Compile and render in one step
- `registerComponent(component)` - Register a component for use in templates
- `addDirective(name, handler)` - Add custom directive handler
- `createBundle(templates, options?)` - Create optimized template bundle
- `precompile(templates, options?)` - Precompile templates for performance
- `hotReload(template, templateId?)` - Hot reload template (dev mode)
- `getStats()` - Get compilation statistics
- `clearCache()` - Clear compilation cache

#### Options

```typescript
interface TemplateOptions {
  minify?: boolean; // Minify output HTML
  sourceMaps?: boolean; // Generate source maps
  target?: 'browser' | 'server' | 'universal'; // Target environment
  development?: boolean; // Enable development features
  delimiters?: {
    // Custom variable delimiters
    start: string;
    end: string;
  };
}
```

### TemplateParser

Low-level template parser.

#### Methods

- `parse(template)` - Parse template into AST
- `extractHyperscriptBlocks(nodes)` - Extract hyperscript from parsed nodes

### TemplateCompiler

Template compilation engine.

#### Methods

- `compile(template, options?)` - Compile template
- `render(compiled, context?)` - Render compiled template
- `registerComponent(component)` - Register component
- `addDirective(name, handler)` - Add directive handler

## Utility Functions

### Template Analysis

```typescript
import {
  extractTemplateVariables,
  validateTemplate,
  analyzeTemplateComplexity,
  debugTemplate,
} from '@lokascript/template-integration';

const variables = extractTemplateVariables('Hello {{name}} from {{city}}');
// Returns: ['name', 'city']

const warnings = validateTemplate('<div>{{unclosed');
// Returns validation warnings

const complexity = analyzeTemplateComplexity(parsedNodes);
// Returns: { nodeCount, depth, variableCount, directiveCount, componentCount }

const debug = debugTemplate(template, context);
// Returns: { variables, missingVariables, unusedVariables, warnings }
```

### Template Optimization

```typescript
import { optimizeTemplate, nodesToHtml } from '@lokascript/template-integration';

const optimized = optimizeTemplate(parsedNodes);
const html = nodesToHtml(optimized);
```

## Examples

### E-commerce Product Page

```typescript
const productTemplate = `
  <div class="product" _="init fetch /api/product/{{productId}} then put result into me">
    <div class="product-header">
      <h1>{{product.name}}</h1>
      <div class="price">${{product.price}}</div>
    </div>

    <div class="product-images">
      <img src="{{product.image}}" alt="{{product.name}}"
           _="on click call lightbox with me" />
    </div>

    <add-to-cart productId="{{productId}}" price="{{product.price}}">
      <quantity-selector min="1" max="{{product.stock}}" />
      <variant-selector variants="{{product.variants}}" />
    </add-to-cart>

    <review-section productId="{{productId}}" />
  </div>
`;

const context = {
  variables: {
    productId: '123',
    product: {
      name: 'Premium Widget',
      price: 29.99,
      image: '/images/widget.jpg',
      stock: 15,
      variants: ['red', 'blue', 'green']
    }
  }
};

const rendered = await engine.compileAndRender(productTemplate, context);
```

### Dashboard with Real-time Updates

```typescript
const dashboardTemplate = `
  <div class="dashboard" _="every 30s fetch /api/stats then update .stats">
    <header>
      <h1>Welcome, {{user.name}}</h1>
      <notification-bell userId="{{user.id}}" />
    </header>

    <div class="stats-grid">
      <stat-card title="Revenue" value="${{stats.revenue}}"
                 change="{{stats.revenueChange}}"
                 _="on update transition opacity to 0.5 then to 1" />
      <stat-card title="Orders" value="{{stats.orders}}"
                 change="{{stats.ordersChange}}" />
      <stat-card title="Customers" value="{{stats.customers}}"
                 change="{{stats.customersChange}}" />
    </div>

    <div class="charts">
      <revenue-chart data="{{chartData.revenue}}" />
      <orders-chart data="{{chartData.orders}}" />
    </div>
  </div>
`;
```

## Integration with Build Tools

> **Note:** Webpack and Vite plugins are planned for a future release. For now, use the programmatic API directly.

### Programmatic Build Integration

```javascript
import { LokaScriptTemplateEngine } from '@lokascript/template-integration';
import fs from 'fs';
import path from 'path';

// Build script example
async function buildTemplates(inputDir, outputDir) {
  const engine = new LokaScriptTemplateEngine({ minify: true });

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const template = fs.readFileSync(path.join(inputDir, file), 'utf-8');
    const compiled = await engine.compile(template);

    fs.writeFileSync(path.join(outputDir, file), compiled.html);
  }
}

buildTemplates('./src/templates', './dist/templates');
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Build the package: `npm run build`
6. Submit a pull request

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
```

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [https://lokascript.dev/docs/template-integration](https://lokascript.dev/docs/template-integration)
- **Issues**: [GitHub Issues](https://github.com/codetalcott/lokascript/issues)
- **NPM Package**: [npmjs.com/package/@lokascript/template-integration](https://www.npmjs.com/package/@lokascript/template-integration)
