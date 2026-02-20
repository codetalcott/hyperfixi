/**
 * Tests for IR conversion MCP tools.
 */

import { describe, it, expect } from 'vitest';
import { handleIRTool } from '../tools/ir-tools.js';

function parseResult(response: { content: Array<{ text: string }> }) {
  return JSON.parse(response.content[0].text);
}

describe('convert_format', () => {
  it('converts explicit syntax to JSON', async () => {
    const response = await handleIRTool('convert_format', {
      explicit: '[toggle patient:.active destination:#btn]',
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.explicit).toContain('toggle');
    expect(data.semantic.action).toBe('toggle');
    expect(data.semantic.roles.patient.type).toBe('selector');
    expect(data.semantic.roles.patient.value).toBe('.active');
    expect(data.semantic.roles.destination.value).toBe('#btn');
  });

  it('converts JSON to explicit syntax', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        action: 'add',
        roles: {
          patient: { type: 'selector', value: '.highlight' },
          destination: { type: 'selector', value: '#output' },
        },
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.explicit).toContain('add');
    expect(data.explicit).toContain('patient:.highlight');
    expect(data.explicit).toContain('destination:#output');
    expect(data.semantic.action).toBe('add');
  });

  it('round-trips: explicit → JSON → explicit produces equivalent', async () => {
    const input = '[toggle patient:.active]';

    // Explicit → JSON
    const r1 = await handleIRTool('convert_format', { explicit: input });
    const d1 = parseResult(r1);

    // JSON → Explicit
    const r2 = await handleIRTool('convert_format', { semantic: d1.semantic });
    const d2 = parseResult(r2);

    // Both should have the same semantic representation
    expect(d2.semantic.action).toBe(d1.semantic.action);
    expect(d2.semantic.roles.patient.value).toBe(d1.semantic.roles.patient.value);
  });

  it('returns error for invalid explicit syntax', async () => {
    const response = await handleIRTool('convert_format', {
      explicit: '[incomplete',
    });

    // The outer handler catches the error
    expect(response.isError).toBe(true);
  });

  it('returns error for invalid JSON (missing action)', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: { roles: { patient: { type: 'selector', value: '.x' } } },
    });

    const data = parseResult(response);
    expect(data.ok).toBe(false);
    expect(data.diagnostics.length).toBeGreaterThan(0);
  });

  it('returns error when neither input is provided', async () => {
    const response = await handleIRTool('convert_format', {});
    expect(response.isError).toBe(true);
  });
});

describe('validate_explicit', () => {
  it('validates correct explicit syntax', async () => {
    const response = await handleIRTool('validate_explicit', {
      explicit: '[toggle patient:.active]',
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.action).toBe('toggle');
    expect(data.diagnostics).toHaveLength(0);
  });

  it('returns diagnostics for invalid syntax', async () => {
    const response = await handleIRTool('validate_explicit', {
      explicit: '[]',
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(false);
    expect(data.diagnostics.length).toBeGreaterThan(0);
    expect(data.diagnostics[0].severity).toBe('error');
  });

  it('returns error for missing explicit parameter', async () => {
    const response = await handleIRTool('validate_explicit', {});
    expect(response.isError).toBe(true);
  });

  it('validates complex explicit syntax with multiple roles', async () => {
    const response = await handleIRTool('validate_explicit', {
      explicit: '[put patient:"hello world" destination:#output]',
    });

    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.action).toBe('put');
    expect(data.semantic.roles.patient.value).toBe('hello world');
  });
});
