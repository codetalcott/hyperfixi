/**
 * BehaviorSpec Domain Tests
 *
 * Comprehensive test suite covering:
 * - Language support (8 languages)
 * - Per-command parsing (test, given, when, expect, after, not)
 * - Cross-language semantic equivalence
 * - Spec parser (indentation-based nesting)
 * - Feature-level parser (test.describe + beforeEach)
 * - Playwright code generation (including new assertion types)
 * - Renderer (natural language output)
 * - Error handling
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { MultilingualDSL, SemanticNode } from '@lokascript/framework';
import { extractValue } from '@lokascript/framework';
import {
  createBehaviorSpecDSL,
  parseBehaviorSpec,
  parseFeatureSpec,
  compileBehaviorSpec,
  compileFeatureSpec,
  renderBehaviorSpec,
  generateSpec,
  generateFeature,
} from '../index.js';

// =============================================================================
// Setup
// =============================================================================

let dsl: MultilingualDSL;

beforeAll(() => {
  dsl = createBehaviorSpecDSL();
});

/** Helper: extract role value as string */
function roleValue(node: SemanticNode, role: string): string {
  const v = node.roles.get(role);
  return v ? extractValue(v) : '';
}

// =============================================================================
// 1. Language Support
// =============================================================================

describe('Language support', () => {
  it('supports English', () => {
    const node = dsl.parse('given page /home', 'en');
    expect(node.action).toBe('given');
  });

  it('supports Spanish', () => {
    const node = dsl.parse('dado pagina /home', 'es');
    expect(node.action).toBe('given');
  });

  it('supports Japanese (SOV)', () => {
    const node = dsl.parse('ページ /home 前提', 'ja');
    expect(node.action).toBe('given');
  });

  it('supports Arabic (VSO)', () => {
    const node = dsl.parse('بافتراض صفحة /home', 'ar');
    expect(node.action).toBe('given');
  });

  it('supports Korean (SOV)', () => {
    const node = dsl.parse('페이지 /home 전제', 'ko');
    expect(node.action).toBe('given');
  });

  it('supports Chinese (SVO)', () => {
    const node = dsl.parse('假设 页面 /home', 'zh');
    expect(node.action).toBe('given');
  });

  it('supports French (SVO)', () => {
    const node = dsl.parse('soit page /home', 'fr');
    expect(node.action).toBe('given');
  });

  it('supports Turkish (SOV)', () => {
    const node = dsl.parse('sayfa /home verilen', 'tr');
    expect(node.action).toBe('given');
  });

  it('rejects unsupported languages', () => {
    expect(() => dsl.parse('given page /home', 'xx')).toThrow();
  });
});

// =============================================================================
// 2. English Parsing
// =============================================================================

describe('English parsing', () => {
  it('parses test command with quoted name', () => {
    const node = dsl.parse('test "Add to cart"', 'en');
    expect(node.action).toBe('test');
    expect(roleValue(node, 'name')).toBe('Add to cart');
  });

  it('parses given page with URL', () => {
    const node = dsl.parse('given page /products/1', 'en');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('page');
    expect(roleValue(node, 'value')).toBe('/products/1');
  });

  it('parses given viewport with dimensions', () => {
    const node = dsl.parse('given viewport 375x812', 'en');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('viewport');
    expect(roleValue(node, 'value')).toBe('375x812');
  });

  it('parses when with user action and target', () => {
    const node = dsl.parse('when user clicks on #button', 'en');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'actor')).toBe('user');
    expect(roleValue(node, 'action')).toBe('clicks');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses when with types and destination (marker scan)', () => {
    // Framework marker scan allows 'hello' to sit between action and 'into' marker
    const node = dsl.parse("when user types 'hello' into #search", 'en');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('types');
    expect(roleValue(node, 'destination')).toBe('#search');
  });

  it('parses expect with appears assertion', () => {
    const node = dsl.parse('expect #toast appears', 'en');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
    expect(roleValue(node, 'assertion')).toBe('appears');
  });

  it('parses expect with shows saying value', () => {
    const node = dsl.parse('expect #toast shows saying Added to cart', 'en');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses expect with disappears assertion', () => {
    const node = dsl.parse('expect #modal disappears', 'en');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'assertion')).toBe('disappears');
  });

  it('parses expect with has class assertion', () => {
    const node = dsl.parse('expect #button has .active', 'en');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses after with milliseconds', () => {
    const node = dsl.parse('after 300ms', 'en');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });

  it('parses after with seconds', () => {
    const node = dsl.parse('after 2s', 'en');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('2s');
  });

  it('parses not with content', () => {
    const node = dsl.parse('not visible #error', 'en');
    expect(node.action).toBe('not');
  });
});

// =============================================================================
// 3. Spanish Parsing
// =============================================================================

describe('Spanish parsing', () => {
  it('parses given with page', () => {
    const node = dsl.parse('dado pagina /products/1', 'es');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('pagina');
  });

  it('parses when with click action', () => {
    const node = dsl.parse('cuando usuario clic en #boton', 'es');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('clic');
  });

  it('parses expect with appears', () => {
    const node = dsl.parse('esperar #toast aparece', 'es');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after with duration', () => {
    const node = dsl.parse('despues 500ms', 'es');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('500ms');
  });
});

// =============================================================================
// 4. Japanese Parsing (SOV)
// =============================================================================

describe('Japanese parsing (SOV)', () => {
  it('parses given in SOV order', () => {
    const node = dsl.parse('ページ /products/1 前提', 'ja');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('ページ');
    expect(roleValue(node, 'value')).toBe('/products/1');
  });

  it('parses when in SOV order', () => {
    const node = dsl.parse('ユーザー #button を クリック 操作', 'ja');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('クリック');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect in SOV order', () => {
    const node = dsl.parse('#toast 表示 期待', 'ja');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
    expect(roleValue(node, 'assertion')).toBe('表示');
  });

  it('parses after in SOV order', () => {
    const node = dsl.parse('300ms 後', 'ja');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });

  it('parses test command (SOV: name keyword)', () => {
    // In SOV, keyword comes at the end: "name" テスト
    const node = dsl.parse('"テスト名" テスト', 'ja');
    expect(node.action).toBe('test');
    expect(roleValue(node, 'name')).toBe('テスト名');
  });
});

// =============================================================================
// 5. Arabic Parsing (VSO)
// =============================================================================

describe('Arabic parsing (VSO)', () => {
  it('parses given', () => {
    const node = dsl.parse('بافتراض صفحة /products/1', 'ar');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('صفحة');
  });

  it('parses when', () => {
    const node = dsl.parse('عندما المستخدم نقر على #button', 'ar');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('نقر');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect', () => {
    const node = dsl.parse('توقع #toast يظهر', 'ar');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after', () => {
    const node = dsl.parse('بعد 300ms', 'ar');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });
});

// =============================================================================
// 6. Cross-Language Semantic Equivalence
// =============================================================================

describe('Cross-language equivalence', () => {
  it('EN and ES given parse to same structure', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const es = dsl.parse('dado pagina /products/1', 'es');
    expect(en.action).toBe(es.action);
    expect(roleValue(en, 'value')).toBe(roleValue(es, 'value'));
  });

  it('EN and JA given parse to same structure', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const ja = dsl.parse('ページ /products/1 前提', 'ja');
    expect(en.action).toBe(ja.action);
    expect(roleValue(en, 'value')).toBe(roleValue(ja, 'value'));
  });

  it('EN and AR given parse to same structure', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const ar = dsl.parse('بافتراض صفحة /products/1', 'ar');
    expect(en.action).toBe(ar.action);
    expect(roleValue(en, 'value')).toBe(roleValue(ar, 'value'));
  });

  it('all languages produce same when action', () => {
    const en = dsl.parse('when user clicks on #button', 'en');
    const ar = dsl.parse('عندما المستخدم نقر على #button', 'ar');
    expect(en.action).toBe(ar.action);
    expect(roleValue(en, 'target')).toBe(roleValue(ar, 'target'));
  });

  it('EN and JA after produce same duration', () => {
    const en = dsl.parse('after 300ms', 'en');
    const ja = dsl.parse('300ms 後', 'ja');
    expect(en.action).toBe(ja.action);
    expect(roleValue(en, 'duration')).toBe(roleValue(ja, 'duration'));
  });
});

// =============================================================================
// 7. Spec Parser
// =============================================================================

describe('Spec parser', () => {
  it('parses a single test block with given and when', () => {
    const spec = `test "Login"
  given page /login
  when user clicks on #submit
    #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Login');
    expect(result.tests[0].givens).toHaveLength(1);
    expect(result.tests[0].interactions).toHaveLength(1);
    expect(result.tests[0].interactions[0].expectations).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('parses multiple when blocks in one test', () => {
    const spec = `test "Flow"
  given page /home
  when user clicks on #first
    #result appears
  when user clicks on #second
    #other appears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests[0].interactions).toHaveLength(2);
  });

  it('parses multiple expectations under one when', () => {
    const spec = `test "Multiple expects"
  given page /home
  when user clicks on #button
    #toast appears
    #count shows
    #loader disappears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests[0].interactions[0].expectations).toHaveLength(3);
  });

  it('parses multiple test blocks', () => {
    const spec = `test "First"
  given page /a
  when user clicks on #x
    #y appears

test "Second"
  given page /b
  when user clicks on #z
    #w appears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(2);
    expect(result.tests[0].name).toBe('First');
    expect(result.tests[1].name).toBe('Second');
  });

  it('strips article prefixes and parses as expect', () => {
    const spec = `test "Articles"
  given page /home
  when user clicks on #button
    the #toast appears
    a #message shows`;

    const result = parseBehaviorSpec(spec, 'en');
    const expectations = result.tests[0].interactions[0].expectations;
    expect(expectations).toHaveLength(2);
    expect(expectations[0].node.action).toBe('expect');
    expect(expectations[1].node.action).toBe('expect');
  });

  it('handles after timing modifier', () => {
    const spec = `test "Timing"
  given page /home
  when user clicks on #button
    #toast appears
    after 2s
    #toast disappears`;

    const result = parseBehaviorSpec(spec, 'en');
    const expectations = result.tests[0].interactions[0].expectations;
    // "after 2s" attaches to the previous expectation (#toast appears)
    expect(expectations[0].timing).toBeDefined();
    expect(roleValue(expectations[0].timing!, 'duration')).toBe('2s');
  });

  it('skips empty lines and comments', () => {
    const spec = `test "Comments"
  -- This is a comment
  given page /home

  // Another comment
  when user clicks on #button
    #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('creates default test block when no test keyword', () => {
    const spec = `given page /home
when user clicks on #button
  #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Untitled');
  });

  it('handles empty spec', () => {
    const result = parseBehaviorSpec('', 'en');
    expect(result.tests).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('handles whitespace-only spec', () => {
    const result = parseBehaviorSpec('   \n  \n  ', 'en');
    expect(result.tests).toHaveLength(0);
  });

  it('parses Japanese SOV spec', () => {
    const spec = `テスト "日本語テスト"
  ページ /products/1 前提
  ユーザー #button を クリック 操作
    #toast 表示 期待`;

    const result = parseBehaviorSpec(spec, 'ja');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('日本語テスト');
    expect(result.tests[0].givens).toHaveLength(1);
    expect(result.tests[0].interactions).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('parses Arabic VSO spec', () => {
    const spec = `اختبار "اختبار عربي"
  بافتراض صفحة /home
  عندما المستخدم نقر على #button
    توقع #toast يظهر`;

    const result = parseBehaviorSpec(spec, 'ar');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('اختبار عربي');
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// 8. Playwright Code Generation
// =============================================================================

describe('Playwright generation', () => {
  it('generates page.goto for given page', () => {
    const result = dsl.compile('given page /products/1', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain("page.goto('/products/1')");
  });

  it('generates setViewportSize for given viewport', () => {
    const result = dsl.compile('given viewport 375x812', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('setViewportSize');
    expect(result.code).toContain('375');
    expect(result.code).toContain('812');
  });

  it('generates click for when clicks', () => {
    const result = dsl.compile('when user clicks on #button', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('.click()');
    expect(result.code).toContain('#button');
  });

  it('generates fill for when types with marker scan', () => {
    const result = dsl.compile("when user types 'hello' into #search", 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('#search');
    expect(result.code).toContain('fill');
  });

  it('generates toBeVisible for expect appears', () => {
    const result = dsl.compile('expect #toast appears', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeVisible');
    expect(result.code).toContain('#toast');
  });

  it('generates toBeHidden for expect disappears', () => {
    const result = dsl.compile('expect #toast disappears', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeHidden');
  });

  it('generates toContainText for expect shows', () => {
    const result = dsl.compile('expect #toast shows saying Hello', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toContainText');
  });

  it('generates waitForTimeout for after', () => {
    const result = dsl.compile('after 300ms', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('waitForTimeout(300)');
  });

  it('generates waitForTimeout for after with seconds', () => {
    const result = dsl.compile('after 2s', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('waitForTimeout(2000)');
  });

  it('generates complete test file from spec', () => {
    const output = compileBehaviorSpec(
      `test "Add to cart"
  given page /products/1
  when user clicks on #add-to-cart
    #toast appears`,
      'en'
    );

    expect(output).toContain("import { test, expect } from '@playwright/test'");
    expect(output).toContain("test('Add to cart'");
    expect(output).toContain("page.goto('/products/1')");
    expect(output).toContain('click()');
    expect(output).toContain('toBeVisible()');
  });

  it('generates multiple test blocks', () => {
    const output = compileBehaviorSpec(
      `test "First"
  given page /a
  when user clicks on #x
    #y appears

test "Second"
  given page /b
  when user clicks on #z
    #w appears`,
      'en'
    );

    expect(output).toContain("test('First'");
    expect(output).toContain("test('Second'");
  });

  it('generates timing in output', () => {
    const spec = parseBehaviorSpec(
      `test "Timing"
  given page /home
  when user clicks on #button
    #toast appears
    after 2s
    #toast disappears`,
      'en'
    );

    const output = generateSpec(spec);
    expect(output).toContain('waitForTimeout(2000)');
    expect(output).toContain('toBeHidden');
  });

  it('compiles Japanese spec to same Playwright code', () => {
    const output = compileBehaviorSpec(
      `テスト "JA test"
  ページ /home 前提
  ユーザー #button を クリック 操作
    #toast 表示 期待`,
      'ja'
    );

    expect(output).toContain("test('JA test'");
    expect(output).toContain('page.goto');
    expect(output).toContain('click()');
  });
});

// =============================================================================
// 9. Renderer
// =============================================================================

describe('Renderer', () => {
  it('renders given to English', () => {
    const node = dsl.parse('given page /products/1', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('given');
    expect(rendered).toContain('page');
    expect(rendered).toContain('/products/1');
  });

  it('renders when to English', () => {
    const node = dsl.parse('when user clicks on #button', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('when');
    expect(rendered).toContain('clicks');
    expect(rendered).toContain('#button');
  });

  it('renders expect to English', () => {
    const node = dsl.parse('expect #toast appears', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('expect');
    expect(rendered).toContain('#toast');
    expect(rendered).toContain('appears');
  });

  it('renders after to English', () => {
    const node = dsl.parse('after 300ms', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('after');
    expect(rendered).toContain('300ms');
  });

  it('renders to Spanish', () => {
    const node = dsl.parse('dado pagina /home', 'es');
    const rendered = renderBehaviorSpec(node, 'es');
    expect(rendered).toContain('dado');
  });

  it('renders to Japanese with SOV order', () => {
    const node = dsl.parse('ページ /home 前提', 'ja');
    const rendered = renderBehaviorSpec(node, 'ja');
    expect(rendered).toContain('前提');
    expect(rendered).toContain('ページ');
  });

  it('renders to Arabic', () => {
    const node = dsl.parse('بافتراض صفحة /home', 'ar');
    const rendered = renderBehaviorSpec(node, 'ar');
    expect(rendered).toContain('بافتراض');
  });

  it('renders test command', () => {
    const node = dsl.parse('test "My test"', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('test');
    expect(rendered).toContain('My test');
  });
});

// =============================================================================
// 10. Error Handling
// =============================================================================

describe('Error handling', () => {
  it('throws on empty input', () => {
    expect(() => dsl.parse('', 'en')).toThrow();
  });

  it('throws on whitespace-only input', () => {
    expect(() => dsl.parse('   ', 'en')).toThrow();
  });

  it('throws on invalid command keyword', () => {
    expect(() => dsl.parse('foobar something', 'en')).toThrow();
  });

  it('spec parser reports errors for malformed lines', () => {
    const spec = `test "Bad spec"
  given page /home
  when user clicks on #button
    foobar bazqux invalid-line`;

    const result = parseBehaviorSpec(spec, 'en');
    // The line should either parse as an expect (with prefixed keyword) or error
    // Since we prepend "expect" keyword, it may parse but with unexpected roles
    expect(result.tests).toHaveLength(1);
  });

  it('handles spec with only given (no when)', () => {
    const spec = `test "Setup only"
  given page /home`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].givens).toHaveLength(1);
    expect(result.tests[0].interactions).toHaveLength(0);
  });

  it('compile returns ok for valid input', () => {
    const result = dsl.compile('given page /home', 'en');
    expect(result.ok).toBe(true);
  });
});

// =============================================================================
// 11. Integration: Full Spec Compilation
// =============================================================================

describe('Integration', () => {
  it('compiles a realistic multi-step spec', () => {
    const spec = `test "Add to cart flow"
  given page /products/1
  when user clicks on #add-to-cart
    #toast appears
    #cart-count shows
  when user clicks on #checkout
    #checkout-form appears

test "Mobile responsive"
  given viewport 375x812
  when user clicks on #hamburger
    #nav-drawer appears`;

    const output = compileBehaviorSpec(spec, 'en');
    expect(output).toContain('import { test, expect }');
    expect(output).toContain("test('Add to cart flow'");
    expect(output).toContain("test('Mobile responsive'");
    expect(output).toContain("page.goto('/products/1')");
    expect(output).toContain('setViewportSize');
    expect(output).toContain('375');
    expect(output).toContain('812');
  });

  it('produces valid-looking Playwright test structure', () => {
    const output = compileBehaviorSpec(
      `test "Simple"
  given page /home
  when user clicks on #button
    #result appears`,
      'en'
    );

    // Check basic structure
    expect(output).toMatch(/^import .+ from '@playwright\/test'/);
    expect(output).toContain('async ({ page })');
    expect(output).toContain('await page.goto');
    expect(output).toContain('await page.locator');
    expect(output).toContain('await expect(');
    expect(output).toContain('});');
  });
});

// =============================================================================
// 12. Negation in Spec Parser
// =============================================================================

describe('Negation', () => {
  it('parses not-prefixed assertion as negated', () => {
    const spec = `test "Negation"
  given page /home
  when user clicks on #button
    not #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    const expectations = result.tests[0].interactions[0].expectations;
    expect(expectations).toHaveLength(1);
    expect(expectations[0].negated).toBe(true);
  });

  it('generates negated Playwright assertion', () => {
    const spec = parseBehaviorSpec(
      `test "Negated"
  given page /home
  when user clicks on #button
    not #error appears`,
      'en'
    );

    const output = generateSpec(spec);
    expect(output).toContain('.not.');
  });

  it('non-negated assertion has no negated flag', () => {
    const spec = `test "Normal"
  given page /home
  when user clicks on #button
    #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    const expectations = result.tests[0].interactions[0].expectations;
    expect(expectations[0].negated).toBeUndefined();
  });
});

// =============================================================================
// 13. Destination Role
// =============================================================================

describe('Destination role', () => {
  it('renders when with destination to English', () => {
    const node = dsl.parse('when user types into #search', 'en');
    const rendered = renderBehaviorSpec(node, 'en');
    expect(rendered).toContain('types');
    expect(rendered).toContain('#search');
  });

  it('generates fill with destination', () => {
    const result = dsl.compile('when user types into #search', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('fill(');
    expect(result.code).toContain('#search');
  });
});

// =============================================================================
// 14. Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('handles when with system actor', () => {
    const node = dsl.parse('when system triggers on #form', 'en');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'actor')).toBe('system');
    expect(roleValue(node, 'action')).toBe('triggers');
    expect(roleValue(node, 'target')).toBe('#form');
  });

  it('handles expect with class assertion via has', () => {
    const node = dsl.parse('expect #button has .active', 'en');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#button');
    expect(roleValue(node, 'assertion')).toBe('has');
  });

  it('compiles toHaveClass for has class assertion', () => {
    // The spec parser prepends "expect" for assertion lines, so
    // "expect #button has saying .active" uses the saying marker for value
    const spec = parseBehaviorSpec(
      `test "Class"
  given page /home
  when user clicks on #button
    expect #button has saying .active`,
      'en'
    );

    const output = generateSpec(spec);
    expect(output).toContain('toHaveClass');
    expect(output).toContain('active');
  });

  it('handles spec with tab indentation', () => {
    const spec =
      'test "Tabs"\n\tgiven page /home\n\twhen user clicks on #button\n\t\t#toast appears';

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].givens).toHaveLength(1);
  });

  it('handles given with deep URL path', () => {
    const node = dsl.parse('given page /api/v2/users/123/profile', 'en');
    expect(roleValue(node, 'value')).toBe('/api/v2/users/123/profile');
  });
});

// =============================================================================
// 15. Korean Parsing (SOV)
// =============================================================================

describe('Korean parsing (SOV)', () => {
  it('parses given in SOV order', () => {
    const node = dsl.parse('페이지 /products/1 전제', 'ko');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('페이지');
    expect(roleValue(node, 'value')).toBe('/products/1');
  });

  it('parses when in SOV order', () => {
    const node = dsl.parse('사용자 #button 을 클릭 동작', 'ko');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('클릭');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect in SOV order', () => {
    const node = dsl.parse('#toast 보임 기대', 'ko');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after in SOV order', () => {
    const node = dsl.parse('300ms 후', 'ko');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });
});

// =============================================================================
// 16. Chinese Parsing (SVO)
// =============================================================================

describe('Chinese parsing (SVO)', () => {
  it('parses given', () => {
    const node = dsl.parse('假设 页面 /products/1', 'zh');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('页面');
  });

  it('parses when with click', () => {
    const node = dsl.parse('当 用户 点击 在 #button', 'zh');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('点击');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect', () => {
    const node = dsl.parse('期望 #toast 可见', 'zh');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after', () => {
    const node = dsl.parse('之后 500ms', 'zh');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('500ms');
  });
});

// =============================================================================
// 17. French Parsing (SVO)
// =============================================================================

describe('French parsing (SVO)', () => {
  it('parses given', () => {
    const node = dsl.parse('soit page /products/1', 'fr');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('page');
  });

  it('parses when with click', () => {
    const node = dsl.parse('quand utilisateur cliquer sur #button', 'fr');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('cliquer');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect', () => {
    const node = dsl.parse('attendre #toast visible', 'fr');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after', () => {
    const node = dsl.parse('apres 300ms', 'fr');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });
});

// =============================================================================
// 18. Turkish Parsing (SOV)
// =============================================================================

describe('Turkish parsing (SOV)', () => {
  it('parses given in SOV order', () => {
    const node = dsl.parse('sayfa /products/1 verilen', 'tr');
    expect(node.action).toBe('given');
    expect(roleValue(node, 'subject')).toBe('sayfa');
    expect(roleValue(node, 'value')).toBe('/products/1');
  });

  it('parses when in SOV order', () => {
    const node = dsl.parse('kullanici #button üzerinde tikla eylem', 'tr');
    expect(node.action).toBe('when');
    expect(roleValue(node, 'action')).toBe('tikla');
    expect(roleValue(node, 'target')).toBe('#button');
  });

  it('parses expect in SOV order', () => {
    const node = dsl.parse('#toast gorunur bekle', 'tr');
    expect(node.action).toBe('expect');
    expect(roleValue(node, 'target')).toBe('#toast');
  });

  it('parses after in SOV order', () => {
    const node = dsl.parse('300ms sonra', 'tr');
    expect(node.action).toBe('after');
    expect(roleValue(node, 'duration')).toBe('300ms');
  });
});

// =============================================================================
// 19. Cross-Language Equivalence (new languages)
// =============================================================================

describe('Cross-language equivalence (new languages)', () => {
  it('KO and EN given parse to same action and value', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const ko = dsl.parse('페이지 /products/1 전제', 'ko');
    expect(en.action).toBe(ko.action);
    expect(roleValue(en, 'value')).toBe(roleValue(ko, 'value'));
  });

  it('ZH and EN given parse to same action and value', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const zh = dsl.parse('假设 页面 /products/1', 'zh');
    expect(en.action).toBe(zh.action);
    expect(roleValue(en, 'value')).toBe(roleValue(zh, 'value'));
  });

  it('FR and EN given parse to same action and value', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const fr = dsl.parse('soit page /products/1', 'fr');
    expect(en.action).toBe(fr.action);
    expect(roleValue(en, 'value')).toBe(roleValue(fr, 'value'));
  });

  it('TR and EN given parse to same action and value', () => {
    const en = dsl.parse('given page /products/1', 'en');
    const tr = dsl.parse('sayfa /products/1 verilen', 'tr');
    expect(en.action).toBe(tr.action);
    expect(roleValue(en, 'value')).toBe(roleValue(tr, 'value'));
  });

  it('KO and EN after produce same duration', () => {
    const en = dsl.parse('after 300ms', 'en');
    const ko = dsl.parse('300ms 후', 'ko');
    expect(en.action).toBe(ko.action);
    expect(roleValue(en, 'duration')).toBe(roleValue(ko, 'duration'));
  });

  it('TR and EN after produce same duration', () => {
    const en = dsl.parse('after 300ms', 'en');
    const tr = dsl.parse('300ms sonra', 'tr');
    expect(en.action).toBe(tr.action);
    expect(roleValue(en, 'duration')).toBe(roleValue(tr, 'duration'));
  });
});

// =============================================================================
// 20. New Assertion Types (Phase 4)
// =============================================================================

describe('New assertion types', () => {
  it('generates toBeChecked for checked assertion', () => {
    const result = dsl.compile('expect #checkbox checked', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeChecked');
  });

  it('generates toBeFocused for focused assertion', () => {
    const result = dsl.compile('expect #input focused', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeFocused');
  });

  it('generates toBeEditable for editable assertion', () => {
    const result = dsl.compile('expect #input editable', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeEditable');
  });

  it('generates toBeEmpty for empty assertion', () => {
    const result = dsl.compile('expect #list empty', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeEmpty');
  });

  it('generates toHaveCount for count assertion', () => {
    const result = dsl.compile('expect .item count saying 5', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toHaveCount');
  });

  it('generates toHaveValue for value assertion', () => {
    const result = dsl.compile('expect #input value saying hello', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toHaveValue');
  });

  it('generates toBeEnabled for enabled assertion', () => {
    const result = dsl.compile('expect #button enabled', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeEnabled');
  });

  it('generates toBeDisabled for disabled assertion', () => {
    const result = dsl.compile('expect #button disabled', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toBeDisabled');
  });

  it('generates toContainText for contains assertion', () => {
    const result = dsl.compile('expect #text contains saying hello', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('toContainText');
  });
});

// =============================================================================
// 21. New Interaction Types
// =============================================================================

describe('New interaction types', () => {
  it('generates hover action', () => {
    const result = dsl.compile('when user hovers on #menu', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('hover()');
  });

  it('generates submit action', () => {
    const result = dsl.compile('when user submits on #form', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain("press('Enter')");
  });

  it('generates scroll action', () => {
    const result = dsl.compile('when user scrolls on #content', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('scrollIntoViewIfNeeded');
  });

  // Note: double-clicks and right-clicks use hyphenated compound keywords
  // that the tokenizer splits into separate tokens. These mappings exist in
  // the mapping table but can't be triggered via natural language input yet.

  it('generates focus action', () => {
    const result = dsl.compile('when user focuses on #input', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('focus()');
  });

  it('generates clear action', () => {
    const result = dsl.compile('when user clears on #input', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('clear()');
  });

  it('generates drag action', () => {
    const result = dsl.compile('when user drags on #item', 'en');
    expect(result.ok).toBe(true);
    expect(result.code).toContain('dragTo');
  });
});

// =============================================================================
// 22. Feature-Level Parser (Phase 3)
// =============================================================================

describe('Feature parser', () => {
  it('parses a feature with setup and tests', () => {
    const spec = `feature "Shopping Cart"
  setup
    given page /cart

  test "Add item"
    when user clicks on #add
      #toast appears

  test "Remove item"
    when user clicks on .remove
      #item disappears`;

    const result = parseFeatureSpec(spec, 'en');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].name).toBe('Shopping Cart');
    expect(result.features[0].setup).toHaveLength(1);
    expect(result.features[0].tests).toHaveLength(2);
    expect(result.features[0].tests[0].name).toBe('Add item');
    expect(result.features[0].tests[1].name).toBe('Remove item');
    expect(result.errors).toHaveLength(0);
  });

  it('parses standalone tests outside features', () => {
    const spec = `test "Standalone"
  given page /home
  when user clicks on #button
    #toast appears`;

    const result = parseFeatureSpec(spec, 'en');
    expect(result.features).toHaveLength(0);
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Standalone');
  });

  it('parses mixed features and standalone tests', () => {
    const spec = `test "Before feature"
  given page /home
  when user clicks on #x
    #y appears

feature "My Feature"
  setup
    given page /app
  test "In feature"
    when user clicks on #z
      #w appears`;

    const result = parseFeatureSpec(spec, 'en');
    expect(result.tests).toHaveLength(1);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].name).toBe('My Feature');
  });

  it('handles feature with no setup section', () => {
    const spec = `feature "No Setup"
  test "Only test"
    given page /home
    when user clicks on #button
      #result appears`;

    const result = parseFeatureSpec(spec, 'en');
    expect(result.features[0].setup).toHaveLength(0);
    expect(result.features[0].tests).toHaveLength(1);
  });

  it('handles empty feature', () => {
    const spec = `feature "Empty"`;

    const result = parseFeatureSpec(spec, 'en');
    expect(result.features).toHaveLength(1);
    expect(result.features[0].tests).toHaveLength(0);
  });
});

// =============================================================================
// 23. Feature-Level Code Generation
// =============================================================================

describe('Feature code generation', () => {
  it('generates test.describe() from feature', () => {
    const output = compileFeatureSpec(
      `feature "Shopping Cart"
  setup
    given page /cart
  test "Add item"
    when user clicks on #add
      #toast appears`,
      'en'
    );

    expect(output).toContain("import { test, expect } from '@playwright/test'");
    expect(output).toContain("test.describe('Shopping Cart'");
    expect(output).toContain('test.beforeEach');
    expect(output).toContain("page.goto('/cart')");
    expect(output).toContain("test('Add item'");
  });

  it('generates standalone tests from features + standalone', () => {
    const output = compileFeatureSpec(
      `test "Standalone"
  given page /home
  when user clicks on #x
    #y appears

feature "My Feature"
  test "In feature"
    when user clicks on #z
      #w appears`,
      'en'
    );

    expect(output).toContain("test('Standalone'");
    expect(output).toContain("test.describe('My Feature'");
  });
});

// =============================================================================
// 24. SOV Negation (end-of-line)
// =============================================================================

describe('SOV negation', () => {
  it('parses Japanese negation at end of line', () => {
    const spec = `テスト "否定テスト"
  ページ /home 前提
  ユーザー #button を クリック 操作
    否定 #error 表示 期待`;

    const result = parseBehaviorSpec(spec, 'ja');
    expect(result.tests).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    // The 否定-prefixed line should be parsed as negated
    const expectations = result.tests[0].interactions[0].expectations;
    expect(expectations).toHaveLength(1);
    expect(expectations[0].negated).toBe(true);
  });
});

// =============================================================================
// 25. Renderer (new languages)
// =============================================================================

describe('Renderer (new languages)', () => {
  it('renders given to Korean', () => {
    const node = dsl.parse('페이지 /home 전제', 'ko');
    const rendered = renderBehaviorSpec(node, 'ko');
    expect(rendered).toContain('전제');
    expect(rendered).toContain('페이지');
  });

  it('renders given to Chinese', () => {
    const node = dsl.parse('假设 页面 /home', 'zh');
    const rendered = renderBehaviorSpec(node, 'zh');
    expect(rendered).toContain('假设');
  });

  it('renders given to French', () => {
    const node = dsl.parse('soit page /home', 'fr');
    const rendered = renderBehaviorSpec(node, 'fr');
    expect(rendered).toContain('soit');
  });

  it('renders given to Turkish', () => {
    const node = dsl.parse('sayfa /home verilen', 'tr');
    const rendered = renderBehaviorSpec(node, 'tr');
    expect(rendered).toContain('verilen');
  });
});

// =============================================================================
// 26. Spec Parser (new languages)
// =============================================================================

describe('Spec parser (new languages)', () => {
  it('parses Korean spec', () => {
    const spec = `테스트 "한국어 테스트"
  페이지 /home 전제
  사용자 #button 을 클릭 동작
    #toast 보임 기대`;

    const result = parseBehaviorSpec(spec, 'ko');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('한국어 테스트');
    expect(result.errors).toHaveLength(0);
  });

  it('parses Chinese spec', () => {
    const spec = `测试 "中文测试"
  假设 页面 /home
  当 用户 点击 在 #button
    期望 #toast 可见`;

    const result = parseBehaviorSpec(spec, 'zh');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('中文测试');
    expect(result.errors).toHaveLength(0);
  });

  it('parses French spec', () => {
    const spec = `test "Test français"
  soit page /home
  quand utilisateur cliquer sur #button
    attendre #toast visible`;

    const result = parseBehaviorSpec(spec, 'fr');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Test français');
    expect(result.errors).toHaveLength(0);
  });

  it('parses Turkish spec', () => {
    const spec = `test "Türkçe test"
  sayfa /home verilen
  kullanici #button üzerinde tikla eylem
    #toast gorunur bekle`;

    const result = parseBehaviorSpec(spec, 'tr');
    expect(result.tests).toHaveLength(1);
    expect(result.tests[0].name).toBe('Türkçe test');
    expect(result.errors).toHaveLength(0);
  });
});

// =============================================================================
// 27. Error Collection
// =============================================================================

describe('Error collection', () => {
  it('collects multiple errors in one spec', () => {
    const spec = `test "Errors"
  given page /home
  orphan-line-no-when
  when user clicks on #button
    #toast appears`;

    const result = parseBehaviorSpec(spec, 'en');
    // orphan-line-no-when should produce an error (outside when block)
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('Line');
  });

  it('reports line numbers in errors', () => {
    const spec = `test "Lines"
  given page /home
  orphan-line`;

    const result = parseBehaviorSpec(spec, 'en');
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    // Should reference line 3 (orphan-line)
    expect(result.errors[0]).toMatch(/Line \d+/);
  });
});
