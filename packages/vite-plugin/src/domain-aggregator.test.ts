import { describe, it, expect } from 'vitest';
import { DomainAggregator } from './domain-aggregator';
import type { DomainFileUsage } from './types';

// =============================================================================
// Helpers
// =============================================================================

function createUsage(domain: string, keywords: string[], snippetCount = 1): DomainFileUsage {
  return {
    domain,
    detectedKeywords: new Set(keywords),
    detectedLanguages: new Set(['en']),
    snippetCount,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('DomainAggregator', () => {
  it('aggregates usage from a single file', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'], 2)]);

    const usage = agg.getUsage();
    expect(usage).toHaveLength(1);
    expect(usage[0].domain).toBe('sql');
    expect(usage[0].fileCount).toBe(1);
    expect(usage[0].totalSnippets).toBe(2);
    expect(usage[0].detectedKeywords.has('select')).toBe(true);
  });

  it('aggregates across multiple files', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'], 1)]);
    agg.add('b.html', [createUsage('sql', ['insert'], 3)]);

    const usage = agg.getUsage();
    expect(usage).toHaveLength(1);
    expect(usage[0].fileCount).toBe(2);
    expect(usage[0].totalSnippets).toBe(4);
    expect(usage[0].detectedKeywords.has('select')).toBe(true);
    expect(usage[0].detectedKeywords.has('insert')).toBe(true);
  });

  it('tracks multiple domains', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select']), createUsage('bdd', ['given'])]);

    const usage = agg.getUsage();
    expect(usage).toHaveLength(2);
    const domains = usage.map(u => u.domain).sort();
    expect(domains).toEqual(['bdd', 'sql']);
  });

  it('removes file usage', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'])]);
    agg.add('b.html', [createUsage('sql', ['insert'])]);

    const removed = agg.remove('a.html');
    expect(removed).toBe(true);

    const usage = agg.getUsage();
    expect(usage).toHaveLength(1);
    expect(usage[0].fileCount).toBe(1);
    expect(usage[0].detectedKeywords.has('select')).toBe(false);
    expect(usage[0].detectedKeywords.has('insert')).toBe(true);
  });

  it('returns false when removing unknown file', () => {
    const agg = new DomainAggregator();
    expect(agg.remove('unknown.html')).toBe(false);
  });

  it('caches aggregated results', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'])]);

    const first = agg.getUsage();
    const second = agg.getUsage();
    expect(first).toBe(second); // Same reference = cached
  });

  it('invalidates cache on add', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'])]);
    const first = agg.getUsage();

    agg.add('b.html', [createUsage('sql', ['insert'])]);
    const second = agg.getUsage();
    expect(first).not.toBe(second); // Different reference = recomputed
  });

  it('getUsageForDomain returns matching domain', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select']), createUsage('bdd', ['given'])]);

    const sql = agg.getUsageForDomain('sql');
    expect(sql).not.toBeNull();
    expect(sql!.domain).toBe('sql');
  });

  it('getUsageForDomain returns null for unknown domain', () => {
    const agg = new DomainAggregator();
    expect(agg.getUsageForDomain('unknown')).toBeNull();
  });

  it('clear removes all data', () => {
    const agg = new DomainAggregator();
    agg.add('a.html', [createUsage('sql', ['select'])]);
    agg.clear();

    expect(agg.getUsage()).toHaveLength(0);
  });

  it('returns empty array when no files tracked', () => {
    const agg = new DomainAggregator();
    expect(agg.getUsage()).toHaveLength(0);
  });
});
