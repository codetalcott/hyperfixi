/**
 * Unit tests for get_pattern_examples. These tests hit the real
 * patterns-reference SQLite database (in-process, read-only), so they
 * confirm our API adapter works against the real shape — not a mock
 * that can drift from the database's actual schema.
 */

import { describe, it, expect } from 'vitest';
import { getPatternExamples } from './get-pattern-examples.js';

describe('getPatternExamples', () => {
  it('rejects empty prompt', async () => {
    await expect(getPatternExamples({ prompt: '' })).rejects.toThrow(/prompt.*required/i);
  });

  it('rejects whitespace-only prompt', async () => {
    await expect(getPatternExamples({ prompt: '  \n  ' })).rejects.toThrow(/prompt.*required/i);
  });

  it('returns a result shape with examples array even on common prompts', async () => {
    // The patterns database ships with 19 LLM examples (English only) — we
    // don't assert specific content because the dataset is expected to grow.
    // We only assert the shape is correct and the query didn't explode.
    const result = await getPatternExamples({
      prompt: 'toggle a class on click',
      language: 'en',
      limit: 3,
    });
    expect(result.prompt).toBe('toggle a class on click');
    expect(result.language).toBe('en');
    expect(Array.isArray(result.examples)).toBe(true);
    expect(result.count).toBe(result.examples.length);
    expect(result.examples.length).toBeLessThanOrEqual(3);
  });

  it('defaults language to "en" and limit to 5', async () => {
    const result = await getPatternExamples({ prompt: 'toggle' });
    expect(result.language).toBe('en');
    expect(result.examples.length).toBeLessThanOrEqual(5);
  });

  it('each example has the declared shape', async () => {
    const result = await getPatternExamples({ prompt: 'toggle', limit: 5 });
    for (const ex of result.examples) {
      expect(typeof ex.id).toBe('number');
      expect(typeof ex.patternId).toBe('string');
      expect(typeof ex.language).toBe('string');
      expect(typeof ex.prompt).toBe('string');
      expect(typeof ex.completion).toBe('string');
      expect(typeof ex.qualityScore).toBe('number');
    }
  });
});
