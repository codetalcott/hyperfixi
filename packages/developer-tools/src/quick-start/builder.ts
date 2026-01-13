/**
 * Quick Start Builder
 * Simplified API for visual builder
 */

import { VisualBuilderServer } from '../builder';
import type { BuilderConfig, ComponentDefinition } from '../types';

/**
 * Quick start builder with sensible defaults
 */
export function quickStartBuilder(
  options: {
    port?: number;
    host?: string;
    open?: boolean;
    livereload?: boolean;
    customComponents?: ComponentDefinition[];
  } = {}
) {
  const {
    port = 8000,
    host = 'localhost',
    open = true,
    livereload = true,
    customComponents = [],
  } = options;

  const config: Partial<BuilderConfig> = {
    port,
    host,
    open,
    livereload,
    components: {
      name: 'HyperFixi Components',
      version: '1.0.0',
      components: customComponents,
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
          id: 'interactive',
          name: 'Interactive',
          description: 'Interactive components',
          icon: '⚡',
        },
        {
          id: 'content',
          name: 'Content',
          description: 'Content components',
          icon: '📄',
        },
      ],
    },
  };

  let server: VisualBuilderServer | null = null;

  return {
    /**
     * Start the visual builder
     */
    async start(): Promise<void> {
      server = new VisualBuilderServer(config);
      await server.start();
      console.log(`🎨 Visual Builder started at http://${host}:${port}`);
    },

    /**
     * Stop the visual builder
     */
    async stop(): Promise<void> {
      if (server) {
        await server.stop();
        server = null;
        console.log('🛑 Visual Builder stopped');
      }
    },

    /**
     * Add custom component
     */
    addComponent(component: ComponentDefinition): void {
      if (config.components) {
        config.components.components.push(component);
      }
    },

    /**
     * Add multiple components
     */
    addComponents(components: ComponentDefinition[]): void {
      components.forEach(component => this.addComponent(component));
    },

    /**
     * Create a simple button component
     */
    createButtonComponent(options: {
      id: string;
      name: string;
      text?: string;
      style?: string;
      onClick?: string;
    }): ComponentDefinition {
      const {
        id,
        name,
        text = 'Click me',
        style = '',
        onClick = 'log "Button clicked!"',
      } = options;

      return {
        id,
        name,
        description: `${name} button component`,
        category: 'interactive',
        icon: '🔘',
        template: `<button class="btn btn-${id}" type="button">${text}</button>`,
        hyperscript: `on click ${onClick}`,
        styles: `.btn-${id} {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  background: #007acc;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  ${style}
}

.btn-${id}:hover {
  background: #0056b3;
  transform: translateY(-1px);
}`,
        properties: [
          {
            name: 'text',
            type: 'string',
            description: 'Button text',
            default: text,
            required: true,
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
            name: 'Basic Usage',
            description: `Basic ${name} button`,
            code: `<button class="btn btn-${id}" _="on click ${onClick}">${text}</button>`,
          },
        ],
      };
    },

    /**
     * Create a form field component
     */
    createFormFieldComponent(options: {
      id: string;
      name: string;
      type?: string;
      label?: string;
      placeholder?: string;
      required?: boolean;
    }): ComponentDefinition {
      const {
        id,
        name,
        type = 'text',
        label = 'Field Label',
        placeholder = '',
        required = false,
      } = options;

      return {
        id,
        name,
        description: `${name} form field component`,
        category: 'forms',
        icon: '📝',
        template: `<div class="form-field form-field-${id}">
  <label for="${id}">${label}</label>
  <input 
    type="${type}" 
    id="${id}" 
    name="${id}" 
    placeholder="${placeholder}"
    ${required ? 'required' : ''}
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
        styles: `.form-field-${id} {
  margin-bottom: 1rem;
}

.form-field-${id} label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #333;
}

.form-field-${id} .form-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-field-${id} .form-input:focus {
  outline: none;
  border-color: #007acc;
  box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.1);
}

.form-field-${id}.error .form-input {
  border-color: #dc3545;
}

.form-field-${id} .form-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}`,
        properties: [
          {
            name: 'label',
            type: 'string',
            description: 'Field label',
            default: label,
            required: true,
          },
          {
            name: 'type',
            type: 'string',
            description: 'Input type',
            default: type,
            options: ['text', 'email', 'password', 'number', 'tel', 'url'],
          },
          {
            name: 'placeholder',
            type: 'string',
            description: 'Placeholder text',
            default: placeholder,
          },
          {
            name: 'required',
            type: 'boolean',
            description: 'Whether field is required',
            default: required,
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
            name: 'Basic Usage',
            description: `Basic ${name} field`,
            code: `<div class="form-field">
  <label for="${id}">${label}</label>
  <input type="${type}" id="${id}" name="${id}" ${required ? 'required' : ''}>
</div>`,
          },
        ],
      };
    },

    /**
     * Create a modal component
     */
    createModalComponent(options: {
      id: string;
      name: string;
      title?: string;
      content?: string;
    }): ComponentDefinition {
      const { id, name, title = 'Modal Title', content = 'Modal content goes here.' } = options;

      return {
        id,
        name,
        description: `${name} modal component`,
        category: 'layout',
        icon: '🪟',
        template: `<div class="modal modal-${id}" style="display: none;">
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" _="on click hide closest .modal">&times;</button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" _="on click hide closest .modal">Cancel</button>
      <button class="btn btn-primary" _="on click trigger confirm then hide closest .modal">OK</button>
    </div>
  </div>
</div>`,
        hyperscript: `on click from .modal-backdrop hide closest .modal`,
        styles: `.modal-${id} {
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

.modal-${id} .modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
}

.modal-${id} .modal-content {
  position: relative;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 90%;
  overflow: auto;
}

.modal-${id} .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e1e5e9;
}

.modal-${id} .modal-body {
  padding: 1rem;
}

.modal-${id} .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #e1e5e9;
}

.modal-${id} .modal-close {
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
            default: title,
            required: true,
          },
          {
            name: 'content',
            type: 'string',
            description: 'Modal content',
            default: content,
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
            name: 'Basic Usage',
            description: `Basic ${name} modal`,
            code: `<div class="modal" _="on show transition opacity to 1">
  <!-- Modal content here -->
</div>`,
          },
        ],
      };
    },

    /**
     * Get server instance (for advanced usage)
     */
    getServer(): VisualBuilderServer | null {
      return server;
    },

    /**
     * Get configuration
     */
    getConfig(): Partial<BuilderConfig> {
      return config;
    },
  };
}
