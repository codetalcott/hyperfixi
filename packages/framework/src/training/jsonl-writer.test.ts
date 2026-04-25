/**
 * Tests for JSONL Writer
 */

import { describe, it, expect } from 'vitest';
import { toJSONL, toJSONLRow, parseJSONL } from './jsonl-writer';
import type { TrainingPair } from './types';
import type { SemanticJSON } from '../ir/types';

// =============================================================================
// Test Data
// =============================================================================

function makePair(overrides?: Partial<TrainingPair>): TrainingPair {
  return {
    id: 'test-001',
    natural: 'fetch /api/users as json into #list',
    language: 'en',
    explicit: '[fetch source:/api/users style:json destination:#list]',
    json: {
      action: 'fetch',
      roles: {
        source: { type: 'expression', value: '/api/users' },
        style: { type: 'expression', value: 'json' },
        destination: { type: 'selector', value: '#list' },
      },
    } as SemanticJSON,
    domain: 'flow',
    action: 'fetch',
    source: 'synthetic',
    quality: 1.0,
    ...overrides,
  };
}

// =============================================================================
// toJSONLRow()
// =============================================================================

describe('toJSONLRow', () => {
  it('converts pair to JSONL row', () => {
    const row = toJSONLRow(makePair());
    expect(row.id).toBe('test-001');
    expect(row.prompt).toBe('fetch /api/users as json into #list');
    expect(row.completion).toBe('[fetch source:/api/users style:json destination:#list]');
  });

  it('includes metadata', () => {
    const row = toJSONLRow(makePair());
    expect(row.metadata.domain).toBe('flow');
    expect(row.metadata.action).toBe('fetch');
    expect(row.metadata.language).toBe('en');
    expect(row.metadata.source).toBe('synthetic');
    expect(row.metadata.quality).toBe(1.0);
  });

  it('includes confidence when present', () => {
    const row = toJSONLRow(makePair({ confidence: 0.95 }));
    expect(row.metadata.confidence).toBe(0.95);
  });

  it('omits confidence when absent', () => {
    const row = toJSONLRow(makePair());
    expect(row.metadata.confidence).toBeUndefined();
  });
});

// =============================================================================
// toJSONL()
// =============================================================================

describe('toJSONL', () => {
  it('produces one line per pair', () => {
    const pairs = [makePair({ id: 'a' }), makePair({ id: 'b' }), makePair({ id: 'c' })];
    const jsonl = toJSONL(pairs);
    const lines = jsonl.split('\n');
    expect(lines.length).toBe(3);
  });

  it('produces valid JSON on each line', () => {
    const pairs = [makePair({ id: 'a' }), makePair({ id: 'b' })];
    const jsonl = toJSONL(pairs);
    for (const line of jsonl.split('\n')) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('returns empty string for empty pairs', () => {
    const jsonl = toJSONL([]);
    expect(jsonl).toBe('');
  });

  it('preserves pair data through serialization', () => {
    const pair = makePair();
    const jsonl = toJSONL([pair]);
    const parsed = JSON.parse(jsonl);
    expect(parsed.id).toBe(pair.id);
    expect(parsed.prompt).toBe(pair.natural);
    expect(parsed.completion).toBe(pair.explicit);
  });
});

// =============================================================================
// parseJSONL()
// =============================================================================

describe('parseJSONL', () => {
  it('roundtrips through toJSONL and parseJSONL', () => {
    const pairs = [makePair({ id: 'a' }), makePair({ id: 'b' })];
    const jsonl = toJSONL(pairs);
    const rows = parseJSONL(jsonl);
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('a');
    expect(rows[1].id).toBe('b');
  });

  it('skips empty lines', () => {
    const jsonl =
      '{"id":"a","prompt":"x","completion":"y","metadata":{}}\n\n{"id":"b","prompt":"x","completion":"y","metadata":{}}';
    const rows = parseJSONL(jsonl);
    expect(rows.length).toBe(2);
  });

  it('handles single line', () => {
    const jsonl = '{"id":"only","prompt":"x","completion":"y","metadata":{}}';
    const rows = parseJSONL(jsonl);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('only');
  });

  it('preserves metadata through roundtrip', () => {
    const pair = makePair({ confidence: 0.85 });
    const jsonl = toJSONL([pair]);
    const rows = parseJSONL(jsonl);
    expect(rows[0].metadata.domain).toBe('flow');
    expect(rows[0].metadata.confidence).toBe(0.85);
  });
});
