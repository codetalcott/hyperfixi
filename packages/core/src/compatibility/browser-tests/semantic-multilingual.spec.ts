/**
 * Semantic Multilingual Browser Tests
 *
 * Tests the semantic parser browser bundle functionality across
 * multiple languages (English, Spanish, Japanese, Arabic).
 */

import { test, expect } from '@playwright/test';

test.describe('Semantic Multilingual Parser', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    // Navigate to the semantic package test page
    // The Playwright config serves from project root on port 3000
    await page.goto(`${baseURL}/packages/semantic/test-browser.html`);

    // Wait for the semantic bundle to load
    await page.waitForFunction(() => typeof (window as any).LokaScriptSemantic !== 'undefined', {
      timeout: 5000,
    });
  });

  test('bundle loads and exposes LokaScriptSemantic global @quick', async ({ page }) => {
    const hasGlobal = await page.evaluate(() => {
      return typeof (window as any).LokaScriptSemantic !== 'undefined';
    });
    expect(hasGlobal).toBe(true);
  });

  test('exposes parse function @quick', async ({ page }) => {
    const hasParseFunction = await page.evaluate(() => {
      return typeof (window as any).LokaScriptSemantic.parse === 'function';
    });
    expect(hasParseFunction).toBe(true);
  });

  test('exposes translate function', async ({ page }) => {
    const hasTranslateFunction = await page.evaluate(() => {
      return typeof (window as any).LokaScriptSemantic.translate === 'function';
    });
    expect(hasTranslateFunction).toBe(true);
  });

  test('exposes createSemanticAnalyzer function', async ({ page }) => {
    const hasAnalyzerFunction = await page.evaluate(() => {
      return typeof (window as any).LokaScriptSemantic.createSemanticAnalyzer === 'function';
    });
    expect(hasAnalyzerFunction).toBe(true);
  });

  test('reports supported languages @quick', async ({ page }) => {
    const languages = await page.evaluate(() => {
      return (window as any).LokaScriptSemantic.getSupportedLanguages();
    });
    // Original 4 languages
    expect(languages).toContain('en');
    expect(languages).toContain('es');
    expect(languages).toContain('ja');
    expect(languages).toContain('ar');
    // Extended languages (13 total)
    expect(languages).toContain('ko');
    expect(languages).toContain('tr');
    expect(languages).toContain('zh');
    expect(languages).toContain('pt');
    expect(languages).toContain('fr');
    expect(languages).toContain('de');
    expect(languages).toContain('id');
    expect(languages).toContain('qu');
    expect(languages).toContain('sw');
  });

  test.describe('English Parsing', () => {
    test('parses "toggle .active on #button" @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('toggle .active on #button', 'en');
      });
      expect(result).toBe(true);
    });

    test('parses "toggle .active" with implicit target', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('toggle .active', 'en');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Japanese Parsing (SOV)', () => {
    test('parses ".active を 切り替え" @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active を 切り替え', 'ja');
      });
      expect(result).toBe(true);
    });

    test('parses "#button の .active を 切り替え"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('#button の .active を 切り替え', 'ja');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Arabic Parsing (VSO)', () => {
    test('parses "بدّل .active" @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('بدّل .active', 'ar');
      });
      expect(result).toBe(true);
    });

    test('parses "بدّل .active على #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('بدّل .active على #button', 'ar');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Spanish Parsing (SVO)', () => {
    test('parses "alternar .active" @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alternar .active', 'es');
      });
      expect(result).toBe(true);
    });

    test('parses "alternar .active en #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alternar .active en #button', 'es');
      });
      expect(result).toBe(true);
    });
  });

  // =============================================================================
  // Extended Language Tests (9 new languages)
  // =============================================================================

  test.describe('Korean Parsing (SOV)', () => {
    // Note: Korean uses SOV word order with particles
    // ".active 를 토글" = "toggle .active" (Object-marker Verb)
    test('parses ".active 를 토글" (SOV with object marker) @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active 를 토글', 'ko');
      });
      expect(result).toBe(true);
    });

    test('parses ".active 을 토글" (alternate object marker)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active 을 토글', 'ko');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Turkish Parsing (SOV)', () => {
    // Note: Turkish uses SOV word order with case suffixes
    // ".active i değiştir" = "toggle .active" (Object-accusative Verb)
    // Accusative marker 'i' is required for definite direct objects
    test('parses ".active i değiştir" (SOV with accusative marker) @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active i değiştir', 'tr');
      });
      expect(result).toBe(true);
    });

    test('parses ".active değiştir" (SOV without marker - colloquial)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active değiştir', 'tr');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Chinese Parsing (SVO)', () => {
    test('parses "切换 .active" @quick', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('切换 .active', 'zh');
      });
      expect(result).toBe(true);
    });

    test('parses "切换 .active 在 #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('切换 .active 在 #button', 'zh');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Portuguese Parsing (SVO)', () => {
    test('parses "alternar .active"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alternar .active', 'pt');
      });
      expect(result).toBe(true);
    });

    test('parses "alternar .active em #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alternar .active em #button', 'pt');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('French Parsing (SVO)', () => {
    test('parses "basculer .active"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('basculer .active', 'fr');
      });
      expect(result).toBe(true);
    });

    test('parses "basculer .active sur #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('basculer .active sur #button', 'fr');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('German Parsing (SVO)', () => {
    test('parses "umschalten .active"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('umschalten .active', 'de');
      });
      expect(result).toBe(true);
    });

    test('parses "umschalten .active auf #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('umschalten .active auf #button', 'de');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Indonesian Parsing (SVO)', () => {
    test('parses "alihkan .active"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alihkan .active', 'id');
      });
      expect(result).toBe(true);
    });

    test('parses "alihkan .active pada #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('alihkan .active pada #button', 'id');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Quechua Parsing (SOV)', () => {
    // Note: Quechua uses SOV word order with case suffixes
    // ".active -ta tikray" = "toggle .active" (Object-accusative Verb)
    // -ta marks accusative (direct object)
    test('parses ".active -ta tikray" (SOV with accusative suffix)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('.active -ta tikray', 'qu');
      });
      expect(result).toBe(true);
    });

    test('parses ".active -ta t\'ikray" (with glottal stop)', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse(".active -ta t'ikray", 'qu');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Swahili Parsing (SVO)', () => {
    test('parses "badilisha .active"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('badilisha .active', 'sw');
      });
      expect(result).toBe(true);
    });

    test('parses "badilisha .active kwenye #button"', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.canParse('badilisha .active kwenye #button', 'sw');
      });
      expect(result).toBe(true);
    });
  });

  test.describe('Translation', () => {
    test('translates English to Japanese', async ({ page }) => {
      const translation = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.translate('toggle .active on #button', 'en', 'ja');
      });
      // Japanese should have particles and different word order
      expect(translation).toContain('.active');
      expect(translation).toContain('#button');
      expect(translation).toContain('切り替え');
    });

    test('translates English to Arabic', async ({ page }) => {
      const translation = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.translate('toggle .active on #button', 'en', 'ar');
      });
      expect(translation).toContain('.active');
      expect(translation).toContain('#button');
      // Arabic should have the verb
      expect(translation).toMatch(/بدل|بدّل/);
    });

    test('translates English to Spanish', async ({ page }) => {
      const translation = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.translate('toggle .active on #button', 'en', 'es');
      });
      expect(translation).toContain('alternar');
      expect(translation).toContain('.active');
      expect(translation).toContain('#button');
    });

    test('translates Japanese to English', async ({ page }) => {
      const translation = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.translate('#button の .active を 切り替え', 'ja', 'en');
      });
      expect(translation).toContain('toggle');
      expect(translation).toContain('.active');
    });

    test('getAllTranslations returns all languages', async ({ page }) => {
      const translations = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.getAllTranslations('toggle .active on #button', 'en');
      });
      // Original 4 languages
      expect(translations).toHaveProperty('en');
      expect(translations).toHaveProperty('ja');
      expect(translations).toHaveProperty('ar');
      expect(translations).toHaveProperty('es');
      // Extended languages (13 total)
      expect(translations).toHaveProperty('ko');
      expect(translations).toHaveProperty('tr');
      expect(translations).toHaveProperty('zh');
      expect(translations).toHaveProperty('pt');
      expect(translations).toHaveProperty('fr');
      expect(translations).toHaveProperty('de');
      expect(translations).toHaveProperty('id');
      expect(translations).toHaveProperty('qu');
      expect(translations).toHaveProperty('sw');
    });
  });

  test.describe('Explicit Mode', () => {
    test('converts to explicit syntax', async ({ page }) => {
      const explicit = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.toExplicit('toggle .active on #button', 'en');
      });
      // Explicit syntax should have brackets and role labels
      expect(explicit).toMatch(/\[toggle/);
      expect(explicit).toContain('patient:');
    });

    test('parses explicit syntax', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.isExplicitSyntax('[toggle patient:.active destination:#button]');
      });
      expect(result).toBe(true);
    });

    test('converts explicit back to natural', async ({ page }) => {
      const natural = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.fromExplicit('[toggle patient:.active destination:#button]', 'en');
      });
      expect(natural).toContain('toggle');
      expect(natural).toContain('.active');
    });
  });

  test.describe('SemanticAnalyzer', () => {
    test('creates analyzer instance', async ({ page }) => {
      const hasAnalyzer = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const analyzer = S.createSemanticAnalyzer();
        return analyzer && typeof analyzer.analyze === 'function';
      });
      expect(hasAnalyzer).toBe(true);
    });

    test('analyzer supports expected languages', async ({ page }) => {
      const supportedLangs = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const analyzer = S.createSemanticAnalyzer();
        return analyzer.supportedLanguages();
      });
      // Original 4 languages
      expect(supportedLangs).toContain('en');
      expect(supportedLangs).toContain('ja');
      expect(supportedLangs).toContain('ar');
      expect(supportedLangs).toContain('es');
      // Extended languages (13 total)
      expect(supportedLangs).toContain('ko');
      expect(supportedLangs).toContain('tr');
      expect(supportedLangs).toContain('zh');
      expect(supportedLangs).toContain('pt');
      expect(supportedLangs).toContain('fr');
      expect(supportedLangs).toContain('de');
      expect(supportedLangs).toContain('id');
      expect(supportedLangs).toContain('qu');
      expect(supportedLangs).toContain('sw');
    });

    test('analyzer returns confidence score', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const analyzer = S.createSemanticAnalyzer();
        return analyzer.analyze('toggle .active on #button', 'en');
      });
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.command).toBeDefined();
      expect(result.command?.name).toBe('toggle');
    });

    test('analyzer returns low confidence for unknown input', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const analyzer = S.createSemanticAnalyzer();
        return analyzer.analyze('unknown gibberish command', 'en');
      });
      expect(result.confidence).toBe(0);
    });
  });

  test.describe('Round-Trip Verification', () => {
    test('English round-trip preserves meaning', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const original = 'toggle .active on #button';
        // Parse to semantic, render back to English
        const roundTripped = S.roundTrip(original, 'en', 'en');
        return { original, roundTripped };
      });
      // The round-tripped version should be semantically equivalent
      expect(result.roundTripped).toContain('toggle');
      expect(result.roundTripped).toContain('.active');
    });

    test('cross-language round-trip preserves meaning', async ({ page }) => {
      const result = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const original = 'toggle .active on #button';
        // English -> Japanese -> English
        const japanese = S.translate(original, 'en', 'ja');
        const backToEnglish = S.translate(japanese, 'ja', 'en');
        return { original, japanese, backToEnglish };
      });
      // Both should contain the key elements
      expect(result.backToEnglish).toContain('toggle');
      expect(result.backToEnglish).toContain('.active');
    });
  });

  test.describe('Tokenizers', () => {
    test('tokenize returns token stream', async ({ page }) => {
      const tokens = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        return S.tokenize('toggle .active on #button', 'en');
      });
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    });

    test('English tokenizer handles selectors', async ({ page }) => {
      const hasSelector = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const tokens = S.tokenize('toggle .active', 'en');
        return tokens.some((t: any) => t.kind === 'selector' || t.value === '.active');
      });
      expect(hasSelector).toBe(true);
    });

    test('Japanese tokenizer handles particles', async ({ page }) => {
      const hasParticle = await page.evaluate(() => {
        const S = (window as any).LokaScriptSemantic;
        const tokens = S.tokenize('.active を 切り替え', 'ja');
        return tokens.some((t: any) => t.kind === 'particle' || t.value === 'を');
      });
      expect(hasParticle).toBe(true);
    });
  });
});

// Demo Page tests - separate describe to avoid the beforeEach hook
test.describe('Semantic Demo Page', () => {
  test('semantic-demo.html loads the bundle', async ({ page }) => {
    await page.goto('http://localhost:3000/examples/multilingual/semantic-demo.html');

    // Wait for bundle to load
    await page.waitForFunction(() => typeof (window as any).LokaScriptSemantic !== 'undefined', {
      timeout: 5000,
    });

    // Verify the bundle is loaded
    const hasGlobal = await page.evaluate(
      () => typeof (window as any).LokaScriptSemantic !== 'undefined'
    );
    expect(hasGlobal).toBe(true);
  });

  test('semantic-demo.html has parse function', async ({ page }) => {
    await page.goto('http://localhost:3000/examples/multilingual/semantic-demo.html');

    await page.waitForFunction(() => typeof (window as any).LokaScriptSemantic !== 'undefined', {
      timeout: 5000,
    });

    const hasParse = await page.evaluate(
      () => typeof (window as any).LokaScriptSemantic.parse === 'function'
    );
    expect(hasParse).toBe(true);
  });

  test('semantic-demo.html can parse input', async ({ page }) => {
    await page.goto('http://localhost:3000/examples/multilingual/semantic-demo.html');

    await page.waitForFunction(() => typeof (window as any).LokaScriptSemantic !== 'undefined', {
      timeout: 5000,
    });

    // Use canParse for simple boolean check
    const canParse = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.canParse('toggle .active on #button', 'en');
    });
    expect(canParse).toBe(true);

    // Check toExplicit works
    const explicit = await page.evaluate(() => {
      const S = (window as any).LokaScriptSemantic;
      return S.toExplicit('toggle .active on #button', 'en');
    });
    expect(explicit).toMatch(/\[toggle/);
    expect(explicit).toContain('patient:');
  });
});
