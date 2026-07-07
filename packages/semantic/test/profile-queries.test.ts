/**
 * Tests for the profile-query helpers (public API for mcp-server/LSP/domain
 * bridges — see docs-internal/FRAMEWORK_SEMANTIC_BRIDGE_PLAN.md, Phase 1
 * riding item).
 */

import { describe, it, expect } from 'vitest';
import { getKeywordTranslations, getRoleMarkers } from '../src/generators/profile-queries';
import { KNOWN_PROFILES } from '../src/generators/known-profiles';

describe('getKeywordTranslations', () => {
  it('returns a translation for every known profile that defines the keyword', () => {
    const translations = getKeywordTranslations('toggle');
    // Every shipped profile translates the flagship keyword.
    expect(Object.keys(translations).sort()).toEqual(Object.keys(KNOWN_PROFILES).sort());
    expect(translations.en?.primary).toBe('toggle');
    expect(translations.ja?.primary).toBe('切り替え');
  });

  it('narrows to the requested languages', () => {
    const translations = getKeywordTranslations('toggle', ['en', 'ja']);
    expect(Object.keys(translations).sort()).toEqual(['en', 'ja']);
  });

  it('omits languages that lack the keyword instead of inserting holes', () => {
    const translations = getKeywordTranslations('definitely-not-a-keyword');
    expect(translations).toEqual({});
  });

  it('ignores unknown language codes', () => {
    const translations = getKeywordTranslations('toggle', ['en', 'xx']);
    expect(Object.keys(translations)).toEqual(['en']);
  });
});

describe('getRoleMarkers', () => {
  it('returns all markers for a language when no role is given', () => {
    const markers = getRoleMarkers('ja');
    expect(markers.source?.primary).toBe('から');
    expect(markers.destination?.primary).toBe('に');
  });

  it('returns a single marker when a role is given', () => {
    expect(getRoleMarkers('ja', 'source')?.primary).toBe('から');
    expect(getRoleMarkers('en', 'source')?.primary).toBe('from');
  });

  it('returns undefined for a role the language has no marker for', () => {
    expect(getRoleMarkers('en', 'instrument')).toBeUndefined();
  });

  it('returns an empty map / undefined for an unknown language', () => {
    expect(getRoleMarkers('xx')).toEqual({});
    expect(getRoleMarkers('xx', 'source')).toBeUndefined();
  });
});
