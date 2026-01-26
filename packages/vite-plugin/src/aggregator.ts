/**
 * Aggregator
 *
 * Collects and aggregates hyperscript usage across all scanned files.
 */

import type { FileUsage, AggregatedUsage, HtmxUsage } from './types';

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
      const htmxEqual = this.htmxUsageEqual(existing.htmx, usage.htmx);

      if (commandsEqual && blocksEqual && positionalEqual && languagesEqual && htmxEqual) {
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

    // Aggregate htmx usage
    const htmx: HtmxUsage = {
      hasHtmxAttributes: false,
      hasFixiAttributes: false,
      httpMethods: new Set(),
      swapStrategies: new Set(),
      onHandlers: [],
      triggerModifiers: new Set(),
      urlManagement: new Set(),
      usesConfirm: false,
    };

    for (const usage of this.fileUsage.values()) {
      for (const cmd of usage.commands) commands.add(cmd);
      for (const block of usage.blocks) blocks.add(block);
      for (const lang of usage.detectedLanguages) detectedLanguages.add(lang);
      if (usage.positional) positional = true;

      // Aggregate htmx usage
      if (usage.htmx) {
        if (usage.htmx.hasHtmxAttributes) htmx.hasHtmxAttributes = true;
        if (usage.htmx.hasFixiAttributes) htmx.hasFixiAttributes = true;
        for (const method of usage.htmx.httpMethods) htmx.httpMethods.add(method);
        for (const swap of usage.htmx.swapStrategies) htmx.swapStrategies.add(swap);
        htmx.onHandlers.push(...usage.htmx.onHandlers);
        for (const modifier of usage.htmx.triggerModifiers) htmx.triggerModifiers.add(modifier);
        for (const url of usage.htmx.urlManagement) htmx.urlManagement.add(url);
        if (usage.htmx.usesConfirm) htmx.usesConfirm = true;
      }
    }

    this.cachedUsage = {
      commands,
      blocks,
      positional,
      detectedLanguages,
      htmx,
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

  /**
   * Compare two HtmxUsage objects for equality
   */
  private htmxUsageEqual(a?: HtmxUsage, b?: HtmxUsage): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return (
      a.hasHtmxAttributes === b.hasHtmxAttributes &&
      a.hasFixiAttributes === b.hasFixiAttributes &&
      this.setsEqual(a.httpMethods, b.httpMethods) &&
      this.setsEqual(a.swapStrategies, b.swapStrategies) &&
      this.setsEqual(a.triggerModifiers, b.triggerModifiers) &&
      this.setsEqual(a.urlManagement, b.urlManagement) &&
      a.usesConfirm === b.usesConfirm
    );
  }
}
