/**
 * Compilation Tools Tests
 *
 * Tests for MCP tools wrapping @lokascript/compilation-service.
 */

import { describe, it, expect } from 'vitest';
import { compilationTools, handleCompilationTool } from '../tools/compilation.js';

// =============================================================================
// Tool Definitions
// =============================================================================

describe('compilationTools', () => {
  it('exports 7 tools', () => {
    expect(compilationTools).toHaveLength(7);
  });

  it('has compile_hyperscript tool', () => {
    const tool = compilationTools.find(t => t.name === 'compile_hyperscript');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Compile');
  });

  it('has validate_and_compile tool', () => {
    const tool = compilationTools.find(t => t.name === 'validate_and_compile');
    expect(tool).toBeDefined();
  });

  it('has translate_code tool with required params', () => {
    const tool = compilationTools.find(t => t.name === 'translate_code');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('code');
    expect(tool?.inputSchema.required).toContain('from');
    expect(tool?.inputSchema.required).toContain('to');
  });

  it('has generate_tests tool', () => {
    const tool = compilationTools.find(t => t.name === 'generate_tests');
    expect(tool).toBeDefined();
  });

  it('has generate_component tool', () => {
    const tool = compilationTools.find(t => t.name === 'generate_component');
    expect(tool).toBeDefined();
  });

  it('has score_fidelity tool with required params', () => {
    const tool = compilationTools.find(t => t.name === 'score_fidelity');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('reference');
    expect(tool?.inputSchema.required).toContain('candidate');
  });

  it('has diff_behaviors tool with required params', () => {
    const tool = compilationTools.find(t => t.name === 'diff_behaviors');
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.required).toContain('a');
    expect(tool?.inputSchema.required).toContain('b');
  });
});

// =============================================================================
// Handler Tests
// =============================================================================

describe('compile_hyperscript', () => {
  it('compiles explicit syntax', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.js).toBeDefined();
    expect(parsed.semantic).toBeDefined();
    expect(result.isError).toBeFalsy();
  }, 30000);

  it('compiles natural language', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      code: 'on click toggle .active',
      language: 'en',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.js).toBeDefined();
  }, 30000);

  it('returns error for invalid input', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
    expect(result.isError).toBe(true);
  }, 30000);
});

describe('validate_and_compile', () => {
  it('validates explicit syntax', async () => {
    const result = await handleCompilationTool('validate_and_compile', {
      explicit: '[add patient:.highlight destination:#panel]',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.semantic).toBeDefined();
  }, 30000);
});

describe('translate_code', () => {
  it('translates between languages', async () => {
    const result = await handleCompilationTool('translate_code', {
      code: 'toggle .active',
      from: 'en',
      to: 'es',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.code).toBeDefined();
  }, 30000);
});

describe('generate_tests', () => {
  it('generates tests from explicit syntax', async () => {
    const result = await handleCompilationTool('generate_tests', {
      explicit: '[toggle patient:.active]',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.tests).toHaveLength(1);
    expect(parsed.operations.length).toBeGreaterThan(0);
  }, 30000);
});

describe('generate_component', () => {
  it('generates React component from explicit syntax', async () => {
    const result = await handleCompilationTool('generate_component', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.component).toBeDefined();
    expect(parsed.component.framework).toBe('react');
    expect(parsed.component.code).toContain("from 'react'");
  }, 30000);

  it('respects custom component name', async () => {
    const result = await handleCompilationTool('generate_component', {
      explicit: '[toggle patient:.active]',
      componentName: 'MyToggle',
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.component.name).toBe('MyToggle');
  }, 30000);
});

describe('diff_behaviors', () => {
  it('reports identical for same input', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.active]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.identical).toBe(true);
    expect(parsed.summary).toBe('No semantic change');
  }, 30000);

  it('detects differences', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[add patient:.highlight]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.identical).toBe(false);
    expect(parsed.operations.length).toBeGreaterThan(0);
  }, 30000);

  it('returns error for invalid input', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { code: 'xyzzy blorp', language: 'en', confidence: 0.9 },
      b: { explicit: '[toggle patient:.active]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
  }, 30000);
});

describe('error handling', () => {
  it('handles unknown tool name', async () => {
    const result = await handleCompilationTool('unknown_tool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown');
  });

  it('handles empty input', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
  }, 30000);
});
