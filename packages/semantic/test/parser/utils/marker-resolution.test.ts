/**
 * Tests for Marker Resolution Utility
 */

import { describe, it, expect } from 'vitest';
import {
  resolveMarkerForRole,
  getAllMarkersForRole,
  getDefaultRoleMarker,
} from '../../../src/parser/utils/marker-resolution';
import type { LanguageProfile } from '../../../src/generators/language-profiles';
import type { SemanticRole } from '../../../src/types';

// Mock language profiles for testing
const mockEnglishProfile: LanguageProfile = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  wordOrder: 'SVO',
  direction: 'ltr',
  caseMarking: 'preposition',
  usesSpaces: true,
  keywords: {},
  roleMarkers: {
    destination: { primary: 'on', position: 'before' },
    patient: { primary: '', position: 'before' },
    source: { primary: 'from', position: 'before', alternatives: ['out of'] },
  },
};

const mockKoreanProfile: LanguageProfile = {
  code: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  wordOrder: 'SOV',
  direction: 'ltr',
  caseMarking: 'postposition',
  usesSpaces: true,
  keywords: {},
  roleMarkers: {
    destination: { primary: '에', position: 'after', alternatives: ['에서'] },
    patient: { primary: '를', position: 'after', alternatives: ['을'] },
  },
};

describe('Marker Resolution Utility', () => {
  describe('resolveMarkerForRole', () => {
    it('should return default marker from profile', () => {
      const roleSpec = { role: 'destination' as SemanticRole };
      const resolved = resolveMarkerForRole(roleSpec, mockEnglishProfile);

      expect(resolved).not.toBeNull();
      expect(resolved!.primary).toBe('on');
      expect(resolved!.position).toBe('before');
      expect(resolved!.isOverride).toBe(false);
    });

    it('should return override marker when specified', () => {
      const roleSpec = {
        role: 'destination' as SemanticRole,
        markerOverride: { en: 'into' },
      };
      const resolved = resolveMarkerForRole(roleSpec, mockEnglishProfile);

      expect(resolved).not.toBeNull();
      expect(resolved!.primary).toBe('into');
      expect(resolved!.isOverride).toBe(true);
    });

    it('should return empty string override (suppresses marker)', () => {
      const roleSpec = {
        role: 'destination' as SemanticRole,
        markerOverride: { en: '' },
      };
      const resolved = resolveMarkerForRole(roleSpec, mockEnglishProfile);

      expect(resolved).not.toBeNull();
      expect(resolved!.primary).toBe('');
      expect(resolved!.isOverride).toBe(true);
    });

    it('should include alternatives from profile', () => {
      const roleSpec = { role: 'source' as SemanticRole };
      const resolved = resolveMarkerForRole(roleSpec, mockEnglishProfile);

      expect(resolved).not.toBeNull();
      expect(resolved!.primary).toBe('from');
      expect(resolved!.alternatives).toContain('out of');
    });

    it('should return null for role without marker', () => {
      const roleSpec = { role: 'style' as SemanticRole };
      const resolved = resolveMarkerForRole(roleSpec, mockEnglishProfile);

      expect(resolved).toBeNull();
    });

    it('should handle postposition markers (after)', () => {
      const roleSpec = { role: 'destination' as SemanticRole };
      const resolved = resolveMarkerForRole(roleSpec, mockKoreanProfile);

      expect(resolved).not.toBeNull();
      expect(resolved!.primary).toBe('에');
      expect(resolved!.position).toBe('after');
    });
  });

  describe('getAllMarkersForRole', () => {
    it('should return primary and alternatives', () => {
      const roleSpec = { role: 'source' as SemanticRole };
      const markers = getAllMarkersForRole(roleSpec, mockEnglishProfile);

      expect(markers).toContain('from');
      expect(markers).toContain('out of');
      expect(markers.length).toBe(2);
    });

    it('should return empty array for role without marker', () => {
      const roleSpec = { role: 'style' as SemanticRole };
      const markers = getAllMarkersForRole(roleSpec, mockEnglishProfile);

      expect(markers).toEqual([]);
    });

    it('should return just primary when no alternatives', () => {
      const roleSpec = { role: 'destination' as SemanticRole };
      const markers = getAllMarkersForRole(roleSpec, mockEnglishProfile);

      expect(markers).toEqual(['on']);
    });
  });

  describe('getDefaultRoleMarker', () => {
    it('should return marker from profile', () => {
      const marker = getDefaultRoleMarker(mockEnglishProfile, 'destination');

      expect(marker).not.toBeUndefined();
      expect(marker!.primary).toBe('on');
    });

    it('should return undefined for unknown role', () => {
      const marker = getDefaultRoleMarker(mockEnglishProfile, 'unknown' as SemanticRole);

      expect(marker).toBeUndefined();
    });
  });
});
