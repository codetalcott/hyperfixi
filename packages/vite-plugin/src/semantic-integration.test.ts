import { describe, it, expect } from 'vitest';
import {
  selectOptimalBundle,
  resolveSemanticConfig,
  getSemanticBundleImport,
  getSemanticExports,
  getLanguagesForBundleType,
  canUseCorePlusLanguages,
  filterToAvailableLanguages,
  generateSemanticIntegrationCode,
  type SemanticBundleType,
  type SemanticConfig,
} from './semantic-integration';
import type { HyperfixiPluginOptions } from './types';
import type { SupportedLanguage } from './language-keywords';

describe('selectOptimalBundle', () => {
  it('returns en for empty language set', () => {
    expect(selectOptimalBundle(new Set())).toBe('en');
  });

  it('returns en for English only', () => {
    expect(selectOptimalBundle(new Set(['en']))).toBe('en');
  });

  it('returns es for Spanish only', () => {
    expect(selectOptimalBundle(new Set(['es']))).toBe('es');
  });

  it('returns tr for Turkish only', () => {
    expect(selectOptimalBundle(new Set(['tr']))).toBe('tr');
  });

  it('returns es-en for English and Spanish', () => {
    expect(selectOptimalBundle(new Set(['en', 'es']))).toBe('es-en');
  });

  it('returns western for Western European languages', () => {
    expect(selectOptimalBundle(new Set(['en', 'fr']))).toBe('western');
    expect(selectOptimalBundle(new Set(['en', 'de']))).toBe('western');
    expect(selectOptimalBundle(new Set(['en', 'pt']))).toBe('western');
    expect(selectOptimalBundle(new Set(['en', 'es', 'fr', 'de', 'pt']))).toBe('western');
  });

  it('returns single-language bundle for individual East Asian languages', () => {
    // Single languages now have individual bundles (smaller than regional)
    expect(selectOptimalBundle(new Set(['ja']))).toBe('ja');
    expect(selectOptimalBundle(new Set(['zh']))).toBe('zh');
    expect(selectOptimalBundle(new Set(['ko']))).toBe('ko');
  });

  it('returns east-asian for multiple East Asian languages', () => {
    expect(selectOptimalBundle(new Set(['ja', 'zh']))).toBe('east-asian');
    expect(selectOptimalBundle(new Set(['ja', 'ko']))).toBe('east-asian');
    expect(selectOptimalBundle(new Set(['ja', 'zh', 'ko']))).toBe('east-asian');
  });

  it('returns single-language bundle for other individual languages', () => {
    expect(selectOptimalBundle(new Set(['pt']))).toBe('pt');
    expect(selectOptimalBundle(new Set(['fr']))).toBe('fr');
    expect(selectOptimalBundle(new Set(['de']))).toBe('de');
    expect(selectOptimalBundle(new Set(['ar']))).toBe('ar');
    expect(selectOptimalBundle(new Set(['id']))).toBe('id');
    expect(selectOptimalBundle(new Set(['qu']))).toBe('qu');
    expect(selectOptimalBundle(new Set(['sw']))).toBe('sw');
  });

  it('returns priority for priority languages', () => {
    // Priority includes: en, es, ja, zh, ko, ar, tr, pt, fr, de, id
    expect(selectOptimalBundle(new Set(['en', 'ja']))).toBe('priority');
    expect(selectOptimalBundle(new Set(['es', 'ja']))).toBe('priority');
    expect(selectOptimalBundle(new Set(['en', 'ar']))).toBe('priority');
  });

  it('returns all when languages span multiple regions', () => {
    // sw (Swahili) and qu (Quechua) are not in priority
    expect(selectOptimalBundle(new Set(['en', 'sw']))).toBe('all');
    expect(selectOptimalBundle(new Set(['en', 'qu']))).toBe('all');
    expect(selectOptimalBundle(new Set(['ja', 'sw']))).toBe('all');
  });
});

describe('getSemanticBundleImport', () => {
  it('returns core entry for all bundle types (ES module usage)', () => {
    // Core entry provides analyzer infrastructure without language data
    // Languages are imported separately via side-effect imports
    expect(getSemanticBundleImport('en')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('es')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('tr')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('es-en')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('western')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('east-asian')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('priority')).toBe('@lokascript/semantic/core');
    expect(getSemanticBundleImport('all')).toBe('@lokascript/semantic/core');
  });
});

describe('getLanguagesForBundleType', () => {
  it('always includes English', () => {
    const result = getLanguagesForBundleType('ja', new Set(['ja'] as SupportedLanguage[]));
    expect(result.has('en')).toBe(true);
    expect(result.has('ja')).toBe(true);
  });

  it('expands western region', () => {
    const result = getLanguagesForBundleType('western', new Set());
    expect(result.has('en')).toBe(true);
    expect(result.has('es')).toBe(true);
    expect(result.has('pt')).toBe(true);
    expect(result.has('fr')).toBe(true);
    expect(result.has('de')).toBe(true);
  });

  it('expands east-asian region', () => {
    const result = getLanguagesForBundleType('east-asian', new Set());
    expect(result.has('ja')).toBe(true);
    expect(result.has('zh')).toBe(true);
    expect(result.has('ko')).toBe(true);
    expect(result.has('en')).toBe(true); // always included
  });

  it('expands es-en', () => {
    const result = getLanguagesForBundleType('es-en', new Set());
    expect(result.has('en')).toBe(true);
    expect(result.has('es')).toBe(true);
  });

  it('includes config languages plus bundle type', () => {
    const result = getLanguagesForBundleType('ja', new Set(['ko'] as SupportedLanguage[]));
    expect(result.has('ja')).toBe(true);
    expect(result.has('ko')).toBe(true);
    expect(result.has('en')).toBe(true);
  });
});

describe('canUseCorePlusLanguages', () => {
  it('returns true for languages with ESM exports', () => {
    expect(canUseCorePlusLanguages(new Set(['en']))).toBe(true);
    expect(canUseCorePlusLanguages(new Set(['en', 'es', 'ja']))).toBe(true);
    expect(canUseCorePlusLanguages(new Set(['en', 'ko', 'zh', 'tr', 'pt', 'fr', 'de']))).toBe(true);
    // All 25 languages now have ESM exports
    expect(canUseCorePlusLanguages(new Set(['en', 'it']))).toBe(true);
    expect(canUseCorePlusLanguages(new Set(['en', 'ru']))).toBe(true);
    expect(canUseCorePlusLanguages(new Set(['en', 'hi']))).toBe(true);
  });

  it('returns false for unknown language codes', () => {
    expect(canUseCorePlusLanguages(new Set(['en', 'xx']))).toBe(false);
    expect(canUseCorePlusLanguages(new Set(['zz']))).toBe(false);
  });

  it('returns true for empty set', () => {
    expect(canUseCorePlusLanguages(new Set())).toBe(true);
  });
});

describe('filterToAvailableLanguages', () => {
  it('keeps languages with ESM exports', () => {
    const result = filterToAvailableLanguages(new Set(['en', 'es', 'ja']));
    expect(result).toEqual(new Set(['en', 'es', 'ja']));
  });

  it('keeps all 25 languages that have ESM exports', () => {
    const result = filterToAvailableLanguages(new Set(['en', 'it', 'ru', 'hi']));
    expect(result).toEqual(new Set(['en', 'it', 'ru', 'hi']));
  });

  it('filters out unknown language codes', () => {
    const result = filterToAvailableLanguages(new Set(['en', 'xx', 'zz']));
    expect(result).toEqual(new Set(['en']));
    expect(result.has('xx')).toBe(false);
  });

  it('always includes English', () => {
    const result = filterToAvailableLanguages(new Set(['xx']));
    expect(result).toEqual(new Set(['en']));
  });

  it('handles empty set', () => {
    const result = filterToAvailableLanguages(new Set());
    expect(result).toEqual(new Set(['en']));
  });

  it('keeps all western region languages', () => {
    // western = en, es, pt, fr, de, it — all now have ESM exports
    const result = filterToAvailableLanguages(new Set(['en', 'es', 'pt', 'fr', 'de', 'it']));
    expect(result).toEqual(new Set(['en', 'es', 'pt', 'fr', 'de', 'it']));
  });

  it('keeps all priority region languages', () => {
    // All priority languages now have ESM exports
    const result = filterToAvailableLanguages(
      new Set(['en', 'es', 'pt', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ar', 'tr', 'ru', 'hi'])
    );
    expect(result.has('it')).toBe(true);
    expect(result.has('ru')).toBe(true);
    expect(result.has('hi')).toBe(true);
    expect(result.size).toBe(13);
  });
});

describe('generateSemanticIntegrationCode', () => {
  it('returns empty string when disabled', () => {
    const config: SemanticConfig = {
      enabled: false,
      bundleType: null,
      languages: new Set(),
      grammarEnabled: false,
    };
    expect(generateSemanticIntegrationCode(config)).toBe('');
  });

  it('generates core + per-language imports for single language', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'en',
      languages: new Set(['en'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).not.toContain("from '@lokascript/semantic';");
  });

  it('generates core + multiple language imports for bilingual config', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'es-en',
      languages: new Set(['en', 'es'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/es'");
  });

  it('always includes English language import', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'ja',
      languages: new Set(['ja'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/ja'");
  });

  it('generates core + all priority language imports including it/ru/hi', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'priority',
      languages: new Set(['en', 'it', 'ru'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    // Always uses core + per-language imports
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).not.toContain("from '@lokascript/semantic';");
    // All priority languages are imported individually (including it, ru, hi)
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/es'");
    expect(code).toContain("import '@lokascript/semantic/languages/ja'");
    expect(code).toContain("import '@lokascript/semantic/languages/it'");
    expect(code).toContain("import '@lokascript/semantic/languages/ru'");
    expect(code).toContain("import '@lokascript/semantic/languages/hi'");
  });

  it('generates core + per-language imports for western region', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'western',
      languages: new Set(['en', 'fr'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    // Uses core, not full bundle
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).not.toContain("from '@lokascript/semantic';");
    // Imports all western languages individually (including Italian)
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/es'");
    expect(code).toContain("import '@lokascript/semantic/languages/pt'");
    expect(code).toContain("import '@lokascript/semantic/languages/fr'");
    expect(code).toContain("import '@lokascript/semantic/languages/de'");
    expect(code).toContain("import '@lokascript/semantic/languages/it'");
  });

  it('generates core + per-language imports for east-asian region', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'east-asian',
      languages: new Set(['ja', 'zh'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).not.toContain("from '@lokascript/semantic';");
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/ja'");
    expect(code).toContain("import '@lokascript/semantic/languages/ko'");
    expect(code).toContain("import '@lokascript/semantic/languages/zh'");
  });

  it('generates core + per-language imports for all region', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'all',
      languages: new Set(['en'] as SupportedLanguage[]),
      grammarEnabled: false,
    };
    const code = generateSemanticIntegrationCode(config);
    // Uses core, never falls back to full bundle
    expect(code).toContain("from '@lokascript/semantic/core'");
    expect(code).not.toContain("from '@lokascript/semantic';");
    // Imports all languages that are in SUPPORTED_LANGUAGES and have ESM exports
    // The 'all' region expands to the vite-plugin's SUPPORTED_LANGUAGES (22 languages)
    expect(code).toContain("import '@lokascript/semantic/languages/en'");
    expect(code).toContain("import '@lokascript/semantic/languages/es'");
    expect(code).toContain("import '@lokascript/semantic/languages/ja'");
    expect(code).toContain("import '@lokascript/semantic/languages/ar'");
    expect(code).toContain("import '@lokascript/semantic/languages/ko'");
    expect(code).toContain("import '@lokascript/semantic/languages/zh'");
    expect(code).toContain("import '@lokascript/semantic/languages/tr'");
    expect(code).toContain("import '@lokascript/semantic/languages/pt'");
    expect(code).toContain("import '@lokascript/semantic/languages/fr'");
    expect(code).toContain("import '@lokascript/semantic/languages/de'");
    expect(code).toContain("import '@lokascript/semantic/languages/id'");
    expect(code).toContain("import '@lokascript/semantic/languages/qu'");
    expect(code).toContain("import '@lokascript/semantic/languages/sw'");
    expect(code).toContain("import '@lokascript/semantic/languages/it'");
    expect(code).toContain("import '@lokascript/semantic/languages/ru'");
    expect(code).toContain("import '@lokascript/semantic/languages/hi'");
  });

  it('includes grammar imports when grammar is enabled', () => {
    const config: SemanticConfig = {
      enabled: true,
      bundleType: 'en',
      languages: new Set(['en'] as SupportedLanguage[]),
      grammarEnabled: true,
    };
    const code = generateSemanticIntegrationCode(config);
    expect(code).toContain("from '@lokascript/i18n'");
    expect(code).toContain('GrammarTransformer');
  });
});

describe('resolveSemanticConfig', () => {
  it('returns disabled config when semantic is false', () => {
    const options: HyperfixiPluginOptions = { semantic: false };
    const config = resolveSemanticConfig(options, new Set());
    expect(config.enabled).toBe(false);
    expect(config.bundleType).toBeNull();
  });

  it('enables semantic when semantic is true', () => {
    const options: HyperfixiPluginOptions = { semantic: true };
    const config = resolveSemanticConfig(options, new Set());
    expect(config.enabled).toBe(true);
  });

  it('enables semantic when semantic is "en"', () => {
    const options: HyperfixiPluginOptions = { semantic: 'en' };
    const config = resolveSemanticConfig(options, new Set());
    expect(config.enabled).toBe(true);
    expect(config.bundleType).toBe('en');
  });

  it('enables semantic when semantic is "auto"', () => {
    const options: HyperfixiPluginOptions = { semantic: 'auto' };
    const config = resolveSemanticConfig(options, new Set(['ja']));
    expect(config.enabled).toBe(true);
    expect(config.languages.has('ja')).toBe(true);
  });

  it('enables semantic when grammar is true', () => {
    const options: HyperfixiPluginOptions = { grammar: true };
    const config = resolveSemanticConfig(options, new Set());
    expect(config.enabled).toBe(true);
    expect(config.grammarEnabled).toBe(true);
  });

  it('uses detected languages when no explicit languages set', () => {
    const options: HyperfixiPluginOptions = { semantic: true };
    const config = resolveSemanticConfig(options, new Set(['ja', 'ko']));
    expect(config.languages.has('ja')).toBe(true);
    expect(config.languages.has('ko')).toBe(true);
    expect(config.bundleType).toBe('east-asian');
  });

  it('uses explicit languages over detected', () => {
    const options: HyperfixiPluginOptions = { semantic: true, languages: ['en', 'es'] };
    const config = resolveSemanticConfig(options, new Set(['ja'])); // ja is detected but not in explicit list
    expect(config.languages.has('en')).toBe(true);
    expect(config.languages.has('es')).toBe(true);
    expect(config.languages.has('ja')).toBe(true); // ja is still included from detection
    expect(config.bundleType).toBe('es-en'); // but bundle is based on explicit languages
  });

  it('respects explicit region setting', () => {
    const options: HyperfixiPluginOptions = { semantic: true, region: 'all' };
    const config = resolveSemanticConfig(options, new Set(['en']));
    expect(config.bundleType).toBe('all');
  });

  it('includes extra languages', () => {
    const options: HyperfixiPluginOptions = { semantic: true, extraLanguages: ['ja', 'ko'] };
    const config = resolveSemanticConfig(options, new Set(['en']));
    expect(config.languages.has('en')).toBe(true);
    expect(config.languages.has('ja')).toBe(true);
    expect(config.languages.has('ko')).toBe(true);
  });
});

describe('getSemanticExports', () => {
  it('returns empty array when disabled', () => {
    const config = {
      enabled: false,
      bundleType: null,
      languages: new Set<
        'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'ar' | 'tr' | 'id' | 'sw' | 'qu'
      >(),
      grammarEnabled: false,
    };
    expect(getSemanticExports(config)).toEqual([]);
  });

  it('returns semantic exports when enabled', () => {
    const config = {
      enabled: true,
      bundleType: 'en' as SemanticBundleType,
      languages: new Set(['en'] as const),
      grammarEnabled: false,
    };
    const exports = getSemanticExports(config);
    expect(exports).toContain('parseWithSemantic');
    expect(exports).toContain('SUPPORTED_SEMANTIC_LANGUAGES');
    expect(exports).not.toContain('translateHyperscript');
  });

  it('returns grammar exports when grammar enabled', () => {
    const config = {
      enabled: true,
      bundleType: 'en' as SemanticBundleType,
      languages: new Set(['en'] as const),
      grammarEnabled: true,
    };
    const exports = getSemanticExports(config);
    expect(exports).toContain('parseWithSemantic');
    expect(exports).toContain('translateHyperscript');
    expect(exports).toContain('grammarTransformer');
  });
});
