import {
  ComponentDefinition,
  ComponentCollection,
  ComponentTemplate,
  TemplateVariable,
  ComponentExample,
  ComponentDependencies,
} from './types';

/**
 * Utility functions for working with components and collections
 */

/**
 * Create a basic component definition with required fields
 */
export function createComponent(
  id: string,
  name: string,
  hyperscript: string | string[],
  version: string = '1.0.0'
): ComponentDefinition {
  return {
    id,
    name,
    version,
    hyperscript,
  };
}

/**
 * Create a component with template support
 */
export function createTemplatedComponent(
  id: string,
  name: string,
  hyperscript: string | string[],
  template: ComponentTemplate,
  version: string = '1.0.0'
): ComponentDefinition {
  return {
    id,
    name,
    version,
    hyperscript,
    template,
  };
}

/**
 * Create a basic component collection
 */
export function createCollection(
  name: string,
  components: Record<string, ComponentDefinition>,
  version: string = '1.0.0'
): ComponentCollection {
  return {
    name,
    version,
    components,
  };
}

/**
 * Merge component definitions (useful for extending components)
 */
export function mergeComponents(
  base: ComponentDefinition,
  override: Partial<ComponentDefinition>
): ComponentDefinition {
  const merged = { ...base, ...override };

  // Special handling for arrays and objects
  if (base.tags && override.tags) {
    merged.tags = [...new Set([...base.tags, ...override.tags])];
  }

  if (base.template && override.template) {
    merged.template = {
      ...base.template,
      ...override.template,
      variables: {
        ...(base.template.variables ?? {}),
        ...(override.template?.variables ?? {}),
      },
      slots: {
        ...(base.template.slots ?? {}),
        ...(override.template?.slots ?? {}),
      },
    };
  }

  if (base.dependencies && override.dependencies) {
    merged.dependencies = {
      components: [
        ...(base.dependencies.components ?? []),
        ...(override.dependencies?.components ?? []),
      ],
      css: [...(base.dependencies.css ?? []), ...(override.dependencies?.css ?? [])],
      javascript: [
        ...(base.dependencies.javascript ?? []),
        ...(override.dependencies?.javascript ?? []),
      ],
    };
  }

  if (base.metadata && override.metadata) {
    merged.metadata = {
      ...base.metadata,
      ...override.metadata,
      keywords: [...(base.metadata.keywords ?? []), ...(override.metadata?.keywords ?? [])],
      examples: [...(base.metadata.examples ?? []), ...(override.metadata?.examples ?? [])],
    };
  }

  return merged;
}

/**
 * Extract template variables from hyperscript and HTML
 */
export function extractTemplateVariables(hyperscript: string | string[], html?: string): string[] {
  const templateVarPattern = /\{\{([^}]+)\}\}/g;
  const variables = new Set<string>();

  // Extract from hyperscript
  const scripts = Array.isArray(hyperscript) ? hyperscript : [hyperscript];
  for (const script of scripts) {
    let match;
    while ((match = templateVarPattern.exec(script)) !== null) {
      if (match[1]) {
        variables.add(match[1].trim());
      }
    }
  }

  // Extract from HTML template
  if (html) {
    let match;
    while ((match = templateVarPattern.exec(html)) !== null) {
      if (match[1]) {
        variables.add(match[1].trim());
      }
    }
  }

  return Array.from(variables).sort();
}

/**
 * Generate template variable definitions from detected variables
 */
export function generateTemplateVariableDefinitions(
  variables: string[]
): Record<string, TemplateVariable> {
  const definitions: Record<string, TemplateVariable> = {};

  for (const variable of variables) {
    // Try to infer type from variable name
    let type: TemplateVariable['type'] = 'string';

    if (variable.toLowerCase().includes('list') || variable.toLowerCase().includes('items')) {
      type = 'array';
    } else if (
      variable.toLowerCase().includes('count') ||
      variable.toLowerCase().includes('index') ||
      variable.toLowerCase().includes('id')
    ) {
      type = 'number';
    } else if (
      variable.toLowerCase().includes('is') ||
      variable.toLowerCase().includes('has') ||
      variable.toLowerCase().includes('enabled')
    ) {
      type = 'boolean';
    }

    definitions[variable] = {
      type,
      description: `Template variable: ${variable}`,
      required: false,
    };
  }

  return definitions;
}

/**
 * Analyze component complexity
 */
export function analyzeComplexity(component: ComponentDefinition): number {
  let complexity = 1;

  const scripts = Array.isArray(component.hyperscript)
    ? component.hyperscript
    : [component.hyperscript];

  for (const script of scripts) {
    // Count events (each event handler adds complexity)
    const eventMatches = script.match(/\bon\s+\w+/g) || [];
    complexity += eventMatches.length;

    // Count commands (each command adds complexity)
    const commandMatches =
      script.match(
        /\b(add|remove|toggle|put|fetch|post|get|delete|trigger|wait|halt|log|call|set|take|make|hide|show|fadeIn|fadeOut|slideUp|slideDown)\b/g
      ) || [];
    complexity += commandMatches.length * 0.5;

    // Count selectors (complex selectors add complexity)
    const selectorMatches = script.match(/[.#][a-zA-Z][a-zA-Z0-9_-]*/g) || [];
    complexity += selectorMatches.length * 0.3;

    // Count template variables
    const templateVars = script.match(/\{\{[^}]+\}\}/g) || [];
    complexity += templateVars.length * 0.2;

    // Count conditions
    const conditionMatches = script.match(/\b(if|unless|when|while|until)\b/g) || [];
    complexity += conditionMatches.length * 0.5;
  }

  // Add complexity for dependencies
  if (component.dependencies?.components) {
    complexity += component.dependencies.components.length * 0.3;
  }

  // Add complexity for template variables
  if (component.template?.variables) {
    complexity += Object.keys(component.template.variables).length * 0.1;
  }

  return Math.min(Math.max(Math.round(complexity), 1), 10);
}

/**
 * Generate component metadata automatically
 */
export function generateMetadata(component: ComponentDefinition): ComponentDefinition {
  const updated = { ...component };

  // Generate metadata if not present
  if (!updated.metadata) {
    updated.metadata = {};
  }

  // Extract and set keywords from name and description
  if (!updated.metadata.keywords) {
    const keywords = new Set<string>();

    // Add words from name
    const nameWords = updated.name.toLowerCase().split(/[\s-_]+/);
    nameWords.forEach(word => {
      if (word.length > 2) keywords.add(word);
    });

    // Add words from description
    if (updated.description) {
      const descWords = updated.description.toLowerCase().split(/[\s-_.,!?]+/);
      descWords.forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    }

    // Add category as keyword
    if (updated.category) {
      keywords.add(updated.category);
    }

    updated.metadata.keywords = Array.from(keywords).slice(0, 10);
  }

  // Set timestamps
  const now = new Date().toISOString();
  if (!updated.metadata.created) {
    updated.metadata.created = now;
  }
  updated.metadata.updated = now;

  // Generate validation metadata if not present
  if (!updated.validation) {
    updated.validation = {};
  }

  if (!updated.validation.complexity) {
    updated.validation.complexity = analyzeComplexity(updated);
  }

  return updated;
}

/**
 * Create example usage for a component
 */
export function createExample(
  name: string,
  html: string,
  variables?: Record<string, any>,
  description?: string
): ComponentExample {
  return {
    name,
    html,
    ...(variables && { variables }),
    ...(description && { description }),
  };
}

/**
 * Resolve component dependencies in a collection
 */
export function resolveDependencies(collection: ComponentCollection): Map<string, string[]> {
  const dependencyGraph = new Map<string, string[]>();

  for (const [componentId, componentDef] of Object.entries(collection.components)) {
    if (typeof componentDef === 'object') {
      const deps = componentDef.dependencies?.components || [];
      dependencyGraph.set(componentDef.id, deps);
    }
  }

  return dependencyGraph;
}

/**
 * Check for circular dependencies in a collection
 */
export function checkCircularDependencies(collection: ComponentCollection): string[] {
  const dependencyGraph = resolveDependencies(collection);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];

  function hasCycle(componentId: string, path: string[]): boolean {
    if (recursionStack.has(componentId)) {
      cycles.push([...path, componentId].join(' -> '));
      return true;
    }

    if (visited.has(componentId)) {
      return false;
    }

    visited.add(componentId);
    recursionStack.add(componentId);

    const dependencies = dependencyGraph.get(componentId) || [];
    for (const depId of dependencies) {
      if (hasCycle(depId, [...path, componentId])) {
        return true;
      }
    }

    recursionStack.delete(componentId);
    return false;
  }

  for (const componentId of dependencyGraph.keys()) {
    if (!visited.has(componentId)) {
      hasCycle(componentId, []);
    }
  }

  return cycles;
}

/**
 * Get topological order of components (for dependency resolution)
 */
export function getTopologicalOrder(collection: ComponentCollection): string[] {
  const dependencyGraph = resolveDependencies(collection);
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(componentId: string): void {
    if (visited.has(componentId)) {
      return;
    }

    visited.add(componentId);

    const dependencies = dependencyGraph.get(componentId) || [];
    for (const depId of dependencies) {
      visit(depId);
    }

    result.push(componentId);
  }

  for (const componentId of dependencyGraph.keys()) {
    visit(componentId);
  }

  return result;
}

/**
 * Convert component to different formats
 */
export function convertComponent(component: ComponentDefinition, format: 'json' | 'yaml'): string {
  if (format === 'yaml') {
    const yaml = require('yaml');
    return yaml.stringify(component);
  }
  return JSON.stringify(component, null, 2);
}

/**
 * Parse component from different formats
 */
export function parseComponent(content: string, format: 'json' | 'yaml'): ComponentDefinition {
  if (format === 'yaml') {
    const yaml = require('yaml');
    return yaml.parse(content);
  }
  return JSON.parse(content);
}
