/**
 * BDD Domain Tests
 *
 * Validates the multilingual BDD specification DSL across 8 languages
 * (EN, ES, JA, AR, KO, ZH, TR, FR) covering SVO, SOV, and VSO word orders.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBDDDSL, parseBDDScenario, parseBDDFeature, renderBDD } from '../index';
import { bddCodeGenerator, generateFeature } from '../generators/playwright-generator';
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
    it('should support 8 languages', () => {
      const languages = bdd.getSupportedLanguages();
      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('ja');
      expect(languages).toContain('ar');
      expect(languages).toContain('ko');
      expect(languages).toContain('zh');
      expect(languages).toContain('tr');
      expect(languages).toContain('fr');
      expect(languages).toHaveLength(8);
    });

    it('should reject unsupported language', () => {
      expect(() => bdd.parse('given #button is exists', 'de')).toThrow();
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
  // Korean (SOV)
  // ===========================================================================

  describe('Korean (SOV)', () => {
    it('should parse Korean GIVEN (SOV order)', () => {
      const node = bdd.parse('#button 이 존재 전제', 'ko');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Korean WHEN (SOV order)', () => {
      const node = bdd.parse('#button 를 클릭 만약', 'ko');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Korean THEN (SOV order)', () => {
      const node = bdd.parse('#button 에 .active 그러면', 'ko');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Korean WHEN to Playwright', () => {
      const result = bdd.compile('#button 를 클릭 만약', 'ko');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('click');
    });
  });

  // ===========================================================================
  // Chinese (SVO)
  // ===========================================================================

  describe('Chinese (SVO)', () => {
    it('should parse Chinese GIVEN', () => {
      const node = bdd.parse('假设 #button 是 存在', 'zh');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Chinese WHEN', () => {
      const node = bdd.parse('当 点击 在 #button', 'zh');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Chinese THEN', () => {
      const node = bdd.parse('那么 #button 有 .active', 'zh');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Chinese WHEN to Playwright', () => {
      const result = bdd.compile('当 点击 在 #button', 'zh');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('click');
    });
  });

  // ===========================================================================
  // Turkish (SOV)
  // ===========================================================================

  describe('Turkish (SOV)', () => {
    it('should parse Turkish GIVEN (SOV order)', () => {
      // SOV: target state marker keyword → #button mevcut dir varsayalım
      const node = bdd.parse('#button mevcut dir varsayalım', 'tr');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse Turkish WHEN (SOV order)', () => {
      const node = bdd.parse('#button üzerinde tıkla olduğunda', 'tr');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse Turkish THEN (SOV order)', () => {
      // SOV: target de-marker assertion sahip-marker keyword → #button de .active sahip sonra
      const node = bdd.parse('#button de .active sahip sonra', 'tr');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile Turkish WHEN to Playwright', () => {
      const result = bdd.compile('#button üzerinde tıkla olduğunda', 'tr');
      expect(result.ok).toBe(true);
      expect(result.code).toBeDefined();
    });
  });

  // ===========================================================================
  // French (SVO)
  // ===========================================================================

  describe('French (SVO)', () => {
    it('should parse French GIVEN', () => {
      const node = bdd.parse('soit #button est visible', 'fr');
      expect(node.action).toBe('given');
      expect(node.roles.has('target')).toBe(true);
    });

    it('should parse French WHEN', () => {
      const node = bdd.parse('quand clic sur #button', 'fr');
      expect(node.action).toBe('when');
      expect(node.roles.has('action_type')).toBe(true);
    });

    it('should parse French THEN', () => {
      const node = bdd.parse('alors #button a .active', 'fr');
      expect(node.action).toBe('then');
      expect(node.roles.has('assertion')).toBe(true);
    });

    it('should compile French WHEN to Playwright', () => {
      const result = bdd.compile('quand clic sur #button', 'fr');
      expect(result.ok).toBe(true);
      expect(result.code).toContain('click');
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
// Escaping (Phase 1a)
// =============================================================================

describe('Escaping', () => {
  let bdd: MultilingualDSL;

  beforeAll(() => {
    bdd = createBDDDSL();
  });

  it('should escape single quotes in selectors via direct node', () => {
    // Build a node with a selector containing a single quote
    const node: any = {
      action: 'given',
      roles: new Map([
        ['target', { value: "#it's-ok" }],
        ['state', { value: 'visible' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("#it\\'s-ok");
    expect(code).toContain('toBeVisible');
  });

  it('should escape single quotes in values via direct node', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'type' }],
        ['target', { value: '#name' }],
        ['value', { value: "O'Reilly" }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("O\\'Reilly");
    expect(code).toContain('.fill(');
  });

  it('should escape backslashes in selectors', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '.my-class\\:hover' }],
        ['assertion', { value: 'visible' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('.my-class\\\\:hover');
    expect(code).toContain('toBeVisible');
  });

  it('should escape regex special chars in class assertions', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#el' }],
        ['assertion', { value: '.status(active)' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    // The parentheses should be escaped in the regex
    expect(code).toContain('status\\(active\\)');
    expect(code).toContain('toHaveClass');
  });

  it('should handle non-numeric count values safely', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#list' }],
        ['assertion', { value: 'count' }],
        ['expected_value', { value: 'abc' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toHaveCount(0)');
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

  // AND Edge Cases (Phase 1b)

  it('should error on leading AND with no preceding step', () => {
    const result = parseBDDScenario('and #panel is visible, when click on #button', 'en');
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('no preceding');
  });

  it('should error on empty AND content', () => {
    // "and" alone with no content — the DSL may or may not parse it
    // If it parses as AND with empty content, the scenario parser should catch it
    const result = parseBDDScenario('given #button is exists, and', 'en');
    // Either parse error or AND content error
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle AND-AND chaining with WHEN steps', () => {
    const result = parseBDDScenario(
      'when click on #button, and click on #panel, and click on #form',
      'en'
    );
    // All three should resolve as WHEN continuations
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0].action).toBe('when');
    // The AND steps should be resolved as when continuations
    for (const step of result.steps) {
      expect(step.action).toBe('when');
    }
    expect(result.errors).toHaveLength(0);
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

  // Spanish hover alias (Phase 1c)

  it('should compile Spanish hover to Playwright', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'sobrevolar' }],
        ['target', { value: '#boton' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('.hover()');
    expect(code).toContain('#boton');
  });
});

// =============================================================================
// Named Scenarios (Phase 3a)
// =============================================================================

describe('Named Scenarios', () => {
  it('should extract English scenario name', () => {
    const result = parseBDDScenario(
      'Scenario: Login flow\ngiven #login is visible\nwhen click on #submit',
      'en'
    );
    expect(result.name).toBe('Login flow');
    expect(result.steps).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should extract Spanish scenario name', () => {
    const result = parseBDDScenario('Escenario: Flujo de login\ndado #login es visible', 'es');
    expect(result.name).toBe('Flujo de login');
    expect(result.steps).toHaveLength(1);
  });

  it('should extract Japanese scenario name', () => {
    const result = parseBDDScenario('シナリオ: ログインフロー\n#login が 表示 前提', 'ja');
    expect(result.name).toBe('ログインフロー');
    expect(result.steps).toHaveLength(1);
  });

  it('should extract Arabic scenario name', () => {
    const result = parseBDDScenario('سيناريو: تدفق تسجيل الدخول\nبافتراض #login هو موجود', 'ar');
    expect(result.name).toBe('تدفق تسجيل الدخول');
    expect(result.steps).toHaveLength(1);
  });

  it('should use scenario name in generated Playwright test', () => {
    const result = parseBDDScenario('Scenario: Login flow\ngiven #login is visible', 'en');
    const code = bddCodeGenerator.generate(result.scenario as any);
    expect(code).toContain("test('Login flow'");
  });

  it('should default to "scenario" when no header present', () => {
    const result = parseBDDScenario('given #login is visible, when click on #submit', 'en');
    expect(result.name).toBeUndefined();
    const code = bddCodeGenerator.generate(result.scenario as any);
    expect(code).toContain("test('scenario'");
  });

  it('should handle case-insensitive scenario header', () => {
    const result = parseBDDScenario('scenario: My test\ngiven #button is exists', 'en');
    expect(result.name).toBe('My test');
  });

  it('should default to "Untitled" for empty scenario name', () => {
    const result = parseBDDScenario('Scenario:\ngiven #button is exists', 'en');
    expect(result.name).toBe('Untitled');
  });
});

// =============================================================================
// Richer Actions & Assertions (Phase 4)
// =============================================================================

describe('Richer Actions', () => {
  it('should generate double-click', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'double-click' }],
        ['target', { value: '#button' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('.dblclick()');
  });

  it('should generate right-click', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'right-click' }],
        ['target', { value: '#menu' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("button: 'right'");
  });

  it('should generate press key', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'press' }],
        ['value', { value: 'Escape' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("keyboard.press('Escape')");
  });

  it('should generate check/uncheck', () => {
    const check: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'check' }],
        ['target', { value: '#agree' }],
      ]),
    };
    const uncheck: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'uncheck' }],
        ['target', { value: '#agree' }],
      ]),
    };
    expect(bddCodeGenerator.generate(check)).toContain('.check()');
    expect(bddCodeGenerator.generate(uncheck)).toContain('.uncheck()');
  });

  it('should generate select option', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'select' }],
        ['target', { value: '#color' }],
        ['value', { value: 'red' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("selectOption('red')");
  });

  it('should generate wait for', () => {
    const node: any = {
      action: 'when',
      roles: new Map([
        ['action_type', { value: 'wait' }],
        ['target', { value: '#spinner' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('.waitFor()');
  });
});

describe('Richer Assertions', () => {
  it('should generate toBeDisabled assertion (GIVEN)', () => {
    const node: any = {
      action: 'given',
      roles: new Map([
        ['target', { value: '#submit' }],
        ['state', { value: 'disabled' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeDisabled');
  });

  it('should generate toBeChecked assertion (GIVEN)', () => {
    const node: any = {
      action: 'given',
      roles: new Map([
        ['target', { value: '#agree' }],
        ['state', { value: 'checked' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeChecked');
  });

  it('should generate toBeFocused assertion (GIVEN)', () => {
    const node: any = {
      action: 'given',
      roles: new Map([
        ['target', { value: '#input' }],
        ['state', { value: 'focused' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeFocused');
  });

  it('should generate toHaveValue assertion (THEN)', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#input' }],
        ['assertion', { value: 'value' }],
        ['expected_value', { value: 'hello' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("toHaveValue('hello')");
  });

  it('should generate toContainText assertion (THEN)', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#message' }],
        ['assertion', { value: 'contains' }],
        ['expected_value', { value: 'success' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain("toContainText('success')");
  });

  it('should generate toBeDisabled assertion (THEN)', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#button' }],
        ['assertion', { value: 'disabled' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toContain('toBeDisabled');
  });
});

// =============================================================================
// Playwright Output Validation (Phase 2a)
// =============================================================================

describe('Playwright Output Validation', () => {
  let bdd: MultilingualDSL;

  beforeAll(() => {
    bdd = createBDDDSL();
  });

  it('should generate exact GIVEN exists output', () => {
    const node = bdd.parse('given #button is exists', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toBe("  await expect(page.locator('#button')).toBeAttached();");
  });

  it('should generate exact GIVEN visible output', () => {
    const node = bdd.parse('given #header is visible', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toBe("  await expect(page.locator('#header')).toBeVisible();");
  });

  it('should generate exact WHEN click output', () => {
    const node = bdd.parse('when click on #button', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toBe("  await page.locator('#button').click();");
  });

  it('should generate exact THEN class assertion output', () => {
    const node = bdd.parse('then #button has .active', 'en');
    const code = bddCodeGenerator.generate(node);
    expect(code).toBe("  await expect(page.locator('#button')).toHaveClass(/active/);");
  });
});

// =============================================================================
// Edge Cases (Phase 2b)
// =============================================================================

describe('Edge Cases', () => {
  it('should handle long scenarios (10+ steps)', () => {
    const steps = Array.from({ length: 10 }, (_, i) => `given #el${i} is visible`).join(', ');
    const result = parseBDDScenario(steps, 'en');
    expect(result.steps).toHaveLength(10);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle numeric count assertion', () => {
    const node: any = {
      action: 'then',
      roles: new Map([
        ['target', { value: '#list' }],
        ['assertion', { value: 'count' }],
        ['expected_value', { value: '5' }],
      ]),
    };
    const code = bddCodeGenerator.generate(node);
    expect(code).toBe("  await expect(page.locator('#list')).toHaveCount(5);");
  });
});

// =============================================================================
// Cross-Language Full Scenarios (Phase 2c)
// =============================================================================

describe('Cross-Language Full Scenarios', () => {
  it('should parse full English scenario', () => {
    const result = parseBDDScenario(
      'given #login is visible, when click on #submit, then #dashboard has visible',
      'en'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.steps[0].action).toBe('given');
    expect(result.steps[1].action).toBe('when');
    expect(result.steps[2].action).toBe('then');
  });

  it('should parse full Spanish scenario', () => {
    const result = parseBDDScenario(
      'dado #login es visible, cuando clic en #submit, entonces #dashboard tiene visible',
      'es'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should parse full Japanese scenario (SOV)', () => {
    const result = parseBDDScenario(
      '#login が 表示 前提、#submit を クリック したら、#dashboard に visible ならば',
      'ja'
    );
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should parse full Arabic scenario (VSO)', () => {
    const result = parseBDDScenario(
      'بافتراض #login هو ظاهر، عند نقر على #submit، فإن #dashboard يحتوي ظاهر',
      'ar'
    );
    // Arabic comma (،) is the delimiter
    expect(result.steps).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// BDD Renderer (Phase 5b)
// =============================================================================

describe('BDD Renderer', () => {
  let bdd: MultilingualDSL;

  beforeAll(() => {
    bdd = createBDDDSL();
  });

  it('should render GIVEN step in English', () => {
    const node = bdd.parse('given #button is visible', 'en');
    const rendered = renderBDD(node, 'en');
    expect(rendered).toContain('Given');
    expect(rendered).toContain('#button');
    expect(rendered).toContain('visible');
  });

  it('should render WHEN step in English', () => {
    const node = bdd.parse('when click on #button', 'en');
    const rendered = renderBDD(node, 'en');
    expect(rendered).toContain('When');
    expect(rendered).toContain('click');
  });

  it('should render THEN step in English', () => {
    const node = bdd.parse('then #button has .active', 'en');
    const rendered = renderBDD(node, 'en');
    expect(rendered).toContain('Then');
    expect(rendered).toContain('#button');
    expect(rendered).toContain('.active');
  });

  it('should render step to Spanish', () => {
    const node = bdd.parse('given #button is visible', 'en');
    const rendered = renderBDD(node, 'es');
    expect(rendered).toContain('Dado');
    expect(rendered).toContain('#button');
  });

  it('should render step to Japanese', () => {
    const node = bdd.parse('given #button is visible', 'en');
    const rendered = renderBDD(node, 'ja');
    expect(rendered).toContain('前提');
    expect(rendered).toContain('#button');
  });

  it('should render named scenario', () => {
    const result = parseBDDScenario('Scenario: Login flow\ngiven #login is visible', 'en');
    const rendered = renderBDD(result.scenario as any, 'es');
    expect(rendered).toContain('Escenario:');
    expect(rendered).toContain('Login flow');
  });

  it('should render unnamed scenario as joined steps', () => {
    const result = parseBDDScenario('given #button is visible, when click on #button', 'en');
    const rendered = renderBDD(result.scenario as any, 'en');
    expect(rendered).toContain('Given');
    expect(rendered).toContain('When');
    expect(rendered).not.toContain('Scenario:');
  });
});

// =============================================================================
// Feature Parser (Phase 3b-c)
// =============================================================================

describe('Feature Parser', () => {
  it('should parse a Feature with two Scenarios', () => {
    const input = [
      'Feature: Authentication',
      '  Scenario: Login',
      '    given #login is visible',
      '    when click on #submit',
      '  Scenario: Logout',
      '    given #dashboard is visible',
      '    when click on #logout',
    ].join('\n');

    const result = parseBDDFeature(input, 'en');
    expect(result.name).toBe('Authentication');
    expect(result.scenarios).toHaveLength(2);
    expect(result.scenarios[0].name).toBe('Login');
    expect(result.scenarios[1].name).toBe('Logout');
    expect(result.background).toBeNull();
    expect(result.errors).toHaveLength(0);
  });

  it('should parse a Feature with Background', () => {
    const input = [
      'Feature: Auth',
      '  Background:',
      '    given #login is visible',
      '  Scenario: Login',
      '    when click on #submit',
    ].join('\n');

    const result = parseBDDFeature(input, 'en');
    expect(result.name).toBe('Auth');
    expect(result.background).not.toBeNull();
    expect(result.background!.steps).toHaveLength(1);
    expect(result.background!.steps[0].action).toBe('given');
    expect(result.scenarios).toHaveLength(1);
  });

  it('should parse Spanish Feature', () => {
    const input = [
      'Funcionalidad: Autenticación',
      '  Escenario: Inicio de sesión',
      '    dado #login es visible',
    ].join('\n');

    const result = parseBDDFeature(input, 'es');
    expect(result.name).toBe('Autenticación');
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].name).toBe('Inicio de sesión');
  });

  it('should parse Japanese Feature', () => {
    const input = ['機能: 認証', '  シナリオ: ログイン', '    #login が 表示 前提'].join('\n');

    const result = parseBDDFeature(input, 'ja');
    expect(result.name).toBe('認証');
    expect(result.scenarios).toHaveLength(1);
  });
});

// =============================================================================
// Feature Generator (Phase 3b-c)
// =============================================================================

describe('Feature Generator', () => {
  it('should generate test.describe with two scenarios', () => {
    const input = [
      'Feature: Auth',
      '  Scenario: Login',
      '    given #login is visible',
      '  Scenario: Logout',
      '    given #dashboard is visible',
    ].join('\n');

    const result = parseBDDFeature(input, 'en');
    const code = generateFeature(result);
    expect(code).toContain("test.describe('Auth'");
    expect(code).toContain("test('Login'");
    expect(code).toContain("test('Logout'");
    expect(code).toContain('toBeVisible');
  });

  it('should generate test.beforeEach from Background', () => {
    const input = [
      'Feature: Auth',
      '  Background:',
      '    given #app is visible',
      '  Scenario: Login',
      '    when click on #submit',
    ].join('\n');

    const result = parseBDDFeature(input, 'en');
    const code = generateFeature(result);
    expect(code).toContain('test.beforeEach');
    expect(code).toContain('toBeVisible');
    expect(code).toContain("test('Login'");
    expect(code).toContain('.click()');
  });
});
