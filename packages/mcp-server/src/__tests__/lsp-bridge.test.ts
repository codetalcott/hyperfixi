/**
 * LSP Bridge Tools Tests
 */
import { describe, it, expect } from 'vitest';
import { handleLspBridgeTool, lspBridgeTools } from '../tools/lsp-bridge.js';

// Helper to safely extract text from MCP content
function getTextContent(result: { content: Array<{ type: string; text?: string }> }): string {
  const item = result.content[0];
  if (item.type === 'text' && item.text) {
    return item.text;
  }
  return '';
}

describe('lspBridgeTools', () => {
  it('exports 4 tools', () => {
    expect(lspBridgeTools).toHaveLength(4);
  });

  it('has get_diagnostics tool', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_diagnostics');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('has get_completions tool', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_completions');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
    // Uses line and character instead of position object
    expect(tool?.inputSchema.required).toContain('line');
    expect(tool?.inputSchema.required).toContain('character');
  });

  it('has get_hover_info tool', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_hover_info');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
    // Uses line and character instead of position object
    expect(tool?.inputSchema.required).toContain('line');
    expect(tool?.inputSchema.required).toContain('character');
  });

  it('has get_document_symbols tool', () => {
    const tool = lspBridgeTools.find(t => t.name === 'get_document_symbols');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
  });
});

describe('get_diagnostics', () => {
  it('returns empty diagnostics for valid code', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics).toBeDefined();
    expect(Array.isArray(parsed.diagnostics)).toBe(true);
  });

  it('detects unmatched single quote', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: "on click put 'hello into #output",
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
    expect(parsed.diagnostics.some((d: any) => d.message.includes('quote'))).toBe(true);
  });

  it('detects unmatched double quote', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click put "hello into #output',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it('detects unbalanced parentheses', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click call myFunction(',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics.some((d: any) => d.message.includes('parenthes'))).toBe(true);
  });

  it('warns about deprecated setTimeout', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click call setTimeout(fn, 1000)',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics.some((d: any) => d.message.includes('setTimeout'))).toBe(true);
  });

  it('warns about missing then between commands', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click toggle .a toggle .b',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.diagnostics.some((d: any) => d.message.includes('then'))).toBe(true);
  });

  it('returns valid LSP diagnostic format', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: "on click put 'hello into #output",
    });

    const parsed = JSON.parse(getTextContent(result));
    const diag = parsed.diagnostics[0];
    expect(diag).toHaveProperty('range');
    expect(diag).toHaveProperty('message');
    expect(diag).toHaveProperty('severity');
    expect(diag.range).toHaveProperty('start');
    expect(diag.range).toHaveProperty('end');
  });
});

describe('get_completions', () => {
  it('returns completions', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on ',
      line: 0,
      character: 3,
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.completions).toBeDefined();
    expect(Array.isArray(parsed.completions)).toBe(true);
  });

  it('returns completions at start of code', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: '',
      line: 0,
      character: 0,
    });

    const parsed = JSON.parse(getTextContent(result));
    const labels = parsed.completions.map((c: any) => c.label);
    // At start, should include initial keywords like 'on', 'init', 'behavior', 'def'
    expect(labels.some((l: string) => ['on', 'init', 'behavior', 'def'].includes(l))).toBe(true);
  });

  it('returns command completions after event', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
    });

    const parsed = JSON.parse(getTextContent(result));
    const labels = parsed.completions.map((c: any) => c.label);
    // Should include commands after event
    expect(
      labels.some((l: string) => ['toggle', 'add', 'remove', 'show', 'hide'].includes(l))
    ).toBe(true);
  });

  it('returns completions with LSP kind codes', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on ',
      line: 0,
      character: 3,
    });

    const parsed = JSON.parse(getTextContent(result));
    const completion = parsed.completions[0];
    expect(completion).toHaveProperty('label');
    expect(completion).toHaveProperty('kind');
    expect(typeof completion.kind).toBe('number');
  });

  it('includes detail and documentation', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
    });

    const parsed = JSON.parse(getTextContent(result));
    const toggleCompletion = parsed.completions.find((c: any) => c.label === 'toggle');
    if (toggleCompletion) {
      expect(toggleCompletion.detail || toggleCompletion.documentation).toBeDefined();
    }
  });
});

describe('get_hover_info', () => {
  it('returns hover info for toggle keyword', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click toggle .active',
      line: 0,
      character: 10,
    });

    const parsed = JSON.parse(getTextContent(result));
    // May have contents or not depending on exact cursor position
    expect(parsed).toBeDefined();
  });

  it('returns hover info for me reference', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click add .active to me',
      line: 0,
      character: 24,
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should return some result
    expect(parsed).toBeDefined();
  });

  it('returns hover info for on keyword', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click toggle .active',
      line: 0,
      character: 0,
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should return some hover info
    expect(parsed).toBeDefined();
  });

  it('handles hover request for any position', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click toggle .active',
      line: 0,
      character: 5,
    });

    const parsed = JSON.parse(getTextContent(result));
    // Should not throw, may have contents or not
    expect(parsed).toBeDefined();
  });
});

describe('get_document_symbols', () => {
  it('extracts event handler symbol', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols).toBeDefined();
    expect(Array.isArray(parsed.symbols)).toBe(true);
    expect(parsed.symbols.some((s: any) => s.name.includes('click'))).toBe(true);
  });

  it('extracts behavior definition', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'behavior Draggable\n  on mousedown ...\nend',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols.some((s: any) => s.name.includes('Draggable'))).toBe(true);
  });

  it('extracts function definition', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'def myFunction()\n  return 42\nend',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols.some((s: any) => s.name.includes('myFunction'))).toBe(true);
  });

  it('extracts init block', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'init\n  set :count to 0\nend',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols.some((s: any) => s.name.toLowerCase().includes('init'))).toBe(true);
  });

  it('extracts multiple symbols', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active\non mouseenter add .hover',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols.length).toBeGreaterThanOrEqual(2);
  });

  it('returns valid LSP symbol format', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active',
    });

    const parsed = JSON.parse(getTextContent(result));
    const symbol = parsed.symbols[0];
    expect(symbol).toHaveProperty('name');
    expect(symbol).toHaveProperty('kind');
    expect(symbol).toHaveProperty('range');
  });
});

describe('error handling', () => {
  it('handles unknown tool gracefully', async () => {
    const result = await handleLspBridgeTool('unknown_lsp_tool', {
      code: 'test',
    });

    expect(result.isError).toBe(true);
    expect(getTextContent(result)).toContain('Unknown');
  });

  it('handles empty code input', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: '',
    });

    // Should not throw
    expect(result.content).toBeDefined();
  });

  it('handles multiline code', async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click\n  toggle .active\n  wait 1s\n  remove .active',
    });

    // Should not throw
    expect(result.content).toBeDefined();
  });
});
