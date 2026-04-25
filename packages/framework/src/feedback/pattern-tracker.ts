/**
 * Pattern Hit-Rate Tracker
 *
 * Records pattern events in a ring buffer and computes hit-rate
 * statistics by command, language, and diagnostic code. Patterns
 * with high rejected/attempts ratios indicate miscalibrated confidence.
 */

import type { PatternEvent, HitRate, PatternTrackerSummary, TopFailure } from './types';

// =============================================================================
// Public API
// =============================================================================

export class PatternTracker {
  private events: PatternEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }

  /**
   * Record a pattern event.
   */
  record(event: PatternEvent): void {
    this.events.push(event);
    // Ring buffer: drop oldest when full
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(this.events.length - this.maxEvents);
    }
  }

  /**
   * Get hit rate by command action.
   */
  getHitRateByCommand(): Record<string, HitRate> {
    return this.computeHitRate(e => e.action);
  }

  /**
   * Get hit rate by language.
   */
  getHitRateByLanguage(): Record<string, HitRate> {
    return this.computeHitRate(e => e.language);
  }

  /**
   * Get the most frequent failure diagnostic codes.
   */
  getTopFailures(limit: number = 10): TopFailure[] {
    const codeMap = new Map<string, { count: number; actions: Set<string> }>();

    for (const event of this.events) {
      if (event.outcome !== 'rejected' || !event.diagnosticCodes) continue;
      for (const code of event.diagnosticCodes) {
        const entry = codeMap.get(code) || { count: 0, actions: new Set() };
        entry.count++;
        entry.actions.add(event.action);
        codeMap.set(code, entry);
      }
    }

    return Array.from(codeMap.entries())
      .map(([code, { count, actions }]) => ({
        code,
        count,
        actions: Array.from(actions),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get a complete summary of tracking data.
   */
  getSummary(): PatternTrackerSummary {
    const byOutcome: Record<string, number> = {};
    for (const event of this.events) {
      byOutcome[event.outcome] = (byOutcome[event.outcome] || 0) + 1;
    }

    return {
      totalEvents: this.events.length,
      byOutcome,
      byCommand: this.getHitRateByCommand(),
      byLanguage: this.getHitRateByLanguage(),
      topFailures: this.getTopFailures(),
    };
  }

  /**
   * Export all events as JSONL.
   */
  exportJSONL(): string {
    return this.events.map(e => JSON.stringify(e)).join('\n');
  }

  /**
   * Get the number of recorded events.
   */
  get size(): number {
    return this.events.length;
  }

  /**
   * Clear all events.
   */
  clear(): void {
    this.events = [];
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private computeHitRate(keyFn: (e: PatternEvent) => string): Record<string, HitRate> {
    const map = new Map<string, { attempts: number; successes: number }>();

    for (const event of this.events) {
      const key = keyFn(event);
      const entry = map.get(key) || { attempts: 0, successes: 0 };
      entry.attempts++;
      if (event.outcome === 'accepted') {
        entry.successes++;
      }
      map.set(key, entry);
    }

    const result: Record<string, HitRate> = {};
    for (const [key, { attempts, successes }] of map) {
      result[key] = {
        attempts,
        successes,
        rate: attempts > 0 ? successes / attempts : 0,
      };
    }
    return result;
  }
}
