/**
 * SQLite-backed component registry implementation
 */
import Database from 'better-sqlite3';
import {
  ComponentDefinition,
  ComponentCollection,
  ComponentRegistry,
  ComponentFilter,
  ValidationResult,
} from '../types';
import { validator } from '../validator';
import { getDatabase, closeDatabase, resetConnection } from './connection';
import { initializeSchema, isSchemaInitialized, dropSchema } from './schema';

export interface SqliteRegistryOptions {
  dbPath?: string;
}

/**
 * SQLite-backed component registry
 * Provides persistent storage with full-text search capabilities
 */
export class SqliteComponentRegistry implements ComponentRegistry {
  private db: Database.Database;
  private dbPath: string | undefined;

  constructor(options: SqliteRegistryOptions = {}) {
    this.dbPath = options.dbPath;
    this.db = getDatabase(options.dbPath ? { dbPath: options.dbPath } : {});
  }

  /**
   * Initialize the registry (creates schema if needed)
   */
  async initialize(): Promise<void> {
    if (!isSchemaInitialized(this.db)) {
      initializeSchema(this.db);
    }
  }

  /**
   * Register a component
   */
  async register(component: ComponentDefinition): Promise<void> {
    const validation = this.validate(component);
    if (!validation.valid) {
      throw new Error(`Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO components (
        id, name, description, version, category, tags,
        hyperscript, template, dependencies, configuration,
        metadata, validation, testing, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, datetime('now')
      )
    `);

    stmt.run(
      component.id,
      component.name,
      component.description || null,
      component.version,
      component.category || null,
      component.tags ? JSON.stringify(component.tags) : null,
      JSON.stringify(component.hyperscript),
      component.template ? JSON.stringify(component.template) : null,
      component.dependencies ? JSON.stringify(component.dependencies) : null,
      component.configuration ? JSON.stringify(component.configuration) : null,
      component.metadata ? JSON.stringify(component.metadata) : null,
      component.validation ? JSON.stringify(component.validation) : null,
      component.testing ? JSON.stringify(component.testing) : null,
    );
  }

  /**
   * Unregister a component
   */
  async unregister(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Component with ID "${id}" not found`);
    }

    const stmt = this.db.prepare('DELETE FROM components WHERE id = ?');
    stmt.run(id);
  }

  /**
   * Get a component by ID
   */
  async get(id: string): Promise<ComponentDefinition | null> {
    const stmt = this.db.prepare('SELECT * FROM components WHERE id = ?');
    const row = stmt.get(id) as ComponentRow | undefined;

    if (!row) {
      return null;
    }

    return this.rowToComponent(row);
  }

  /**
   * List components with optional filtering
   */
  async list(filter?: ComponentFilter): Promise<ComponentDefinition[]> {
    if (!filter) {
      const stmt = this.db.prepare('SELECT * FROM components ORDER BY created_at DESC');
      const rows = stmt.all() as ComponentRow[];
      return rows.map(row => this.rowToComponent(row));
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filter.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }

    if (filter.version) {
      conditions.push('version = ?');
      params.push(filter.version);
    }

    if (filter.tags && filter.tags.length > 0) {
      // Match any tag using JSON functions
      const tagConditions = filter.tags.map(() =>
        `EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?)`
      );
      conditions.push(`(${tagConditions.join(' OR ')})`);
      params.push(...filter.tags);
    }

    if (filter.author) {
      conditions.push(`json_extract(metadata, '$.author') LIKE ?`);
      params.push(`%${filter.author}%`);
    }

    if (filter.keywords && filter.keywords.length > 0) {
      const keywordConditions = filter.keywords.map(() =>
        `EXISTS (SELECT 1 FROM json_each(json_extract(metadata, '$.keywords')) WHERE LOWER(value) LIKE ?)`
      );
      conditions.push(`(${keywordConditions.join(' OR ')})`);
      params.push(...filter.keywords.map(k => `%${k.toLowerCase()}%`));
    }

    if (filter.complexity) {
      if (filter.complexity.min !== undefined) {
        conditions.push(`json_extract(validation, '$.complexity') >= ?`);
        params.push(filter.complexity.min);
      }
      if (filter.complexity.max !== undefined) {
        conditions.push(`json_extract(validation, '$.complexity') <= ?`);
        params.push(filter.complexity.max);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM components ${whereClause} ORDER BY created_at DESC`;

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as ComponentRow[];

    return rows.map(row => this.rowToComponent(row));
  }

  /**
   * Search components using full-text search
   */
  async search(query: string): Promise<ComponentDefinition[]> {
    // Use FTS5 for efficient full-text search
    const stmt = this.db.prepare(`
      SELECT c.*
      FROM components c
      JOIN components_fts fts ON c.rowid = fts.rowid
      WHERE components_fts MATCH ?
      ORDER BY rank
    `);

    try {
      // FTS5 MATCH syntax - escape special characters
      const escapedQuery = query.replace(/['"\\]/g, '');
      const ftsQuery = `"${escapedQuery}"*`;
      const rows = stmt.all(ftsQuery) as ComponentRow[];
      return rows.map(row => this.rowToComponent(row));
    } catch {
      // Fallback to LIKE search if FTS fails
      return this.searchFallback(query);
    }
  }

  /**
   * Fallback search using LIKE
   */
  private searchFallback(query: string): ComponentDefinition[] {
    const lowerQuery = `%${query.toLowerCase()}%`;
    const stmt = this.db.prepare(`
      SELECT * FROM components
      WHERE LOWER(name) LIKE ?
         OR LOWER(description) LIKE ?
         OR LOWER(tags) LIKE ?
         OR LOWER(hyperscript) LIKE ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(lowerQuery, lowerQuery, lowerQuery, lowerQuery) as ComponentRow[];
    return rows.map(row => this.rowToComponent(row));
  }

  /**
   * Validate a component
   */
  validate(component: ComponentDefinition): ValidationResult {
    return validator.validateComponent(component);
  }

  /**
   * Import components from a collection
   */
  async importCollection(collection: ComponentCollection): Promise<void> {
    const transaction = this.db.transaction(() => {
      for (const [_, componentDef] of Object.entries(collection.components)) {
        if (typeof componentDef === 'object') {
          // Synchronously register within transaction
          const validation = this.validate(componentDef);
          if (!validation.valid) {
            throw new Error(`Component validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
          }

          const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO components (
              id, name, description, version, category, tags,
              hyperscript, template, dependencies, configuration,
              metadata, validation, testing, updated_at
            ) VALUES (
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, datetime('now')
            )
          `);

          stmt.run(
            componentDef.id,
            componentDef.name,
            componentDef.description || null,
            componentDef.version,
            componentDef.category || null,
            componentDef.tags ? JSON.stringify(componentDef.tags) : null,
            JSON.stringify(componentDef.hyperscript),
            componentDef.template ? JSON.stringify(componentDef.template) : null,
            componentDef.dependencies ? JSON.stringify(componentDef.dependencies) : null,
            componentDef.configuration ? JSON.stringify(componentDef.configuration) : null,
            componentDef.metadata ? JSON.stringify(componentDef.metadata) : null,
            componentDef.validation ? JSON.stringify(componentDef.validation) : null,
            componentDef.testing ? JSON.stringify(componentDef.testing) : null,
          );
        }
      }
    });

    transaction();
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
   * Count total components
   */
  async count(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM components');
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Clear all components (for testing)
   */
  async clear(): Promise<void> {
    this.db.exec('DELETE FROM components');
  }

  /**
   * Close the database connection
   */
  close(): void {
    closeDatabase();
  }

  /**
   * Reset the connection (for testing)
   */
  reset(): void {
    resetConnection();
  }

  /**
   * Drop and recreate schema (for testing)
   */
  resetSchema(): void {
    dropSchema(this.db);
    initializeSchema(this.db);
  }

  /**
   * Convert a database row to a ComponentDefinition
   */
  private rowToComponent(row: ComponentRow): ComponentDefinition {
    const component: ComponentDefinition = {
      id: row.id,
      name: row.name,
      version: row.version,
      hyperscript: JSON.parse(row.hyperscript),
    };

    if (row.description) {
      component.description = row.description;
    }
    if (row.category) {
      // Type assertion with explicit cast to satisfy exactOptionalPropertyTypes
      (component as any).category = row.category;
    }
    if (row.tags) {
      component.tags = JSON.parse(row.tags);
    }
    if (row.template) {
      component.template = JSON.parse(row.template);
    }
    if (row.dependencies) {
      component.dependencies = JSON.parse(row.dependencies);
    }
    if (row.configuration) {
      component.configuration = JSON.parse(row.configuration);
    }
    if (row.metadata) {
      component.metadata = JSON.parse(row.metadata);
    }
    if (row.validation) {
      component.validation = JSON.parse(row.validation);
    }
    if (row.testing) {
      component.testing = JSON.parse(row.testing);
    }

    return component;
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
      const category = component.category || 'uncategorized';
      stats.categories[category] = (stats.categories[category] || 0) + 1;

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
 * Database row type
 */
interface ComponentRow {
  id: string;
  name: string;
  description: string | null;
  version: string;
  category: string | null;
  tags: string | null;
  hyperscript: string;
  template: string | null;
  dependencies: string | null;
  configuration: string | null;
  metadata: string | null;
  validation: string | null;
  testing: string | null;
  created_at: string;
  updated_at: string;
}
