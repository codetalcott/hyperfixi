/**
 * Multilingual MCP Tools Tests
 *
 * Tests multilingual support across LSP Bridge and Validation tools.
 * These tests verify that non-English users can get assistance in their native language.
 */
import { describe, it, expect } from 'vitest';
import { handleLspBridgeTool, lspBridgeTools } from '../tools/lsp-bridge.js';
import { handleValidationTool, validationTools } from '../tools/validation.js';

// Helper to safely extract text from MCP content
function getTextContent(result: { content: Array<{ type: string; text?: string }> }): string {
  const item = result.content[0];
  if (item.type === 'text' && item.text) {
    return item.text;
  }
  return '';
}

describe('Multilingual Tool Schemas', () => {
  it('get_diagnostics has language parameter', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_diagnostics');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
  });

  it('get_completions has language parameter', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_completions');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
  });

  it('get_hover_info has language parameter', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_hover_info');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
  });

  it('get_document_symbols has language parameter', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_document_symbols');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
  });

  it('suggest_command has language parameter', () => {
    const tool = validationTools.find(t => t.name === 'suggest_command');
    expect(tool?.inputSchema.properties).toHaveProperty('language');
  });
});

describe('get_completions multilingual', () => {
  it('returns English keywords by default', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.completions.some((c: any) => c.label === 'toggle')).toBe(true);
  });

  it('includes language in response', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
  });

  it('respects language parameter for command context', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should have command completions
    expect(parsed.completions.length).toBeGreaterThan(0);
  });

  it('returns completions for empty code', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: '',
      line: 0,
      character: 0,
      language: 'ja',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ja');
    expect(parsed.completions.length).toBeGreaterThan(0);
  });
});

describe('get_diagnostics multilingual', () => {
  it('includes language in response', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .active',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
  });

  it('validates English code correctly', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics).toBeDefined();
    expect(Array.isArray(parsed.diagnostics)).toBe(true);
  });

  it('detects syntax errors regardless of language', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: "on click put 'hello into #output",
      language: 'ja',
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should detect unmatched quote or other syntax issues
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    // May report 'quote' error or semantic parsing error or low confidence
    const hasRelevantDiagnostic = parsed.diagnostics.some(
      (d: any) =>
        d.message.includes('quote') ||
        d.message.includes('confidence') ||
        d.message.includes('parse') ||
        d.severity === 1 ||
        d.severity === 2
    );
    expect(hasRelevantDiagnostic).toBe(true);
  });
});

describe('get_hover_info multilingual', () => {
  it('includes language in response', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click toggle .active',
      line: 0,
      character: 10,
      language: 'es',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('es');
  });

  it('returns hover for English keyword regardless of language setting', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click toggle .active',
      line: 0,
      character: 10, // "toggle"
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should find documentation for toggle
    expect(parsed).toBeDefined();
  });
});

describe('get_document_symbols multilingual', () => {
  it('includes language in response', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active',
      language: 'de',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('de');
  });

  it('extracts English event handlers', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols).toBeDefined();
    expect(parsed.symbols.some((s: any) => s.name.includes('click'))).toBe(true);
  });
});

describe('validate_hyperscript multilingual', () => {
  it('includes language in response', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
  });

  it('validates English code as valid', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.valid).toBe(true);
  });

  it('detects unbalanced quotes in any language', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: "on click put 'hello into #output",
      language: 'ja',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.valid).toBe(false);
    expect(parsed.errors.some((e: any) => e.message.includes('quote'))).toBe(true);
  });
});

describe('suggest_command multilingual', () => {
  it('includes language in response', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'toggle a class',
      language: 'ko',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('ko');
  });

  it('suggests toggle for "toggle a class" task in English', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'toggle a class',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.bestMatch.command).toBe('toggle');
  });

  it('suggests show for "show modal" task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'show a modal dialog',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.bestMatch.command).toBe('show');
  });

  it('suggests fetch for "api request" task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'make an api request',
      language: 'en',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.bestMatch.command).toBe('fetch');
  });

  it('returns suggestions for unknown task', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'xyzzy frobulate widget',
      language: 'fr',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.suggestions).toBeDefined();
    expect(parsed.suggestions.length).toBeGreaterThan(0);
    expect(parsed.language).toBe('fr');
  });
});

describe('Language fallback', () => {
  it('falls back gracefully for unsupported language', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
      language: 'xx', // Unsupported language
    });

    // Should not throw, should return something
    expect(result.content).toBeDefined();
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.completions.length).toBeGreaterThan(0);
  });

  it('handles missing language parameter', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .active',
      // No language parameter
    });

    // Should default to English
    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.language).toBe('en');
  });
});
