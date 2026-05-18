/**
 * Tests for confidence-calculator utility — focused on the tokensConsumed
 * field added to ParseWithConfidenceResult so it can replace the deprecated
 * SemanticAnalyzer.analyze() path.
 */

import { describe, it, expect } from 'vitest';
// Import via the main entry so language modules self-register
import { parseSemantic } from '../src';
import { parseWithConfidence } from '../src/utils/confidence-calculator';

describe('parseWithConfidence', () => {
  it('returns tokensConsumed for a successful match', () => {
    const result = parseWithConfidence('toggle .active', 'en');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.tokensConsumed).toBeGreaterThan(0);
  });

  it('returns undefined tokensConsumed for a failed match', () => {
    const result = parseWithConfidence('asdfgh xyz nonsense', 'en');
    expect(result.confidence).toBe(0);
    expect(result.tokensConsumed).toBeUndefined();
  });
});

describe('parseSemantic (public alias for parseWithConfidence)', () => {
  it('passes through tokensConsumed', () => {
    const result = parseSemantic('toggle .active', 'en');
    expect(result.tokensConsumed).toBeGreaterThan(0);
  });

  it('returns undefined tokensConsumed for no match', () => {
    const result = parseSemantic('asdfgh xyz nonsense', 'en');
    expect(result.tokensConsumed).toBeUndefined();
  });
});
