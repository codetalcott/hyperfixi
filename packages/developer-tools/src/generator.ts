/**
 * Code Generator
 * Scaffolding and template generation utilities
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import type {
  ScaffoldOptions,
  ProjectTemplate,
  TemplateFile,
  ProjectConfig,
  GeneratedCode,
  GeneratorConfig,
  CodeGenerationSchema,
  SchemaGeneratedCode,
  ComponentSchema,
  PageSchema,
  FormSchema,
  ListSchema,
} from './types';

/**
 * Built-in project templates
 */
const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  basic: {
    name: 'basic',
    description: 'Basic HyperFixi project',
    category: 'basic',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
</head>
<body>
    <h1>Welcome to {{name}}</h1>
    
    <button _="on click toggle .active">
        Toggle Active
    </button>
    
    <div class="container">
        <p>This is a basic HyperFixi project.</p>
        <p>Edit this file to get started!</p>
    </div>

    <style>
        .active {
            background-color: #007acc;
            color: white;
        }
        .container {
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</body>
</html>`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.html",
  "scripts": {
    "dev": "hyperfixi dev",
    "build": "hyperfixi build",
    "test": "hyperfixi test"
  },
  "keywords": ["hyperscript", "hyperfixi"],
  "author": "{{author}}",
  "license": "{{license}}",
  "devDependencies": {
    "@hyperfixi/developer-tools": "^0.1.0"
  }
}`,
      },
      {
        path: 'README.md',
        content: `# {{name}}

{{description}}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser to http://localhost:3000

## Features

- HyperScript integration
- Live reload during development
- Production builds

## Learn More

- [HyperFixi Documentation](https://hyperfixi.dev/docs)
- [HyperScript Reference](https://hyperscript.org)
`,
      },
    ],
    dependencies: [],
    devDependencies: ['@hyperfixi/developer-tools'],
  },

  'multi-tenant': {
    name: 'multi-tenant',
    description: 'Multi-tenant HyperFixi application',
    category: 'advanced',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en" data-tenant="{{tenant}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}} - {{tenant}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <script src="https://unpkg.com/@hyperfixi/multi-tenant@latest/dist/index.min.js"></script>
</head>
<body>
    <header data-tenant-branding>
        <h1>{{name}}</h1>
        <nav>
            <a href="#" _="on click show #dashboard then hide #settings">Dashboard</a>
            <a href="#" _="on click show #settings then hide #dashboard">Settings</a>
        </nav>
    </header>

    <main>
        <div id="dashboard" class="page">
            <h2>Dashboard</h2>
            <p>Welcome to your tenant-specific dashboard.</p>
        </div>

        <div id="settings" class="page" style="display: none;">
            <h2>Settings</h2>
            <p>Tenant-specific settings and configuration.</p>
        </div>
    </main>

    <style>
        [data-tenant] {
            --primary-color: #007acc;
            --secondary-color: #666;
        }
        
        [data-tenant="tenant1"] {
            --primary-color: #28a745;
        }
        
        [data-tenant="tenant2"] {
            --primary-color: #dc3545;
        }
        
        header {
            background: var(--primary-color);
            color: white;
            padding: 1rem;
        }
        
        .page {
            padding: 2rem;
        }
    </style>
</body>
</html>`,
      },
      {
        path: 'server.js',
        content: `const express = require('express');
const { createMultiTenantSystem } = require('@hyperfixi/multi-tenant');

const app = express();
const port = process.env.PORT || 3000;

// Simple tenant resolver
const tenantResolver = {
  async resolveTenantByDomain(domain) {
    // Simple mapping - in production, use database
    const tenantMap = {
      'tenant1.example.com': { id: 'tenant1', name: 'Tenant 1' },
      'tenant2.example.com': { id: 'tenant2', name: 'Tenant 2' },
    };
    return tenantMap[domain] || null;
  },
  async resolveTenantBySubdomain(subdomain) {
    return { id: subdomain, name: subdomain };
  },
  async resolveTenantById(id) {
    return { id, name: id };
  },
};

// Simple customization provider
const customizationProvider = {
  async getCustomization(tenantId) {
    // Return tenant-specific customizations
    return {
      tenantId,
      branding: {
        colors: {
          primary: tenantId === 'tenant1' ? '#28a745' : '#dc3545',
        },
      },
    };
  },
  async updateCustomization(tenantId, customization) {
    // Update tenant customization
  },
  async deleteCustomization(tenantId) {
    // Delete tenant customization
  },
};

// Create multi-tenant system
const multiTenant = createMultiTenantSystem({
  tenantResolver,
  customizationProvider,
});

// Use multi-tenant middleware
app.use(multiTenant.createExpressMiddleware({
  tenantIdentifier: { type: 'subdomain', value: '' },
}));

// Serve static files
app.use(express.static('.'));

app.listen(port, () => {
  console.log(\`Multi-tenant server running at http://localhost:\${port}\`);
});`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "server.js",
  "scripts": {
    "dev": "node server.js",
    "build": "hyperfixi build",
    "test": "hyperfixi test"
  },
  "keywords": ["hyperscript", "hyperfixi", "multi-tenant"],
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "@hyperfixi/multi-tenant": "^0.1.0",
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@hyperfixi/developer-tools": "^0.1.0"
  }
}`,
      },
    ],
    dependencies: ['@hyperfixi/multi-tenant', 'express'],
    devDependencies: ['@hyperfixi/developer-tools'],
  },

  analytics: {
    name: 'analytics',
    description: 'HyperFixi project with analytics',
    category: 'advanced',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}} - Analytics Demo</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <script src="https://unpkg.com/@hyperfixi/analytics@latest/dist/index.min.js"></script>
</head>
<body>
    <h1>{{name}} with Analytics</h1>
    
    <div class="demo-area">
        <button _="on click increment @data-clicks then put @data-clicks into #click-count" 
                data-clicks="0">
            Click Me!
        </button>
        <p>Clicks: <span id="click-count">0</span></p>
        
        <form _="on submit halt the event then log 'Form submitted' then put 'Thank you!' into #message">
            <input type="text" placeholder="Enter your name" required>
            <button type="submit">Submit</button>
        </form>
        <div id="message"></div>
    </div>

    <div class="analytics-info">
        <h2>Analytics Dashboard</h2>
        <div id="analytics-display"></div>
    </div>

    <script>
        // Initialize analytics
        const analytics = HyperFixiAnalytics.quickStartAnalytics({
            apiEndpoint: '/api/analytics',
            events: {
                compilation: true,
                execution: true,
                interactions: true,
                performance: true,
                errors: true,
            },
        });

        // Display analytics data
        setInterval(async () => {
            const metrics = await analytics.getMetrics();
            document.getElementById('analytics-display').innerHTML = \`
                <p>Total Events: \${Object.values(metrics.events.byType).reduce((a, b) => a + b, 0)}</p>
                <p>Interactions: \${metrics.interactions.totalClicks}</p>
                <p>Error Rate: \${(metrics.performance.errorRate * 100).toFixed(2)}%</p>
            \`;
        }, 2000);
    </script>

    <style>
        .demo-area {
            margin: 2rem 0;
            padding: 1rem;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .analytics-info {
            margin: 2rem 0;
            padding: 1rem;
            background: #f5f5f5;
            border-radius: 4px;
        }
        
        button {
            background: #007acc;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            margin: 0.5rem;
        }
        
        input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin: 0.5rem;
        }
    </style>
</body>
</html>`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.html",
  "scripts": {
    "dev": "hyperfixi dev",
    "build": "hyperfixi build",
    "test": "hyperfixi test"
  },
  "keywords": ["hyperscript", "hyperfixi", "analytics"],
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "@hyperfixi/analytics": "^0.1.0"
  },
  "devDependencies": {
    "@hyperfixi/developer-tools": "^0.1.0"
  }
}`,
      },
    ],
    dependencies: ['@hyperfixi/analytics'],
    devDependencies: ['@hyperfixi/developer-tools'],
  },

  'full-stack': {
    name: 'full-stack',
    description: 'Full-stack HyperFixi project with server',
    category: 'advanced',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
</head>
<body>
    <h1>{{name}} - Full Stack</h1>
    <div id="app" _="on load fetch /api/data then put it into me"></div>
</body>
</html>`,
      },
      {
        path: 'server.js',
        content: `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}`,
      },
    ],
    dependencies: ['express'],
    devDependencies: ['nodemon'],
  },

  api: {
    name: 'api',
    description: 'API-only HyperFixi project',
    category: 'advanced',
    files: [
      {
        path: 'index.js',
        content: `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/items', (req, res) => {
  res.json([
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ]);
});

app.listen(port, () => {
  console.log(\`API server running at http://localhost:\${port}\`);
});`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}`,
      },
    ],
    dependencies: ['express'],
    devDependencies: ['nodemon'],
  },

  static: {
    name: 'static',
    description: 'Static site with HyperFixi',
    category: 'basic',
    files: [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/about.html">About</a>
        </nav>
    </header>
    <main>
        <h1>Welcome to {{name}}</h1>
        <p>A static site powered by HyperFixi.</p>
    </main>
    <footer>
        <p>&copy; 2024 {{name}}</p>
    </footer>
</body>
</html>`,
      },
      {
        path: 'about.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - {{name}}</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/about.html">About</a>
        </nav>
    </header>
    <main>
        <h1>About {{name}}</h1>
        <p>This is the about page.</p>
    </main>
    <footer>
        <p>&copy; 2024 {{name}}</p>
    </footer>
</body>
</html>`,
      },
      {
        path: 'styles.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; line-height: 1.6; }
header { background: #333; color: white; padding: 1rem; }
nav a { color: white; margin-right: 1rem; text-decoration: none; }
main { padding: 2rem; max-width: 800px; margin: 0 auto; }
footer { text-align: center; padding: 1rem; background: #f5f5f5; }`,
      },
      {
        path: 'package.json',
        content: `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "scripts": {
    "dev": "npx http-server . -p 3000",
    "build": "echo 'Static site - no build needed'"
  },
  "author": "{{author}}",
  "license": "{{license}}"
}`,
      },
    ],
    dependencies: [],
    devDependencies: [],
  },
};

/**
 * Create a new project
 */
export async function createProject(options: ScaffoldOptions): Promise<void> {
  const { name, template, description, author, license, features = [], typescript, testing, linting, git, install } = options;
  
  const projectPath = path.resolve(name);
  
  // Check if directory already exists
  if (await fs.pathExists(projectPath)) {
    throw new Error(`Directory ${name} already exists`);
  }

  // Get template
  const templateData = PROJECT_TEMPLATES[template];
  if (!templateData) {
    throw new Error(`Template ${template} not found`);
  }

  // Create project directory
  await fs.ensureDir(projectPath);

  // Process template files
  for (const file of templateData.files) {
    const filePath = path.join(projectPath, file.path);
    let content = file.content;

    // Replace template variables
    content = content.replace(/\{\{name\}\}/g, name);
    content = content.replace(/\{\{description\}\}/g, description || `A ${name} project`);
    content = content.replace(/\{\{author\}\}/g, author || '');
    content = content.replace(/\{\{license\}\}/g, license || 'MIT');

    // Write file
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content);

    // Make executable if needed
    if (file.executable) {
      await fs.chmod(filePath, 0o755);
    }
  }

  // Add feature-specific dependencies
  if (features.includes('multi-tenant')) {
    await addDependency(projectPath, '@hyperfixi/multi-tenant', '^0.1.0');
  }
  if (features.includes('analytics')) {
    await addDependency(projectPath, '@hyperfixi/analytics', '^0.1.0');
  }
  if (features.includes('progressive-enhancement')) {
    await addDependency(projectPath, '@hyperfixi/progressive-enhancement', '^0.1.0');
  }
  if (features.includes('i18n')) {
    await addDependency(projectPath, '@hyperfixi/i18n', '^0.1.0');
  }
  if (features.includes('ssr')) {
    await addDependency(projectPath, '@hyperfixi/ssr-support', '^0.1.0');
  }

  // Add TypeScript support
  if (typescript) {
    await addDevDependency(projectPath, 'typescript', '^5.0.0');
    await addDevDependency(projectPath, '@types/node', '^20.0.0');
    
    // Create tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    };
    
    await fs.writeFile(
      path.join(projectPath, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );
  }

  // Add testing setup
  if (testing) {
    await addDevDependency(projectPath, '@hyperfixi/testing-framework', '^0.1.0');
    
    // Create test file
    const testContent = `import { describe, it, expect } from '@hyperfixi/testing-framework';

describe('${name}', () => {
  it('should work', () => {
    expect(true).toBe(true);
  });
});`;
    
    await fs.writeFile(
      path.join(projectPath, 'src/index.test.js'),
      testContent
    );
  }

  // Add linting setup
  if (linting) {
    await addDevDependency(projectPath, 'eslint', '^8.0.0');
    
    const eslintConfig = {
      env: {
        browser: true,
        es2021: true,
      },
      extends: ['eslint:recommended'],
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
      },
      rules: {},
    };
    
    await fs.writeFile(
      path.join(projectPath, '.eslintrc.json'),
      JSON.stringify(eslintConfig, null, 2)
    );
  }

  // Initialize git repository
  if (git) {
    const { spawn } = await import('child_process');
    
    await new Promise<void>((resolve, reject) => {
      const gitInit = spawn('git', ['init'], { cwd: projectPath });
      gitInit.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error('Git initialization failed'));
      });
    });

    // Create .gitignore
    const gitignore = `node_modules/
dist/
.env
.DS_Store
*.log`;
    
    await fs.writeFile(path.join(projectPath, '.gitignore'), gitignore);
  }

  // Install dependencies
  if (install) {
    await installDependencies(projectPath);
  }
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Create a new component
 */
export async function createComponent(options: {
  name: string;
  path?: string;
  description?: string;
  category?: string;
  typescript?: boolean;
  hyperscript?: boolean;
  events?: string[];
  template?: boolean;
  styles?: boolean;
}): Promise<void> {
  const {
    name,
    path: outputPath,
    description,
    category = 'custom',
    typescript = false,
    hyperscript = false,
    events = [],
    template = false,
    styles = false,
  } = options;

  const kebabName = toKebabCase(name);
  const componentDir = outputPath || path.join('src/components', kebabName);
  await fs.ensureDir(componentDir);

  // Create component files
  const extension = typescript ? 'ts' : 'js';

  // Generate hyperscript for events
  const eventHandlers = events.length > 0
    ? events.map(e => `on ${e} log '${e} triggered'`).join('\n    ')
    : `on click log 'Clicked ${name}'`;

  // If template option is true, create an HTML file
  if (template) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} Component</title>
    ${styles ? `<link rel="stylesheet" href="${kebabName}.css">` : ''}
</head>
<body>
    <div class="${kebabName}"${hyperscript ? ` _="${eventHandlers}"` : ''}>
        <h3>${name}</h3>
        <p>${description || `This is the ${name} component.`}</p>
    </div>
</body>
</html>`;
    await fs.writeFile(path.join(componentDir, `${kebabName}.html`), htmlContent);
  }

  // If styles option is true, create a CSS file
  if (styles) {
    const cssContent = `.${kebabName} {
    padding: 1rem;
    background: #f5f5f5;
    border-radius: 4px;
    margin: 1rem 0;
}`;
    await fs.writeFile(path.join(componentDir, `${kebabName}.css`), cssContent);
  }

  // Component definition
  const componentContent = `${typescript ? 'interface ' + name + 'Props {\n  // Define props here\n}\n\n' : ''}export const ${name} = {
  name: '${name}',
  description: '${description || `${name} component`}',
  category: '${category}',

  template: \`
    <div class="${kebabName}"${hyperscript ? ` _="${eventHandlers}"` : ''}>
      <h3>${name}</h3>
      <p>This is the ${name} component.</p>
    </div>
  \`,

  hyperscript: \`
    ${eventHandlers}
  \`,

  styles: \`
    .${kebabName} {
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 4px;
      margin: 1rem 0;
    }
  \`,

  properties: [
    {
      name: 'title',
      type: 'string',
      description: 'Component title',
      default: '${name}',
    },
  ],

  events: [
    ${events.map(e => `{
      name: '${e}',
      description: 'Fired on ${e} event',
    }`).join(',\n    ') || `{
      name: 'click',
      description: 'Fired when component is clicked',
    }`}
  ],
};`;

  await fs.writeFile(
    path.join(componentDir, `index.${extension}`),
    componentContent
  );

  // Component test
  const testContent = `import { describe, it, expect } from '@hyperfixi/testing-framework';
import { ${name} } from './index${typescript ? '' : '.js'}';

describe('${name} Component', () => {
  it('should render correctly', () => {
    expect(${name}.name).toBe('${name}');
    expect(${name}.template).toContain('${name.toLowerCase()}');
  });
  
  it('should have hyperscript behavior', () => {
    expect(${name}.hyperscript).toContain('click');
  });
});`;

  await fs.writeFile(
    path.join(componentDir, `index.test.${extension}`),
    testContent
  );

  // Component documentation
  const docsContent = `# ${name} Component

${description || `The ${name} component provides...`}

## Usage

\`\`\`html
<div class="${name.toLowerCase()}">
  <!-- Component content -->
</div>
\`\`\`

## Properties

- \`title\` (string): Component title

## Events

- \`click\`: Fired when component is clicked

## Styling

The component includes default styles that can be customized:

\`\`\`css
.${name.toLowerCase()} {
  /* Custom styles */
}
\`\`\`
`;

  await fs.writeFile(
    path.join(componentDir, 'README.md'),
    docsContent
  );
}

/**
 * Create a new template
 */
export async function createTemplate(options: {
  name: string;
  path?: string;
  description?: string;
  variables?: string[];
  slots?: string[];
  typescript?: boolean;
}): Promise<void> {
  const {
    name,
    path: outputPath,
    description,
    variables = [],
    slots = [],
    typescript = false,
  } = options;

  const templateDir = outputPath || path.join('templates', name);
  await fs.ensureDir(templateDir);

  // Create template configuration
  const templateConfig = {
    name,
    description: description || `${name} template`,
    category: 'custom',
    variables,
    slots,
    files: [],
    dependencies: [],
    devDependencies: ['@hyperfixi/developer-tools'],
  };

  await fs.writeFile(
    path.join(templateDir, 'template.json'),
    JSON.stringify(templateConfig, null, 2)
  );

  // Generate variable placeholders
  const variablePlaceholders = variables.map(v => `  {{${v}}}`).join('\n');

  // Generate slot elements
  const slotElements = slots.map(s => `  <slot name="${s}"></slot>`).join('\n');

  // Create HTML template file
  await fs.writeFile(
    path.join(templateDir, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{name}}</title>
</head>
<body>
    <h1>{{name}} Template</h1>
    <p>Customize this template for your needs.</p>
${variablePlaceholders}
${slotElements}
</body>
</html>`
  );

  // If typescript option is true, create a TypeScript file
  if (typescript) {
    const tsContent = `// ${name} Template TypeScript Definition

export interface ${name}Props {
${variables.map(v => `  ${v}: string;`).join('\n') || '  // Add props here'}
}

export function render(props: ${name}Props): string {
  return \`
    <div class="${name.toLowerCase()}">
      ${variables.map(v => `<p>\${props.${v}}</p>`).join('\n      ')}
    </div>
  \`;
}
`;
    await fs.writeFile(path.join(templateDir, `${name.toLowerCase()}.ts`), tsContent);
  }

  await fs.writeFile(
    path.join(templateDir, 'README.md'),
    `# ${name} Template

${description || `Template for creating ${name} projects.`}

## Usage

\`\`\`bash
hyperfixi create my-project --template ${name}
\`\`\`

## Features

- List features here
- Add more details

## Customization

Explain how to customize this template.
`
  );
}

/**
 * Helper functions
 */
async function addDependency(projectPath: string, name: string, version: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  if (!packageJson.dependencies) {
    packageJson.dependencies = {};
  }
  
  packageJson.dependencies[name] = version;
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

async function addDevDependency(projectPath: string, name: string, version: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  if (!packageJson.devDependencies) {
    packageJson.devDependencies = {};
  }
  
  packageJson.devDependencies[name] = version;
  
  await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
}

async function installDependencies(projectPath: string): Promise<void> {
  const { spawn } = await import('child_process');
  
  return new Promise<void>((resolve, reject) => {
    const npm = spawn('npm', ['install'], { 
      cwd: projectPath,
      stdio: 'inherit'
    });
    
    npm.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('Package installation failed'));
    });
  });
}

/**
 * Generate code from templates (string-based API)
 */
export async function generateCode(
  template: string,
  data: Record<string, any>,
  config?: GeneratorConfig
): Promise<GeneratedCode>;

/**
 * Generate code from schema (schema-based API)
 */
export async function generateCode(
  schema: CodeGenerationSchema
): Promise<SchemaGeneratedCode>;

/**
 * Generate code from templates or schema
 */
export async function generateCode(
  templateOrSchema: string | CodeGenerationSchema,
  data?: Record<string, any>,
  config: GeneratorConfig = {
    target: 'javascript',
    format: 'module',
    optimization: {
      minify: false,
      comments: true,
      sourceMaps: false,
    },
    typescript: {
      strict: true,
      target: 'ES2020',
      moduleResolution: 'bundler',
    },
  }
): Promise<GeneratedCode | SchemaGeneratedCode> {
  // Schema-based generation
  if (typeof templateOrSchema === 'object' && 'type' in templateOrSchema) {
    return generateFromSchema(templateOrSchema);
  }

  // String-based template generation
  const template = templateOrSchema;
  const files = [
    {
      path: 'generated.js',
      content: template.replace(/\{\{(\w+)\}\}/g, (match, key) => data?.[key] || match),
      type: 'javascript' as const,
      size: 0,
    },
  ];

  return {
    files,
    dependencies: [],
    warnings: [],
    metadata: {
      generator: '@hyperfixi/developer-tools',
      version: '0.1.0',
      timestamp: Date.now(),
      source: 'template',
      target: config.target,
      options: config,
    },
  };
}

/**
 * Generate code from a schema definition
 */
async function generateFromSchema(schema: CodeGenerationSchema): Promise<SchemaGeneratedCode> {
  const { type, name, schema: schemaData } = schema;

  let html = '';
  let js: string | undefined;
  let css: string | undefined;
  const dependencies: string[] = [];
  const warnings: string[] = [];

  switch (type) {
    case 'component':
      ({ html, js, css } = generateComponent(name, schemaData as ComponentSchema));
      break;
    case 'page':
      ({ html, js, css } = generatePage(name, schemaData as PageSchema));
      break;
    case 'form':
      ({ html, js, css } = generateForm(name, schemaData as FormSchema));
      break;
    case 'list':
      ({ html, js, css } = generateList(name, schemaData as ListSchema));
      break;
    default:
      throw new Error(`Unknown generation type: ${type}`);
  }

  return {
    files: { html, js, css },
    dependencies,
    warnings,
    metadata: {
      generator: '@hyperfixi/developer-tools',
      version: '0.1.0',
      timestamp: Date.now(),
      source: 'schema',
      target: 'html',
      options: {},
    },
  };
}

/**
 * Generate component HTML from schema
 */
function generateComponent(name: string, schema: ComponentSchema): { html: string; js?: string; css?: string } {
  const { template, events = [], commands = [] } = schema;

  // Build hyperscript if there are events or commands
  let hyperscript = '';
  if (events.length > 0 || commands.length > 0) {
    const eventHandlers = events.map(event => {
      const command = commands[0] || 'log';
      return `on ${event} ${command} .active`;
    });
    hyperscript = ` _="${eventHandlers.join(' then ')}"`;
  }

  // Wrap template with hyperscript attribute if needed
  let html = template;
  if (hyperscript && template.startsWith('<')) {
    const tagEnd = template.indexOf('>');
    html = template.slice(0, tagEnd) + hyperscript + template.slice(tagEnd);
  }

  return {
    html: `<!-- Component: ${name} -->\n${html}`,
    js: undefined,
    css: schema.styles,
  };
}

/**
 * Generate page HTML from schema
 */
function generatePage(name: string, schema: PageSchema): { html: string; js?: string; css?: string } {
  const { title, components = [], layout = 'default' } = schema;

  const componentIncludes = components.map(c => `  <!-- Include: ${c} -->`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://unpkg.com/hyperfixi/dist/hyperfixi-browser.js"></script>
</head>
<body class="layout-${layout}">
${componentIncludes}
  <main id="${name}">
    <!-- Page content -->
  </main>
</body>
</html>`;

  return { html, js: undefined, css: undefined };
}

/**
 * Generate form HTML from schema
 */
function generateForm(name: string, schema: FormSchema): { html: string; js?: string; css?: string } {
  const { fields, submitAction, validation = true } = schema;

  const fieldHtml = fields.map(field => {
    const label = field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1);
    const required = field.required ? ' required' : '';
    const placeholder = field.placeholder ? ` placeholder="${field.placeholder}"` : '';

    if (field.type === 'textarea') {
      return `  <div class="form-field">
    <label for="${field.name}">${label}</label>
    <textarea id="${field.name}" name="${field.name}"${required}${placeholder}></textarea>
  </div>`;
    }

    if (field.type === 'select' && field.options) {
      const options = field.options.map(opt => `      <option value="${opt}">${opt}</option>`).join('\n');
      return `  <div class="form-field">
    <label for="${field.name}">${label}</label>
    <select id="${field.name}" name="${field.name}"${required}>
${options}
    </select>
  </div>`;
    }

    return `  <div class="form-field">
    <label for="${field.name}">${label}</label>
    <input type="${field.type}" id="${field.name}" name="${field.name}"${required}${placeholder}>
  </div>`;
  }).join('\n');

  const validationAttr = validation ? ` _="on submit halt the event then send ${submitAction} to me"` : '';

  const html = `<form id="${name}" class="form"${validationAttr}>
${fieldHtml}
  <button type="submit">Submit</button>
</form>`;

  return { html, js: undefined, css: undefined };
}

/**
 * Generate list HTML from schema
 */
function generateList(name: string, schema: ListSchema): { html: string; js?: string; css?: string } {
  const { itemTemplate, actions = [], sortable = false, filterable = false } = schema;

  const actionButtons = actions.map(action =>
    `    <button _="on click send ${action} to closest <li/>">${action}</button>`
  ).join('\n');

  const listAttrs: string[] = [];
  if (sortable) listAttrs.push('data-sortable="true"');
  if (filterable) listAttrs.push('data-filterable="true"');
  const attrsStr = listAttrs.length > 0 ? ' ' + listAttrs.join(' ') : '';

  const html = `<div id="${name}" class="list-container">
  <ul class="list"${attrsStr}>
    <li class="list-item">
      ${itemTemplate}
${actionButtons ? `      <div class="list-actions">\n${actionButtons}\n      </div>` : ''}
    </li>
  </ul>
</div>`;

  return { html, js: undefined, css: undefined };
}