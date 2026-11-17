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
    // The engine's own error ("Unterminated string at [Line: 1, Column: 13]") comes
    // first; the token-based "Unmatched single quote" is the fallback.
    expect(parsed.diagnostics.some((d: any) => /quote|string/i.test(d.message))).toBe(true);
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
    // The engine reports where it ran out ("Unexpected value: <<<EOF>>>", upstream's
    // wording, at the end of the line); the token check names the parenthesis when the
    // engine is absent.
    const error = parsed.diagnostics.find((d: any) => d.code === 'parse-error');
    expect(error?.message ?? parsed.diagnostics[0]?.message).toMatch(/EOF|parenthes|\)/);
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

  // O8 (2026-10-18): measured on 672 inputs, this tool flagged 6 of the 27 English inputs the
  // engine rejects (none with a position), gave 9 false errors on English it reads, and 467
  // possible-typo warnings, 391 of them on ja/es/ar. The engine decides for English now.
  const diagnose = async (code: string, language = 'en') =>
    JSON.parse(getTextContent(await handleLspBridgeTool('get_diagnostics', { code, language })))
      .diagnostics as any[];

  it("reports the engine's parse error at the token where it stopped", async () => {
    const ds = await diagnose('on click toggel .active');
    expect(ds[0]).toMatchObject({
      severity: 1,
      code: 'parse-error',
      source: 'engine',
      range: { start: { line: 0, character: 9 }, end: { line: 0, character: 15 } },
    });
    // A "did you mean" for the word it stopped on, and only that one.
    expect(ds.filter(d => d.code === 'possible-typo').map(d => d.message)).toEqual([
      'The grammar does not read "toggel" here. Did you mean "toggle"?',
    ]);
  });

  it("makes the typo's fix an edit that writes the suggestion (not `${suggestion}`)", async () => {
    const code = 'on load log "hi"\non click toggel .active';
    const parsed = JSON.parse(
      getTextContent(await handleLspBridgeTool('get_diagnostics', { code }))
    );
    const typo = parsed.diagnostics.findIndex((d: any) => d.code === 'possible-typo');
    const action = parsed.codeActions.find((a: any) => a.diagnosticIndex === typo);
    expect(action.fixes[0]).toMatchObject({
      title: 'Fix typo: toggle',
      edit: { type: 'replace', text: 'toggle' },
    });
    const { start, end } = action.fixes[0].edit.range;
    expect(code.slice(start, end)).toBe('toggel');
    const titles = parsed.codeActions.flatMap((a: any) => a.fixes.map((f: any) => f.title));
    expect(titles.filter((t: string) => t.includes('${'))).toEqual([]);
  });

  it('suggests no typo for a word the engine did not stop on', async () => {
    // `and` is not a misspelled `add`: the engine stops on `"Loading"`.
    const ds = await diagnose('on click add .busy to me and put "Loading" into #output');
    expect(ds.map(d => d.code)).toEqual(['parse-error']);
    expect(ds[0]).toMatchObject({ source: 'engine', range: { start: { line: 0, character: 33 } } });
  });

  it("gives no error on English the engine reads (a possessive 's is not an open quote)", async () => {
    for (const code of [
      "on click increment #counter's textContent",
      "bind $color to #picker's value",
    ]) {
      expect((await diagnose(code)).filter(d => d.severity === 1)).toEqual([]);
    }
  });

  it("makes semantic's doubt about English the engine reads a warning", async () => {
    const ds = await diagnose('on "refresh" put "Refreshed" into #output');
    expect(ds.filter(d => d.severity === 1)).toEqual([]);
    expect(ds.some(d => d.code === 'semantic-error' && d.severity === 2)).toBe(true);
  });

  // 2026-11-17: the "did you mean" compared the stop token with a list of commands. The
  // candidates are now the words the engine's grammar takes at that place.
  const typo = async (code: string) =>
    (await diagnose(code))
      .filter(d => d.code === 'possible-typo')
      .map(d => [
        d.data.suggestion,
        code.split('\n')[d.range.start.line]!.slice(d.range.start.character, d.range.end.character),
      ]);

  it('names a misspelled keyword, not only a misspelled command', async () => {
    expect(await typo('on click put "a" itno #out')).toEqual([['into', 'itno']]);
    expect(await typo("on click halt the event's bublbing")).toEqual([['bubbling', 'bublbing']]);
    expect(await typo('on click transition *width froom 0px to 100px')).toEqual([
      ['from', 'froom'],
    ]);
  });

  it('looks one token back: a misspelled word read as a name stops the parse after it', async () => {
    // The engine stops at `NoSuchBehavior`, at `notify`, at `set`.
    expect(await typo('intsall NoSuchBehavior')).toEqual([['install', 'intsall']]);
    expect(await typo('on click\n  sned notify to #out')).toEqual([['send', 'sned']]);
    expect(await typo('iint set $x to 1')).toEqual([['init', 'iint']]);
  });

  it('counts two swapped letters as one slip', async () => {
    expect(await typo('on click mkae a <p/>')).toEqual([['make', 'mkae']]);
    expect(await typo('on click epmty #list')).toEqual([['empty', 'epmty']]);
  });

  it('offers only a word the grammar takes there', async () => {
    // `for` is a command and one edit from `form`, and no command fits after `.active`.
    const after = await typo('on click if x add .a to me else remove .active form me end');
    expect(after.map(([word]) => word)).not.toContain('for');
    // A name that is no misspelling gets no suggestion.
    expect(await typo('on click put total itno')).toEqual([['into', 'itno']]);
    expect(await typo('on click frobnicate the widget')).toEqual([]);
  });

  it('warns no possible-typo off English (its command list is English)', async () => {
    const ds = await diagnose(
      "على النقر أضف [@aria-selected='false'] إلى .tab ثم أضف [@aria-selected='true'] إليّ",
      'ar'
    );
    expect(ds.filter(d => d.code === 'possible-typo')).toEqual([]);
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
    // At the start every feature fits (`on`, `init`, `behavior`, `def`): said as a group.
    expect(parsed.features).toBe('all');
  });

  it('returns command completions after event', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
    });

    const parsed = JSON.parse(getTextContent(result));
    // After an event every command fits (`toggle`, `add`, `remove`, …): said as a group.
    expect(parsed.commands).toBe('all');
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

  it('with a context hint, answers from the keyword lists, with details', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'on click ',
      line: 0,
      character: 9,
      context: 'command',
    });

    const parsed = JSON.parse(getTextContent(result));
    expect(parsed.source).toBeUndefined();
    const toggleCompletion = parsed.completions.find((c: any) => c.label === 'toggle');
    expect(toggleCompletion).toBeDefined();
    expect(toggleCompletion.detail).toBe('Toggle class/attribute');
  });
});

// 2026-11-17: for English the answer is the engine's grammar (`@hyperfixi/engine/next-words`,
// what the language server completes with), where it was keyword lists by a guessed context.
// It lists what is particular to the position and reports the groups that fit (commands,
// features, operators, expression starts) as "all", a list, or { allExcept }.
describe('get_completions from the grammar', () => {
  const complete = async (code: string, language?: string) => {
    const lines = code.split('\n');
    const result = await handleLspBridgeTool('get_completions', {
      code,
      line: lines.length - 1,
      character: lines[lines.length - 1]!.length,
      ...(language ? { language } : {}),
    });
    const parsed = JSON.parse(getTextContent(result));
    return { ...parsed, labels: parsed.completions.map((c: any) => c.label) as string[] };
  };

  it("lists a command's own next words, and no group where none fits", async () => {
    const answer = await complete('on click put x ');
    expect(answer.source).toBe('grammar');
    expect(answer.labels).toEqual(['into', 'before', 'after', 'at']);
    expect(answer.count).toBe(4);
    expect(answer.commands).toBeUndefined();
    expect(answer.features).toBeUndefined();
    // An expression can go on (`x is …`, `x as …`), but not with a word of another command.
    expect(answer.operators.allExcept).toEqual(expect.arrayContaining(['catch', 'finally']));
    expect(answer.operators.allExcept).not.toContain('is');
  });

  it("after an event: every command, said once, and the head's own words listed", async () => {
    const answer = await complete('on click ');
    expect(answer.commands).toBe('all');
    expect(answer.features).toBe('all');
    expect(answer.labels).toEqual(expect.arrayContaining(['from', 'debounced', 'end']));
    expect(answer.labels).not.toContain('toggle'); // in `commands`
    expect(answer.labels).not.toContain('into');
    expect(answer.takesValue).toBe(false);
    expect(answer.expressionStarts).toBeUndefined();
  });

  it('after a finished command: a command, an operator, or a closer', async () => {
    const answer = await complete('on click log 1 ');
    expect(answer.labels).toEqual(['then', 'end']);
    expect(answer.commands).toBe('all');
    expect(answer.operators).toBe('all');
  });

  it('takes the word being typed as a prefix, not as context', async () => {
    const typed = await complete('on click tog');
    const untyped = await complete('on click ');
    expect(typed.labels).toEqual(untyped.labels);
    expect(typed.commands).toBe('all');
  });

  it('where a value is read: the pronouns and sigils, and how an expression starts', async () => {
    const answer = await complete('on click set x to ');
    expect(answer.takesValue).toBe(true);
    expect(answer.labels).toEqual(expect.arrayContaining(['me', 'it', ':', '$', '#', '.']));
    expect(answer.expressionStarts).toEqual({ allExcept: ['new'] });
    expect(answer.features).toBeUndefined();
    expect(answer.operators).toBeUndefined();
  });

  it('an empty script opens with a feature, not with `me`', async () => {
    const answer = await complete('');
    expect(answer.features).toBe('all');
    expect(answer.labels).not.toContain('me');
  });

  it('after the `on` of a handler, event names first', async () => {
    const { labels } = await complete('on ');
    expect(labels.slice(0, 3)).toEqual(['click', 'dblclick', 'mouseenter']);
  });

  it('past a parse error, offers nothing and says why', async () => {
    const past = await complete('on click set x 5 then ');
    expect(past.labels).toEqual([]);
    expect(past.commands).toBeUndefined();
    expect(past.pastError).toBe(true);
    expect(past.note).toMatch(/get_diagnostics/);
    // An unfinished command at the cursor is not past an error.
    expect((await complete('on click put ')).pastError).toBeUndefined();
  });

  it('answers another language from its keyword lists, as before', async () => {
    const { source, labels } = await complete('on click ', 'es');
    expect(source).toBeUndefined();
    expect(labels.length).toBeGreaterThan(0);
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
      character: 16, // after "toggle "
    });
    const labels = JSON.parse(getTextContent(result)).completions.map(
      (c: { label: string }) => c.label
    );
    expect(labels).toEqual(expect.arrayContaining(['.', '#', 'me']));
    expect(labels).not.toContain('init'); // a feature does not start inside a handler's command
  });

  it('completions: after `set … to`, the variable sigils are offered', async () => {
    const result = await handleLspBridgeTool('get_completions', {
      code: 'set x to ',
      line: 0,
      character: 9,
    });
    const parsed = JSON.parse(getTextContent(result));
    const labels = parsed.completions.map((c: { label: string }) => c.label);
    expect(labels).toEqual(expect.arrayContaining([':', '$']));
    // `the` is one of the words any expression starts with: in the group.
    expect(parsed.expressionStarts.allExcept).not.toContain('the');
  });

  it("diagnostics: the engine's own error is reported, at its position", async () => {
    const result = await handleLspBridgeTool('get_diagnostics', {
      code: 'on click put "Saved" in #output',
    });
    const { diagnostics } = JSON.parse(getTextContent(result));
    const parseErrors = diagnostics.filter((d: { code: string }) => d.code === 'parse-error');
    expect(parseErrors[0]?.message).toMatch(/Expected one of: 'into'/);
    // `"Saved" in #output` reads as a membership test, so the engine stops at the end of
    // the line still wanting `into`: column 31.
    expect(parseErrors[0]?.range.start).toEqual({ line: 0, character: 31 });
    // And on a later line, the position is that line's.
    const second = JSON.parse(
      getTextContent(
        await handleLspBridgeTool('get_diagnostics', { code: 'on click\n  log 1\n  qqqq' })
      )
    ).diagnostics.find((d: { code: string }) => d.code === 'parse-error');
    expect(second?.range.start).toEqual({ line: 2, character: 2 });
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
