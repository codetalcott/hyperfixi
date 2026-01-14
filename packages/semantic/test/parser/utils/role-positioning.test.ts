/**
 * Tests for Role Positioning Utility
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE_PRIORITY,
  getRolePriority,
  sortRolesByPriority,
  sortRolesByWordOrder,
} from '../../../src/parser/utils/role-positioning';
import type { SemanticRole } from '../../../src/types';

describe('Role Positioning Utility', () => {
  describe('ROLE_PRIORITY', () => {
    it('should define patient as highest priority', () => {
      expect(ROLE_PRIORITY.patient).toBe(1);
    });

    it('should define destination as second priority', () => {
      expect(ROLE_PRIORITY.destination).toBe(2);
    });

    it('should define common pattern roles', () => {
      expect(ROLE_PRIORITY.patient).toBeDefined();
      expect(ROLE_PRIORITY.destination).toBeDefined();
      expect(ROLE_PRIORITY.source).toBeDefined();
      expect(ROLE_PRIORITY.style).toBeDefined();
      expect(ROLE_PRIORITY.manner).toBeDefined();
      expect(ROLE_PRIORITY.goal).toBeDefined();
    });
  });

  describe('getRolePriority', () => {
    it('should return correct priority for known roles', () => {
      expect(getRolePriority('patient')).toBe(1);
      expect(getRolePriority('destination')).toBe(2);
      expect(getRolePriority('source')).toBe(3);
    });

    it('should return 99 for unknown roles', () => {
      expect(getRolePriority('unknown' as SemanticRole)).toBe(99);
    });
  });

  describe('sortRolesByPriority', () => {
    it('should sort roles by priority', () => {
      const roles: SemanticRole[] = ['destination', 'patient', 'source'];
      const sorted = sortRolesByPriority(roles);
      expect(sorted).toEqual(['patient', 'destination', 'source']);
    });

    it('should not mutate original array', () => {
      const roles: SemanticRole[] = ['destination', 'patient'];
      const sorted = sortRolesByPriority(roles);
      expect(roles[0]).toBe('destination');
      expect(sorted[0]).toBe('patient');
    });

    it('should handle empty array', () => {
      expect(sortRolesByPriority([])).toEqual([]);
    });

    it('should handle single element array', () => {
      expect(sortRolesByPriority(['patient'])).toEqual(['patient']);
    });
  });

  describe('sortRolesByWordOrder', () => {
    const roles = [
      { role: 'patient' as SemanticRole, svoPosition: 1, sovPosition: 2 },
      { role: 'destination' as SemanticRole, svoPosition: 2, sovPosition: 1 },
    ];

    it('should sort by svoPosition for SVO word order', () => {
      const sorted = sortRolesByWordOrder(roles, 'SVO');
      expect(sorted[0].role).toBe('patient');
      expect(sorted[1].role).toBe('destination');
    });

    it('should sort by sovPosition for SOV word order', () => {
      const sorted = sortRolesByWordOrder(roles, 'SOV');
      expect(sorted[0].role).toBe('destination');
      expect(sorted[1].role).toBe('patient');
    });

    it('should treat VSO same as SVO', () => {
      const sorted = sortRolesByWordOrder(roles, 'VSO');
      expect(sorted[0].role).toBe('patient');
    });

    it('should not mutate original array', () => {
      const sorted = sortRolesByWordOrder(roles, 'SOV');
      expect(roles[0].role).toBe('patient');
      expect(sorted[0].role).toBe('destination');
    });

    it('should handle missing position fields gracefully', () => {
      const rolesNoPos = [
        { role: 'patient' as SemanticRole },
        { role: 'destination' as SemanticRole, svoPosition: 1 },
      ];
      const sorted = sortRolesByWordOrder(rolesNoPos, 'SVO');
      // destination has position 1, patient defaults to 99
      expect(sorted[0].role).toBe('destination');
    });
  });
});
