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

describe('convert_format — v1.2 protocol JSON', () => {
  it('round-trips try/catch/finally', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        kind: 'command',
        action: 'try',
        roles: {},
        body: [
          {
            kind: 'command',
            action: 'fetch',
            roles: { patient: { type: 'literal', value: '/api' } },
          },
        ],
        catchBranch: [
          {
            kind: 'command',
            action: 'log',
            roles: { patient: { type: 'literal', value: 'error' } },
          },
        ],
        finallyBranch: [{ kind: 'command', action: 'settle', roles: {} }],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.action).toBe('try');
    expect(data.semantic.body).toHaveLength(1);
    expect(data.semantic.catchBranch).toHaveLength(1);
    expect(data.semantic.finallyBranch).toHaveLength(1);
  });

  it('round-trips async all/race', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        kind: 'command',
        action: 'async',
        roles: {},
        asyncVariant: 'all',
        asyncBody: [
          {
            kind: 'command',
            action: 'fetch',
            roles: { patient: { type: 'literal', value: '/a' } },
          },
          {
            kind: 'command',
            action: 'fetch',
            roles: { patient: { type: 'literal', value: '/b' } },
          },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.asyncVariant).toBe('all');
    expect(data.semantic.asyncBody).toHaveLength(2);
  });

  it('round-trips match/arms', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        kind: 'command',
        action: 'match',
        roles: { patient: { type: 'reference', value: 'status' } },
        arms: [
          {
            pattern: { type: 'literal', value: 200, dataType: 'number' },
            body: [
              {
                kind: 'command',
                action: 'log',
                roles: { patient: { type: 'literal', value: 'ok' } },
              },
            ],
          },
        ],
        defaultArm: [
          {
            kind: 'command',
            action: 'log',
            roles: { patient: { type: 'literal', value: 'unknown' } },
          },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.arms).toHaveLength(1);
    expect(data.semantic.arms[0].pattern.value).toBe(200);
    expect(data.semantic.defaultArm).toHaveLength(1);
  });

  it('round-trips pipe chainType', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        kind: 'compound',
        action: 'compound',
        chainType: 'pipe',
        statements: [
          {
            kind: 'command',
            action: 'get',
            roles: { patient: { type: 'reference', value: 'input' } },
          },
          { kind: 'command', action: 'trim', roles: {} },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.semantic.chainType).toBe('pipe');
    expect(data.semantic.statements).toHaveLength(2);
  });

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

  it('handles envelope input in convert_format', async () => {
    const response = await handleIRTool('convert_format', {
      semantic: {
        lseVersion: '1.2',
        nodes: [
          {
            kind: 'command',
            action: 'toggle',
            roles: { patient: { type: 'selector', value: '.active' } },
          },
          {
            kind: 'command',
            action: 'add',
            roles: { patient: { type: 'selector', value: '.highlight' } },
          },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.envelope.lseVersion).toBe('1.2');
    expect(data.nodes).toHaveLength(2);
    expect(data.nodes[0].semantic.action).toBe('toggle');
    expect(data.nodes[1].semantic.action).toBe('add');
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

  it('validates v1.2 fields', async () => {
    const response = await handleIRTool('validate_protocol', {
      json: {
        kind: 'command',
        action: 'try',
        roles: {},
        body: [{ kind: 'command', action: 'fetch', roles: {} }],
        catchBranch: [{ kind: 'command', action: 'log', roles: {} }],
        asyncVariant: 'all', // invalid on try node, but structurally valid
      },
    });

    const data = parseResult(response);
    // Should pass structural validation (asyncVariant is valid enum)
    expect(data.ok).toBe(true);
  });

  it('returns error for missing json parameter', async () => {
    const response = await handleIRTool('validate_protocol', {});
    expect(response.isError).toBe(true);
  });
});

describe('to_envelope', () => {
  it('wraps protocol JSON nodes into an envelope', async () => {
    const response = await handleIRTool('to_envelope', {
      nodes: [
        {
          kind: 'command',
          action: 'toggle',
          roles: { patient: { type: 'selector', value: '.active' } },
        },
        {
          kind: 'command',
          action: 'add',
          roles: { patient: { type: 'selector', value: '.highlight' } },
        },
      ],
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.envelope.lseVersion).toBe('1.2');
    expect(data.envelope.nodes).toHaveLength(2);
    expect(data.envelope.nodes[0].action).toBe('toggle');
  });

  it('accepts explicit bracket strings as nodes', async () => {
    const response = await handleIRTool('to_envelope', {
      nodes: ['[toggle patient:.active]', '[add patient:.highlight]'],
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.envelope.nodes).toHaveLength(2);
  });

  it('accepts mixed strings and JSON objects', async () => {
    const response = await handleIRTool('to_envelope', {
      nodes: [
        '[toggle patient:.active]',
        { kind: 'command', action: 'add', roles: { patient: { type: 'selector', value: '.x' } } },
      ],
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.envelope.nodes).toHaveLength(2);
  });

  it('uses custom version when provided', async () => {
    const response = await handleIRTool('to_envelope', {
      nodes: [{ kind: 'command', action: 'noop', roles: {} }],
      version: '1.3',
    });

    const data = parseResult(response);
    expect(data.envelope.lseVersion).toBe('1.3');
  });

  it('returns error for empty nodes', async () => {
    const response = await handleIRTool('to_envelope', { nodes: [] });
    expect(response.isError).toBe(true);
  });

  it('returns error for missing nodes', async () => {
    const response = await handleIRTool('to_envelope', {});
    expect(response.isError).toBe(true);
  });
});

describe('from_envelope', () => {
  it('unwraps an envelope into nodes', async () => {
    const response = await handleIRTool('from_envelope', {
      envelope: {
        lseVersion: '1.2',
        nodes: [
          {
            kind: 'command',
            action: 'toggle',
            roles: { patient: { type: 'selector', value: '.active' } },
          },
        ],
      },
    });

    expect(response.isError).toBeUndefined();
    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.lseVersion).toBe('1.2');
    expect(data.nodes).toHaveLength(1);
    expect(data.nodes[0].semantic.action).toBe('toggle');
    expect(data.nodes[0].explicit).toContain('toggle');
  });

  it('preserves features from envelope', async () => {
    const response = await handleIRTool('from_envelope', {
      envelope: {
        lseVersion: '1.2',
        features: ['try-catch', 'pipe'],
        nodes: [{ kind: 'command', action: 'noop', roles: {} }],
      },
    });

    const data = parseResult(response);
    expect(data.ok).toBe(true);
    expect(data.features).toEqual(['try-catch', 'pipe']);
  });

  it('returns error for invalid envelope', async () => {
    const response = await handleIRTool('from_envelope', {
      envelope: { nodes: [] }, // missing lseVersion
    });

    expect(response.isError).toBe(true);
  });

  it('returns error for missing envelope parameter', async () => {
    const response = await handleIRTool('from_envelope', {});
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
    expect(data.semantic.kind).toBe('event-handler');
    expect(data.semantic.body).toHaveLength(1);
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
