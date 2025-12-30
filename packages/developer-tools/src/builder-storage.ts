/**
 * Builder Storage - Persistence layer for Visual Builder projects
 *
 * Provides save/load functionality for builder projects, including
 * component definitions, settings, and export capabilities.
 */

import fs from 'fs-extra';
import path from 'path';
import type { ComponentDefinition, BuilderConfig } from './types';

/**
 * Builder project structure
 */
export interface BuilderProject {
  id: string;
  name: string;
  description: string;
  version: string;
  components: ComponentDefinition[];
  settings: BuilderProjectSettings;
  created: number;
  modified: number;
}

/**
 * Project-specific settings
 */
export interface BuilderProjectSettings {
  theme?: string;
  defaultCategory?: string;
  exportFormat?: 'html' | 'json' | 'javascript';
  autoSave?: boolean;
  autoSaveInterval?: number;
}

/**
 * Project summary for listing
 */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  componentCount: number;
  created: number;
  modified: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  baseDir?: string;
  autoCreate?: boolean;
}

/**
 * Builder Storage class for project persistence
 */
export class BuilderStorage {
  private projectsDir: string;
  private autoCreate: boolean;

  constructor(config: StorageConfig = {}) {
    this.projectsDir = config.baseDir || path.join(process.cwd(), '.hyperfixi', 'builder');
    this.autoCreate = config.autoCreate !== false;
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDirectory(): Promise<void> {
    if (this.autoCreate) {
      await fs.ensureDir(this.projectsDir);
    }
  }

  /**
   * Get path to project file
   */
  private getProjectPath(id: string): string {
    return path.join(this.projectsDir, `${id}.json`);
  }

  /**
   * Generate unique project ID
   */
  private generateId(): string {
    return `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Save a project to disk
   */
  async saveProject(project: BuilderProject): Promise<BuilderProject> {
    await this.ensureDirectory();

    // Ensure project has ID
    if (!project.id) {
      project.id = this.generateId();
      project.created = Date.now();
    }

    // Update modified timestamp
    project.modified = Date.now();

    const projectPath = this.getProjectPath(project.id);
    await fs.writeJson(projectPath, project, { spaces: 2 });

    return project;
  }

  /**
   * Load a project from disk
   */
  async loadProject(id: string): Promise<BuilderProject> {
    const projectPath = this.getProjectPath(id);

    if (!(await fs.pathExists(projectPath))) {
      throw new Error(`Project not found: ${id}`);
    }

    const project = await fs.readJson(projectPath);
    return project as BuilderProject;
  }

  /**
   * List all saved projects
   */
  async listProjects(): Promise<ProjectSummary[]> {
    await this.ensureDirectory();

    const files = await fs.readdir(this.projectsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const summaries: ProjectSummary[] = [];

    for (const file of jsonFiles) {
      try {
        const projectPath = path.join(this.projectsDir, file);
        const project = await fs.readJson(projectPath) as BuilderProject;

        summaries.push({
          id: project.id,
          name: project.name,
          description: project.description,
          componentCount: project.components?.length || 0,
          created: project.created,
          modified: project.modified,
        });
      } catch {
        // Skip invalid files
      }
    }

    // Sort by modified date, newest first
    return summaries.sort((a, b) => b.modified - a.modified);
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    const projectPath = this.getProjectPath(id);

    if (!(await fs.pathExists(projectPath))) {
      throw new Error(`Project not found: ${id}`);
    }

    await fs.remove(projectPath);
  }

  /**
   * Check if a project exists
   */
  async projectExists(id: string): Promise<boolean> {
    const projectPath = this.getProjectPath(id);
    return fs.pathExists(projectPath);
  }

  /**
   * Export project to various formats
   */
  async exportProject(
    id: string,
    format: 'html' | 'json' | 'zip'
  ): Promise<Buffer> {
    const project = await this.loadProject(id);

    switch (format) {
      case 'html':
        return this.exportToHtml(project);

      case 'json':
        return Buffer.from(JSON.stringify(project, null, 2));

      case 'zip':
        return this.exportToZip(project);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export project as HTML bundle
   */
  private async exportToHtml(project: BuilderProject): Promise<Buffer> {
    const components = project.components || [];

    // Generate component HTML
    const componentHtml = components
      .map(comp => {
        const hyperscriptAttr = comp.hyperscript ? ` _="${comp.hyperscript}"` : '';
        return `<!-- Component: ${comp.name} -->
<template id="${comp.id}">
  ${comp.template}
</template>`;
      })
      .join('\n\n');

    // Generate styles
    const styles = components
      .filter(c => c.styles)
      .map(c => `/* ${c.name} */\n${c.styles}`)
      .join('\n\n');

    // Generate full HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name}</title>
  <script src="https://unpkg.com/@hyperfixi/core@latest/dist/hyperfixi-browser.js"></script>
  <style>
${styles}
  </style>
</head>
<body>
  <!-- HyperFixi Builder Export: ${project.name} -->
  <!-- Generated: ${new Date().toISOString()} -->

${componentHtml}

  <script>
    // Initialize HyperFixi
    if (typeof hyperfixi !== 'undefined') {
      hyperfixi.processNode(document.body);
    }
  </script>
</body>
</html>`;

    return Buffer.from(html);
  }

  /**
   * Export project as ZIP archive
   */
  private async exportToZip(project: BuilderProject): Promise<Buffer> {
    // For now, return JSON wrapped in a simple format
    // TODO: Implement actual ZIP creation with archiver package
    const content = {
      'project.json': project,
      'components/': project.components.map(c => ({
        [`${c.id}.json`]: c,
      })),
    };

    return Buffer.from(JSON.stringify(content, null, 2));
  }

  /**
   * Import project from file
   */
  async importProject(filePath: string): Promise<BuilderProject> {
    if (!(await fs.pathExists(filePath))) {
      throw new Error(`Import file not found: ${filePath}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    let project: BuilderProject;

    try {
      project = JSON.parse(content);
    } catch {
      throw new Error('Invalid project file format');
    }

    // Validate required fields
    if (!project.name) {
      throw new Error('Project must have a name');
    }

    // Generate new ID for imported project
    project.id = this.generateId();
    project.created = Date.now();
    project.modified = Date.now();

    // Save imported project
    await this.saveProject(project);

    return project;
  }

  /**
   * Create auto-save function with debouncing
   */
  createAutoSave(
    project: BuilderProject,
    interval: number = 30000
  ): { save: () => Promise<void>; cancel: () => void } {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pendingSave = false;

    const save = async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      pendingSave = true;

      timeoutId = setTimeout(async () => {
        if (pendingSave) {
          await this.saveProject(project);
          pendingSave = false;
        }
      }, interval);
    };

    const cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      pendingSave = false;
    };

    return { save, cancel };
  }

  /**
   * Duplicate a project
   */
  async duplicateProject(id: string, newName?: string): Promise<BuilderProject> {
    const original = await this.loadProject(id);

    const duplicate: BuilderProject = {
      ...original,
      id: this.generateId(),
      name: newName || `${original.name} (Copy)`,
      created: Date.now(),
      modified: Date.now(),
    };

    await this.saveProject(duplicate);
    return duplicate;
  }

  /**
   * Get storage directory path
   */
  getStorageDirectory(): string {
    return this.projectsDir;
  }
}

/**
 * Create a new builder project
 */
export function createProject(
  name: string,
  options: Partial<BuilderProject> = {}
): BuilderProject {
  return {
    id: '',
    name,
    description: options.description || '',
    version: options.version || '1.0.0',
    components: options.components || [],
    settings: options.settings || {},
    created: Date.now(),
    modified: Date.now(),
  };
}

/**
 * Default export
 */
export default BuilderStorage;
