import { describe, it, expect } from 'vitest';

import { validationTools, handleValidationTool } from '../tools/validation.js';
import { lspBridgeTools, handleLspBridgeTool } from '../tools/lsp-bridge.js';
import { languageDocsTools, handleLanguageDocsTool } from '../tools/language-docs.js';
import { analysisTools, handleAnalysisTool } from '../tools/analysis.js';
import { listResources, readResource } from '../resources/index.js';

describe('Tool Definitions', () => {
  it('exports validation tools', () => {
    expect(validationTools).toHaveLength(3);
    expect(validationTools.map(t => t.name)).toEqual([
      'validate_hyperscript',
      'suggest_command',
      'get_code_fixes',
    ]);
  });

  it('exports LSP bridge tools', () => {
    expect(lspBridgeTools).toHaveLength(4);
    expect(lspBridgeTools.map(t => t.name)).toEqual([
      'get_diagnostics',
      'get_completions',
      'get_hover_info',
      'get_document_symbols',
    ]);
  });

  it('exports language docs tools', () => {
    expect(languageDocsTools).toHaveLength(4);
    expect(languageDocsTools.map(t => t.name)).toEqual([
      'get_command_docs',
      'get_expression_docs',
      'search_language_elements',
      'suggest_best_practices',
    ]);
  });

  it('exports analysis tools', () => {
    expect(analysisTools).toHaveLength(3);
    expect(analysisTools.map(t => t.name)).toEqual([
      'analyze_complexity',
      'explain_code',
      'recognize_intent',
    ]);
  });

  it('provides 14 total tools', () => {
    const total =
      validationTools.length +
      lspBridgeTools.length +
      languageDocsTools.length +
      analysisTools.length;
    expect(total).toBe(14);
  });
});

describe('Validation Tools', () => {
  it('validates correct hyperscript', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'on click toggle .active on me',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(true);
    expect(data.errors).toHaveLength(0);
  });

  it('detects unmatched quotes', async () => {
    const result = await handleValidationTool('validate_hyperscript', {
      code: 'put "Hello into me',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: any) => e.code === 'unmatched-quote')).toBe(true);
  });

  it('suggests commands for tasks', async () => {
    const result = await handleValidationTool('suggest_command', {
      task: 'show a modal dialog',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.suggestions.length).toBeGreaterThan(0);
    expect(data.suggestions.some((s: any) => s.command === 'show')).toBe(true);
  });

  it('lists fixable error codes', async () => {
    const result = await handleValidationTool('get_code_fixes', { listAll: true });
    const data = JSON.parse(result.content[0].text);
    expect(data.fixableErrors.length).toBeGreaterThan(0);
  });
});

describe('LSP Bridge Tools', () => {
  it('returns diagnostics for valid code', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .active',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBe(0);
  });

  it('returns diagnostics for unclosed blocks', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'if me matches .active\n  toggle .highlight',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.count).toBeGreaterThan(0);
  });

  it('provides completions in event context', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on ',
      line: 0,
      character: 3,
      context: 'event',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.completions.length).toBeGreaterThan(0);
    expect(data.completions.some((c: any) => c.label === 'click')).toBe(true);
  });

  it('provides hover for known keywords', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'toggle .active',
      line: 0,
      character: 3,
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.hover).not.toBeNull();
    expect(data.hover.contents).toContain('toggle');
  });

  it('extracts document symbols', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active\nbehavior MyBehavior\n  on load show me\nend\ndef greet(name)\n  log name\nend',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.symbols.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Language Docs Tools', () => {
  it('returns command docs', async () => {
    const result = await handleLanguageDocsTool('get_command_docs', {
      command: 'toggle',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe('toggle');
    expect(data.syntax).toBeTruthy();
    expect(data.examples.length).toBeGreaterThan(0);
  });

  it('returns expression docs', async () => {
    const result = await handleLanguageDocsTool('get_expression_docs', {
      expression: 'me',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.name).toBe('me');
    expect(data.category).toBe('references');
  });

  it('searches language elements', async () => {
    const result = await handleLanguageDocsTool('search_language_elements', {
      query: 'class',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.results.length).toBeGreaterThan(0);
  });

  it('suggests best practices', async () => {
    const result = await handleLanguageDocsTool('suggest_best_practices', {
      code: 'if me has .active remove .active from me else add .active to me end',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.suggestions.some((s: any) => s.id === 'prefer-toggle')).toBe(true);
  });
});

describe('Analysis Tools', () => {
  it('analyzes complexity', async () => {
    const result = await handleAnalysisTool('analyze_complexity', {
      code: 'on click if me matches .active remove .active else add .active end',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.commandCount).toBeGreaterThan(0);
    expect(data.estimatedCyclomatic).toBeGreaterThan(1);
  });

  it('explains code', async () => {
    const result = await handleAnalysisTool('explain_code', {
      code: 'on click toggle .active on me then wait 500ms then remove .highlight',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.overview).toContain('click');
    expect(data.overview).toContain('toggle');
  });

  it('recognizes intent', async () => {
    const result = await handleAnalysisTool('recognize_intent', {
      code: 'on click toggle .active on me',
    });
    const data = JSON.parse(result.content[0].text);
    expect(data.allIntents).toContain('event-handling');
    expect(data.allIntents).toContain('dom-manipulation');
  });
});

describe('Resources', () => {
  it('lists 4 resources', () => {
    const resources = listResources();
    expect(resources).toHaveLength(4);
    expect(resources.map(r => r.uri)).toEqual([
      'hyperscript://docs/commands',
      'hyperscript://docs/expressions',
      'hyperscript://docs/events',
      'hyperscript://examples/common',
    ]);
  });

  it('reads commands reference', () => {
    const result = readResource('hyperscript://docs/commands');
    expect(result.contents[0].text).toContain('toggle');
    expect(result.contents[0].text).toContain('fetch');
  });

  it('reads common patterns', () => {
    const result = readResource('hyperscript://examples/common');
    expect(result.contents[0].text).toContain('Toggle Menu');
    expect(result.contents[0].text).toContain('Modal Dialog');
  });

  it('throws on unknown resource', () => {
    expect(() => readResource('hyperscript://unknown')).toThrow();
  });
});
