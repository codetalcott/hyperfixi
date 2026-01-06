import { describe, it, expect } from 'vitest';
import {
  selectOptimalBundle,
  resolveSemanticConfig,
  getSemanticBundleImport,
  getSemanticExports,
  type SemanticBundleType,
} from './semantic-integration';
import type { HyperfixiPluginOptions } from './types';

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
  it('returns main entry for all bundle types (ES module usage)', () => {
    // All ES module imports use the main entry which has named exports
    // Regional bundles are IIFE format only (for <script> tags)
    expect(getSemanticBundleImport('en')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('es')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('tr')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('es-en')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('western')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('east-asian')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('priority')).toBe('@hyperfixi/semantic');
    expect(getSemanticBundleImport('all')).toBe('@hyperfixi/semantic');
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
      languages: new Set<'en' | 'es' | 'pt' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'ar' | 'tr' | 'id' | 'sw' | 'qu'>(),
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
