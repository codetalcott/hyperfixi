# HyperFixi Component Schema

Universal component definition schema and validation for HyperFixi server-side hyperscript compilation. This package provides comprehensive JSON Schema definitions, TypeScript types, and validation utilities for creating reusable hyperscript components.

## Features

- **JSON Schema Validation** - Comprehensive schema definitions for components and collections
- **TypeScript Support** - Complete type definitions with strict typing
- **Component Registry** - File-based, in-memory, and **SQLite-backed** registries
- **SQLite Full-Text Search** - FTS5-powered search across component names, descriptions, and content
- **Utility Functions** - Helper functions for creating, merging, and analyzing components
- **Template Variables** - Support for `{{variable}}` substitution in hyperscript
- **Dependency Management** - Component dependency resolution and circular dependency detection
- **Testing Integration** - Built-in support for unit and integration test definitions

## Installation

```bash
npm install @hyperfixi/component-schema
# or
yarn add @hyperfixi/component-schema
# or
pnpm add @hyperfixi/component-schema
```

## Quick Start

### Basic Component Creation

```typescript
import { createComponent, validateComponent } from '@hyperfixi/component-schema';

// Create a simple toggle button component
const toggleButton = createComponent(
  'toggle-button',
  'Toggle Button', 
  'on click toggle .active'
);

// Validate the component
const validation = validateComponent(toggleButton);
if (validation.valid) {
  console.log('Component is valid!');
} else {
  console.error('Validation errors:', validation.errors);
}
```

### Component with Template Variables

```typescript
import { createTemplatedComponent } from '@hyperfixi/component-schema';

const ajaxForm = createTemplatedComponent(
  'ajax-form',
  'AJAX Form',
  'on submit halt then fetch {{apiUrl}} with method: "POST" then put result into #{{resultId}}',
  {
    html: '<form _="...">{{formContent}}</form><div id="{{resultId}}"></div>',
    variables: {
      apiUrl: {
        type: 'string',
        description: 'API endpoint for form submission',
        required: true
      },
      resultId: {
        type: 'string', 
        default: 'form-result',
        description: 'ID of element to display results'
      },
      formContent: {
        type: 'string',
        description: 'HTML content of the form',
        required: true
      }
    }
  }
);
```

### Component Registry Usage

```typescript
import { createRegistry } from '@hyperfixi/component-schema';

// Create a file-based registry
const registry = createRegistry('file', { path: './components' });
await registry.initialize();

// Register components
await registry.register(toggleButton);
await registry.register(ajaxForm);

// Search and retrieve components
const components = await registry.search('toggle');
const specificComponent = await registry.get('toggle-button');

// Filter components by category
const formComponents = await registry.list({
  category: 'form',
  complexity: { max: 5 }
});
```

### SQLite Registry (Recommended for Production)

```typescript
import { createRegistry, SqliteComponentRegistry } from '@hyperfixi/component-schema';

// Using the factory function
const registry = createRegistry('sqlite', { dbPath: './components.db' });
await registry.initialize();

// Or directly instantiate
const sqliteRegistry = new SqliteComponentRegistry({ dbPath: './my-components.db' });
await sqliteRegistry.initialize();

// All standard registry operations work
await sqliteRegistry.register(toggleButton);
const results = await sqliteRegistry.search('toggle'); // Uses FTS5 full-text search

// SQLite-specific features
const count = await sqliteRegistry.count();
await sqliteRegistry.clear(); // Clear all components

// Import/export collections
await sqliteRegistry.importCollection(myCollection);
const exported = await sqliteRegistry.exportCollection(['comp-a', 'comp-b'], {
  name: 'My Export'
});
```

#### Database Initialization

```bash
# Create database with schema
npm run db:init

# Force recreate (drops existing data)
npm run db:init:force
```

## Component Definition Schema

A complete component definition includes:

```typescript
interface ComponentDefinition {
  // Required fields
  id: string;                    // Unique identifier (kebab-case)
  name: string;                  // Human-readable name
  version: string;               // Semantic version
  hyperscript: string | string[]; // Hyperscript code

  // Optional metadata
  description?: string;
  category?: ComponentCategory;
  tags?: string[];

  // Template support
  template?: {
    html?: string;
    variables?: Record<string, TemplateVariable>;
    slots?: Record<string, TemplateSlot>;
  };

  // Dependencies
  dependencies?: {
    components?: string[];       // Other component dependencies
    css?: string[];             // CSS file dependencies  
    javascript?: string[];      // JavaScript dependencies
  };

  // Configuration
  configuration?: {
    compilation?: CompilationConfig;
    deployment?: DeploymentConfig;
  };

  // Metadata
  metadata?: {
    author?: string;
    license?: string;
    keywords?: string[];
    examples?: ComponentExample[];
    // ... more metadata fields
  };

  // Validation info
  validation?: {
    events?: EventType[];
    selectors?: string[];
    commands?: HyperscriptCommand[];
    complexity?: number;
  };

  // Testing
  testing?: {
    unit?: ComponentUnitTest[];
    integration?: ComponentIntegrationTest[];
  };
}
```

## Component Categories

Components can be categorized for better organization:

- **`form`** - Form-related components (submit handlers, validation)
- **`navigation`** - Navigation and routing components  
- **`ui-interaction`** - Interactive UI elements (modals, toggles, dropdowns)
- **`data-display`** - Components for displaying data (tables, lists, cards)
- **`animation`** - Animation and transition components
- **`validation`** - Input validation and feedback components
- **`communication`** - AJAX, WebSocket, and API communication components
- **`utility`** - General utility components
- **`layout`** - Layout and positioning components
- **`custom`** - Custom or specialized components

## Template Variables

Components support template variable substitution using `{{variable}}` syntax:

```typescript
const component = {
  id: 'user-profile',
  name: 'User Profile',
  version: '1.0.0',
  hyperscript: 'on click fetch /api/users/{{userId}} then put result into #{{targetId}}',
  template: {
    html: '<div id="{{targetId}}"><button>Load User {{userId}}</button></div>',
    variables: {
      userId: {
        type: 'number',
        description: 'User ID to load',
        required: true
      },
      targetId: {
        type: 'string', 
        default: 'user-data',
        description: 'Target element ID for results'
      }
    }
  }
};
```

## Component Collections

Group related components into collections:

```typescript
import { createCollection, validateCollection } from '@hyperfixi/component-schema';

const uiCollection = createCollection(
  'UI Components',
  {
    'toggle-button': toggleButton,
    'ajax-form': ajaxForm,
    'modal-dialog': modalDialog
  },
  '2.1.0'
);

// Add collection metadata
uiCollection.description = 'Comprehensive UI component library';
uiCollection.configuration = {
  defaults: {
    compilation: { minify: true, compatibility: 'modern' }
  }
};

// Validate entire collection
const validation = validateCollection(uiCollection);
```

## Utility Functions

### Component Analysis

```typescript
import { analyzeComplexity, generateMetadata, extractTemplateVariables } from '@hyperfixi/component-schema';

// Analyze component complexity (1-10 scale)
const complexity = analyzeComplexity(component);

// Auto-generate metadata
const enhancedComponent = generateMetadata(component);

// Extract template variables from hyperscript
const variables = extractTemplateVariables(
  'on click fetch /api/users/{{userId}} then log {{message}}',
  '<div>{{content}}</div>'
);
// Returns: ['content', 'message', 'userId']
```

### Component Merging

```typescript
import { mergeComponents } from '@hyperfixi/component-schema';

const baseComponent = createComponent('base', 'Base Component', 'on click log "base"');
const extensionConfig = {
  description: 'Extended component',
  tags: ['extended'],
  template: {
    variables: {
      newVar: { type: 'string', description: 'New variable' }
    }
  }
};

const mergedComponent = mergeComponents(baseComponent, extensionConfig);
```

### Dependency Management

```typescript
import { checkCircularDependencies, getTopologicalOrder } from '@hyperfixi/component-schema';

// Check for circular dependencies in a collection
const cycles = checkCircularDependencies(collection);
if (cycles.length > 0) {
  console.error('Circular dependencies found:', cycles);
}

// Get components in dependency order
const buildOrder = getTopologicalOrder(collection);
console.log('Build order:', buildOrder);
```

## Validation

### Component Validation

```typescript
import { validateComponent } from '@hyperfixi/component-schema';

const result = validateComponent(component);

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(error => {
    console.log(`- ${error.path}: ${error.message}`);
  });
}

if (result.warnings.length > 0) {
  console.warn('Validation warnings:');
  result.warnings.forEach(warning => {
    console.log(`- ${warning.path}: ${warning.message}`);
  });
}
```

### Custom Validation Rules

The validator includes semantic rules beyond JSON schema:

- **Hyperscript Syntax** - Warns about scripts that don't start with `on`, `def`, or `init`
- **Template Variables** - Detects unused template variable definitions
- **Dependencies** - Prevents self-dependencies and detects missing dependencies
- **Test Coverage** - Warns about missing tests for declared events

## Examples

### Toggle Button Component

```json
{
  "id": "toggle-button",
  "name": "Toggle Button", 
  "version": "1.0.0",
  "category": "ui-interaction",
  "tags": ["button", "toggle", "state"],
  "hyperscript": "on click toggle .active",
  "template": {
    "html": "<button class=\"{{buttonClass}}\" _=\"on click toggle .active\">{{buttonText}}</button>",
    "variables": {
      "buttonClass": {
        "type": "string",
        "default": "toggle-btn",
        "description": "CSS class for the button"
      },
      "buttonText": {
        "type": "string", 
        "required": true,
        "description": "Button text"
      }
    }
  },
  "validation": {
    "events": ["click"],
    "selectors": [".active"],
    "commands": ["toggle"],
    "complexity": 2
  },
  "testing": {
    "unit": [
      {
        "name": "Toggle adds active class",
        "action": "click button", 
        "expected": "button has class 'active'"
      }
    ]
  }
}
```

### Modal Dialog Component

```json
{
  "id": "modal-dialog",
  "name": "Modal Dialog",
  "version": "2.0.1", 
  "category": "ui-interaction",
  "tags": ["modal", "dialog", "overlay"],
  "hyperscript": [
    "on click from .modal-trigger add .show to #{{modalId}}",
    "on click from .modal-close remove .show from #{{modalId}}",
    "on click from .modal-backdrop remove .show from #{{modalId}}",
    "on keydown[key=='Escape'] from document remove .show from #{{modalId}}"
  ],
  "template": {
    "html": "<div id=\"{{modalId}}\" class=\"modal\"><div class=\"modal-backdrop\"></div><div class=\"modal-content\"><button class=\"modal-close\">&times;</button>{{modalContent}}</div></div>",
    "variables": {
      "modalId": {
        "type": "string",
        "default": "modal",
        "description": "Unique modal ID"
      },
      "modalContent": {
        "type": "string", 
        "required": true,
        "description": "Modal content HTML"
      }
    }
  },
  "dependencies": {
    "css": ["modal.css"],
    "components": ["focus-trap"]
  },
  "validation": {
    "events": ["click", "keydown"],
    "selectors": [".modal-trigger", ".modal-close", ".modal-backdrop"],
    "commands": ["add", "remove"],
    "complexity": 6
  }
}
```

## Registry Formats

Components can be saved in multiple formats:

### JSON Format
```json
{
  "id": "component-id",
  "name": "Component Name",
  "version": "1.0.0",
  "hyperscript": "on click toggle .active"
}
```

### YAML Format  
```yaml
id: component-id
name: Component Name
version: 1.0.0
hyperscript: on click toggle .active
template:
  variables:
    buttonText:
      type: string
      required: true
```

## Integration

### With Build Systems

```typescript
// Build script integration
import { createRegistry, getTopologicalOrder } from '@hyperfixi/component-schema';

const registry = createRegistry('file', './src/components');
await registry.initialize();

const collection = await registry.exportCollection(
  ['toggle-button', 'ajax-form', 'modal-dialog'],
  { name: 'Production Build', version: '1.0.0' }
);

// Build components in dependency order
const buildOrder = getTopologicalOrder(collection);
for (const componentId of buildOrder) {
  await compileComponent(collection.components[componentId]);
}
```

### With HyperFixi Server Integration

```typescript
// Use with HyperFixi compilation service
import { createClient } from '@hyperfixi/client';
import { createRegistry } from '@hyperfixi/component-schema';

const hyperfixiClient = createClient({ baseURL: 'http://localhost:3000' });
const registry = createRegistry('file', './components');

// Compile a component from registry
const component = await registry.get('toggle-button');
if (component) {
  const result = await hyperfixiClient.compile({
    scripts: { [component.id]: component.hyperscript },
    options: component.configuration?.compilation,
    context: { templateVars: { buttonText: 'Click Me!' } }
  });
  
  console.log('Compiled JavaScript:', result.compiled[component.id]);
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Build the package: `npm run build`
6. Submit a pull request

## Testing

```bash
# Run tests (84 tests across 4 test files)
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run typecheck
```

## License

MIT License - see LICENSE file for details.

## Support  

- **Documentation**: [https://hyperfixi.dev/docs](https://hyperfixi.dev/docs)
- **Issues**: [GitHub Issues](https://github.com/hyperfixi/hyperfixi/issues)
- **NPM Package**: [npmjs.com/package/@hyperfixi/component-schema](https://www.npmjs.com/package/@hyperfixi/component-schema)