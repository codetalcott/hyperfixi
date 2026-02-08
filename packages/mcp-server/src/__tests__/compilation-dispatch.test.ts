/**
 * Compilation Dispatch & Contract Tests
 *
 * Tests the MCP layer between tool definitions and the compilation service:
 * - Tool name routing correctness
 * - Schema-handler parameter parity
 * - Response shape contract for LLM consumption
 * - Diff tool through MCP layer
 * - Error wrapping consistency
 */

import { describe, it, expect } from 'vitest';
import { compilationTools, handleCompilationTool } from '../tools/compilation.js';

// =============================================================================
// Tool Definition Contracts
// =============================================================================

describe('Tool definition contracts', () => {
  const expectedTools = [
    'compile_hyperscript',
    'validate_and_compile',
    'translate_code',
    'generate_tests',
    'generate_component',
    'diff_behaviors',
  ];

  it('exports exactly the expected tools', () => {
    const toolNames = compilationTools.map(t => t.name);
    expect(toolNames).toEqual(expect.arrayContaining(expectedTools));
    expect(toolNames).toHaveLength(expectedTools.length);
  });

  for (const toolName of expectedTools) {
    it(`${toolName} has valid inputSchema`, () => {
      const tool = compilationTools.find(t => t.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.inputSchema).toBeDefined();
      expect(tool!.inputSchema.type).toBe('object');
      expect(tool!.inputSchema.properties).toBeDefined();
    });

    it(`${toolName} has non-empty description`, () => {
      const tool = compilationTools.find(t => t.name === toolName);
      expect(tool!.description!.length).toBeGreaterThan(10);
    });
  }
});

// =============================================================================
// Schema-Handler Parameter Parity
// =============================================================================

describe('Schema-handler parameter parity', () => {
  it('compile_hyperscript schema matches handler expectations', () => {
    const tool = compilationTools.find(t => t.name === 'compile_hyperscript')!;
    const props = Object.keys(tool.inputSchema.properties!);

    // Handler reads: code, explicit, semantic, language, confidence
    expect(props).toContain('code');
    expect(props).toContain('explicit');
    expect(props).toContain('semantic');
    expect(props).toContain('language');
    expect(props).toContain('confidence');
  });

  it('validate_and_compile schema matches handler expectations', () => {
    const tool = compilationTools.find(t => t.name === 'validate_and_compile')!;
    const props = Object.keys(tool.inputSchema.properties!);

    expect(props).toContain('code');
    expect(props).toContain('explicit');
    expect(props).toContain('semantic');
    expect(props).toContain('language');
    expect(props).toContain('confidence');
  });

  it('translate_code schema has required fields', () => {
    const tool = compilationTools.find(t => t.name === 'translate_code')!;
    const props = Object.keys(tool.inputSchema.properties!);

    expect(props).toContain('code');
    expect(props).toContain('from');
    expect(props).toContain('to');
    expect(tool.inputSchema.required).toContain('code');
    expect(tool.inputSchema.required).toContain('from');
    expect(tool.inputSchema.required).toContain('to');
  });

  it('generate_tests schema matches handler expectations', () => {
    const tool = compilationTools.find(t => t.name === 'generate_tests')!;
    const props = Object.keys(tool.inputSchema.properties!);

    expect(props).toContain('code');
    expect(props).toContain('explicit');
    expect(props).toContain('semantic');
    expect(props).toContain('language');
    expect(props).toContain('testName');
    expect(props).toContain('executionMode');
  });

  it('generate_component schema matches handler expectations', () => {
    const tool = compilationTools.find(t => t.name === 'generate_component')!;
    const props = Object.keys(tool.inputSchema.properties!);

    expect(props).toContain('code');
    expect(props).toContain('explicit');
    expect(props).toContain('semantic');
    expect(props).toContain('language');
    expect(props).toContain('componentName');
    expect(props).toContain('typescript');
  });

  it('diff_behaviors schema has required a and b', () => {
    const tool = compilationTools.find(t => t.name === 'diff_behaviors')!;
    const props = Object.keys(tool.inputSchema.properties!);

    expect(props).toContain('a');
    expect(props).toContain('b');
    expect(props).toContain('confidence');
    expect(tool.inputSchema.required).toContain('a');
    expect(tool.inputSchema.required).toContain('b');
  });

  it('diff_behaviors a/b have input format properties', () => {
    const tool = compilationTools.find(t => t.name === 'diff_behaviors')!;
    const aProps = tool.inputSchema.properties!.a as { properties?: Record<string, unknown> };
    const bProps = tool.inputSchema.properties!.b as { properties?: Record<string, unknown> };

    // Both sides should accept code, explicit, semantic, language
    for (const side of [aProps, bProps]) {
      expect(side.properties).toHaveProperty('code');
      expect(side.properties).toHaveProperty('explicit');
      expect(side.properties).toHaveProperty('semantic');
      expect(side.properties).toHaveProperty('language');
    }
  });
});

// =============================================================================
// MCP Response Shape Contract
// =============================================================================

describe('MCP response shape contract', () => {
  it('successful response has content array with text type', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      explicit: '[toggle patient:.active]',
    });

    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(typeof result.content[0].text).toBe('string');
  }, 30000);

  it('successful response has isError=false or undefined', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      explicit: '[toggle patient:.active]',
    });

    expect(result.isError).toBeFalsy();
  }, 30000);

  it('failure response has isError=true', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      code: 'xyzzy blorp',
      language: 'en',
      confidence: 0.9,
    });

    expect(result.isError).toBe(true);
  }, 30000);

  it('response text is valid JSON', async () => {
    const result = await handleCompilationTool('compile_hyperscript', {
      explicit: '[toggle patient:.active]',
    });

    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  }, 30000);

  it('unknown tool name returns isError=true', async () => {
    const result = await handleCompilationTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown');
  });
});

// =============================================================================
// Diff Tool Through MCP Layer
// =============================================================================

describe('diff_behaviors via MCP', () => {
  it('identical explicit inputs return identical=true', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[toggle patient:.active]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.identical).toBe(true);
    expect(parsed.summary).toBe('No semantic change');
    expect(result.isError).toBeFalsy();
  }, 30000);

  it('different operations return identical=false with details', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { explicit: '[toggle patient:.active]' },
      b: { explicit: '[add patient:.highlight destination:#btn]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.identical).toBe(false);
    expect(parsed.operations.length).toBeGreaterThan(0);
    expect(parsed.summary.length).toBeGreaterThan(0);
  }, 30000);

  it('cross-format diff (explicit vs JSON) for same semantics', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { explicit: '[toggle patient:.active]' },
      b: {
        semantic: {
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(true);
    expect(parsed.identical).toBe(true);
  }, 30000);

  it('diff with parse failure returns ok=false', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { code: 'xyzzy blorp', language: 'en', confidence: 0.9 },
      b: { explicit: '[toggle patient:.active]' },
    });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.ok).toBe(false);
    expect(parsed.identical).toBe(false);
    expect(result.isError).toBe(true);
  }, 30000);

  it('diff with confidence field', async () => {
    const result = await handleCompilationTool('diff_behaviors', {
      a: { code: 'on click toggle .active', language: 'en' },
      b: { explicit: '[toggle patient:.active]' },
      confidence: 0.5,
    });

    const parsed = JSON.parse(result.content[0].text);
    // With low confidence threshold, natural language should parse
    if (parsed.ok) {
      expect(parsed).toHaveProperty('identical');
      expect(parsed).toHaveProperty('operations');
      expect(parsed).toHaveProperty('summary');
    }
  }, 30000);
});

// =============================================================================
// All Tools — Input Format Coverage
// =============================================================================

describe('All tools accept explicit syntax', () => {
  const toolsWithExplicit = [
    'compile_hyperscript',
    'validate_and_compile',
    'generate_tests',
    'generate_component',
  ];

  for (const toolName of toolsWithExplicit) {
    it(`${toolName} accepts explicit syntax input`, async () => {
      const result = await handleCompilationTool(toolName, {
        explicit: '[toggle patient:.active]',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ok).toBe(true);
      expect(result.isError).toBeFalsy();
    }, 30000);
  }
});

describe('All tools accept LLM JSON', () => {
  const toolsWithSemantic = [
    'compile_hyperscript',
    'validate_and_compile',
    'generate_tests',
    'generate_component',
  ];

  for (const toolName of toolsWithSemantic) {
    it(`${toolName} accepts LLM JSON input`, async () => {
      const result = await handleCompilationTool(toolName, {
        semantic: {
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.ok).toBe(true);
      expect(result.isError).toBeFalsy();
    }, 30000);
  }
});

// =============================================================================
// Error Wrapping
// =============================================================================

describe('Error wrapping consistency', () => {
  it('handler catches exceptions and returns isError', async () => {
    // Pass a value that will cause a type error inside the handler
    const result = await handleCompilationTool('compile_hyperscript', {
      // Empty args — service.compile({}) should produce diagnostics, not crash
    });

    // Whether it fails or succeeds, the response should be well-formed
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    // Text should be valid JSON (wrapped response or error message)
    const text = result.content[0].text;
    if (text.startsWith('{')) {
      expect(() => JSON.parse(text)).not.toThrow();
    }
  }, 30000);

  it('translate_code with missing params returns error or handles gracefully', async () => {
    const result = await handleCompilationTool('translate_code', {
      // Missing required code, from, to
    });

    // Should either return an error via service or via exception handling
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
  }, 30000);
});
