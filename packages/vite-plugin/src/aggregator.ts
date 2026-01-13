/**
 * Aggregator
 *
 * Collects and aggregates hyperscript usage across all scanned files.
 */

import type { FileUsage, AggregatedUsage } from './types';

/**
 * Aggregator class for collecting usage across files
 */
export class Aggregator {
  private fileUsage: Map<string, FileUsage> = new Map();
  private cachedUsage: AggregatedUsage | null = null;

  /**
   * Add or update usage for a file
   * @returns true if the overall usage changed
   */
  add(filePath: string, usage: FileUsage): boolean {
    const existing = this.fileUsage.get(filePath);

    // Check if anything changed
    if (existing) {
      const commandsEqual = this.setsEqual(existing.commands, usage.commands);
      const blocksEqual = this.setsEqual(existing.blocks, usage.blocks);
      const positionalEqual = existing.positional === usage.positional;
      const languagesEqual = this.setsEqual(existing.detectedLanguages, usage.detectedLanguages);

      if (commandsEqual && blocksEqual && positionalEqual && languagesEqual) {
        return false; // No change
      }
    }

    // Update file usage
    this.fileUsage.set(filePath, usage);
    this.cachedUsage = null; // Invalidate cache

    return true;
  }

  /**
   * Remove a file from tracking (e.g., when deleted)
   * @returns true if the overall usage changed
   */
  remove(filePath: string): boolean {
    const existed = this.fileUsage.delete(filePath);
    if (existed) {
      this.cachedUsage = null;
    }
    return existed;
  }

  /**
   * Get aggregated usage across all files
   */
  getUsage(): AggregatedUsage {
    if (this.cachedUsage) {
      return this.cachedUsage;
    }

    const commands = new Set<string>();
    const blocks = new Set<string>();
    const detectedLanguages = new Set<string>();
    let positional = false;

    for (const usage of this.fileUsage.values()) {
      for (const cmd of usage.commands) commands.add(cmd);
      for (const block of usage.blocks) blocks.add(block);
      for (const lang of usage.detectedLanguages) detectedLanguages.add(lang);
      if (usage.positional) positional = true;
    }

    this.cachedUsage = {
      commands,
      blocks,
      positional,
      detectedLanguages,
      fileUsage: new Map(this.fileUsage),
    };

    return this.cachedUsage;
  }

  /**
   * Load usage from a project scan
   */
  loadFromScan(scannedFiles: Map<string, FileUsage>): void {
    this.fileUsage = new Map(scannedFiles);
    this.cachedUsage = null;
  }

  /**
   * Check if any hyperscript usage has been detected
   */
  hasUsage(): boolean {
    const usage = this.getUsage();
    return (
      usage.commands.size > 0 ||
      usage.blocks.size > 0 ||
      usage.positional ||
      usage.detectedLanguages.size > 0
    );
  }

  /**
   * Get summary for logging
   */
  getSummary(): {
    commands: string[];
    blocks: string[];
    positional: boolean;
    languages: string[];
    fileCount: number;
  } {
    const usage = this.getUsage();
    return {
      commands: [...usage.commands].sort(),
      blocks: [...usage.blocks].sort(),
      positional: usage.positional,
      languages: [...usage.detectedLanguages].sort(),
      fileCount: this.fileUsage.size,
    };
  }

  /**
   * Clear all tracked usage
   */
  clear(): void {
    this.fileUsage.clear();
    this.cachedUsage = null;
  }

  /**
   * Compare two sets for equality
   */
  private setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
}
