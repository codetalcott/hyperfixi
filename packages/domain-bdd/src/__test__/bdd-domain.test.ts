/**
 * BDD Domain Tests
 *
 * Validates the multilingual BDD specification DSL across 4 languages
 * (EN, ES, JA, AR) covering SVO, SOV, and VSO word orders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBDDDSL, parseBDDScenario } from '../index';
import { bddCodeGenerator } from '../generators/playwright-generator';
import type { MultilingualDSL } from '@lokascript/framework';

describe('BDD Domain', () => {
  let bdd: MultilingualDSL;

  beforeAll(() => {
    bdd = createBDDDSL();
  });

  // ===========================================================================
  // Language Support
  // ===========================================================================

  describe('Language Support', () => {
    it('should support 4 languages', () => {
      const languages = bdd.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toHaveLength(4);
    });

    it('should reject unsupported language', () => {
      expect(() => bdd.parse('given #button is exists', 'fr')).toThrow();
    });
  });

  // ===========================================================================
  // English (SVO)
  // ===========================================================================

  describe('English (SVO)', () => {
    it('should parse GIVEN step', () => {
      const node = bdd.parse('given #button is exists', 'en');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
      expect(node.roles.has('state')).toBe(true);
    });

    it('should parse WHEN step', () => {
      const node = bdd.parse('when click on #button', 'en');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse THEN step', () => {
      const node = bdd.parse('then #button has .active', 'en');
      expect(node.action).toBe('then');
      expect(node.roles.has('target')).toBe(true);
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should parse AND step', () => {
      const node = bdd.parse('and visible', 'en');
      expect(node.action).toBe('and');
      expect(node.roles.has('content')).toBe(true);
    });

    it('should compile GIVEN to Playwright assertion', () => {
      const result = bdd.compile('given #button is exists', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('toBeAttached');
    });

    it('should compile WHEN to Playwright action', () => {
      const result = bdd.compile('when click on #button', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('click');
    });

    it('should compile THEN to Playwright assertion', () => {
      const result = bdd.compile('then #button has .active', 'en');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('toHaveClass');
    });

    it('should validate correct input', () => {
      const result = bdd.validate('given #button is exists', 'en');
      expect(result.valid).toBe(true);
      expect(result.node).toBeDefined();
    });
  });

  // ===========================================================================
  // Spanish (SVO)
  // ===========================================================================

  describe('Spanish (SVO)', () => {
    it('should parse Spanish GIVEN', () => {
      const node = bdd.parse('dado #boton es existe', 'es');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Spanish WHEN', () => {
      const node = bdd.parse('cuando clic en #boton', 'es');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Spanish THEN', () => {
      const node = bdd.parse('entonces #boton tiene .active', 'es');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Spanish WHEN to Playwright', () => {
      const result = bdd.compile('cuando clic en #boton', 'es');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('click');
    });
  });

  // ===========================================================================
  // Japanese (SOV)
  // ===========================================================================

  describe('Japanese (SOV)', () => {
    it('should parse Japanese GIVEN (SOV order)', () => {
      const node = bdd.parse('#button が 存在 前提', 'ja');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Japanese WHEN (SOV order)', () => {
      const node = bdd.parse('#button を クリック したら', 'ja');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Japanese THEN (SOV order)', () => {
      const node = bdd.parse('#button に .active ならば', 'ja');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Japanese WHEN to Playwright', () => {
      const result = bdd.compile('#button を クリック したら', 'ja');
      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  // ===========================================================================
  // Arabic (VSO)
  // ===========================================================================

  describe('Arabic (VSO)', () => {
    it('should parse Arabic GIVEN (VSO order)', () => {
      const node = bdd.parse('بافتراض #button هو موجود', 'ar');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Arabic WHEN (VSO order)', () => {
      const node = bdd.parse('عند نقر على #button', 'ar');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Arabic THEN (VSO order)', () => {
      const node = bdd.parse('فإن #button يحتوي .active', 'ar');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Arabic WHEN to Playwright', () => {
      const result = bdd.compile('عند نقر على #button', 'ar');
      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  // ===========================================================================
  // Cross-Language Semantic Equivalence
  // ===========================================================================

  describe('Semantic Equivalence', () => {
    it('should parse EN and ES GIVEN to equivalent structures', () => {
      const en = bdd.parse('given #button is exists', 'en');
      const es = bdd.parse('dado #button es existe', 'es');
      expect(en.action).toBe(es.action);
      expect(en.roles.size).toBe(es.roles.size);
    });

    it('should parse EN and JA WHEN to equivalent structures', () => {
      const en = bdd.parse('when click on #button', 'en');
      const ja = bdd.parse('#button を クリック したら', 'ja');
      expect(en.action).toBe(ja.action);
      expect(en.roles.has('action_type')).toBe(ja.roles.has('action_type'));
    });

    it('should parse EN and AR THEN to equivalent structures', () => {
      const en = bdd.parse('then #button has .active', 'en');
      const ar = bdd.parse('فإن #button يحتوي .active', 'ar');
      expect(en.action).toBe(ar.action);
      expect(en.roles.has('target')).toBe(ar.roles.has('target'));
      expect(en.roles.has('assertion')).toBe(ar.roles.has('assertion'));
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle empty input', () => {
      expect(() => bdd.parse('', 'en')).toThrow();
    });

    it('should handle whitespace-only input', () => {
      expect(() => bdd.parse('   ', 'en')).toThrow();
    });

    it('should provide error info for unrecognized input', () => {
      const result = bdd.validate('xyzzy foobar', 'en');
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Scenario Parser
// =============================================================================

describe('Scenario Parser', () => {
  it('should split English scenario on commas', () => {
    const result = parseBDDScenario(
      'given #button is exists, when click on #button, then #button has .active',
      'en'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.steps[0].action).toBe('given');
    expect(result.steps[1].action).toBe('when');
    expect(result.steps[2].action).toBe('then');
  });

  it('should split on newlines', () => {
    const result = parseBDDScenario(
      'given #button is exists\nwhen click on #button\nthen #button has .active',
      'en'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should split Japanese on full-width comma', () => {
    const result = parseBDDScenario(
      '#button が 存在 前提、#button を クリック したら、#button に .active ならば',
      'ja'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should build a compound scenario node', () => {
    const result = parseBDDScenario('given #button is exists, when click on #button', 'en');
    expect(result.scenario.kind).toBe('compound');
    expect(result.scenario.action).toBe('scenario');
    expect(result.scenario.statements).toHaveLength(2);
    expect(result.scenario.chainType).toBe('sequential');
  });

  it('should handle empty input gracefully', () => {
    const result = parseBDDScenario('', 'en');
    expect(result.steps).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors for unparseable steps', () => {
    const result = parseBDDScenario(
      'given #button is exists, xyzzy foobar baz, then #button has .active',
      'en'
    );
    // First and last should parse; middle should fail
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });
});

// =============================================================================
// Playwright Generator
// =============================================================================

describe('Playwright Generator', () => {
  let bdd: MultilingualDSL;

  beforeAll(() => {
    bdd = createBDDDSL();
  });

  it('should generate exists assertion', () => {
    const node = bdd.parse('given #button is exists', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeAttached');
    expect(code).toContain('#button');
  });

  it('should generate visible assertion', () => {
    const node = bdd.parse('given #header is visible', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeVisible');
  });

  it('should generate click action', () => {
    const node = bdd.parse('when click on #button', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('.click()');
  });

  it('should generate class assertion for .active', () => {
    const node = bdd.parse('then #button has .active', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toHaveClass');
    expect(code).toContain('active');
  });

  it('should generate compound scenario as full test', () => {
    const result = parseBDDScenario(
      'given #button is exists, when click on #button, then #button has .active',
      'en'
    );
    const code = bddCodeGenerator.generate(result.scenario as any);
    expect(code).toContain("test('scenario'");
    expect(code).toContain('toBeAttached');
    expect(code).toContain('.click()');
    expect(code).toContain('toHaveClass');
  });
});
