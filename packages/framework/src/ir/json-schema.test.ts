import { describe, it, expect } from 'vitest';
import { validateSemanticJSON, jsonToSemanticNode, semanticNodeToJSON } from './json-schema';
import type { SemanticJSON } from './types';
import {
  createCommandNode,
  createSelector,
  createLiteral,
  createReference,
  createFlag,
} from '../core/types';

describe('validateSemanticJSON', () => {
  it('validates a correct input', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
      },
    };
    expect(validateSemanticJSON(input)).toEqual([]);
  });

  it('rejects missing action', () => {
    const input = { roles: {} } as unknown as SemanticJSON;
    const diags = validateSemanticJSON(input);
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('INVALID_ACTION');
  });

  it('rejects invalid role value', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: 'not-an-object' as unknown as { type: 'selector'; value: string },
      },
    };
    const diags = validateSemanticJSON(input);
    expect(diags.some(d => d.code === 'INVALID_ROLE_VALUE')).toBe(true);
  });

  it('rejects invalid value type', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'unknown' as 'selector', value: '.active' },
      },
    };
    const diags = validateSemanticJSON(input);
    expect(diags.some(d => d.code === 'INVALID_VALUE_TYPE')).toBe(true);
  });

  it('rejects missing value field', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'selector' } as unknown as { type: 'selector'; value: string },
      },
    };
    const diags = validateSemanticJSON(input);
    expect(diags.some(d => d.code === 'MISSING_VALUE')).toBe(true);
  });

  it('validates trigger', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: '' },
    };
    const diags = validateSemanticJSON(input);
    expect(diags.some(d => d.code === 'INVALID_TRIGGER')).toBe(true);
  });

  it('accepts valid trigger', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
      trigger: { event: 'click' },
    };
    expect(validateSemanticJSON(input)).toEqual([]);
  });
});

describe('jsonToSemanticNode', () => {
  it('converts a basic command', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
      },
    };
    const node = jsonToSemanticNode(input);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toMatchObject({ type: 'selector', value: '.active' });
  });

  it('converts selector values with kind detection', () => {
    const input: SemanticJSON = {
      action: 'add',
      roles: {
        patient: { type: 'selector', value: '.highlight' },
        destination: { type: 'selector', value: '#output' },
      },
    };
    const node = jsonToSemanticNode(input);
    const dest = node.roles.get('destination');
    expect(dest).toMatchObject({ type: 'selector', value: '#output', selectorKind: 'id' });
    const pat = node.roles.get('patient');
    expect(pat).toMatchObject({ type: 'selector', value: '.highlight', selectorKind: 'class' });
  });

  it('converts literal values', () => {
    const input: SemanticJSON = {
      action: 'put',
      roles: {
        patient: { type: 'literal', value: 'hello' },
        quantity: { type: 'literal', value: 42 },
        flag: { type: 'literal', value: true },
      },
    };
    const node = jsonToSemanticNode(input);
    expect(node.roles.get('patient')).toMatchObject({
      type: 'literal',
      value: 'hello',
      dataType: 'string',
    });
    expect(node.roles.get('quantity')).toMatchObject({
      type: 'literal',
      value: 42,
      dataType: 'number',
    });
    expect(node.roles.get('flag')).toMatchObject({
      type: 'literal',
      value: true,
      dataType: 'boolean',
    });
  });

  it('converts reference values', () => {
    const input: SemanticJSON = {
      action: 'add',
      roles: {
        destination: { type: 'reference', value: 'me' },
      },
    };
    const node = jsonToSemanticNode(input);
    expect(node.roles.get('destination')).toMatchObject({ type: 'reference', value: 'me' });
  });

  it('converts expression values', () => {
    const input: SemanticJSON = {
      action: 'set',
      roles: {
        goal: { type: 'expression', value: 'x + 1' },
      },
    };
    const node = jsonToSemanticNode(input);
    expect(node.roles.get('goal')).toMatchObject({ type: 'expression', raw: 'x + 1' });
  });

  it('wraps in event handler when trigger is present', () => {
    const input: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
      },
      trigger: { event: 'click' },
    };
    const node = jsonToSemanticNode(input);
    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
    const eventNode = node as { body: Array<{ action: string; roles: Map<string, unknown> }> };
    expect(eventNode.body).toHaveLength(1);
    expect(eventNode.body[0].action).toBe('toggle');
  });

  it('sets sourceLanguage to json', () => {
    const node = jsonToSemanticNode({
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
    });
    expect(node.metadata?.sourceLanguage).toBe('json');
  });
});

describe('semanticNodeToJSON', () => {
  it('converts a basic command', () => {
    const node = createCommandNode('toggle', {
      patient: createSelector('.active'),
    });
    const json = semanticNodeToJSON(node);
    expect(json.action).toBe('toggle');
    expect(json.roles.patient).toEqual({ type: 'selector', value: '.active' });
    expect(json.trigger).toBeUndefined();
  });

  it('converts multiple role types', () => {
    const node = createCommandNode('set', {
      destination: createLiteral('count', 'string'),
      goal: createLiteral(42, 'number'),
    });
    const json = semanticNodeToJSON(node);
    expect(json.roles.destination).toEqual({ type: 'literal', value: 'count' });
    expect(json.roles.goal).toEqual({ type: 'literal', value: 42 });
  });

  it('handles reference values', () => {
    const node = createCommandNode('add', {
      patient: createSelector('.active'),
      destination: createReference('me'),
    });
    const json = semanticNodeToJSON(node);
    expect(json.roles.destination).toEqual({ type: 'reference', value: 'me' });
  });
});

describe('flag support in JSON', () => {
  it('validates flag type as valid', () => {
    const input: SemanticJSON = {
      action: 'column',
      roles: {
        'primary-key': { type: 'flag', value: true },
      },
    };
    expect(validateSemanticJSON(input)).toEqual([]);
  });

  it('converts flag JSON to FlagValue', () => {
    const input: SemanticJSON = {
      action: 'column',
      roles: {
        name: { type: 'literal', value: 'id' },
        'primary-key': { type: 'flag', value: true },
      },
    };
    const node = jsonToSemanticNode(input);
    expect(node.roles.get('primary-key')).toEqual({
      type: 'flag',
      name: 'true',
      enabled: true,
    });
  });

  it('converts FlagValue to JSON', () => {
    const node = createCommandNode('column', {
      name: createLiteral('id', 'string'),
      'primary-key': createFlag('primary-key', true),
      'not-null': createFlag('not-null', true),
    });
    const json = semanticNodeToJSON(node);
    expect(json.roles['primary-key']).toEqual({ type: 'flag', value: true });
    expect(json.roles['not-null']).toEqual({ type: 'flag', value: true });
  });

  it('converts disabled FlagValue to JSON', () => {
    const node = createCommandNode('field', {
      nullable: createFlag('nullable', false),
    });
    const json = semanticNodeToJSON(node);
    expect(json.roles.nullable).toEqual({ type: 'flag', value: false });
  });
});

describe('round-trip: JSON → SemanticNode → JSON', () => {
  it('preserves command structure', () => {
    const original: SemanticJSON = {
      action: 'toggle',
      roles: {
        patient: { type: 'selector', value: '.active' },
        destination: { type: 'selector', value: '#button' },
      },
    };
    const node = jsonToSemanticNode(original);
    const roundTripped = semanticNodeToJSON(node);
    expect(roundTripped.action).toBe(original.action);
    expect(roundTripped.roles.patient.type).toBe('selector');
    expect(roundTripped.roles.patient.value).toBe('.active');
    expect(roundTripped.roles.destination.type).toBe('selector');
    expect(roundTripped.roles.destination.value).toBe('#button');
  });
});
