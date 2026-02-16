/**
 * Domain Aggregator
 *
 * Aggregates per-domain usage across files, following the same
 * pattern as the existing hyperscript Aggregator.
 */

import type { DomainFileUsage, DomainAggregatedUsage } from './types';

/**
 * Aggregates domain usage across multiple files.
 */
export class DomainAggregator {
  private fileUsage = new Map<string, DomainFileUsage[]>();
  private cache: DomainAggregatedUsage[] | null = null;

  /**
   * Add or update domain usage for a file.
   * Returns true if usage changed (invalidates cache).
   */
  add(filePath: string, usage: DomainFileUsage[]): boolean {
    const existing = this.fileUsage.get(filePath);
    const changed = !existing || !this.isEqual(existing, usage);

    if (changed) {
      this.fileUsage.set(filePath, usage);
      this.cache = null;
    }

    return changed;
  }

  /**
   * Remove a file's domain usage.
   * Returns true if the file was tracked.
   */
  remove(filePath: string): boolean {
    const had = this.fileUsage.has(filePath);
    if (had) {
      this.fileUsage.delete(filePath);
      this.cache = null;
    }
    return had;
  }

  /**
   * Get aggregated usage across all files.
   * Result is cached until add/remove changes it.
   */
  getUsage(): DomainAggregatedUsage[] {
    if (this.cache) return this.cache;

    const domainMap = new Map<
      string,
      {
        detectedKeywords: Set<string>;
        detectedLanguages: Set<string>;
        fileCount: number;
        totalSnippets: number;
      }
    >();

    for (const usages of this.fileUsage.values()) {
      for (const usage of usages) {
        let entry = domainMap.get(usage.domain);
        if (!entry) {
          entry = {
            detectedKeywords: new Set(),
            detectedLanguages: new Set(),
            fileCount: 0,
            totalSnippets: 0,
          };
          domainMap.set(usage.domain, entry);
        }

        entry.fileCount++;
        entry.totalSnippets += usage.snippetCount;
        for (const kw of usage.detectedKeywords) entry.detectedKeywords.add(kw);
        for (const lang of usage.detectedLanguages) entry.detectedLanguages.add(lang);
      }
    }

    this.cache = Array.from(domainMap.entries()).map(([domain, data]) => ({
      domain,
      detectedKeywords: data.detectedKeywords,
      detectedLanguages: data.detectedLanguages,
      fileCount: data.fileCount,
      totalSnippets: data.totalSnippets,
    }));

    return this.cache;
  }

  /**
   * Get aggregated usage for a specific domain.
   */
  getUsageForDomain(domain: string): DomainAggregatedUsage | null {
    return this.getUsage().find(u => u.domain === domain) ?? null;
  }

  /**
   * Clear all tracked data.
   */
  clear(): void {
    this.fileUsage.clear();
    this.cache = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private isEqual(a: DomainFileUsage[], b: DomainFileUsage[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].domain !== b[i].domain) return false;
      if (a[i].snippetCount !== b[i].snippetCount) return false;
      if (a[i].detectedKeywords.size !== b[i].detectedKeywords.size) return false;
    }
    return true;
  }
}
