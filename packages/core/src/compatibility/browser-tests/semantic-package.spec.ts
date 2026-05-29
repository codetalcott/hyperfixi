/**
 * Playwright Browser Tests for @lokascript/semantic
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
    // Package supports 24 languages (the original 13 plus bn, he, hi, it, ms,
    // pl, ru, th, tl, uk, vi). See packages/semantic/CLAUDE.md.
    expect(languages.length).toBe(24);
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
      const node = S.parse('alternar .active', 'es');
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

  test('parses Japanese toggle command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const node = S.parse('トグル .active', 'ja');
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

  test('parses Korean toggle command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const node = S.parse('토글 .active', 'ko');
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

  test('parses Arabic toggle command @quick', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const node = S.parse('بدّل .active', 'ar'); // بدّل = toggle in Arabic
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
    // Note: roundTrip with 2 args returns object with { original, rendered, matches }
    // With 3 args it returns a string (the translation), so we call it twice
    const roundTripResult = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const translated = S.roundTrip('toggle .active', 'en', 'es'); // Returns string
      const backTranslated = S.roundTrip(translated, 'es', 'en'); // Returns string
      return {
        original: 'toggle .active',
        translated,
        backTranslated,
      };
    });

    expect(roundTripResult).toBeDefined();
    expect(roundTripResult.original).toBe('toggle .active');
    expect(roundTripResult.translated).toBeDefined();
    expect(roundTripResult.translated).toContain('alternar'); // Spanish for toggle
    expect(roundTripResult.backTranslated).toBeDefined();
    expect(roundTripResult.backTranslated).toContain('toggle');
  });

  test('converts to explicit syntax', async ({ page }) => {
    const explicit = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.toExplicit('toggle .active', 'en');
    });

    expect(explicit).toBeDefined();
    // Explicit syntax is a lowercase, bracket-wrapped IR:
    // `[toggle patient:.active destination:me]`.
    expect(explicit).toContain('toggle');
    expect(explicit).toContain('.active');
  });

  test('converts from explicit syntax', async ({ page }) => {
    const natural = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      // Explicit IR must be bracket-wrapped, lowercase `key:value` roles.
      const explicit = '[toggle patient:.active]';
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
    // Tokens expose `.value` (the surface text). Should contain 'toggle'.
    expect(tokens.some((t: any) => t.value === 'toggle')).toBe(true);
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

  // canParse is a boolean predicate; numeric confidence comes from
  // parseSemantic (parseWithConfidence).
  test('canParse returns confidence score', async ({ page }) => {
    const out = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return {
        can: S.canParse('toggle .active', 'en'),
        conf: S.parseSemantic('toggle .active', 'en')?.confidence,
      };
    });

    expect(out.can).toBe(true);
    expect(typeof out.conf).toBe('number');
    expect(out.conf).toBeGreaterThan(0.8);
    expect(out.conf).toBeLessThanOrEqual(1);
  });

  test('canParse returns low confidence for invalid input', async ({ page }) => {
    const out = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return { can: S.canParse('xyzabc123 notvalid', 'en') };
    });

    expect(out.can).toBe(false);
  });

  test('isExplicitSyntax correctly identifies explicit syntax', async ({ page }) => {
    const check = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return {
        // Explicit IR is bracket-wrapped.
        explicit: S.isExplicitSyntax('[toggle patient:.active]'),
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
      // analyze() returns { node, confidence, success } — the confidence is on
      // the result, so the analyzer surface is just analyze().
      const res = analyzer?.analyze('toggle .active', 'en');
      return {
        exists: !!analyzer,
        hasAnalyze: typeof analyzer?.analyze === 'function',
        resultHasConfidence: typeof res?.confidence === 'number',
      };
    });

    expect(analyzerCheck.exists).toBe(true);
    expect(analyzerCheck.hasAnalyze).toBe(true);
    expect(analyzerCheck.resultHasConfidence).toBe(true);
  });

  // Note: SemanticNode uses `action` (not `command`) and `roles` is a Map, so
  // role assertions must run inside page.evaluate (a Map serializes to `{}`
  // across the Playwright bridge). Matches the documented shape in
  // packages/semantic/CLAUDE.md.
  test('parses add command with destination', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const n = S.parse('add .active to #button', 'en');
      return {
        action: n.action,
        hasPatient: !!n.roles?.get?.('patient'),
        hasDestination: !!n.roles?.get?.('destination'),
      };
    });

    expect(result.action).toBe('add');
    expect(result.hasPatient).toBe(true);
    expect(result.hasDestination).toBe(true);
  });

  test('parses remove command', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      const n = S.parse('remove .active', 'en');
      return { action: n.action, hasPatient: !!n.roles?.get?.('patient') };
    });

    expect(result.action).toBe('remove');
    expect(result.hasPatient).toBe(true);
  });

  test('handles complex multi-word commands', async ({ page }) => {
    const result = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      // parse() returns a node without a confidence score; use parseSemantic
      // (parseWithConfidence) when a confidence value is needed.
      const n = S.parse('add .highlight to #element', 'en');
      const conf = S.parseSemantic('add .highlight to #element', 'en');
      return { action: n.action, confidence: conf?.confidence ?? 0 };
    });

    expect(result.action).toBe('add');
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
