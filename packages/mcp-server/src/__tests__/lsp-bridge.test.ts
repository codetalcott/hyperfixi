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
    // The core parser's own error ("Unclosed string literal") now comes
    // first; the token-based "Unmatched single quote" is the fallback.
    expect(parsed.diagnostics.some((d: any) => /quote|string literal/i.test(d.message))).toBe(true);
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
    // Parser first ("Expected ')' after arguments"); token check is the fallback.
    expect(parsed.diagnostics.some((d: any) => /parenthes|\)/.test(d.message))).toBe(true);
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

  // The interchange hover renders the node at the cursor as LSE. `fromCoreAST`
  // names roles for `set` and `go` only unless the schema-driven inferrer is
  // injected (lsp-bridge.ts binds `schemaRoleInferrer`) — but the framework's
  // `fromInterchangeNode` re-infers the SIMPLE cases itself when rendering, so
  // a `toggle .active` hover shows `patient:.active` even with the injection
  // deleted. Only a case the framework cannot re-infer proves the wiring:
  // without the inferrer `add .x to me` renders `[add patient:.x]` (the
  // destination is dropped) and `halt the event` renders bare `[halt]`.
  // Measured over the engine corpus's feature sources, 2026-09-03: 4 of 28
  // render differently. Mutation: drop `inferRoles` in lsp-bridge.ts.
  it('hover LSE carries the schema-inferred destination role on add', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on click add .x to me',
      line: 0,
      character: 9, // "add"
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.contents).toContain('**LSE:**');
    expect(parsed.contents).toContain('destination:me');
    expect(parsed.contents).toContain('patient:.x');
  });

  it('hover LSE carries the schema-inferred patient role on halt the event', async () => {
    const result = await handleLspBridgeTool('get_hover_info', {
      code: 'on mouseenter halt the event',
      line: 0,
      character: 14, // "halt"
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.contents).toContain('patient:event');
  });
});

// ---------------------------------------------------------------------------
// The three AST paths that were never reached. `lsp-bridge.ts` guarded its
// diagnostics, completions and symbols AST paths on `astToolkit.astToLSP*`,
// names core has never exported, so all three silently took their token-based
// fallback (After-the-plan item 6). They read the interchange now; each row
// below asserts something the token path cannot produce, so reverting the
// guards to the dead names reddens every one.
// ---------------------------------------------------------------------------

describe('AST paths: symbols, completions, diagnostics read the interchange', () => {
  it('symbols: an event handler carries its commands as children', async () => {
    const result = await handleLspBridgeTool('get_document_symbols', {
      code: 'on click toggle .active then add .x',
    });
    const { symbols } = JSON.parse(getTextContent(result));
    const handler = symbols.find((s: { name: string }) => s.name === 'on click');
    expect(handler).toBeDefined();
    expect((handler.children ?? []).map((c: { name: string }) => c.name)).toEqual([
      'toggle',
      'add',
    ]);
  });

  it('completions: inside a command, its argument shapes are offered', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click toggle .active',
      line: 0,
      character: 15, // inside "toggle"
    });
    const labels = JSON.parse(getTextContent(result)).completions.map(
      (c: { label: string }) => c.label
    );
    expect(labels).toEqual(expect.arrayContaining(['.', '@', 'me']));
    expect(labels).not.toContain('init'); // the token path's generic list
  });

  it('completions: after `set … to`, the variable sigils are offered', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'set x to',
      line: 0,
      character: 8,
    });
    const labels = JSON.parse(getTextContent(result)).completions.map(
      (c: { label: string }) => c.label
    );
    expect(labels).toEqual(expect.arrayContaining([':', '$', 'the']));
  });

  it("diagnostics: the core parser's own error is reported, not a typo guess", async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'behavior Foo on click add .x end',
    });
    const { diagnostics } = JSON.parse(getTextContent(result));
    const parseErrors = diagnostics.filter((d: { code: string }) => d.code === 'parse-error');
    expect(parseErrors.map((d: { message: string }) => d.message)).toContain(
      "Expected 'end' to close behavior definition"
    );
  });

  it('a statement kind the converter cannot represent is not a parse error', async () => {
    // `fromCoreAST` throws "Unknown core AST node type: def"; that is a
    // converter limit and must not surface as a diagnostic.
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'def greet(name) log name end',
    });
    const { diagnostics } = JSON.parse(getTextContent(result));
    expect(diagnostics.filter((d: { code: string }) => d.code === 'parse-error')).toEqual([]);
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
      // `end`-terminated: without it, `toggle .active on mouseenter` reads
      // `on` as toggle's destination marker (upstream does too), and the
      // token-based extractor only ever counted two by regex.
      code: 'on click toggle .active end\non mouseenter add .hover end',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.symbols.map((s: any) => s.name)).toEqual(['on click', 'on mouseenter']);
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
