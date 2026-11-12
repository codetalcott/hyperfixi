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

// =============================================================================
// v1.2 Protocol Features
// =============================================================================

describe('convert_format — annotations and diagnostics', () => {
  it('round-trips annotations and diagnostics', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        kind: 'command',
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
        annotations: [{ name: 'deprecated', value: 'use flip instead' }],
        diagnostics: [
          { level: 'warning', role: 'patient', message: 'Broad selector', code: 'W001' },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.annotations).toHaveLength(1);
    expect(data.semantic.annotations[0].name).toBe('deprecated');
    expect(data.semantic.diagnostics).toHaveLength(1);
    expect(data.semantic.diagnostics[0].code).toBe('W001');
  });
});

describe('validate_protocol', () => {
  it('validates correct protocol JSON', async () => {
    const response = await handleIRTool('validate_protocol', {
      json: {
        kind: 'command',
        action: 'toggle',
        roles: { patient: { type: 'selector', value: '.active' } },
      },
    });

    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.errors).toHaveLength(0);
  });

  it('returns errors for invalid protocol JSON', async () => {
    const response = await handleIRTool('validate_protocol', {
      json: { kind: 'command' }, // missing action
    });

    const data = parseResult(response);
    expect(data.ok).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it('reports a construct LSE 3.0 removed', async () => {
    const response = await handleIRTool('validate_protocol', {
      json: {
        kind: 'command',
        action: 'try',
        roles: {},
        body: [{ kind: 'command', action: 'fetch', roles: {} }],
        catchBranch: [{ kind: 'command', action: 'log', roles: {} }],
      },
    });

    const data = parseResult(response);
    expect(data.ok).toBe(false);
    expect(JSON.stringify(data)).toContain('REMOVED_IN_LSE_3');
  });

  it('returns error for missing json parameter', async () => {
    const response = await handleIRTool('validate_protocol', {});
    expect(response.isError).toBe(true);
  });
});

// =============================================================================
// InterchangeNode Input
// =============================================================================

describe('convert_format — interchange input', () => {
  it('converts interchange command node to LSE', async () => {
    const response = await handleIRTool('convert_format', {
      interchange: {
        type: 'command',
        name: 'toggle',
        roles: {
          patient: { type: 'selector', value: '.active' },
          destination: { type: 'selector', value: '#button' },
        },
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.explicit).toContain('toggle');
    expect(data.explicit).toContain('patient:.active');
    expect(data.explicit).toContain('destination:#button');
    expect(data.semantic.action).toBe('toggle');
    expect(data.semantic.kind).toBe('command');
  });

  it('converts interchange event node to LSE', async () => {
    const response = await handleIRTool('convert_format', {
      interchange: {
        type: 'event',
        event: 'click',
        body: [
          {
            type: 'command',
            name: 'toggle',
            roles: { patient: { type: 'selector', value: '.active' } },
          },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    // `semantic` is the protocol JSON shape (from toProtocolJSON). Single-body
    // event handlers are emitted in compact `trigger` form: the body command's
    // action is hoisted to the top, and the event name moves under
    // `trigger.event`. See @lokascript/intent protocol.ts:canEmitCompactTrigger.
    expect(data.semantic.kind).toBeUndefined();
    expect(data.semantic.action).toBe('toggle');
    expect(data.semantic.trigger).toEqual({ event: 'click' });
    expect(data.semantic.body).toBeUndefined();
    // The explicit bracket rendering is unchanged — it still reflects the
    // event-handler structure because the renderer walks the SemanticNode,
    // not the JSON output.
    expect(data.explicit).toContain('event:click');
  });

  it('converts interchange if node to LSE', async () => {
    const response = await handleIRTool('convert_format', {
      interchange: {
        type: 'if',
        condition: { type: 'identifier', value: 'x' },
        thenBranch: [{ type: 'command', name: 'show' }],
        elseBranch: [{ type: 'command', name: 'hide' }],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.action).toBe('if');
    expect(data.semantic.thenBranch).toHaveLength(1);
    expect(data.semantic.elseBranch).toHaveLength(1);
  });

  it('infers roles for core parser commands', async () => {
    const response = await handleIRTool('convert_format', {
      interchange: {
        type: 'command',
        name: 'put',
        args: [{ type: 'literal', value: 'hello' }],
        modifiers: { into: { type: 'selector', value: '#output' } },
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.roles.patient.value).toBe('hello');
    expect(data.semantic.roles.destination.value).toBe('#output');
    expect(data.semantic.roles.method.value).toBe('into');
  });

  it('returns error when interchange has no type field', async () => {
    const response = await handleIRTool('convert_format', {
      interchange: { name: 'toggle' }, // missing type
    });

    expect(response.isError).toBe(true);
  });
});
