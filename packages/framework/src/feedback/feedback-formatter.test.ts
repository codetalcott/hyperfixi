/**
 * Tests for Feedback Formatter
 */

import { describe, it, expect } from 'vitest';
import { buildFeedback } from './feedback-formatter';
import type { Diagnostic } from '../generation/diagnostics';
import type { SchemaLookup } from '../ir/types';
import { defineCommand, defineRole } from '../schema/command-schema';

// =============================================================================
// Test Helpers
// =============================================================================

const fetchSchema = defineCommand({
  action: 'fetch',
  description: 'Fetch data from a URL',
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
      description: 'Response format',
      required: false,
      expectedTypes: ['expression'],
    }),
  ],
});

const schemaLookup: SchemaLookup = {
  getSchema(action: string) {
    if (action === 'fetch') return fetchSchema;
    return undefined;
  },
};

function makeDiagnostic(overrides?: Partial<Diagnostic>): Diagnostic {
  return {
    message: 'Test error',
    severity: 'error',
    ...overrides,
  };
}

// =============================================================================
// buildFeedback()
// =============================================================================

describe('buildFeedback', () => {
  it('accepts input with no errors', () => {
    const result = buildFeedback('[fetch source:/api]', 'explicit', []);
    expect(result.accepted).toBe(true);
    expect(result.diagnostics.length).toBe(0);
  });

  it('rejects input with errors', () => {
    const result = buildFeedback('[fetch]', 'explicit', [makeDiagnostic()]);
    expect(result.accepted).toBe(false);
  });

  it('preserves input info', () => {
    const result = buildFeedback('[fetch source:/api]', 'explicit', []);
    expect(result.input.format).toBe('explicit');
    expect(result.input.text).toBe('[fetch source:/api]');
  });

  it('handles JSON input format', () => {
    const result = buildFeedback('{"action":"fetch"}', 'json', []);
    expect(result.input.format).toBe('json');
  });

  // --- Diagnostic Classification ---

  it('classifies missing_role fix type', () => {
    const diag = makeDiagnostic({ code: 'missing-role', message: 'Required role source missing' });
    const result = buildFeedback('[fetch]', 'explicit', [diag]);
    expect(result.diagnostics[0].fixType).toBe('missing_role');
  });

  it('classifies unknown_command fix type', () => {
    const diag = makeDiagnostic({ code: 'unknown-command', message: 'Unknown command xyz' });
    const result = buildFeedback('[xyz]', 'explicit', [diag]);
    expect(result.diagnostics[0].fixType).toBe('unknown_command');
  });

  it('classifies unknown_role fix type', () => {
    const diag = makeDiagnostic({ code: 'unknown-role', message: 'Unknown role target' });
    const result = buildFeedback('[fetch target:/api]', 'explicit', [diag]);
    expect(result.diagnostics[0].fixType).toBe('unknown_role');
  });

  it('classifies invalid_type fix type', () => {
    const diag = makeDiagnostic({ code: 'invalid-type', message: 'Invalid type for role' });
    const result = buildFeedback('[fetch source:123]', 'explicit', [diag]);
    expect(result.diagnostics[0].fixType).toBe('invalid_type');
  });

  it('classifies syntax_error fix type', () => {
    const diag = makeDiagnostic({ code: 'parse-error', message: 'Unexpected token' });
    const result = buildFeedback('[fetch', 'explicit', [diag]);
    expect(result.diagnostics[0].fixType).toBe('syntax_error');
  });

  it('handles diagnostics with no code', () => {
    const diag = makeDiagnostic({ code: undefined, message: 'Something went wrong' });
    const result = buildFeedback('[fetch]', 'explicit', [diag]);
    expect(result.diagnostics[0].code).toBe('unknown');
    expect(result.diagnostics[0].fixType).toBeUndefined();
  });

  // --- Hints ---

  it('generates hints for missing_role with schema', () => {
    const diag = makeDiagnostic({ code: 'missing-role', message: 'Missing role source' });
    const result = buildFeedback('[fetch]', 'explicit', [diag], schemaLookup, 'fetch');
    expect(result.hints.length).toBeGreaterThan(0);
    expect(result.hints[0]).toContain("'source'");
  });

  it('generates hints for unknown_role with schema', () => {
    const diag = makeDiagnostic({ code: 'unknown-role', message: 'Unknown role target' });
    const result = buildFeedback('[fetch target:/api]', 'explicit', [diag], schemaLookup, 'fetch');
    expect(result.hints.some(h => h.includes("'source'"))).toBe(true);
  });

  it('generates generic hint for unknown_command', () => {
    const diag = makeDiagnostic({ code: 'unknown-command', message: 'Unknown command' });
    const result = buildFeedback('[xyz]', 'explicit', [diag]);
    expect(result.hints.some(h => h.includes('not recognized'))).toBe(true);
  });

  it('deduplicates hints', () => {
    const diags = [
      makeDiagnostic({ code: 'missing-role', message: 'Missing role source' }),
      makeDiagnostic({ code: 'missing-role', message: 'Missing role source again' }),
    ];
    const result = buildFeedback('[fetch]', 'explicit', diags, schemaLookup, 'fetch');
    const unique = new Set(result.hints);
    expect(unique.size).toBe(result.hints.length);
  });

  // --- Schema Info ---

  it('includes schema info when action and schemaLookup provided', () => {
    const result = buildFeedback('[fetch]', 'explicit', [makeDiagnostic()], schemaLookup, 'fetch');
    expect(result.schema).toBeDefined();
    expect(result.schema!.action).toBe('fetch');
    expect(result.schema!.requiredRoles).toContain('source');
    expect(result.schema!.optionalRoles).toContain('style');
  });

  it('omits schema when no schemaLookup', () => {
    const result = buildFeedback('[fetch]', 'explicit', [makeDiagnostic()], undefined, 'fetch');
    expect(result.schema).toBeUndefined();
  });

  it('omits schema when action not found', () => {
    const result = buildFeedback('[xyz]', 'explicit', [makeDiagnostic()], schemaLookup, 'xyz');
    expect(result.schema).toBeUndefined();
  });

  // --- Corrected Example ---

  it('generates corrected example on error with schema', () => {
    const diag = makeDiagnostic({ code: 'missing-role', message: 'Missing role' });
    const result = buildFeedback('[fetch]', 'explicit', [diag], schemaLookup, 'fetch');
    expect(result.correctedExample).toBeDefined();
    expect(result.correctedExample!.explicit).toContain('[fetch');
    expect(result.correctedExample!.json.action).toBe('fetch');
    expect(result.correctedExample!.json.roles['source']).toBeDefined();
  });

  it('omits corrected example when accepted', () => {
    const result = buildFeedback('[fetch source:/api]', 'explicit', [], schemaLookup, 'fetch');
    expect(result.correctedExample).toBeUndefined();
  });

  // --- Warnings/Info ---

  it('accepts with warnings (no errors)', () => {
    const diag = makeDiagnostic({ severity: 'warning', message: 'Low confidence' });
    const result = buildFeedback('[fetch source:/api]', 'explicit', [diag]);
    expect(result.accepted).toBe(true);
  });

  it('includes info-level diagnostics', () => {
    const diag = makeDiagnostic({ severity: 'info', message: 'Suggestion' });
    const result = buildFeedback('[fetch source:/api]', 'explicit', [diag]);
    expect(result.diagnostics.length).toBe(1);
    expect(result.diagnostics[0].severity).toBe('info');
  });
});
