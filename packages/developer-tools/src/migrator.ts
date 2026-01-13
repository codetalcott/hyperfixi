/**
 * HyperFixi Migrator - Version migration system
 *
 * Provides tools to migrate HyperFixi projects between versions,
 * including syntax transformations, deprecation handling, and backups.
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import semver from 'semver';

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Project root directory */
  projectPath?: string;
  /** Create backup before migration */
  backup?: boolean;
  /** Dry run - report changes without applying */
  dryRun?: boolean;
  /** File patterns to include */
  include?: string[];
  /** File patterns to exclude */
  exclude?: string[];
  /** Verbose output */
  verbose?: boolean;
}

/**
 * Migration rule
 */
export interface MigrationRule {
  /** Rule identifier */
  id: string;
  /** Rule description */
  description: string;
  /** Pattern to match (regex) */
  pattern: RegExp;
  /** Replacement string or function */
  replacement: string | ((match: string, ...args: string[]) => string);
  /** Deprecation warning message */
  deprecationMessage?: string;
}

/**
 * File transformation result
 */
export interface FileTransformResult {
  file: string;
  changes: TransformChange[];
  success: boolean;
  error?: string;
}

/**
 * Individual transformation change
 */
export interface TransformChange {
  rule: string;
  line: number;
  before: string;
  after: string;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  filesProcessed: number;
  filesChanged: number;
  totalChanges: number;
  backupPath?: string;
  results: FileTransformResult[];
  warnings: string[];
  errors: string[];
}

/**
 * Migration rules by version transition
 */
const MIGRATION_RULES: Record<string, MigrationRule[]> = {
  // Example: 0.1.x to 0.2.x migrations
  '0.1->0.2': [
    {
      id: 'deprecated-halt',
      description: 'Replace deprecated "halt the event" with "halt"',
      pattern: /halt\s+the\s+event/gi,
      replacement: 'halt',
      deprecationMessage: '"halt the event" is deprecated, use "halt" instead',
    },
    {
      id: 'deprecated-take',
      description: 'Replace deprecated "take .class from" with "remove .class from"',
      pattern: /take\s+(\.[a-zA-Z0-9_-]+)\s+from/gi,
      replacement: 'remove $1 from',
      deprecationMessage: '"take .class from" is deprecated, use "remove .class from" instead',
    },
  ],

  // 0.2.x to 0.3.x migrations
  '0.2->0.3': [
    {
      id: 'attribute-syntax',
      description: 'Update attribute syntax from data-script to _',
      pattern: /data-script="/gi,
      replacement: '_="',
    },
  ],
};

/**
 * HyperFixi Migrator class
 */
export class HyperFixiMigrator {
  private config: Required<MigrationConfig>;

  constructor(config: MigrationConfig = {}) {
    this.config = {
      projectPath: config.projectPath || process.cwd(),
      backup: config.backup !== false,
      dryRun: config.dryRun || false,
      include: config.include || ['**/*.html', '**/*.htm', '**/*.js', '**/*.ts'],
      exclude: config.exclude || ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      verbose: config.verbose || false,
    };
  }

  /**
   * Migrate project from one version to another
   */
  async migrate(from: string, to: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion: from,
      toVersion: to,
      filesProcessed: 0,
      filesChanged: 0,
      totalChanges: 0,
      results: [],
      warnings: [],
      errors: [],
    };

    try {
      // Validate versions
      if (!this.isValidVersion(from) || !this.isValidVersion(to)) {
        result.errors.push('Invalid version format. Use semver (e.g., 0.1.0, 0.2.0)');
        return result;
      }

      // Get migration rules for version range
      const rules = this.getRulesForVersionRange(from, to);
      if (rules.length === 0) {
        result.warnings.push(`No migration rules found for ${from} -> ${to}`);
        result.success = true;
        return result;
      }

      // Create backup if enabled
      if (this.config.backup && !this.config.dryRun) {
        result.backupPath = await this.createBackup();
      }

      // Find files to process
      const files = await this.findHyperscriptFiles();
      result.filesProcessed = files.length;

      // Process each file
      for (const file of files) {
        const fileResult = await this.transformFile(file, rules);
        result.results.push(fileResult);

        if (fileResult.changes.length > 0) {
          result.filesChanged++;
          result.totalChanges += fileResult.changes.length;
        }

        if (fileResult.error) {
          result.errors.push(`${file}: ${fileResult.error}`);
        }
      }

      // Collect deprecation warnings
      for (const rule of rules) {
        if (rule.deprecationMessage) {
          const affectedFiles = result.results.filter(r => r.changes.some(c => c.rule === rule.id));
          if (affectedFiles.length > 0) {
            result.warnings.push(
              `${rule.deprecationMessage} (${affectedFiles.length} file(s) affected)`
            );
          }
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Validate semver version
   */
  private isValidVersion(version: string): boolean {
    return semver.valid(version) !== null || /^\d+\.\d+$/.test(version);
  }

  /**
   * Get migration rules for a version range
   */
  private getRulesForVersionRange(from: string, to: string): MigrationRule[] {
    const rules: MigrationRule[] = [];

    // Parse major.minor versions
    const fromMajorMinor = this.getMajorMinor(from);
    const toMajorMinor = this.getMajorMinor(to);

    // Find all applicable rule sets
    for (const [transition, transitionRules] of Object.entries(MIGRATION_RULES)) {
      const [transFrom, transTo] = transition.split('->');

      // Check if this transition is in our range
      if (this.isInRange(transFrom, transTo, fromMajorMinor, toMajorMinor)) {
        rules.push(...transitionRules);
      }
    }

    return rules;
  }

  /**
   * Extract major.minor from version
   */
  private getMajorMinor(version: string): string {
    const parsed = semver.parse(version);
    if (parsed) {
      return `${parsed.major}.${parsed.minor}`;
    }
    // Handle simple major.minor format
    const match = version.match(/^(\d+)\.(\d+)/);
    return match ? `${match[1]}.${match[2]}` : '0.0';
  }

  /**
   * Check if a transition is within the migration range
   */
  private isInRange(
    transFrom: string,
    transTo: string,
    rangeFrom: string,
    rangeTo: string
  ): boolean {
    const transFromNum = this.versionToNumber(transFrom);
    const transToNum = this.versionToNumber(transTo);
    const rangeFromNum = this.versionToNumber(rangeFrom);
    const rangeToNum = this.versionToNumber(rangeTo);

    return transFromNum >= rangeFromNum && transToNum <= rangeToNum;
  }

  /**
   * Convert version to comparable number
   */
  private versionToNumber(version: string): number {
    const parts = version.split('.').map(Number);
    return parts[0] * 1000 + (parts[1] || 0);
  }

  /**
   * Find all hyperscript files in project
   */
  async findHyperscriptFiles(): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of this.config.include) {
      const matches = await glob(pattern, {
        cwd: this.config.projectPath,
        ignore: this.config.exclude,
        absolute: true,
      });
      files.push(...matches);
    }

    // Filter to only files containing hyperscript
    const hyperscriptFiles: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (this.containsHyperscript(content)) {
          hyperscriptFiles.push(file);
        }
      } catch {
        // Skip unreadable files
      }
    }

    return hyperscriptFiles;
  }

  /**
   * Check if content contains hyperscript
   */
  private containsHyperscript(content: string): boolean {
    return (
      content.includes('_="') ||
      content.includes("_='") ||
      content.includes('data-script="') ||
      content.includes("data-script='") ||
      content.includes('hyperscript') ||
      // Common hyperscript patterns
      /\bon\s+(click|load|change|input|submit|keydown|keyup)/.test(content)
    );
  }

  /**
   * Transform a single file
   */
  async transformFile(filePath: string, rules: MigrationRule[]): Promise<FileTransformResult> {
    const result: FileTransformResult = {
      file: filePath,
      changes: [],
      success: true,
    };

    try {
      let content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      let modified = false;

      for (const rule of rules) {
        // Process line by line for better change tracking
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (rule.pattern.test(line)) {
            const newLine = line.replace(rule.pattern, rule.replacement as string);
            if (newLine !== line) {
              result.changes.push({
                rule: rule.id,
                line: i + 1,
                before: line.trim(),
                after: newLine.trim(),
              });
              lines[i] = newLine;
              modified = true;
            }
          }
          // Reset regex lastIndex for global patterns
          rule.pattern.lastIndex = 0;
        }
      }

      // Write changes if not dry run
      if (modified && !this.config.dryRun) {
        await fs.writeFile(filePath, lines.join('\n'));
      }
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }

  /**
   * Create backup of project files
   */
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.config.projectPath, `.hyperfixi-backup-${timestamp}`);

    await fs.ensureDir(backupDir);

    // Find and copy all relevant files
    const files = await this.findHyperscriptFiles();

    for (const file of files) {
      const relativePath = path.relative(this.config.projectPath, file);
      const backupPath = path.join(backupDir, relativePath);

      await fs.ensureDir(path.dirname(backupPath));
      await fs.copy(file, backupPath);
    }

    return backupDir;
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!(await fs.pathExists(backupPath))) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    // Find all files in backup
    const backupFiles = await glob('**/*', {
      cwd: backupPath,
      nodir: true,
      absolute: true,
    });

    for (const backupFile of backupFiles) {
      const relativePath = path.relative(backupPath, backupFile);
      const targetPath = path.join(this.config.projectPath, relativePath);

      await fs.copy(backupFile, targetPath, { overwrite: true });
    }
  }

  /**
   * Get available migration paths
   */
  getAvailableMigrations(): Array<{ from: string; to: string; ruleCount: number }> {
    return Object.entries(MIGRATION_RULES).map(([transition, rules]) => {
      const [from, to] = transition.split('->');
      return { from, to, ruleCount: rules.length };
    });
  }

  /**
   * Add custom migration rules
   */
  addCustomRules(transition: string, rules: MigrationRule[]): void {
    if (!MIGRATION_RULES[transition]) {
      MIGRATION_RULES[transition] = [];
    }
    MIGRATION_RULES[transition].push(...rules);
  }
}

/**
 * Create a migration rule
 */
export function createMigrationRule(
  id: string,
  description: string,
  pattern: RegExp,
  replacement: string | ((match: string, ...args: string[]) => string),
  deprecationMessage?: string
): MigrationRule {
  return { id, description, pattern, replacement, deprecationMessage };
}

/**
 * Run migration with default options
 */
export async function migrate(
  from: string,
  to: string,
  config?: MigrationConfig
): Promise<MigrationResult> {
  const migrator = new HyperFixiMigrator(config);
  return migrator.migrate(from, to);
}

export default HyperFixiMigrator;
