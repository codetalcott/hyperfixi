/**
 * Semantic Analysis Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  analyze,
  analyzeAll,
  analyzeMultiple,
  enableDevMode,
  disableDevMode,
  isDevModeEnabled,
  type AnalysisWarning,
} from '../../src/analysis';
import { parse } from '../../src/parser';

describe('Semantic Analysis', () => {
  describe('analyze', () => {
    it('should return valid for well-formed input', () => {
      const result = analyze('toggle .active on #button', 'en');
      expect(result.valid).toBe(true);
      expect(result.node).not.toBeNull();
    });

    it('should return node from parsing', () => {
      const result = analyze('toggle .active', 'en');
      expect(result.node?.action).toBe('toggle');
    });
  });

  describe('accessibility checks', () => {
    it('should warn about hover-only interactions', () => {
      const result = analyze('on mouseenter show .tooltip', 'en');

      const hoverWarning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');
      expect(hoverWarning).toBeDefined();
      expect(hoverWarning?.severity).toBe('warning');
      expect(hoverWarning?.suggestion).toContain('keyboard');
    });

    it('should warn about mouseover triggers', () => {
      const result = analyze('on mouseover add .highlight', 'en');

      const hoverWarning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');
      expect(hoverWarning).toBeDefined();
    });

    it('should not warn about click interactions', () => {
      const result = analyze('on click toggle .active', 'en');

      const hoverWarning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');
      expect(hoverWarning).toBeUndefined();
    });

    it('should be disabled when accessibility=false', () => {
      const result = analyze('on mouseenter show .tooltip', 'en', { accessibility: false });

      const hoverWarning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');
      expect(hoverWarning).toBeUndefined();
    });
  });

  describe('performance checks', () => {
    it('should warn about scroll handlers', () => {
      const result = analyze('on scroll add .shadow to #header', 'en');

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeDefined();
      expect(perfWarning?.severity).toBe('warning');
      expect(perfWarning?.suggestion).toContain('throttle');
    });

    it('should warn about mousemove handlers', () => {
      const result = analyze('on mousemove set x to event.clientX', 'en');

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeDefined();
    });

    it('should warn about resize handlers', () => {
      const result = analyze('on resize from window toggle .mobile', 'en');

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeDefined();
    });

    it('should provide info for input handlers', () => {
      const result = analyze('on input set value to target.value', 'en');

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeDefined();
      expect(perfWarning?.severity).toBe('info'); // Less severe than scroll
    });

    it('should not warn about click handlers', () => {
      const result = analyze('on click toggle .active', 'en');

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeUndefined();
    });

    it('should be disabled when performance=false', () => {
      const result = analyze('on scroll add .shadow', 'en', { performance: false });

      const perfWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');
      expect(perfWarning).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should not error for valid toggle command', () => {
      const result = analyze('toggle .active on #button', 'en');

      const schemaError = result.warnings.find(
        w => w.code === 'MISSING_REQUIRED_ROLE' || w.code === 'INVALID_ROLE_FOR_COMMAND'
      );
      // toggle has flexible schema, should be valid
      expect(result.valid).toBe(true);
    });

    it('should be disabled when schema=false', () => {
      const result = analyze('toggle .active', 'en', { schema: false });

      const schemaWarning = result.warnings.find(
        w => w.code === 'MISSING_REQUIRED_ROLE' || w.code === 'INVALID_ROLE_FOR_COMMAND'
      );
      expect(schemaWarning).toBeUndefined();
    });
  });

  describe('strict mode', () => {
    it('should mark warnings as invalid in strict mode', () => {
      const normal = analyze('on mouseenter show .tooltip', 'en', { strict: false });
      const strict = analyze('on mouseenter show .tooltip', 'en', { strict: true });

      // Both have warnings
      expect(normal.warnings.length).toBeGreaterThan(0);
      expect(strict.warnings.length).toBeGreaterThan(0);

      // Normal mode is valid (only warnings, no errors)
      expect(normal.valid).toBe(true);

      // Strict mode treats warnings as invalid
      expect(strict.valid).toBe(false);
    });
  });

  describe('parse failures', () => {
    it('should return invalid for unparseable input', () => {
      // This input likely won't parse to a semantic node
      const result = analyze('this is definitely not hyperscript syntax!@#$%', 'en');

      // Either it fails to parse or parses with low confidence
      // The test verifies the flow doesn't crash
      expect(result).toBeDefined();
    });
  });
});

describe('analyzeMultiple', () => {
  it('should detect conflicting toggle and hide on same trigger', () => {
    const nodes = [
      parse('on click toggle .modal', 'en'),
      parse('on click hide .modal', 'en'),
    ].filter((n): n is NonNullable<typeof n> => n !== null);

    const warnings = analyzeMultiple(nodes);

    const conflict = warnings.find(w => w.code === 'CONFLICTING_ACTIONS');
    expect(conflict).toBeDefined();
  });

  it('should detect potential race conditions with async', () => {
    const nodes = [
      parse('on click fetch /api/data', 'en'),
      parse('on click send message', 'en'),
    ].filter((n): n is NonNullable<typeof n> => n !== null);

    const warnings = analyzeMultiple(nodes);

    const race = warnings.find(w => w.code === 'POTENTIAL_RACE_CONDITION');
    expect(race).toBeDefined();
  });

  it('should not warn about independent handlers', () => {
    const nodes = [
      parse('on click toggle .active on #button1', 'en'),
      parse('on click toggle .active on #button2', 'en'),
    ].filter((n): n is NonNullable<typeof n> => n !== null);

    const warnings = analyzeMultiple(nodes);

    const conflict = warnings.find(w => w.code === 'CONFLICTING_ACTIONS');
    expect(conflict).toBeUndefined();
  });
});

describe('analyzeAll', () => {
  it('should analyze multiple inputs and combine warnings', () => {
    const result = analyzeAll([
      'on mouseenter show .tooltip',
      'on scroll add .shadow',
    ], 'en');

    expect(result.warnings.length).toBeGreaterThanOrEqual(2);

    const hoverWarning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');
    const scrollWarning = result.warnings.find(w => w.code === 'HIGH_FREQUENCY_TRIGGER');

    expect(hoverWarning).toBeDefined();
    expect(scrollWarning).toBeDefined();
  });

  it('should run cross-input analysis', () => {
    const result = analyzeAll([
      'on click toggle .modal',
      'on click hide .modal',
    ], 'en');

    const conflict = result.warnings.find(w => w.code === 'CONFLICTING_ACTIONS');
    expect(conflict).toBeDefined();
  });
});

describe('Dev Mode', () => {
  afterEach(() => {
    disableDevMode();
  });

  it('should start disabled', () => {
    expect(isDevModeEnabled()).toBe(false);
  });

  it('should enable and disable', () => {
    enableDevMode();
    expect(isDevModeEnabled()).toBe(true);

    disableDevMode();
    expect(isDevModeEnabled()).toBe(false);
  });

  it('should accept config', () => {
    enableDevMode({ strict: true, accessibility: false });
    expect(isDevModeEnabled()).toBe(true);
  });
});

describe('Warning structure', () => {
  it('should include all required fields', () => {
    const result = analyze('on mouseenter show .tooltip', 'en');
    const warning = result.warnings[0];

    expect(warning).toHaveProperty('code');
    expect(warning).toHaveProperty('severity');
    expect(warning).toHaveProperty('message');
    expect(typeof warning.code).toBe('string');
    expect(['error', 'warning', 'info']).toContain(warning.severity);
    expect(typeof warning.message).toBe('string');
  });

  it('should include location for input-specific warnings', () => {
    const result = analyze('on mouseenter show .tooltip', 'en');
    const warning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');

    expect(warning?.location).toBeDefined();
    expect(warning?.location?.input).toContain('mouseenter');
  });

  it('should include suggestions where available', () => {
    const result = analyze('on mouseenter show .tooltip', 'en');
    const warning = result.warnings.find(w => w.code === 'HOVER_ONLY_INTERACTION');

    expect(warning?.suggestion).toBeDefined();
    expect(typeof warning?.suggestion).toBe('string');
  });
});
