import { describe, it, expect } from 'vitest';
import { createDomainRegistry } from '../tools/domain-registry-setup.js';
import { dispatcherTools, handleDispatcherTool } from '../tools/dispatcher.js';

// =============================================================================
// Tool Definition Tests
// =============================================================================

describe('Dispatcher Tool Definitions', () => {
  it('exports 4 tool definitions', () => {
    expect(dispatcherTools).toHaveLength(4);
    const names = dispatcherTools.map(t => t.name);
    expect(names).toContain('detect_domain');
    expect(names).toContain('parse_composite');
    expect(names).toContain('compile_auto');
    expect(names).toContain('compile_composite');
  });

  it('all tools require input parameter', () => {
    for (const tool of dispatcherTools) {
      expect(tool.inputSchema.required).toContain('input');
    }
  });
});

// =============================================================================
// detect_domain Tests
// =============================================================================

describe('detect_domain', () => {
  it('detects SQL domain for a select query', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'detect_domain',
      { input: 'select name from users', language: 'en' },
      registry
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.domain).toBe('sql');
    expect(data.action).toBe('select');
    expect(data.confidence).toBeGreaterThan(0);
  });

  it('detects todo domain for an add command', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'detect_domain',
      { input: 'add milk to groceries', language: 'en' },
      registry
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.domain).toBe('todo');
    expect(data.action).toBe('add');
  });

  it('returns null domain for unrecognizable input', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'detect_domain',
      { input: 'xyzzy plugh', language: 'en' },
      registry
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.domain).toBeNull();
  });

  it('returns error for missing input', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool('detect_domain', {}, registry);

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.error).toContain('Missing');
  });

  it('defaults to English when language not specified', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'detect_domain',
      { input: 'select name from users' },
      registry
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.language).toBe('en');
  });
});

// =============================================================================
// parse_composite Tests
// =============================================================================

describe('parse_composite', () => {
  it('parses multi-line input from different domains', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'parse_composite',
      {
        input: 'select name from users\nadd milk to groceries',
        language: 'en',
      },
      registry
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.statements).toHaveLength(2);
    expect(data.statements[0].domain).toBe('sql');
    expect(data.statements[1].domain).toBe('todo');
    expect(data.summary.matched).toBe(2);
    expect(data.summary.domains).toContain('sql');
    expect(data.summary.domains).toContain('todo');
  });

  it('skips blank and comment lines', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'parse_composite',
      {
        input:
          '# This is a comment\nselect name from users\n\n-- another comment\nadd milk to groceries',
        language: 'en',
      },
      registry
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.statements).toHaveLength(2);
    expect(data.errors).toHaveLength(0);
  });

  it('reports errors for unmatched lines', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'parse_composite',
      {
        input: 'select name from users\nxyzzy plugh\nadd milk to groceries',
        language: 'en',
      },
      registry
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.statements).toHaveLength(2);
    expect(data.errors).toHaveLength(1);
    expect(data.errors[0].input).toBe('xyzzy plugh');
    expect(data.summary.unmatched).toBe(1);
  });
});

// =============================================================================
// compile_auto Tests
// =============================================================================

describe('compile_auto', () => {
  it('detects and compiles SQL in one shot', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'compile_auto',
      { input: 'select name from users', language: 'en' },
      registry
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.domain).toBe('sql');
    expect(data.ok).toBe(true);
    expect(data.code).toBeTruthy();
  });

  it('returns null domain for uncompilable input', async () => {
    const registry = createDomainRegistry();
    const result = await handleDispatcherTool(
      'compile_auto',
      { input: 'xyzzy plugh', language: 'en' },
      registry
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.domain).toBeNull();
    expect(data.ok).toBe(false);
  });
});
