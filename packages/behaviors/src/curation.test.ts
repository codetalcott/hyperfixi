import { describe, it, expect } from 'vitest';
import {
  CURATED_BEHAVIORS,
  OPTIONAL_BEHAVIORS,
  EXPERIMENTAL_BEHAVIORS,
  CURATION_STATUS,
  curationStatusOf,
  isCurated,
} from './curation';
import { ALL_BEHAVIOR_NAMES } from './generated/metadata';

describe('curation', () => {
  it('partitions all behaviors into exactly one status', () => {
    const all = [...CURATED_BEHAVIORS, ...OPTIONAL_BEHAVIORS, ...EXPERIMENTAL_BEHAVIORS];
    // No overlaps.
    expect(new Set(all).size).toBe(all.length);
    // Covers exactly the known behavior set.
    expect(new Set(all)).toEqual(new Set(ALL_BEHAVIOR_NAMES));
  });

  it('marks the curated 5', () => {
    expect([...CURATED_BEHAVIORS].sort()).toEqual(
      ['AutoDismiss', 'ClickOutside', 'Clipboard', 'Removable', 'Toggleable'].sort()
    );
  });

  it('marks the experimental 3 (beyond the boundary)', () => {
    expect([...EXPERIMENTAL_BEHAVIORS].sort()).toEqual(['Draggable', 'Resizable', 'Sortable']);
  });

  it('curationStatusOf / isCurated agree with the table', () => {
    expect(curationStatusOf('Toggleable')).toBe('curated');
    expect(curationStatusOf('Draggable')).toBe('experimental');
    expect(curationStatusOf('Tabs')).toBe('optional');
    expect(curationStatusOf('Nope')).toBeUndefined();
    expect(isCurated('Clipboard')).toBe(true);
    expect(isCurated('Sortable')).toBe(false);
  });

  it('every behavior has a status', () => {
    for (const name of ALL_BEHAVIOR_NAMES) {
      expect(CURATION_STATUS[name]).toBeDefined();
    }
  });
});
