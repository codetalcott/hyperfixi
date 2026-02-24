/**
 * Tests for Confidence-Aware Disambiguation
 */

import { describe, it, expect } from 'vitest';
import { needsDisambiguation, buildDisambiguation } from './confidence-gate';
import { createCommandNode, createSelector, createLiteral } from '../core/types';

// =============================================================================
// needsDisambiguation()
// =============================================================================

describe('needsDisambiguation', () => {
  it('returns false for high confidence', () => {
    expect(needsDisambiguation(0.9)).toBe(false);
  });

  it('returns false for very low confidence', () => {
    expect(needsDisambiguation(0.3)).toBe(false);
  });

  it('returns true for borderline confidence', () => {
    expect(needsDisambiguation(0.6)).toBe(true);
  });

  it('returns true at exact low threshold', () => {
    expect(needsDisambiguation(0.5)).toBe(true);
  });

  it('returns false at exact high threshold', () => {
    expect(needsDisambiguation(0.7)).toBe(false);
  });

  it('supports custom thresholds', () => {
    expect(needsDisambiguation(0.45, 0.4, 0.6)).toBe(true);
    expect(needsDisambiguation(0.3, 0.4, 0.6)).toBe(false);
    expect(needsDisambiguation(0.7, 0.4, 0.6)).toBe(false);
  });
});

// =============================================================================
// buildDisambiguation()
// =============================================================================

describe('buildDisambiguation', () => {
  const nodeA = createCommandNode('toggle', { patient: createSelector('#button') });
  const nodeB = createCommandNode('toggle', { patient: createSelector('.button') });

  it('builds a disambiguation request', () => {
    const result = buildDisambiguation('toggle button', [
      { action: 'toggle', confidence: 0.62, node: nodeA, description: 'toggle class on #button' },
      { action: 'toggle', confidence: 0.58, node: nodeB, description: 'toggle .button class' },
    ]);

    expect(result.input).toBe('toggle button');
    expect(result.candidates.length).toBe(2);
    expect(result.question).toContain('0.62');
  });

  it('sorts candidates by confidence (highest first)', () => {
    const result = buildDisambiguation('test', [
      { action: 'add', confidence: 0.5, node: nodeB },
      { action: 'toggle', confidence: 0.65, node: nodeA },
    ]);

    expect(result.candidates[0].action).toBe('toggle');
    expect(result.candidates[1].action).toBe('add');
  });

  it('includes bracket syntax in candidates', () => {
    const result = buildDisambiguation('test', [
      { action: 'toggle', confidence: 0.6, node: nodeA },
    ]);

    expect(result.candidates[0].explicit).toContain('[toggle');
  });

  it('generates option labels (a, b, c)', () => {
    const result = buildDisambiguation('test', [
      { action: 'a', confidence: 0.6, node: nodeA },
      { action: 'b', confidence: 0.55, node: nodeB },
    ]);

    expect(result.question).toContain('(a)');
    expect(result.question).toContain('(b)');
  });

  it('includes Which did you mean? prompt', () => {
    const result = buildDisambiguation('test', [
      { action: 'toggle', confidence: 0.6, node: nodeA },
    ]);

    expect(result.question).toContain('Which did you mean?');
  });

  it('uses custom description when provided', () => {
    const result = buildDisambiguation('test', [
      { action: 'toggle', confidence: 0.6, node: nodeA, description: 'Custom description' },
    ]);

    expect(result.candidates[0].description).toBe('Custom description');
  });

  it('generates default description when not provided', () => {
    const result = buildDisambiguation('test', [
      { action: 'toggle', confidence: 0.6, node: nodeA },
    ]);

    expect(result.candidates[0].description).toContain('toggle');
  });
});
