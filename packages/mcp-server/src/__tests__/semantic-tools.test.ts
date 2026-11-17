/**
 * Semantic Tools Tests (Phase 5)
 *
 * Tests for full syntax-level multilingual support via @lokascript/semantic.
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
// translate_to_english Tests
// =============================================================================

describe('translate_to_english', () => {
  it('translates from English to English (passthrough)', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(result.isError).toBeUndefined();
    expect(parsed.sourceLanguage).toBe('en');
    expect(parsed.english).toBe('toggle .active');
  });

  it('includes explicit syntax when available', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.explicit).toBe('[toggle patient:.active]');
  });

  it('returns all translations when requested', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'toggle .active',
      sourceLanguage: 'en',
      getAllLanguages: true,
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(result.isError).toBeUndefined();
    expect(parsed.translations.en).toBe('toggle .active');
    expect(parsed.translations.es).toBe('alternar .active');
    // The bracket form rides along under `explicit`; it is not a language (it was counted).
    expect(parsed.translations.explicit).toBe('[toggle patient:.active]');
    const languages = Object.keys(parsed.translations).filter(k => k !== 'explicit');
    expect(languages).toHaveLength(24);
    expect(parsed.languageCount).toBe(24);
  });

  it('handles translation errors gracefully', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: 'invalid syntax here',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(result.isError).toBe(true);
    expect(parsed.error).toBe('Could not parse input in en: invalid syntax here');
    expect(parsed).not.toHaveProperty('english');
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
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.semanticConfidence).toBeGreaterThan(0.5);
    expect(parsed.semanticConfidence).toBeLessThanOrEqual(1);
  });

  it('validates Korean code semantically', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: '.active 를 토글',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.hasErrors).toBe(false);
    expect(parsed.semanticConfidence).toBeGreaterThan(0.5);
  });

  it('detects semantic errors', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'xyzzy frobulate',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.hasErrors).toBe(true);
    expect(parsed.diagnostics).toHaveLength(1);
    expect(parsed.diagnostics[0]).toMatchObject({
      code: 'parse-error',
      message: 'Unexpected Token : frobulate',
    });
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Semantic tools error handling', () => {
  it('translate_to_english handles empty code', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: '',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(result.isError).toBe(true);
    expect(parsed.error).toContain('Could not parse input in en');
  });
});
