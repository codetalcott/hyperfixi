import { describe, it, expect } from 'vitest';
import { parseExplicit, isExplicitSyntax } from './explicit-parser';
import type { ParseExplicitOptions, SchemaLookup } from './types';
import { defineCommand, defineRole } from '../schema/command-schema';

describe('isExplicitSyntax', () => {
  it('detects bracket syntax', () => {
    expect(isExplicitSyntax('[toggle patient:.active]')).toBe(true);
    expect(isExplicitSyntax('  [toggle patient:.active]  ')).toBe(true);
  });

  it('rejects non-bracket syntax', () => {
    expect(isExplicitSyntax('toggle .active')).toBe(false);
    expect(isExplicitSyntax('[incomplete')).toBe(false);
    expect(isExplicitSyntax('incomplete]')).toBe(false);
    expect(isExplicitSyntax('')).toBe(false);
  });
});

describe('parseExplicit — without schema', () => {
  it('parses basic command with roles', () => {
    const node = parseExplicit('[toggle patient:.active destination:#button]');
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
    expect(node.roles.get('destination')).toEqual({ type: 'selector', value: '#button' });
  });

  it('parses selector values', () => {
    const node = parseExplicit('[add patient:.highlight destination:#output]');
    const patient = node.roles.get('patient');
    expect(patient?.type).toBe('selector');
    expect(patient && 'value' in patient && patient.value).toBe('.highlight');
  });

  it('parses string literal values', () => {
    const node = parseExplicit('[put patient:"hello world" destination:#output]');
    const patient = node.roles.get('patient');
    expect(patient).toEqual({ type: 'literal', value: 'hello world', dataType: 'string' });
  });

  it('parses boolean values', () => {
    const node = parseExplicit('[set destination:myVar goal:true]');
    expect(node.roles.get('goal')).toEqual({ type: 'literal', value: true, dataType: 'boolean' });
  });

  it('parses numeric values', () => {
    const node = parseExplicit('[increment destination:count quantity:5]');
    expect(node.roles.get('quantity')).toEqual({ type: 'literal', value: 5, dataType: 'number' });
  });

  it('parses duration values', () => {
    const node = parseExplicit('[wait duration:500ms]');
    expect(node.roles.get('duration')).toEqual({
      type: 'literal',
      value: '500ms',
      dataType: 'duration',
    });

    const node2 = parseExplicit('[wait duration:2s]');
    expect(node2.roles.get('duration')).toEqual({
      type: 'literal',
      value: '2s',
      dataType: 'duration',
    });
  });

  it('parses reference values', () => {
    const node = parseExplicit('[add patient:.active destination:me]');
    expect(node.roles.get('destination')).toEqual({ type: 'reference', value: 'me' });
  });

  it('parses plain string values (unquoted, non-special)', () => {
    const node = parseExplicit('[fetch source:/api/users responseType:json]');
    expect(node.roles.get('source')).toEqual({
      type: 'literal',
      value: '/api/users',
      dataType: 'string',
    });
    expect(node.roles.get('responseType')).toEqual({
      type: 'literal',
      value: 'json',
      dataType: 'string',
    });
  });

  it('parses event handlers with body', () => {
    const node = parseExplicit('[on event:click body:[toggle patient:.active]]');
    expect(node.kind).toBe('event-handler');
    expect(node.action).toBe('on');
    const eventNode = node as { body: unknown[] };
    expect(eventNode.body).toHaveLength(1);
    expect(eventNode.body[0]).toMatchObject({ kind: 'command', action: 'toggle' });
  });

  it('accepts any role names without schema', () => {
    // Custom domain roles should parse fine
    const node = parseExplicit('[deploy destination:production source:main manner:rolling]');
    expect(node.action).toBe('deploy');
    expect(node.roles.get('destination')).toEqual({
      type: 'literal',
      value: 'production',
      dataType: 'string',
    });
    expect(node.roles.get('source')).toEqual({
      type: 'literal',
      value: 'main',
      dataType: 'string',
    });
    expect(node.roles.get('manner')).toEqual({
      type: 'literal',
      value: 'rolling',
      dataType: 'string',
    });
  });

  it('sets sourceLanguage to explicit', () => {
    const node = parseExplicit('[toggle patient:.active]');
    expect(node.metadata?.sourceLanguage).toBe('explicit');
  });
});

describe('parseExplicit — error handling', () => {
  it('throws on missing brackets', () => {
    expect(() => parseExplicit('toggle patient:.active')).toThrow('must be wrapped in brackets');
  });

  it('throws on empty brackets', () => {
    expect(() => parseExplicit('[]')).toThrow('Empty explicit statement');
    expect(() => parseExplicit('[  ]')).toThrow('Empty explicit statement');
  });

  it('throws on missing colon in role', () => {
    expect(() => parseExplicit('[toggle active]')).toThrow('Expected role:value');
  });

  it('throws on missing event role for event handler', () => {
    expect(() => parseExplicit('[on body:[toggle patient:.active]]')).toThrow(
      'requires event role'
    );
  });
});

describe('parseExplicit — with SchemaLookup', () => {
  const toggleSchema = defineCommand({
    action: 'toggle',
    roles: [
      defineRole({ role: 'patient', required: true, expectedTypes: ['selector'] }),
      defineRole({ role: 'destination', required: false, expectedTypes: ['selector'] }),
    ],
  });

  const schemaLookup: SchemaLookup = {
    getSchema(action: string) {
      if (action === 'toggle') return toggleSchema;
      return undefined;
    },
  };

  const options: ParseExplicitOptions = { schemaLookup };

  it('validates roles against schema', () => {
    // Valid roles pass
    const node = parseExplicit('[toggle patient:.active]', options);
    expect(node.action).toBe('toggle');
  });

  it('rejects unknown roles for known commands', () => {
    expect(() => parseExplicit('[toggle patient:.active bogus:value]', options)).toThrow(
      'Unknown role "bogus"'
    );
  });

  it('enforces required roles', () => {
    expect(() => parseExplicit('[toggle destination:#btn]', options)).toThrow(
      'Missing required role "patient"'
    );
  });

  it('allows any roles for unknown commands', () => {
    // 'deploy' has no schema registered
    const node = parseExplicit('[deploy target:prod]', options);
    expect(node.action).toBe('deploy');
    expect(node.roles.get('target')).toBeDefined();
  });
});

describe('parseExplicit — boolean flags', () => {
  it('parses +flag as enabled FlagValue', () => {
    const node = parseExplicit('[column name:id +primary-key]');
    expect(node.roles.get('primary-key')).toEqual({
      type: 'flag',
      name: 'primary-key',
      enabled: true,
    });
  });

  it('parses ~flag as disabled FlagValue', () => {
    const node = parseExplicit('[field name:email ~nullable]');
    expect(node.roles.get('nullable')).toEqual({
      type: 'flag',
      name: 'nullable',
      enabled: false,
    });
  });

  it('parses flags alongside role:value pairs', () => {
    const node = parseExplicit('[column name:id type:uuid +primary-key +not-null]');
    expect(node.action).toBe('column');
    expect(node.roles.get('name')).toEqual({ type: 'literal', value: 'id', dataType: 'string' });
    expect(node.roles.get('type')).toEqual({ type: 'literal', value: 'uuid', dataType: 'string' });
    expect(node.roles.get('primary-key')).toEqual({
      type: 'flag',
      name: 'primary-key',
      enabled: true,
    });
    expect(node.roles.get('not-null')).toEqual({
      type: 'flag',
      name: 'not-null',
      enabled: true,
    });
  });

  it('parses mixed + and ~ flags', () => {
    const node = parseExplicit('[field name:email +required ~nullable]');
    expect(node.roles.get('required')).toEqual({
      type: 'flag',
      name: 'required',
      enabled: true,
    });
    expect(node.roles.get('nullable')).toEqual({
      type: 'flag',
      name: 'nullable',
      enabled: false,
    });
  });

  it('throws on empty flag name', () => {
    expect(() => parseExplicit('[column name:id +]')).toThrow('Empty flag name');
    expect(() => parseExplicit('[column name:id ~]')).toThrow('Empty flag name');
  });

  it('validates flag names against schema', () => {
    const schema = defineCommand({
      action: 'column',
      roles: [
        defineRole({ role: 'name', required: true, expectedTypes: ['literal'] }),
        defineRole({ role: 'primary-key', required: false, expectedTypes: ['flag'] }),
      ],
    });
    const schemaLookup: SchemaLookup = {
      getSchema(action: string) {
        if (action === 'column') return schema;
        return undefined;
      },
    };
    // Valid flag
    const node = parseExplicit('[column name:id +primary-key]', { schemaLookup });
    expect(node.roles.get('primary-key')).toBeDefined();

    // Invalid flag
    expect(() => parseExplicit('[column name:id +unknown-flag]', { schemaLookup })).toThrow(
      'Unknown flag "unknown-flag"'
    );
  });

  it('allows any flags for unknown commands (no schema)', () => {
    const node = parseExplicit('[widget +draggable +resizable]');
    expect(node.roles.get('draggable')).toEqual({
      type: 'flag',
      name: 'draggable',
      enabled: true,
    });
    expect(node.roles.get('resizable')).toEqual({
      type: 'flag',
      name: 'resizable',
      enabled: true,
    });
  });
});

describe('parseExplicit — custom reference set', () => {
  it('uses custom references', () => {
    const options: ParseExplicitOptions = {
      referenceSet: new Set(['self', 'parent']),
    };
    const node = parseExplicit('[add patient:.active destination:self]', options);
    expect(node.roles.get('destination')).toEqual({ type: 'reference', value: 'self' });
  });

  it('does not recognize default references with custom set', () => {
    const options: ParseExplicitOptions = {
      referenceSet: new Set(['self']),
    };
    // 'me' is not in the custom set, so it becomes a literal string
    const node = parseExplicit('[add patient:.active destination:me]', options);
    expect(node.roles.get('destination')).toEqual({
      type: 'literal',
      value: 'me',
      dataType: 'string',
    });
  });
});
