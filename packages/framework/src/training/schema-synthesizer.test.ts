/**
 * Tests for Schema Synthesizer
 */

import { describe, it, expect } from 'vitest';
import { synthesizeFromSchemas } from './schema-synthesizer';
import type { SynthesisConfig } from './types';
import { defineCommand, defineRole } from '../schema/command-schema';
import type { CommandSchema } from '../schema/command-schema';

// =============================================================================
// Test Schemas
// =============================================================================

const fetchSchema: CommandSchema = defineCommand({
  action: 'fetch',
  description: 'Fetch data from a URL',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'URL to fetch from',
      required: true,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'style',
      description: 'Response format',
      required: false,
      expectedTypes: ['expression'],
      markerOverride: { en: 'as', es: 'como' },
    }),
    defineRole({
      role: 'destination',
      description: 'Target element',
      required: false,
      expectedTypes: ['selector', 'expression'],
      markerOverride: { en: 'into', es: 'en' },
    }),
  ],
});

const toggleSchema: CommandSchema = defineCommand({
  action: 'toggle',
  description: 'Toggle a class',
  category: 'dom',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'CSS selector',
      required: true,
      expectedTypes: ['selector'],
    }),
  ],
});

const submitSchema: CommandSchema = defineCommand({
  action: 'submit',
  description: 'Submit form data',
  category: 'action',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Form element',
      required: true,
      expectedTypes: ['selector'],
    }),
    defineRole({
      role: 'destination',
      description: 'URL to submit to',
      required: true,
      expectedTypes: ['expression'],
      markerOverride: { en: 'to', es: 'a' },
    }),
  ],
});

const testSchemas = [fetchSchema, toggleSchema, submitSchema];

function makeConfig(overrides?: Partial<SynthesisConfig>): SynthesisConfig {
  return {
    domain: 'test',
    ...overrides,
  };
}

// =============================================================================
// synthesizeFromSchemas()
// =============================================================================

describe('synthesizeFromSchemas', () => {
  it('generates pairs for each schema', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    expect(result.pairs.length).toBeGreaterThan(0);
    expect(result.metadata.commandCount).toBe(3);
  });

  it('includes metadata', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    expect(result.metadata.domain).toBe('test');
    expect(result.metadata.pairCount).toBe(result.pairs.length);
    expect(result.metadata.bySource.synthetic).toBe(result.pairs.length);
  });

  it('generates valid bracket syntax', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    for (const pair of result.pairs) {
      expect(pair.explicit).toMatch(/^\[/);
      expect(pair.explicit).toMatch(/\]$/);
    }
  });

  it('generates valid JSON', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    for (const pair of result.pairs) {
      expect(pair.json.action).toBeTruthy();
      expect(typeof pair.json.roles).toBe('object');
    }
  });

  it('includes required roles in every pair', () => {
    const result = synthesizeFromSchemas([fetchSchema], makeConfig());
    for (const pair of result.pairs) {
      expect(pair.json.roles['source']).toBeDefined();
    }
  });

  it('generates natural language form', () => {
    const result = synthesizeFromSchemas([fetchSchema], makeConfig());
    for (const pair of result.pairs) {
      expect(pair.natural).toContain('fetch');
      expect(pair.natural.length).toBeGreaterThan(0);
    }
  });

  it('uses markers in natural language', () => {
    const result = synthesizeFromSchemas([fetchSchema], makeConfig({ languages: ['en'] }));
    // Find a pair with the style role
    const withStyle = result.pairs.find(p => p.json.roles['style']);
    if (withStyle) {
      expect(withStyle.natural).toContain('as');
    }
  });

  // --- Configuration ---

  it('respects maxPairsPerCommand', () => {
    const result = synthesizeFromSchemas([fetchSchema], makeConfig({ maxPairsPerCommand: 2 }));
    expect(result.pairs.length).toBeLessThanOrEqual(2);
  });

  it('respects minQuality filter', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig({ minQuality: 0.9 }));
    for (const pair of result.pairs) {
      expect(pair.quality).toBeGreaterThanOrEqual(0.9);
    }
  });

  it('generates for multiple languages', () => {
    const result = synthesizeFromSchemas([toggleSchema], makeConfig({ languages: ['en', 'es'] }));
    const languages = new Set(result.pairs.map(p => p.language));
    expect(languages.has('en')).toBe(true);
    expect(languages.has('es')).toBe(true);
  });

  it('generates shuffled role order variants', () => {
    const result = synthesizeFromSchemas([submitSchema], makeConfig({ shuffleRoles: true }));
    // submit has 2 required roles, so shuffled variant should exist
    expect(result.pairs.length).toBeGreaterThanOrEqual(2);
  });

  it('disables shuffling when configured', () => {
    const withShuffle = synthesizeFromSchemas(
      [submitSchema],
      makeConfig({ shuffleRoles: true, maxPairsPerCommand: 10 })
    );
    const noShuffle = synthesizeFromSchemas(
      [submitSchema],
      makeConfig({ shuffleRoles: false, maxPairsPerCommand: 10 })
    );
    expect(noShuffle.pairs.length).toBeLessThanOrEqual(withShuffle.pairs.length);
  });

  // --- Pair Quality ---

  it('assigns quality based on role coverage', () => {
    const result = synthesizeFromSchemas([fetchSchema], makeConfig());
    for (const pair of result.pairs) {
      expect(pair.quality).toBeGreaterThanOrEqual(0);
      expect(pair.quality).toBeLessThanOrEqual(1);
    }
  });

  it('gives quality 1.0 when all required roles present', () => {
    const result = synthesizeFromSchemas([toggleSchema], makeConfig());
    // toggle has 1 required role, always filled
    expect(result.pairs[0].quality).toBe(1);
  });

  // --- Pair Metadata ---

  it('tags pairs as synthetic source', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    for (const pair of result.pairs) {
      expect(pair.source).toBe('synthetic');
    }
  });

  it('assigns unique IDs', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    const ids = new Set(result.pairs.map(p => p.id));
    expect(ids.size).toBe(result.pairs.length);
  });

  it('includes domain in each pair', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    for (const pair of result.pairs) {
      expect(pair.domain).toBe('test');
    }
  });

  it('includes action in each pair', () => {
    const result = synthesizeFromSchemas(testSchemas, makeConfig());
    const actions = new Set(result.pairs.map(p => p.action));
    expect(actions.has('fetch')).toBe(true);
    expect(actions.has('toggle')).toBe(true);
    expect(actions.has('submit')).toBe(true);
  });

  // --- Edge Cases ---

  it('handles empty schemas', () => {
    const result = synthesizeFromSchemas([], makeConfig());
    expect(result.pairs.length).toBe(0);
    expect(result.metadata.commandCount).toBe(0);
  });

  it('handles schema with no roles', () => {
    const noRoleSchema = defineCommand({
      action: 'noop',
      roles: [],
      primaryRole: 'patient',
    });
    const result = synthesizeFromSchemas([noRoleSchema], makeConfig());
    expect(result.pairs.length).toBeGreaterThanOrEqual(0);
  });
});
