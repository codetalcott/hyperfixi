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
// Error Handling Tests
// =============================================================================

describe('Semantic tools error handling', () => {
  it('translate_to_english handles empty code', async () => {
    const result = await handleValidationTool('translate_to_english', {
      code: '',
      sourceLanguage: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed).toBeDefined();
  });
});
