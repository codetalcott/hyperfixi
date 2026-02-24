/**
 * Tests for LLM Prompt Generator
 */

import { describe, it, expect } from 'vitest';
import { generatePrompt, generateExamples, generateProtocolReference } from './prompt-generator';
import type { PromptGeneratorConfig } from './types';
import { defineCommand, defineRole } from '../schema/command-schema';
import type { CommandSchema } from '../schema/command-schema';

// =============================================================================
// Test Schemas (mimics domain-flow patterns)
// =============================================================================

const fetchSchema: CommandSchema = defineCommand({
  action: 'fetch',
  description: 'Fetch data from a URL and deliver to a target element',
  category: 'source',
  primaryRole: 'source',
  roles: [
    defineRole({
      role: 'source',
      description: 'URL to fetch from',
      required: true,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'style',
      description: 'Response format (json, html, text)',
      required: false,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'destination',
      description: 'Target element to deliver data to',
      required: false,
      expectedTypes: ['selector', 'expression'],
    }),
  ],
});

const submitSchema: CommandSchema = defineCommand({
  action: 'submit',
  description: 'Submit form data to a URL',
  category: 'action',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'Form element to submit',
      required: true,
      expectedTypes: ['selector', 'expression'],
    }),
    defineRole({
      role: 'destination',
      description: 'URL to submit to',
      required: true,
      expectedTypes: ['expression'],
    }),
    defineRole({
      role: 'style',
      description: 'Request encoding (json, form, multipart)',
      required: false,
      expectedTypes: ['expression'],
    }),
  ],
});

const toggleSchema: CommandSchema = defineCommand({
  action: 'toggle',
  description: 'Toggle a class or attribute on an element',
  category: 'dom',
  primaryRole: 'patient',
  roles: [
    defineRole({
      role: 'patient',
      description: 'The CSS selector to toggle',
      required: true,
      expectedTypes: ['selector'],
    }),
  ],
});

const testSchemas: readonly CommandSchema[] = [fetchSchema, submitSchema, toggleSchema];

function makeConfig(overrides?: Partial<PromptGeneratorConfig>): PromptGeneratorConfig {
  return {
    domain: 'test',
    description: 'Test domain for unit testing',
    schemas: testSchemas,
    ...overrides,
  };
}

// =============================================================================
// generatePrompt()
// =============================================================================

describe('generatePrompt', () => {
  it('returns a GeneratedPrompt with all sections', () => {
    const result = generatePrompt(makeConfig());
    expect(result.text).toBeTruthy();
    expect(result.sections.length).toBeGreaterThanOrEqual(4);
    expect(result.metadata.domain).toBe('test');
  });

  it('includes protocol section', () => {
    const result = generatePrompt(makeConfig());
    const protocol = result.sections.find(s => s.id === 'protocol');
    expect(protocol).toBeDefined();
    expect(protocol!.content).toContain('[command role1:value1');
    expect(protocol!.content).toContain('lowercased');
  });

  it('includes value types section', () => {
    const result = generatePrompt(makeConfig());
    const types = result.sections.find(s => s.id === 'value-types');
    expect(types).toBeDefined();
    expect(types!.content).toContain('Selector');
    expect(types!.content).toContain('Duration');
    expect(types!.content).toContain('Reference');
  });

  it('includes commands section with all schemas', () => {
    const result = generatePrompt(makeConfig());
    const commands = result.sections.find(s => s.id === 'commands');
    expect(commands).toBeDefined();
    expect(commands!.content).toContain('`fetch`');
    expect(commands!.content).toContain('`submit`');
    expect(commands!.content).toContain('`toggle`');
  });

  it('includes output format section', () => {
    const result = generatePrompt(makeConfig());
    const format = result.sections.find(s => s.id === 'output-format');
    expect(format).toBeDefined();
  });

  it('includes error recovery section', () => {
    const result = generatePrompt(makeConfig());
    const recovery = result.sections.find(s => s.id === 'error-recovery');
    expect(recovery).toBeDefined();
    expect(recovery!.content).toContain('Unknown command');
  });

  it('counts commands and roles in metadata', () => {
    const result = generatePrompt(makeConfig());
    expect(result.metadata.commandCount).toBe(3);
    // fetch: 3 roles, submit: 3 roles, toggle: 1 role = 7
    expect(result.metadata.roleCount).toBe(7);
  });

  it('estimates approximate tokens', () => {
    const result = generatePrompt(makeConfig());
    expect(result.metadata.approximateTokens).toBeGreaterThan(0);
    // Roughly chars/4
    expect(result.metadata.approximateTokens).toBe(Math.ceil(result.text.length / 4));
  });

  // --- Output Format Variants ---

  it('generates explicit-only format', () => {
    const result = generatePrompt(makeConfig({ outputFormat: 'explicit' }));
    const format = result.sections.find(s => s.id === 'output-format');
    expect(format!.content).toContain('bracket syntax');
    expect(format!.content).toContain('Do NOT output JSON');
  });

  it('generates json-only format', () => {
    const result = generatePrompt(makeConfig({ outputFormat: 'json' }));
    const format = result.sections.find(s => s.id === 'output-format');
    expect(format!.content).toContain('JSON');
    expect(format!.content).toContain('Do NOT output bracket syntax');
  });

  it('generates both format', () => {
    const result = generatePrompt(makeConfig({ outputFormat: 'both' }));
    const format = result.sections.find(s => s.id === 'output-format');
    expect(format!.content).toContain('EITHER format');
  });

  // --- Command Documentation ---

  it('documents required and optional roles', () => {
    const result = generatePrompt(makeConfig());
    const commands = result.sections.find(s => s.id === 'commands')!;
    // fetch has 1 required (source) and 2 optional (style, destination)
    expect(commands.content).toContain('**Required roles:**');
    expect(commands.content).toContain('**Optional roles:**');
    expect(commands.content).toContain('`source`');
    expect(commands.content).toContain('`style`');
    expect(commands.content).toContain('`destination`');
  });

  it('includes role type information', () => {
    const result = generatePrompt(makeConfig());
    const commands = result.sections.find(s => s.id === 'commands')!;
    expect(commands.content).toContain('(type: expression)');
    expect(commands.content).toContain('(type: selector)');
  });

  it('includes bracket syntax examples', () => {
    const result = generatePrompt(makeConfig({ outputFormat: 'explicit' }));
    const commands = result.sections.find(s => s.id === 'commands')!;
    expect(commands.content).toContain('[fetch');
    expect(commands.content).toContain('[submit');
    expect(commands.content).toContain('[toggle');
  });

  it('includes JSON examples when format is json or both', () => {
    const result = generatePrompt(makeConfig({ outputFormat: 'json' }));
    const commands = result.sections.find(s => s.id === 'commands')!;
    expect(commands.content).toContain('"action": "fetch"');
    expect(commands.content).toContain('"roles"');
  });

  // --- Token Budget ---

  it('truncates to maxTokens budget', () => {
    const full = generatePrompt(makeConfig());
    const truncated = generatePrompt(makeConfig({ maxTokens: 100 }));

    expect(truncated.sections.length).toBeLessThanOrEqual(full.sections.length);
    expect(truncated.text.length).toBeLessThan(full.text.length);
  });

  it('includes truncation marker when budget is exceeded', () => {
    const result = generatePrompt(makeConfig({ maxTokens: 100 }));
    // Either fewer sections or truncation marker
    const hasFewerSections = result.sections.length < 5;
    const hasTruncationMarker = result.text.includes('*(truncated)*');
    expect(hasFewerSections || hasTruncationMarker).toBe(true);
  });

  // --- Examples Per Command ---

  it('respects examplesPerCommand setting', () => {
    const result1 = generatePrompt(makeConfig({ examplesPerCommand: 1 }));
    const result3 = generatePrompt(makeConfig({ examplesPerCommand: 3 }));
    // More examples = longer text
    expect(result3.text.length).toBeGreaterThan(result1.text.length);
  });
});

// =============================================================================
// generateExamples()
// =============================================================================

describe('generateExamples', () => {
  it('generates examples for a command with required + optional roles', () => {
    const examples = generateExamples(fetchSchema, 3);
    expect(examples.length).toBeGreaterThanOrEqual(2);
  });

  it('generates valid bracket syntax', () => {
    const examples = generateExamples(fetchSchema, 2);
    for (const ex of examples) {
      expect(ex.explicit).toMatch(/^\[fetch\s/);
      expect(ex.explicit).toMatch(/\]$/);
    }
  });

  it('generates valid JSON format', () => {
    const examples = generateExamples(fetchSchema, 2);
    for (const ex of examples) {
      expect(ex.json.action).toBe('fetch');
      expect(ex.json.roles).toBeDefined();
      expect(typeof ex.json.roles).toBe('object');
    }
  });

  it('always includes required roles', () => {
    const examples = generateExamples(fetchSchema, 3);
    for (const ex of examples) {
      // source is required
      expect(ex.json.roles['source']).toBeDefined();
    }
  });

  it('generates selector values for selector-typed roles', () => {
    const examples = generateExamples(toggleSchema, 1);
    const patientValue = examples[0].json.roles['patient'];
    expect(patientValue).toBeDefined();
    expect(patientValue.type).toBe('selector');
    expect(String(patientValue.value)).toMatch(/^[#.@*\[]/);
  });

  it('generates expression values for expression-typed roles', () => {
    const examples = generateExamples(fetchSchema, 1);
    const sourceValue = examples[0].json.roles['source'];
    expect(sourceValue).toBeDefined();
    expect(sourceValue.type).toBe('expression');
  });

  it('limits output to requested count', () => {
    const one = generateExamples(fetchSchema, 1);
    expect(one.length).toBe(1);
  });

  it('handles schema with no optional roles', () => {
    const examples = generateExamples(toggleSchema, 3);
    // toggle has only 1 required role, so only 1 combination
    expect(examples.length).toBe(1);
  });

  it('handles schema with all required roles', () => {
    const examples = generateExamples(submitSchema, 3);
    // submit: 2 required + 1 optional = combos: [req], [req+opt1], total 2
    expect(examples.length).toBeGreaterThanOrEqual(2);
  });

  it('generates unique combinations', () => {
    const examples = generateExamples(fetchSchema, 4);
    const explicits = examples.map(e => e.explicit);
    const unique = new Set(explicits);
    expect(unique.size).toBe(examples.length);
  });
});

// =============================================================================
// generateProtocolReference()
// =============================================================================

describe('generateProtocolReference', () => {
  it('returns a markdown string with protocol info', () => {
    const ref = generateProtocolReference();
    expect(ref).toContain('LokaScript Explicit Syntax');
    expect(ref).toContain('[command');
  });

  it('includes value type information', () => {
    const ref = generateProtocolReference();
    expect(ref).toContain('Selector');
    expect(ref).toContain('Duration');
    expect(ref).toContain('Boolean');
    expect(ref).toContain('Reference');
  });

  it('returns non-empty string', () => {
    const ref = generateProtocolReference();
    expect(ref.length).toBeGreaterThan(100);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles empty schemas array', () => {
    const result = generatePrompt(makeConfig({ schemas: [] }));
    expect(result.metadata.commandCount).toBe(0);
    expect(result.metadata.roleCount).toBe(0);
    expect(result.text).toBeTruthy();
  });

  it('handles schema with no roles', () => {
    const noRoleSchema = defineCommand({
      action: 'noop',
      roles: [],
      primaryRole: 'patient',
    });
    const examples = generateExamples(noRoleSchema, 2);
    expect(examples.length).toBeGreaterThanOrEqual(0);
  });

  it('handles schema with only optional roles', () => {
    const optionalOnlySchema = defineCommand({
      action: 'log',
      roles: [
        defineRole({ role: 'patient', required: false, expectedTypes: ['expression'] }),
        defineRole({ role: 'style', required: false, expectedTypes: ['literal'] }),
      ],
      primaryRole: 'patient',
    });
    const examples = generateExamples(optionalOnlySchema, 3);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('handles very small maxTokens', () => {
    const result = generatePrompt(makeConfig({ maxTokens: 10 }));
    // Should still produce something
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
  });
});
