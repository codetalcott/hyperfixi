import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import {
  ComponentDefinition,
  ComponentCollection,
  ComponentRegistry,
  ComponentFilter,
  ValidationResult,
} from './types';
import { validator } from './validator';

/**
 * File-based component registry implementation
 */
export class FileComponentRegistry implements ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();
  private registryPath: string;

  constructor(registryPath: string = './components') {
    this.registryPath = registryPath;
  }

  /**
   * Initialize the registry by loading existing components
   */
  async initialize(): Promise<void> {
    try {
      await fs.access(this.registryPath);
      await this.loadComponents();
    } catch (error) {
      // Registry directory doesn't exist, create it
      await fs.mkdir(this.registryPath, { recursive: true });
    }
  }

  /**
   * Register a new component
   */
  async register(component: ComponentDefinition): Promise<void> {
    // Validate component before registration
    const validation = this.validate(component);
    if (!validation.valid) {
      throw new Error(
        `Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    // Store in memory
    this.components.set(component.id, component);

    // Save to file
    await this.saveComponent(component);
  }

  /**
   * Unregister a component
   */
  async unregister(id: string): Promise<void> {
    const component = this.components.get(id);
    if (!component) {
      throw new Error(`Component with ID "${id}" not found`);
    }

    // Remove from memory
    this.components.delete(id);

    // Remove file
    const filePath = path.join(this.registryPath, `${id}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore error
    }
  }

  /**
   * Get a component by ID
   */
  async get(id: string): Promise<ComponentDefinition | null> {
    return this.components.get(id) || null;
  }

  /**
   * List components with optional filtering
   */
  async list(filter?: ComponentFilter): Promise<ComponentDefinition[]> {
    let components = Array.from(this.components.values());

    if (!filter) {
      return components;
    }

    // Apply filters
    if (filter.category) {
      components = components.filter(c => c.category === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      components = components.filter(
        c => c.tags && filter.tags!.some(tag => c.tags!.includes(tag))
      );
    }

    if (filter.author) {
      components = components.filter(c =>
        c.metadata?.author?.toLowerCase().includes(filter.author!.toLowerCase())
      );
    }

    if (filter.version) {
      components = components.filter(c => c.version === filter.version);
    }

    if (filter.keywords && filter.keywords.length > 0) {
      components = components.filter(
        c =>
          c.metadata?.keywords &&
          filter.keywords!.some(keyword =>
            c.metadata!.keywords!.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
          )
      );
    }

    if (filter.complexity) {
      components = components.filter(c => {
        const complexity = c.validation?.complexity;
        if (complexity === undefined) return false;

        const { min, max } = filter.complexity!;
        return (min === undefined || complexity >= min) && (max === undefined || complexity <= max);
      });
    }

    return components;
  }

  /**
   * Search components by query
   */
  async search(query: string): Promise<ComponentDefinition[]> {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.components.values()).filter(component => {
      // Search in name, description, tags, and keywords
      if (component.name.toLowerCase().includes(lowerQuery)) return true;
      if (component.description?.toLowerCase().includes(lowerQuery)) return true;
      if (component.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
      if (component.metadata?.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery)))
        return true;

      // Search in hyperscript content
      const scripts = Array.isArray(component.hyperscript)
        ? component.hyperscript
        : [component.hyperscript];

      if (scripts.some(script => script.toLowerCase().includes(lowerQuery))) return true;

      return false;
    });
  }

  /**
   * Validate a component
   */
  validate(component: ComponentDefinition): ValidationResult {
    return validator.validateComponent(component);
  }

  /**
   * Load a component collection from file
   */
  async loadCollection(filePath: string): Promise<ComponentCollection> {
    const content = await fs.readFile(filePath, 'utf-8');
    const extension = path.extname(filePath).toLowerCase();

    let collection: ComponentCollection;

    if (extension === '.yaml' || extension === '.yml') {
      collection = yaml.parse(content);
    } else {
      collection = JSON.parse(content);
    }

    // Validate collection
    const validation = validator.validateCollection(collection);
    if (!validation.valid) {
      throw new Error(
        `Collection validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    return collection;
  }

  /**
   * Save a component collection to file
   */
  async saveCollection(collection: ComponentCollection, filePath: string): Promise<void> {
    const extension = path.extname(filePath).toLowerCase();
    let content: string;

    if (extension === '.yaml' || extension === '.yml') {
      content = yaml.stringify(collection);
    } else {
      content = JSON.stringify(collection, null, 2);
    }

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Import components from a collection
   */
  async importCollection(collection: ComponentCollection): Promise<void> {
    for (const [_, componentDef] of Object.entries(collection.components)) {
      if (typeof componentDef === 'object') {
        await this.register(componentDef);
      }
    }
  }

  /**
   * Export components to a collection
   */
  async exportCollection(
    componentIds: string[],
    collectionInfo: Partial<ComponentCollection>
  ): Promise<ComponentCollection> {
    const components: Record<string, ComponentDefinition> = {};

    for (const id of componentIds) {
      const component = await this.get(id);
      if (component) {
        components[id] = component;
      }
    }

    const collection: ComponentCollection = {
      name: collectionInfo.name || 'Exported Collection',
      version: collectionInfo.version || '1.0.0',
      components,
      ...collectionInfo,
    };

    // Generate manifest statistics
    const stats = this.generateCollectionStats(Object.values(components));
    collection.manifest = {
      ...collection.manifest,
      statistics: stats,
      build: {
        timestamp: new Date().toISOString(),
        version: collection.version,
        environment: 'export',
      },
    };

    return collection;
  }

  /**
   * Load all components from registry directory
   */
  private async loadComponents(): Promise<void> {
    try {
      const files = await fs.readdir(this.registryPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(this.registryPath, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const component: ComponentDefinition = JSON.parse(content);

            // Validate before loading
            const validation = this.validate(component);
            if (validation.valid) {
              this.components.set(component.id, component);
            } else {
              console.warn(`Skipping invalid component ${file}:`, validation.errors);
            }
          } catch (error) {
            console.warn(`Error loading component ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Error loading components:', error);
    }
  }

  /**
   * Save a component to file
   */
  private async saveComponent(component: ComponentDefinition): Promise<void> {
    const filePath = path.join(this.registryPath, `${component.id}.json`);
    const content = JSON.stringify(component, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Generate collection statistics
   */
  private generateCollectionStats(components: ComponentDefinition[]) {
    const stats = {
      totalComponents: components.length,
      categories: {} as Record<string, number>,
      averageComplexity: 0,
    };

    let totalComplexity = 0;
    let complexityCount = 0;

    for (const component of components) {
      // Count categories
      const category = component.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;

      // Calculate average complexity
      if (component.validation?.complexity) {
        totalComplexity += component.validation.complexity;
        complexityCount++;
      }
    }

    if (complexityCount > 0) {
      stats.averageComplexity = Math.round((totalComplexity / complexityCount) * 10) / 10;
    }

    return stats;
  }
}

/**
 * In-memory component registry for testing and development
 */
export class MemoryComponentRegistry implements ComponentRegistry {
  private components = new Map<string, ComponentDefinition>();

  async register(component: ComponentDefinition): Promise<void> {
    const validation = this.validate(component);
    if (!validation.valid) {
      throw new Error(
        `Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    this.components.set(component.id, component);
  }

  async unregister(id: string): Promise<void> {
    if (!this.components.has(id)) {
      throw new Error(`Component with ID "${id}" not found`);
    }
    this.components.delete(id);
  }

  async get(id: string): Promise<ComponentDefinition | null> {
    return this.components.get(id) || null;
  }

  async list(filter?: ComponentFilter): Promise<ComponentDefinition[]> {
    let components = Array.from(this.components.values());

    if (!filter) {
      return components;
    }

    // Apply filters (matching FileComponentRegistry)
    if (filter.category) {
      components = components.filter(c => c.category === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      components = components.filter(
        c => c.tags && filter.tags!.some(tag => c.tags!.includes(tag))
      );
    }

    if (filter.author) {
      components = components.filter(c =>
        c.metadata?.author?.toLowerCase().includes(filter.author!.toLowerCase())
      );
    }

    if (filter.version) {
      components = components.filter(c => c.version === filter.version);
    }

    if (filter.keywords && filter.keywords.length > 0) {
      components = components.filter(
        c =>
          c.metadata?.keywords &&
          filter.keywords!.some(keyword =>
            c.metadata!.keywords!.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
          )
      );
    }

    if (filter.complexity) {
      components = components.filter(c => {
        const complexity = c.validation?.complexity;
        if (complexity === undefined) return false;

        const { min, max } = filter.complexity!;
        return (min === undefined || complexity >= min) && (max === undefined || complexity <= max);
      });
    }

    return components;
  }

  async search(query: string): Promise<ComponentDefinition[]> {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.components.values()).filter(component => {
      // Search in name, description, tags, and keywords
      if (component.name.toLowerCase().includes(lowerQuery)) return true;
      if (component.description?.toLowerCase().includes(lowerQuery)) return true;
      if (component.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
      if (component.metadata?.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery)))
        return true;

      // Search in hyperscript content
      const scripts = Array.isArray(component.hyperscript)
        ? component.hyperscript
        : [component.hyperscript];

      if (scripts.some(script => script.toLowerCase().includes(lowerQuery))) return true;

      return false;
    });
  }

  validate(component: ComponentDefinition): ValidationResult {
    return validator.validateComponent(component);
  }
}

/**
 * Registry creation options
 */
export interface RegistryOptions {
  /** Path for file-based registry */
  path?: string;
  /** Database path for SQLite registry */
  dbPath?: string;
}

/**
 * Create a registry instance
 */
export function createRegistry(
  type: 'file' | 'memory' | 'sqlite' = 'file',
  options?: string | RegistryOptions
): ComponentRegistry {
  // Handle legacy string path argument
  const opts: RegistryOptions = typeof options === 'string' ? { path: options } : options || {};

  if (type === 'memory') {
    return new MemoryComponentRegistry();
  }

  if (type === 'sqlite') {
    // Lazy import to avoid loading SQLite when not needed
    const { SqliteComponentRegistry } = require('./database/sqlite-registry');
    return new SqliteComponentRegistry({ dbPath: opts.dbPath });
  }

  return new FileComponentRegistry(opts.path);
}
