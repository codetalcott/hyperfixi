/**
 * Language Server tests for v2 / v2.1 features:
 *   - `^var` (caretVar) symbol tracking
 *   - `attrs.X` component attribute tracking
 *   - `<template component>` region extraction
 *   - `#if`/`#for` directive structure diagnostics
 */

import { describe, it, expect } from 'vitest';
import { extractHyperscriptRegions } from './extraction.js';
import { buildSymbolTable } from './symbol-table.js';
import { runDirectiveDiagnostics } from './simple-diagnostics.js';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

describe('extraction — template component regions', () => {
  it('extracts <template component="..."> body as a template region', () => {
    const html = `
<template component="my-counter">
  <span>${'${^count}'}</span>
</template>
<my-counter></my-counter>
`;
    const regions = extractHyperscriptRegions(html);
    const tpl = regions.find(r => r.type === 'template');
    expect(tpl).toBeDefined();
    expect(tpl!.componentTag).toBe('my-counter');
    expect(tpl!.code).toContain('<span>');
  });

  it('extracts <script type="text/hyperscript-template" component> body', () => {
    const html = `
<script type="text/hyperscript-template" component="my-greet" _="set ^name to attrs.who">
  <p>Hello ${'${^name}'}</p>
</script>
`;
    const regions = extractHyperscriptRegions(html);
    const tpl = regions.find(r => r.type === 'template');
    expect(tpl).toBeDefined();
    expect(tpl!.componentTag).toBe('my-greet');
  });

  it('handles components and `_=` attributes side by side', () => {
    const html = `
<button _="on click increment ^count">Click</button>
<template component="my-counter">
  <span>${'${^count}'}</span>
</template>
`;
    const regions = extractHyperscriptRegions(html);
    const types = regions.map(r => r.type).sort();
    expect(types).toEqual(['attribute', 'template']);
  });
});

describe('symbol-table — caretVar', () => {
  it('tracks `set ^name` as a definition', () => {
    const region = {
      code: 'on click set ^count to 0',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 24,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([region]);
    const entry = table.symbols.get('^count');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('caretVar');
    expect(entry!.scope).toBe('caret');
    expect(entry!.definitions).toHaveLength(1);
  });

  it('tracks `^name` reads as usages, not definitions', () => {
    const region = {
      code: 'on click log ^count',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 19,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([region]);
    const entry = table.symbols.get('^count');
    expect(entry).toBeDefined();
    expect(entry!.definitions).toHaveLength(0);
    expect(entry!.usages).toHaveLength(1);
  });

  it('combines defs and usages across regions for the same caret-var', () => {
    const init = {
      code: 'set ^count to 0',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 15,
      type: 'attribute' as const,
    };
    const reader = {
      code: 'on click increment ^count',
      startLine: 5,
      startChar: 0,
      endLine: 5,
      endChar: 25,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([init, reader]);
    const entry = table.symbols.get('^count')!;
    expect(entry.definitions).toHaveLength(1);
    expect(entry.usages).toHaveLength(1);
  });

  it('does not double-count the write site as a usage', () => {
    const region = {
      code: 'set ^x to 1',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 11,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([region]);
    const entry = table.symbols.get('^x')!;
    expect(entry.definitions).toHaveLength(1);
    expect(entry.usages).toHaveLength(0);
  });
});

describe('symbol-table — componentAttr (attrs.X)', () => {
  it('tracks `attrs.fooBar` as a componentAttr usage', () => {
    const region = {
      code: 'set ^name to attrs.userName',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 27,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([region]);
    const entry = table.symbols.get('attrs.userName');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('componentAttr');
    expect(entry!.scope).toBe('attr');
    expect(entry!.usages).toHaveLength(1);
  });

  it('tracks distinct attrs entries per property', () => {
    const region = {
      code: 'log attrs.foo then log attrs.bar',
      startLine: 0,
      startChar: 0,
      endLine: 0,
      endChar: 32,
      type: 'attribute' as const,
    };
    const table = buildSymbolTable([region]);
    expect(table.symbols.has('attrs.foo')).toBe(true);
    expect(table.symbols.has('attrs.bar')).toBe(true);
  });
});

describe('runDirectiveDiagnostics', () => {
  it('accepts a balanced #if/#end block', () => {
    const code = ['#if attrs.show', '  <p>hi</p>', '#end'].join('\n');
    expect(runDirectiveDiagnostics(code)).toEqual([]);
  });

  it('accepts #if/#else/#end and #for/#else/#end', () => {
    const code = [
      '#if cond',
      '  yes',
      '#else',
      '  no',
      '#end',
      '#for x in items',
      '  ${x}',
      '#else',
      '  empty',
      '#end',
    ].join('\n');
    expect(runDirectiveDiagnostics(code)).toEqual([]);
  });

  it('reports unclosed #if', () => {
    const code = '#if cond\n  body';
    const diags = runDirectiveDiagnostics(code);
    expect(diags.some(d => d.code === 'directive-unclosed')).toBe(true);
  });

  it('reports stray #end', () => {
    const code = '#end';
    const diags = runDirectiveDiagnostics(code);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('directive-stray-end');
    expect(diags[0].severity).toBe(DiagnosticSeverity.Error);
  });

  it('reports stray #else', () => {
    const code = '#else';
    const diags = runDirectiveDiagnostics(code);
    expect(diags.some(d => d.code === 'directive-stray-else')).toBe(true);
  });

  it('reports duplicate #else in the same block', () => {
    const code = ['#if cond', '#else', '  a', '#else', '  b', '#end'].join('\n');
    const diags = runDirectiveDiagnostics(code);
    expect(diags.some(d => d.code === 'directive-duplicate-else')).toBe(true);
  });

  it('reports malformed #for missing `in`', () => {
    const code = ['#for item items', '#end'].join('\n');
    const diags = runDirectiveDiagnostics(code);
    expect(diags.some(d => d.code === 'directive-malformed-for')).toBe(true);
  });

  it('reports #continue outside of #for', () => {
    const code = ['#if cond', '  #continue', '#end'].join('\n');
    const diags = runDirectiveDiagnostics(code);
    expect(diags.some(d => d.code === 'directive-stray-continue')).toBe(true);
  });

  it('accepts #continue inside #for', () => {
    const code = ['#for item in items', '  #continue', '#end'].join('\n');
    const diags = runDirectiveDiagnostics(code);
    expect(diags.filter(d => d.code === 'directive-stray-continue')).toHaveLength(0);
  });

  it('ignores plain text and ${...} interpolation', () => {
    const code = ['<p>Hello ${attrs.name}</p>', '<button>Click</button>'].join('\n');
    expect(runDirectiveDiagnostics(code)).toEqual([]);
  });
});
