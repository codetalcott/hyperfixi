/**
 * Playwright Browser Tests for @hyperfixi/semantic
 *
 * Tests the semantic parser browser bundle functionality including:
 * - Bundle loading and API exposure
 * - Multi-language parsing (13 languages)
 * - Translation between languages
 * - Explicit syntax conversions
 * - Tokenization
 */

import { test, expect } from '@playwright/test';

test.describe('HyperFixi Semantic Parser Bundle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/packages/semantic/test-browser.html');
  });

  test('bundle loads and exposes LokaScriptSemantic global @quick', async ({ page }) => {
    const isLoaded = await page.evaluate(
      () => typeof (window as any).LokaScriptSemantic !== 'undefined'
    );
    expect(isLoaded).toBe(true);
  });

  test('exposes all core API methods @quick', async ({ page }) => {
    const apiCheck = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return {
        parse: typeof S.parse,
        translate: typeof S.translate,
        toExplicit: typeof S.toExplicit,
        fromExplicit: typeof S.fromExplicit,
        canParse: typeof S.canParse,
        getSupportedLanguages: typeof S.getSupportedLanguages,
        createSemanticAnalyzer: typeof S.createSemanticAnalyzer,
        tokenize: typeof S.tokenize,
        getAllTranslations: typeof S.getAllTranslations,
        roundTrip: typeof S.roundTrip,
        isExplicitSyntax: typeof S.isExplicitSyntax,
      };
    });

    expect(apiCheck.parse).toBe('function');
    expect(apiCheck.translate).toBe('function');
    expect(apiCheck.toExplicit).toBe('function');
    expect(apiCheck.fromExplicit).toBe('function');
    expect(apiCheck.canParse).toBe('function');
    expect(apiCheck.getSupportedLanguages).toBe('function');
    expect(apiCheck.createSemanticAnalyzer).toBe('function');
    expect(apiCheck.tokenize).toBe('function');
    expect(apiCheck.getAllTranslations).toBe('function');
    expect(apiCheck.roundTrip).toBe('function');
    expect(apiCheck.isExplicitSyntax).toBe('function');
  });

  test('supports all 13 languages @quick', async ({ page }) => {
    const languages = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.getSupportedLanguages();
    });

    expect(languages).toContain('en');
    expect(languages).toContain('es');
    expect(languages).toContain('ja');
    expect(languages).toContain('zh');
    expect(languages).toContain('ar');
    expect(languages).toContain('ko');
    expect(languages).toContain('tr');
    expect(languages).toContain('pt');
    expect(languages).toContain('fr');
    expect(languages).toContain('de');
    expect(languages).toContain('id');
    expect(languages).toContain('qu');
    expect(languages).toContain('sw');
    expect(languages.length).toBe(13);
  });

  test('parses English toggle command @quick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const node = S.parse('toggle .active', 'en');
      // SemanticNode has 'action' not 'command', and roles is a Map
      return {
        action: node.action,
        kind: node.kind,
        hasRoles: node.roles && (node.roles.size > 0 || Object.keys(node.roles).length > 0),
      };
    });

    expect(result).toBeDefined();
    expect(result.action).toBe('toggle');
    expect(result.kind).toBe('command');
  });

  test('parses Spanish toggle command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('alternar .active', 'es');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('toggle');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('parses Japanese toggle command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('トグル .active', 'ja');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('toggle');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('parses Korean toggle command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('토글 .active', 'ko');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('toggle');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('parses Arabic toggle command @quick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('زِد .active', 'ar');
    });

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('translates English to Spanish', async ({ page }) => {
    const translated = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.translate('toggle .active', 'en', 'es');
    });

    expect(translated).toBeDefined();
    expect(translated).toContain('alternar');
    expect(translated).toContain('.active');
  });

  test('translates English to Japanese', async ({ page }) => {
    const translated = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.translate('toggle .active', 'en', 'ja');
    });

    expect(translated).toBeDefined();
    expect(translated).toContain('トグル');
    expect(translated).toContain('.active');
  });

  test('round-trip translation preserves meaning @quick', async ({ page }) => {
    const roundTripResult = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.roundTrip('toggle .active', 'en', 'es');
    });

    expect(roundTripResult).toBeDefined();
    expect(roundTripResult.original).toBe('toggle .active');
    expect(roundTripResult.translated).toBeDefined();
    expect(roundTripResult.backTranslated).toBeDefined();
    // Allow for slight variations in round-trip
    expect(roundTripResult.confidence).toBeGreaterThan(0.7);
  });

  test('converts to explicit syntax', async ({ page }) => {
    const explicit = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.toExplicit('toggle .active', 'en');
    });

    expect(explicit).toBeDefined();
    expect(explicit).toContain('TOGGLE');
    expect(explicit).toContain('.active');
  });

  test('converts from explicit syntax', async ({ page }) => {
    const natural = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const explicit = 'TOGGLE PATIENT=".active"';
      return S.fromExplicit(explicit, 'en');
    });

    expect(natural).toBeDefined();
    expect(natural.toLowerCase()).toContain('toggle');
    expect(natural).toContain('.active');
  });

  test('tokenizes English correctly', async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.tokenize('toggle .active on me', 'en');
    });

    expect(tokens).toBeDefined();
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    // Should contain 'toggle', '.active', 'on', 'me'
    expect(tokens.some((t: any) => t.text === 'toggle')).toBe(true);
  });

  test('tokenizes Japanese correctly', async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.tokenize('トグル .active', 'ja');
    });

    expect(tokens).toBeDefined();
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  test('tokenizes Arabic correctly (RTL)', async ({ page }) => {
    const tokens = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.tokenize('زِد .active', 'ar');
    });

    expect(tokens).toBeDefined();
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
  });

  test('getAllTranslations returns all language translations @quick', async ({ page }) => {
    const allTranslations = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.getAllTranslations('toggle .active', 'en');
    });

    expect(allTranslations).toBeDefined();
    expect(typeof allTranslations).toBe('object');
    expect(Object.keys(allTranslations).length).toBeGreaterThan(10);
    expect(allTranslations.es).toBeDefined();
    expect(allTranslations.ja).toBeDefined();
    expect(allTranslations.ko).toBeDefined();
  });

  test('canParse returns confidence score', async ({ page }) => {
    const canParse = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.canParse('toggle .active', 'en');
    });

    expect(canParse).toBeDefined();
    expect(typeof canParse).toBe('number');
    expect(canParse).toBeGreaterThan(0.8);
    expect(canParse).toBeLessThanOrEqual(1);
  });

  test('canParse returns low confidence for invalid input', async ({ page }) => {
    const canParse = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.canParse('xyzabc123 notvalid', 'en');
    });

    expect(canParse).toBeDefined();
    expect(typeof canParse).toBe('number');
    expect(canParse).toBeLessThan(0.5);
  });

  test('isExplicitSyntax correctly identifies explicit syntax', async ({ page }) => {
    const check = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return {
        explicit: S.isExplicitSyntax('TOGGLE PATIENT=".active"'),
        natural: S.isExplicitSyntax('toggle .active'),
      };
    });

    expect(check.explicit).toBe(true);
    expect(check.natural).toBe(false);
  });

  test('createSemanticAnalyzer creates analyzer instance', async ({ page }) => {
    const analyzerCheck = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const analyzer = S.createSemanticAnalyzer('en');
      return {
        exists: !!analyzer,
        hasAnalyze: typeof analyzer?.analyze === 'function',
        hasGetConfidence: typeof analyzer?.getConfidence === 'function',
      };
    });

    expect(analyzerCheck.exists).toBe(true);
    expect(analyzerCheck.hasAnalyze).toBe(true);
    expect(analyzerCheck.hasGetConfidence).toBe(true);
  });

  test('parses add command with destination', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('add .active to #button', 'en');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('add');
    expect(result.roles.patient).toBeDefined();
    expect(result.roles.destination).toBeDefined();
  });

  test('parses remove command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('remove .active', 'en');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('remove');
    expect(result.roles.patient).toBeDefined();
  });

  test('handles complex multi-word commands', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.parse('add .highlight to #element', 'en');
    });

    expect(result).toBeDefined();
    expect(result.command).toBe('add');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
