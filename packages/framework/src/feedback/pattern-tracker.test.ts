/**
 * Tests for Pattern Hit-Rate Tracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternTracker } from './pattern-tracker';
import type { PatternEvent } from './types';

// =============================================================================
// Test Helpers
// =============================================================================

function makeEvent(overrides?: Partial<PatternEvent>): PatternEvent {
  return {
    timestamp: Date.now(),
    domain: 'flow',
    action: 'fetch',
    language: 'en',
    inputFormat: 'explicit',
    confidence: 0.95,
    outcome: 'accepted',
    ...overrides,
  };
}

// =============================================================================
// PatternTracker
// =============================================================================

describe('PatternTracker', () => {
  let tracker: PatternTracker;

  beforeEach(() => {
    tracker = new PatternTracker();
  });

  // --- Basic recording ---

  it('starts empty', () => {
    expect(tracker.size).toBe(0);
  });

  it('records events', () => {
    tracker.record(makeEvent());
    expect(tracker.size).toBe(1);
  });

  it('records multiple events', () => {
    tracker.record(makeEvent());
    tracker.record(makeEvent({ action: 'toggle' }));
    tracker.record(makeEvent({ action: 'add' }));
    expect(tracker.size).toBe(3);
  });

  // --- Ring buffer ---

  it('enforces ring buffer limit', () => {
    const small = new PatternTracker(5);
    for (let i = 0; i < 10; i++) {
      small.record(makeEvent({ action: `action-${i}` }));
    }
    expect(small.size).toBe(5);
  });

  it('keeps newest events when buffer overflows', () => {
    const small = new PatternTracker(3);
    for (let i = 0; i < 5; i++) {
      small.record(makeEvent({ action: `action-${i}` }));
    }
    const summary = small.getSummary();
    // Should only have action-2, action-3, action-4
    expect(summary.byCommand['action-0']).toBeUndefined();
    expect(summary.byCommand['action-1']).toBeUndefined();
    expect(summary.byCommand['action-2']).toBeDefined();
  });

  // --- Hit rate by command ---

  it('computes hit rate by command', () => {
    tracker.record(makeEvent({ action: 'fetch', outcome: 'accepted' }));
    tracker.record(makeEvent({ action: 'fetch', outcome: 'accepted' }));
    tracker.record(makeEvent({ action: 'fetch', outcome: 'rejected' }));
    tracker.record(makeEvent({ action: 'toggle', outcome: 'accepted' }));

    const rates = tracker.getHitRateByCommand();
    expect(rates['fetch'].attempts).toBe(3);
    expect(rates['fetch'].successes).toBe(2);
    expect(rates['fetch'].rate).toBeCloseTo(2 / 3);
    expect(rates['toggle'].rate).toBe(1);
  });

  // --- Hit rate by language ---

  it('computes hit rate by language', () => {
    tracker.record(makeEvent({ language: 'en', outcome: 'accepted' }));
    tracker.record(makeEvent({ language: 'en', outcome: 'rejected' }));
    tracker.record(makeEvent({ language: 'ja', outcome: 'accepted' }));

    const rates = tracker.getHitRateByLanguage();
    expect(rates['en'].attempts).toBe(2);
    expect(rates['en'].rate).toBe(0.5);
    expect(rates['ja'].rate).toBe(1);
  });

  // --- Top failures ---

  it('computes top failures by diagnostic code', () => {
    tracker.record(makeEvent({ outcome: 'rejected', diagnosticCodes: ['missing-role'] }));
    tracker.record(makeEvent({ outcome: 'rejected', diagnosticCodes: ['missing-role'] }));
    tracker.record(makeEvent({ outcome: 'rejected', diagnosticCodes: ['unknown-command'] }));

    const failures = tracker.getTopFailures();
    expect(failures[0].code).toBe('missing-role');
    expect(failures[0].count).toBe(2);
    expect(failures[1].code).toBe('unknown-command');
    expect(failures[1].count).toBe(1);
  });

  it('tracks which actions trigger each failure', () => {
    tracker.record(
      makeEvent({ action: 'fetch', outcome: 'rejected', diagnosticCodes: ['missing-role'] })
    );
    tracker.record(
      makeEvent({ action: 'toggle', outcome: 'rejected', diagnosticCodes: ['missing-role'] })
    );

    const failures = tracker.getTopFailures();
    expect(failures[0].actions).toContain('fetch');
    expect(failures[0].actions).toContain('toggle');
  });

  it('limits top failures to requested count', () => {
    for (let i = 0; i < 20; i++) {
      tracker.record(makeEvent({ outcome: 'rejected', diagnosticCodes: [`code-${i}`] }));
    }

    const failures = tracker.getTopFailures(5);
    expect(failures.length).toBe(5);
  });

  it('ignores non-rejected events for failures', () => {
    tracker.record(makeEvent({ outcome: 'accepted', diagnosticCodes: ['some-code'] }));
    const failures = tracker.getTopFailures();
    expect(failures.length).toBe(0);
  });

  it('ignores rejected events without diagnostic codes', () => {
    tracker.record(makeEvent({ outcome: 'rejected' }));
    const failures = tracker.getTopFailures();
    expect(failures.length).toBe(0);
  });

  // --- Summary ---

  it('produces a complete summary', () => {
    tracker.record(makeEvent({ outcome: 'accepted' }));
    tracker.record(makeEvent({ outcome: 'rejected', diagnosticCodes: ['err'] }));
    tracker.record(makeEvent({ outcome: 'disambiguated' }));

    const summary = tracker.getSummary();
    expect(summary.totalEvents).toBe(3);
    expect(summary.byOutcome['accepted']).toBe(1);
    expect(summary.byOutcome['rejected']).toBe(1);
    expect(summary.byOutcome['disambiguated']).toBe(1);
    expect(summary.byCommand).toBeDefined();
    expect(summary.byLanguage).toBeDefined();
    expect(summary.topFailures.length).toBe(1);
  });

  // --- JSONL export ---

  it('exports events as JSONL', () => {
    tracker.record(makeEvent({ action: 'fetch' }));
    tracker.record(makeEvent({ action: 'toggle' }));

    const jsonl = tracker.exportJSONL();
    const lines = jsonl.split('\n');
    expect(lines.length).toBe(2);

    const parsed0 = JSON.parse(lines[0]);
    expect(parsed0.action).toBe('fetch');
    const parsed1 = JSON.parse(lines[1]);
    expect(parsed1.action).toBe('toggle');
  });

  it('exports empty string when no events', () => {
    expect(tracker.exportJSONL()).toBe('');
  });

  // --- Clear ---

  it('clears all events', () => {
    tracker.record(makeEvent());
    tracker.record(makeEvent());
    tracker.clear();
    expect(tracker.size).toBe(0);
  });
});
