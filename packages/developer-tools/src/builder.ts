/**
 * Visual Builder API
 * Server and API for visual HyperScript component builder
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import * as chokidar from 'chokidar';
import open from 'open';
import type {
  BuilderConfig,
  ComponentLibrary,
  ComponentDefinition,
  ComponentCategory,
  BuilderTheme,
} from './types';

/**
 * Default builder configuration
 */
const DEFAULT_CONFIG: BuilderConfig = {
  port: 8000,
  host: 'localhost',
  open: true,
  livereload: true,
  components: {
    name: 'HyperFixi Components',
    version: '1.0.0',
    components: [],
    categories: [
      {
        id: 'layout',
        name: 'Layout',
        description: 'Layout components',
        icon: '🏗️',
      },
      {
        id: 'forms',
        name: 'Forms',
        description: 'Form components',
        icon: '📝',
      },
      {
        id: 'navigation',
        name: 'Navigation',
        description: 'Navigation components',
        icon: '🧭',
      },
      {
        id: 'content',
        name: 'Content',
        description: 'Content components',
        icon: '📄',
      },
      {
        id: 'interactive',
        name: 'Interactive',
        description: 'Interactive components',
        icon: '⚡',
      },
    ],
  },
  theme: {
    name: 'HyperFixi',
    colors: {
      primary: '#007acc',
      secondary: '#666',
      accent: '#ff6b35',
      background: '#ffffff',
      surface: '#f8f9fa',
      text: '#333333',
      textSecondary: '#666666',
      border: '#e1e5e9',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
    },
    fonts: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      code: '"SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '1rem',
    },
  },
};

/**
 * Built-in component library
 */
const BUILTIN_COMPONENTS: ComponentDefinition[] = [
  {
    id: 'button',
    name: 'Button',
    description: 'Interactive button component',
    category: 'interactive',
    icon: '🔘',
    template: `<button class="btn" type="{{type}}">{{text}}</button>`,
    hyperscript: `on click add .loading to me then wait 1s then remove .loading from me`,
    styles: `.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  background: var(--primary-color, #007acc);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: var(--primary-dark, #0056b3);
  transform: translateY(-1px);
}

.btn.loading {
  opacity: 0.7;
  cursor: not-allowed;
}`,
    properties: [
      {
        name: 'text',
        type: 'string',
        description: 'Button text',
        default: 'Click me',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Button type',
        default: 'button',
        options: ['button', 'submit', 'reset'],
      },
    ],
    events: [
      {
        name: 'click',
        description: 'Fired when button is clicked',
        payload: { target: 'HTMLElement' },
      },
    ],
    slots: [],
    examples: [
      {
        name: 'Basic Button',
        description: 'Simple button with click handler',
        code: `<button class="btn" _="on click log 'Button clicked!'">Click me</button>`,
      },
      {
        name: 'Loading Button',
        description: 'Button with loading state',
        code: `<button class="btn" _="on click add .loading to me then wait 2s then remove .loading from me">Submit</button>`,
      },
    ],
  },
  {
    id: 'modal',
    name: 'Modal',
    description: 'Modal dialog component',
    category: 'layout',
    icon: '🪟',
    template: `<div class="modal" style="display: none;">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3>{{title}}</h3>
      <button class="modal-close" _="on click hide closest .modal">&times;</button>
    </div>
    <div class="modal-body">
      {{content}}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" _="on click hide closest .modal">Cancel</button>
      <button class="btn btn-primary" _="on click trigger confirm then hide closest .modal">OK</button>
    </div>
  </div>
</div>`,
    hyperscript: `on click from .modal-backdrop hide closest .modal`,
    styles: `.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90%;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e1e5e9;
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e1e5e9;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
}`,
    properties: [
      {
        name: 'title',
        type: 'string',
        description: 'Modal title',
        default: 'Modal Title',
        required: true,
      },
      {
        name: 'content',
        type: 'string',
        description: 'Modal content',
        default: 'Modal content goes here.',
      },
    ],
    events: [
      {
        name: 'confirm',
        description: 'Fired when OK button is clicked',
      },
      {
        name: 'cancel',
        description: 'Fired when Cancel button or backdrop is clicked',
      },
    ],
    slots: [
      {
        name: 'body',
        description: 'Modal body content',
      },
      {
        name: 'footer',
        description: 'Modal footer content',
      },
    ],
    examples: [
      {
        name: 'Basic Modal',
        description: 'Simple modal with title and content',
        code: `<div class="modal" _="on show transition opacity to 1">
  <!-- Modal content -->
</div>`,
      },
    ],
  },
  {
    id: 'form-field',
    name: 'Form Field',
    description: 'Form input field with validation',
    category: 'forms',
    icon: '📝',
    template: `<div class="form-field">
  <label for="{{id}}">{{label}}</label>
  <input 
    type="{{type}}" 
    id="{{id}}" 
    name="{{name}}" 
    placeholder="{{placeholder}}"
    {{#required}}required{{/required}}
    class="form-input"
  />
  <div class="form-error" style="display: none;"></div>
</div>`,
    hyperscript: `on blur 
  if my value is empty and I have @required
    then add .error to closest .form-field 
    then put 'This field is required' into next .form-error 
    then show next .form-error
  else 
    remove .error from closest .form-field 
    then hide next .form-error`,
    styles: `.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.form-field.error .form-input {
  border-color: #dc3545;
}

.form-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}`,
    properties: [
      {
        name: 'label',
        type: 'string',
        description: 'Field label',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Input type',
        default: 'text',
        options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      },
      {
        name: 'id',
        type: 'string',
        description: 'Field ID',
        required: true,
      },
      {
        name: 'name',
        type: 'string',
        description: 'Field name',
        required: true,
      },
      {
        name: 'placeholder',
        type: 'string',
        description: 'Placeholder text',
      },
      {
        name: 'required',
        type: 'boolean',
        description: 'Whether field is required',
        default: false,
      },
    ],
    events: [
      {
        name: 'change',
        description: 'Fired when field value changes',
      },
      {
        name: 'blur',
        description: 'Fired when field loses focus',
      },
    ],
    slots: [],
    examples: [
      {
        name: 'Text Field',
        description: 'Basic text input field',
        code: `<div class="form-field">
  <label for="name">Name</label>
  <input type="text" id="name" name="name" required>
</div>`,
      },
    ],
  },
];

/**
 * Visual Builder Server
 */
export class VisualBuilderServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private config: BuilderConfig;
  private components: ComponentDefinition[];
  private watcher?: chokidar.FSWatcher;
  private clients: Set<WebSocket> = new Set();

  constructor(config: Partial<BuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.components = [...BUILTIN_COMPONENTS, ...this.config.components.components];
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Static files
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.use(express.json());

    // API routes
    this.app.get('/api/config', (req, res) => {
      res.json(this.config);
    });

    this.app.get('/api/components', (req, res) => {
      res.json(this.components);
    });

    this.app.get('/api/components/:id', (req, res) => {
      const component = this.components.find(c => c.id === req.params.id);
      if (!component) {
        return res.status(404).json({ error: 'Component not found' });
      }
      res.json(component);
    });

    this.app.post('/api/components', (req, res) => {
      const component: ComponentDefinition = req.body;
      
      // Validate component
      if (!component.id || !component.name || !component.template) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check for duplicate ID
      if (this.components.find(c => c.id === component.id)) {
        return res.status(409).json({ error: 'Component ID already exists' });
      }

      this.components.push(component);
      this.broadcastUpdate('component-added', component);
      res.json(component);
    });

    this.app.put('/api/components/:id', (req, res) => {
      const index = this.components.findIndex(c => c.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Component not found' });
      }

      const component: ComponentDefinition = { ...this.components[index], ...req.body };
      this.components[index] = component;
      this.broadcastUpdate('component-updated', component);
      res.json(component);
    });

    this.app.delete('/api/components/:id', (req, res) => {
      const index = this.components.findIndex(c => c.id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ error: 'Component not found' });
      }

      const component = this.components[index];
      this.components.splice(index, 1);
      this.broadcastUpdate('component-deleted', component);
      res.json({ success: true });
    });

    // Preview route
    this.app.post('/api/preview', (req, res) => {
      const { template, hyperscript, styles, data } = req.body;
      
      try {
        const preview = this.generatePreview(template, hyperscript, styles, data);
        res.json({ preview });
      } catch (error) {
        res.status(400).json({ 
          error: 'Preview generation failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Export route
    this.app.post('/api/export', (req, res) => {
      const { components, format = 'html' } = req.body;
      
      try {
        const exported = this.exportComponents(components, format);
        res.json({ code: exported });
      } catch (error) {
        res.status(400).json({ 
          error: 'Export failed', 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Main builder app
    this.app.get('/', (req, res) => {
      res.send(this.generateBuilderHTML());
    });
  }

  /**
   * Setup WebSocket connection
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial state
      ws.send(JSON.stringify({
        type: 'init',
        config: this.config,
        components: this.components,
      }));
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'preview':
        try {
          const preview = this.generatePreview(
            message.template,
            message.hyperscript,
            message.styles,
            message.data
          );
          ws.send(JSON.stringify({
            type: 'preview-result',
            id: message.id,
            preview,
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'preview-error',
            id: message.id,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
        break;

      case 'validate':
        try {
          const validation = this.validateComponent(message.component);
          ws.send(JSON.stringify({
            type: 'validation-result',
            id: message.id,
            validation,
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'validation-error',
            id: message.id,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`,
        }));
    }
  }

  /**
   * Generate component preview
   */
  private generatePreview(
    template: string,
    hyperscript: string,
    styles: string,
    data: Record<string, any> = {}
  ): string {
    // Simple template replacement (in production, use a proper template engine)
    let html = template;
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, String(value));
    }

    // Add hyperscript attribute
    if (hyperscript) {
      html = html.replace(/<(\w+)([^>]*)>/, `<$1$2 _="${hyperscript}">`);
    }

    // Wrap in preview container
    return `
      <div class="preview-container">
        <style>
          .preview-container {
            padding: 1rem;
            border: 1px solid #e1e5e9;
            border-radius: 0.5rem;
            background: white;
          }
          ${styles}
        </style>
        ${html}
      </div>
    `;
  }

  /**
   * Validate component definition
   */
  private validateComponent(component: Partial<ComponentDefinition>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!component.id) errors.push('Component ID is required');
    if (!component.name) errors.push('Component name is required');
    if (!component.template) errors.push('Component template is required');

    // ID format
    if (component.id && !/^[a-z][a-z0-9-]*$/.test(component.id)) {
      errors.push('Component ID must start with lowercase letter and contain only lowercase letters, numbers, and hyphens');
    }

    // Template validation
    if (component.template) {
      const openTags = (component.template.match(/<\w+/g) || []).length;
      const closeTags = (component.template.match(/<\/\w+>/g) || []).length;
      
      if (openTags !== closeTags) {
        warnings.push('Template may have unmatched HTML tags');
      }
    }

    // HyperScript validation
    if (component.hyperscript) {
      const openParens = (component.hyperscript.match(/\(/g) || []).length;
      const closeParens = (component.hyperscript.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        errors.push('HyperScript has unmatched parentheses');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export components to code
   */
  private exportComponents(components: ComponentDefinition[], format: string): string {
    switch (format) {
      case 'html':
        return this.exportToHTML(components);
      case 'json':
        return JSON.stringify(components, null, 2);
      case 'javascript':
        return this.exportToJavaScript(components);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to HTML
   */
  private exportToHTML(components: ComponentDefinition[]): string {
    const html = components.map(component => {
      let template = component.template;
      
      // Add hyperscript
      if (component.hyperscript) {
        template = template.replace(/<(\w+)([^>]*)>/, `<$1$2 _="${component.hyperscript}">`);
      }

      return `<!-- ${component.name} Component -->
${template}`;
    }).join('\n\n');

    const styles = components
      .filter(c => c.styles)
      .map(c => `/* ${c.name} Styles */\n${c.styles}`)
      .join('\n\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Components</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <style>
${styles}
    </style>
</head>
<body>
${html}
</body>
</html>`;
  }

  /**
   * Export to JavaScript
   */
  private exportToJavaScript(components: ComponentDefinition[]): string {
    return `// Generated HyperFixi Components
export const components = ${JSON.stringify(components, null, 2)};

// Component factory
export function createComponent(id, props = {}) {
  const component = components.find(c => c.id === id);
  if (!component) {
    throw new Error(\`Component \${id} not found\`);
  }
  
  let html = component.template;
  
  // Replace template variables
  for (const [key, value] of Object.entries(props)) {
    const regex = new RegExp(\`\\\\{\\\\{\${key}\\\\}\\\\}\`, 'g');
    html = html.replace(regex, String(value));
  }
  
  // Add hyperscript
  if (component.hyperscript) {
    html = html.replace(/<(\\w+)([^>]*)>/, \`<$1$2 _="\${component.hyperscript}">\`);
  }
  
  return html;
}`;
  }

  /**
   * Generate builder HTML
   */
  private generateBuilderHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HyperFixi Visual Builder</title>
    <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: ${this.config.theme.fonts.primary};
            background: ${this.config.theme.colors.background};
            color: ${this.config.theme.colors.text};
            height: 100vh;
            overflow: hidden;
        }
        
        .builder {
            display: grid;
            grid-template-columns: 250px 1fr 300px;
            grid-template-rows: 60px 1fr;
            height: 100vh;
        }
        
        .header {
            grid-column: 1 / -1;
            background: ${this.config.theme.colors.surface};
            border-bottom: 1px solid ${this.config.theme.colors.border};
            display: flex;
            align-items: center;
            padding: 0 1rem;
            gap: 1rem;
        }
        
        .logo {
            font-size: 1.25rem;
            font-weight: bold;
            color: ${this.config.theme.colors.primary};
        }
        
        .sidebar {
            background: ${this.config.theme.colors.surface};
            border-right: 1px solid ${this.config.theme.colors.border};
            overflow-y: auto;
        }
        
        .canvas {
            background: white;
            position: relative;
            overflow: auto;
        }
        
        .properties {
            background: ${this.config.theme.colors.surface};
            border-left: 1px solid ${this.config.theme.colors.border};
            overflow-y: auto;
        }
        
        .component-list {
            padding: 1rem;
        }
        
        .component-category {
            margin-bottom: 1rem;
        }
        
        .category-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
            color: ${this.config.theme.colors.textSecondary};
        }
        
        .component-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            border-radius: ${this.config.theme.borderRadius.sm};
            cursor: pointer;
            margin-bottom: 0.25rem;
            transition: background 0.2s ease;
        }
        
        .component-item:hover {
            background: ${this.config.theme.colors.primary}20;
        }
        
        .properties-panel {
            padding: 1rem;
        }
        
        .panel-title {
            font-weight: bold;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid ${this.config.theme.colors.border};
        }
        
        .property-group {
            margin-bottom: 1rem;
        }
        
        .property-label {
            display: block;
            margin-bottom: 0.25rem;
            font-size: 0.875rem;
            color: ${this.config.theme.colors.textSecondary};
        }
        
        .property-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid ${this.config.theme.colors.border};
            border-radius: ${this.config.theme.borderRadius.sm};
            font-size: 0.875rem;
        }
        
        .preview-frame {
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: ${this.config.theme.borderRadius.sm};
            background: ${this.config.theme.colors.primary};
            color: white;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.2s ease;
        }
        
        .btn:hover {
            background: ${this.config.theme.colors.primary}dd;
        }
        
        .btn-secondary {
            background: ${this.config.theme.colors.secondary};
        }
        
        .btn-secondary:hover {
            background: ${this.config.theme.colors.secondary}dd;
        }
    </style>
</head>
<body>
    <div class="builder">
        <div class="header">
            <div class="logo">🔧 HyperFixi Builder</div>
            <div style="flex: 1;"></div>
            <button class="btn" onclick="exportComponents()">Export</button>
            <button class="btn btn-secondary" onclick="saveProject()">Save</button>
        </div>
        
        <div class="sidebar">
            <div class="component-list">
                <div class="panel-title">Components</div>
                <div id="component-categories"></div>
            </div>
        </div>
        
        <div class="canvas">
            <iframe id="preview-frame" class="preview-frame" srcdoc="<h3>Drop components here to start building</h3>"></iframe>
        </div>
        
        <div class="properties">
            <div class="properties-panel">
                <div class="panel-title">Properties</div>
                <div id="property-editor">
                    <p style="color: ${this.config.theme.colors.textSecondary};">Select a component to edit properties</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // WebSocket connection for live updates
        const ws = new WebSocket(\`ws://\${location.host}\`);
        let components = [];
        let selectedComponent = null;
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'init':
                    components = message.components;
                    renderComponentList();
                    break;
                case 'component-added':
                case 'component-updated':
                    updateComponentList();
                    break;
                case 'preview-result':
                    updatePreview(message.preview);
                    break;
            }
        };
        
        function renderComponentList() {
            const container = document.getElementById('component-categories');
            const categories = {};
            
            // Group components by category
            components.forEach(component => {
                if (!categories[component.category]) {
                    categories[component.category] = [];
                }
                categories[component.category].push(component);
            });
            
            container.innerHTML = Object.entries(categories).map(([categoryId, categoryComponents]) => {
                const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1);
                return \`
                    <div class="component-category">
                        <div class="category-title">\${categoryName}</div>
                        \${categoryComponents.map(component => \`
                            <div class="component-item" onclick="selectComponent('\${component.id}')">
                                <span>\${component.icon || '📦'}</span>
                                <span>\${component.name}</span>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }).join('');
        }
        
        function selectComponent(componentId) {
            selectedComponent = components.find(c => c.id === componentId);
            if (selectedComponent) {
                renderPropertyEditor();
                requestPreview();
            }
        }
        
        function renderPropertyEditor() {
            if (!selectedComponent) return;
            
            const container = document.getElementById('property-editor');
            container.innerHTML = \`
                <div class="property-group">
                    <label class="property-label">Template</label>
                    <textarea class="property-input" rows="4" onchange="updateProperty('template', this.value)">\${selectedComponent.template}</textarea>
                </div>
                <div class="property-group">
                    <label class="property-label">HyperScript</label>
                    <textarea class="property-input" rows="3" onchange="updateProperty('hyperscript', this.value)">\${selectedComponent.hyperscript || ''}</textarea>
                </div>
                <div class="property-group">
                    <label class="property-label">Styles</label>
                    <textarea class="property-input" rows="6" onchange="updateProperty('styles', this.value)">\${selectedComponent.styles || ''}</textarea>
                </div>
                \${selectedComponent.properties.map(prop => \`
                    <div class="property-group">
                        <label class="property-label">\${prop.name}</label>
                        <input type="text" class="property-input" value="\${prop.default || ''}" onchange="updatePropertyData('\${prop.name}', this.value)" />
                    </div>
                \`).join('')}
            \`;
        }
        
        function updateProperty(key, value) {
            if (selectedComponent) {
                selectedComponent[key] = value;
                requestPreview();
            }
        }
        
        function updatePropertyData(key, value) {
            if (selectedComponent) {
                if (!selectedComponent.data) selectedComponent.data = {};
                selectedComponent.data[key] = value;
                requestPreview();
            }
        }
        
        function requestPreview() {
            if (selectedComponent) {
                ws.send(JSON.stringify({
                    type: 'preview',
                    id: Date.now(),
                    template: selectedComponent.template,
                    hyperscript: selectedComponent.hyperscript,
                    styles: selectedComponent.styles,
                    data: selectedComponent.data || {}
                }));
            }
        }
        
        function updatePreview(html) {
            const frame = document.getElementById('preview-frame');
            frame.srcdoc = html;
        }
        
        function exportComponents() {
            fetch('/api/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ components: [selectedComponent], format: 'html' })
            })
            .then(response => response.json())
            .then(data => {
                const blob = new Blob([data.code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'components.html';
                a.click();
                URL.revokeObjectURL(url);
            });
        }
        
        function saveProject() {
            // Implement project saving
            alert('Project saved!');
        }
    </script>
</body>
</html>`;
  }

  /**
   * Broadcast update to all connected clients
   */
  private broadcastUpdate(type: string, data: any): void {
    const message = JSON.stringify({ type, data });
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * Setup file watching for live reload
   */
  private setupFileWatcher(watchPaths: string[]): void {
    if (!this.config.livereload) return;

    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
    });

    this.watcher.on('change', (path) => {
      this.broadcastUpdate('file-changed', { path });
    });
  }

  /**
   * Start the builder server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        const url = `http://${this.config.host}:${this.config.port}`;
        console.log(`🔧 Visual Builder started at ${url}`);

        if (this.config.open) {
          open(url).catch(() => {
            // Ignore open errors
          });
        }

        resolve();
      });

      this.server.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the builder server
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    for (const client of this.clients) {
      client.close();
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }
}

/**
 * Start development server
 */
export async function startDevServer(config: {
  port: number;
  host: string;
  open: boolean;
  livereload: boolean;
}): Promise<void> {
  const builderConfig: Partial<BuilderConfig> = {
    port: config.port,
    host: config.host,
    open: config.open,
    livereload: config.livereload,
  };

  const builder = new VisualBuilderServer(builderConfig);
  await builder.start();
}

/**
 * Build project for production
 */
export async function buildProject(config: {
  output: string;
  minify: boolean;
  sourcemap: boolean;
  analyze: boolean;
  projectPath?: string;
}): Promise<{
  files: Array<{ path: string; size: number; gzippedSize?: number }>;
  warnings: string[];
  metadata: { timestamp: number; totalSize: number; gzippedSize: number };
}> {
  const esbuild = await import('esbuild');
  const { gzipSync } = await import('zlib');
  const { glob } = await import('glob');

  const projectPath = config.projectPath || process.cwd();
  const warnings: string[] = [];
  const files: Array<{ path: string; size: number; gzippedSize?: number }> = [];

  // Ensure output directory exists
  await fs.ensureDir(config.output);

  // Discover entry points
  const htmlFiles = await glob('**/*.html', {
    cwd: projectPath,
    ignore: ['node_modules/**', 'dist/**', config.output.replace(projectPath, '') + '/**']
  });
  const jsEntries = await glob('**/*.{js,ts}', {
    cwd: projectPath,
    ignore: ['node_modules/**', 'dist/**', config.output.replace(projectPath, '') + '/**', '**/*.test.{js,ts}', '**/*.spec.{js,ts}']
  });

  // Find main entry point
  const mainEntry = jsEntries.find(f =>
    f === 'index.ts' || f === 'index.js' ||
    f === 'main.ts' || f === 'main.js' ||
    f === 'src/index.ts' || f === 'src/index.js' ||
    f === 'src/main.ts' || f === 'src/main.js'
  );

  // Bundle JavaScript/TypeScript files
  if (mainEntry) {
    try {
      const result = await esbuild.build({
        entryPoints: [path.join(projectPath, mainEntry)],
        bundle: true,
        outdir: config.output,
        minify: config.minify,
        sourcemap: config.sourcemap,
        target: 'es2020',
        format: 'esm',
        metafile: config.analyze,
        external: ['@hyperfixi/*'],
        write: true,
      });

      // Collect bundled files
      if (result.metafile) {
        for (const [outputPath, output] of Object.entries(result.metafile.outputs)) {
          const relativePath = path.relative(config.output, outputPath);
          const content = await fs.readFile(outputPath);
          const gzipped = gzipSync(content);

          files.push({
            path: relativePath,
            size: output.bytes,
            gzippedSize: gzipped.length,
          });
        }
      }

      // Handle warnings
      for (const warning of result.warnings) {
        warnings.push(`esbuild: ${warning.text}`);
      }
    } catch (error) {
      warnings.push(`Build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Process HTML files
  for (const htmlFile of htmlFiles) {
    const srcPath = path.join(projectPath, htmlFile);
    const destPath = path.join(config.output, htmlFile);

    let content = await fs.readFile(srcPath, 'utf-8');

    // Extract and process inline hyperscript
    const hyperscriptMatches = content.match(/_="([^"]+)"/g) || [];
    if (hyperscriptMatches.length > 0) {
      // Optionally minify hyperscript (basic - remove extra whitespace)
      if (config.minify) {
        content = content.replace(/_="([^"]+)"/g, (match, script) => {
          const minified = script.replace(/\s+/g, ' ').trim();
          return `_="${minified}"`;
        });
      }
    }

    // Update script references for bundled output
    if (mainEntry) {
      const bundleName = path.basename(mainEntry).replace(/\.(ts|js)$/, '.js');
      // Add bundle script if not already present
      if (!content.includes(bundleName)) {
        content = content.replace('</body>', `  <script type="module" src="./${bundleName}"></script>\n</body>`);
      }
    }

    await fs.ensureDir(path.dirname(destPath));
    await fs.writeFile(destPath, content);

    const stats = await fs.stat(destPath);
    const gzipped = gzipSync(content);

    files.push({
      path: htmlFile,
      size: stats.size,
      gzippedSize: gzipped.length,
    });
  }

  // Copy static assets (images, fonts, etc.)
  const staticFiles = await glob('**/*.{css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot,ico}', {
    cwd: projectPath,
    ignore: ['node_modules/**', 'dist/**', config.output.replace(projectPath, '') + '/**'],
  });

  for (const staticFile of staticFiles) {
    const srcPath = path.join(projectPath, staticFile);
    const destPath = path.join(config.output, staticFile);

    await fs.ensureDir(path.dirname(destPath));
    await fs.copy(srcPath, destPath);

    const stats = await fs.stat(destPath);
    const content = await fs.readFile(destPath);
    const gzipped = gzipSync(content);

    files.push({
      path: staticFile,
      size: stats.size,
      gzippedSize: gzipped.length,
    });
  }

  // Calculate totals
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const gzippedSize = files.reduce((sum, f) => sum + (f.gzippedSize || 0), 0);

  return {
    files,
    warnings,
    metadata: {
      timestamp: Date.now(),
      totalSize,
      gzippedSize,
    },
  };
}