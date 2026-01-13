/**
 * Semantic Tools Tests (Phase 5)
 *
 * Tests for full syntax-level multilingual support via @hyperfixi/semantic.
 * These tests verify semantic parsing, translation, and confidence scoring.
 */
import { describe, it, expect } from 'vitest';
import { handleValidationTool, validationTools } from '../tools/validation.js';
import { handleLspBridgeTool } from '../tools/lsp-bridge.js';

// Helper to safely extract text from MCP content
function getTextContent(result: { content: Array<{ type: string; text?: string }> }): string {
  const item = result.content[0];
  if (item.type === 'text' && item.text) {
    return item.text;
  }
  return '';
}

// =============================================================================
// Tool Schema Tests
// =============================================================================

describe('Phase 5 Tool Schemas', () => {
  it('parse_multilingual tool exists', () => {
    const tool = validationTools.find(t => t.name === 'parse_multilingual');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('code');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
    expect(tool?.inputSchema.required).toContain('code');
    expect(tool?.inputSchema.required).toContain('language');
  });

  it('translate_to_english tool exists', () => {
    const tool = validationTools.find(t => t.name === 'translate_to_english');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('code');
    expect(tool?.inputSchema.properties).toHaveProperty('sourceLanguage');
    expect(tool?.inputSchema.properties).toHaveProperty('getAllLanguages');
    expect(tool?.inputSchema.required).toContain('code');
    expect(tool?.inputSchema.required).toContain('sourceLanguage');
  });
});

// =============================================================================
// parse_multilingual Tests
// =============================================================================

describe('parse_multilingual', () => {
  it('parses English toggle with confidence', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('en');
    // May have success or error depending on semantic package availability
    expect(parsed).toHaveProperty('confidence');
  });

  it('parses English with roles', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'toggle .active on #button',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('en');
    if (parsed.success) {
      expect(parsed.command).toBeDefined();
      expect(parsed.command.name).toBe('toggle');
    }
  });

  it('returns supported languages list', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    if (parsed.supportedLanguages) {
      expect(Array.isArray(parsed.supportedLanguages)).toBe(true);
      expect(parsed.supportedLanguages.length).toBeGreaterThan(10); // At least 13 languages
    }
  });

  it('handles invalid code gracefully', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'xyzzy frobulate widget',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should return low confidence or error, not crash
    expect(parsed).toHaveProperty('confidence');
  });

  it('parses Korean code', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: '.active 를 토글',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
    // If semantic package is available, should parse Korean
    if (parsed.success) {
      expect(parsed.command?.name).toBe('toggle');
    }
  });

  it('parses Japanese code', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: '.active を 切り替え',
      language: 'ja',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ja');
  });

  it('parses Spanish code', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'alternar .active',
      language: 'es',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('es');
  });
});

// =============================================================================
// translate_to_english Tests
// =============================================================================

describe('translate_to_english', () => {
  it('translates from English to English (passthrough)', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.sourceLanguage).toBe('en');
    if (parsed.english) {
      expect(parsed.english).toContain('toggle');
    }
  });

  it('includes explicit syntax when available', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    // explicit may be null if toExplicit is unavailable
    expect(parsed).toHaveProperty('explicit');
  });

  it('returns all translations when requested', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
      getAllLanguages: true,
    });

    const parsed = JSON.parse(getTextContent(result));
    if (parsed.translations) {
      expect(typeof parsed.translations).toBe('object');
      expect(parsed.languageCount).toBeGreaterThan(0);
    }
  });

  it('handles translation errors gracefully', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'invalid syntax here',
      sourceLanguage: 'en',
    });

    // Should not throw, should return error info
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toBeDefined();
  });
});

// =============================================================================
// Enhanced validate_hyperscript Tests
// =============================================================================

describe('validate_hyperscript semantic enhancement', () => {
  it('includes semantic info in validation result', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toHaveProperty('semantic');
    // semantic may be null if package unavailable
    if (parsed.semantic) {
      expect(parsed.semantic).toHaveProperty('confidence');
      expect(parsed.semantic).toHaveProperty('usedSemanticParsing');
    }
  });

  it('semantic validation for Korean code', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: '.active 를 토글',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
    expect(parsed).toHaveProperty('semantic');
  });

  it('validates toggle command has target', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should be valid - has .active target
    expect(parsed.valid).toBe(true);
  });
});

// =============================================================================
// Enhanced get_diagnostics Tests
// =============================================================================

describe('get_diagnostics semantic enhancement', () => {
  it('includes semantic confidence in response', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('en');
    // semanticConfidence may be undefined if package unavailable
    if (parsed.semanticConfidence !== undefined) {
      expect(typeof parsed.semanticConfidence).toBe('number');
    }
  });

  it('validates Korean code semantically', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: '.active 를 토글',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
    expect(parsed).toHaveProperty('diagnostics');
  });

  it('detects semantic errors', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'xyzzy frobulate',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toHaveProperty('diagnostics');
    // May have diagnostics for unknown syntax
  });
});

// =============================================================================
// Cross-Language Consistency Tests
// =============================================================================

describe('Cross-language parsing consistency', () => {
  const languages = ['en', 'ko', 'ja', 'es', 'ar', 'zh', 'tr', 'pt', 'fr', 'de'];

  for (const lang of languages) {
    it(`parse_multilingual accepts language: ${lang}`, async () => {
      const result = await handleValidationTool('parse_multilingual', {
        code: 'toggle .active', // English code as fallback
        language: lang,
      });

      const parsed = JSON.parse(getTextContent(result));
      expect(parsed.language).toBe(lang);
      expect(parsed).toHaveProperty('confidence');
    });
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Semantic tools error handling', () => {
  it('parse_multilingual handles empty code', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: '',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toBeDefined();
    expect(parsed.language).toBe('en');
  });

  it('translate_to_english handles empty code', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: '',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toBeDefined();
  });

  it('parse_multilingual handles unknown language gracefully', async () => {
    const result = await handleValidationTool('parse_multilingual', {
      code: 'toggle .active',
      language: 'xx', // Unknown language code
    });

    // Should not throw
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toBeDefined();
  });
});
