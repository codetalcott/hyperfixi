/**
 * Tests for SYNTAX table derivation and generation.
 *
 * Verifies that:
 * 1. deriveEnglishSyntax() produces correct output from schemas
 * 2. The generated syntax-table.ts is up to date
 * 3. deriveSyntax() works for non-English languages
 */

import { describe, it, expect } from 'vitest';
import { deriveEnglishSyntax, deriveSyntax } from '../src/derive-syntax';
import { SYNTAX as GENERATED_SYNTAX } from '../src/generated/syntax-table';
import { commandSchemas, englishProfile } from '@lokascript/semantic';

// ---------------------------------------------------------------------------
// English derivation
// ---------------------------------------------------------------------------

describe('deriveEnglishSyntax', () => {
  const derived = deriveEnglishSyntax(commandSchemas, englishProfile);

  it('produces entries for every command schema', () => {
    const schemaKeys = Object.keys(commandSchemas).sort();
    const derivedKeys = Object.keys(derived).sort();
    expect(derivedKeys).toEqual(schemaKeys);
  });

  it('has no extra entries beyond schemas', () => {
    const schemaActions = new Set(Object.keys(commandSchemas));
    for (const action of Object.keys(derived)) {
      expect(schemaActions.has(action)).toBe(true);
    }
  });

  // Spot-check representative commands from each category
  it('derives class/attribute commands correctly', () => {
    expect(derived.toggle).toEqual([
      ['patient', ''],
      ['destination', 'on'],
    ]);
    expect(derived.add).toEqual([
      ['patient', ''],
      ['destination', 'to'],
    ]);
    expect(derived.remove).toEqual([
      ['patient', ''],
      ['source', 'from'],
    ]);
  });

  it('derives content commands correctly', () => {
    expect(derived.put).toEqual([
      ['patient', ''],
      ['destination', 'into'],
    ]);
    expect(derived.swap).toEqual([
      ['method', ''],
      ['destination', 'of'],
      ['patient', 'with'],
    ]);
  });

  it('derives go with renderOverride (no preposition)', () => {
    expect(derived.go).toEqual([['destination', '']]);
  });

  it('derives fetch with renderOverride on source (no preposition)', () => {
    expect(derived.fetch).toEqual([
      ['source', ''],
      ['responseType', 'as'],
      ['method', 'via'],
      ['destination', 'on'],
    ]);
  });

  it('uses RENDER_OVERRIDES for repeat', () => {
    expect(derived.repeat).toEqual([
      ['quantity', ''],
      ['condition', 'until'],
    ]);
  });

  it('derives zero-role commands as empty arrays', () => {
    expect(derived.break).toEqual([]);
    expect(derived.exit).toEqual([]);
    expect(derived.continue).toEqual([]);
    expect(derived.compound).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Generated file validation
// ---------------------------------------------------------------------------

describe('generated syntax-table.ts', () => {
  const freshlyDerived = deriveEnglishSyntax(commandSchemas, englishProfile);

  it('is up to date (run `npm run generate:syntax` if this fails)', () => {
    for (const action of Object.keys(commandSchemas)) {
      expect(GENERATED_SYNTAX[action]).toEqual(freshlyDerived[action]);
    }
  });

  it('has no extra entries beyond schemas', () => {
    const schemaActions = new Set(Object.keys(commandSchemas));
    for (const action of Object.keys(GENERATED_SYNTAX)) {
      expect(schemaActions.has(action)).toBe(true);
    }
  });

  it('has entries for every schema', () => {
    for (const action of Object.keys(commandSchemas)) {
      expect(GENERATED_SYNTAX[action]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Multi-language derivation
// ---------------------------------------------------------------------------

describe('deriveSyntax (multi-language)', () => {
  it('English deriveSyntax matches deriveEnglishSyntax', () => {
    const viaGeneral = deriveSyntax(commandSchemas, englishProfile, 'en');
    const viaEnglish = deriveEnglishSyntax(commandSchemas, englishProfile);
    expect(viaGeneral).toEqual(viaEnglish);
  });

  it('produces entries for every schema regardless of language', () => {
    // Use English profile with a non-English lang code to test fallback behavior
    const result = deriveSyntax(commandSchemas, englishProfile, 'xx');
    const schemaKeys = Object.keys(commandSchemas).sort();
    const resultKeys = Object.keys(result).sort();
    expect(resultKeys).toEqual(schemaKeys);
  });

  it('does not apply RENDER_OVERRIDES for non-English languages', () => {
    // repeat gets RENDER_OVERRIDE for 'en', but should derive from schema for others
    const result = deriveSyntax(commandSchemas, englishProfile, 'xx');
    // repeat schema has loopType, quantity, event, source roles — not the override
    expect(result.repeat).not.toEqual([
      ['quantity', ''],
      ['condition', 'until'],
    ]);
  });

  it('sorts by sovPosition for SOV profile', () => {
    // Create a minimal SOV profile to verify sorting
    const sovProfile = {
      ...englishProfile,
      wordOrder: 'SOV' as const,
    };
    const result = deriveSyntax(commandSchemas, sovProfile, 'test');
    // toggle: patient svoPosition=1/sovPosition=2, destination svoPosition=2/sovPosition=1
    // SOV: destination (sovPosition=1) should come first
    expect(result.toggle[0][0]).toBe('destination');
    expect(result.toggle[1][0]).toBe('patient');
  });

  it('uses renderOverride over markerOverride', () => {
    // go has markerOverride.en='to' and renderOverride.en=''
    // For 'en', renderOverride should win
    const result = deriveSyntax(commandSchemas, englishProfile, 'en');
    expect(result.go).toEqual([['destination', '']]);
  });
});
