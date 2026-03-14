import { describe, it, expect } from 'vitest';
import { renderExplicit, renderDocument } from './explicit-renderer';
import { parseExplicit, parseCompound } from './explicit-parser';
import {
  createCommandNode,
  createSelector,
  createLiteral,
  createReference,
  createFlag,
  createEventHandlerNode,
  createCompoundNode,
} from '../core/types';
import type { SemanticNode, LSEEnvelope } from '../core/types';

describe('renderExplicit', () => {
  it('renders a basic command', () => {
    const node = createCommandNode('toggle', {
      patient: createSelector('.active'),
    });
    expect(renderExplicit(node)).toBe('[toggle patient:.active]');
  });

  it('renders multiple roles', () => {
    const node = createCommandNode('put', {
      patient: createLiteral('hello', 'string'),
      destination: createSelector('#output', 'id'),
    });
    const result = renderExplicit(node);
    expect(result).toContain('put');
    expect(result).toContain('patient:"hello"');
    expect(result).toContain('destination:#output');
    expect(result.startsWith('[')).toBe(true);
    expect(result.endsWith(']')).toBe(true);
  });

  it('renders reference values', () => {
    const node = createCommandNode('add', {
      patient: createSelector('.clicked'),
      destination: createReference('me'),
    });
    expect(renderExplicit(node)).toBe('[add patient:.clicked destination:me]');
  });

  it('renders numeric values', () => {
    const node = createCommandNode('increment', {
      destination: createSelector('#count', 'id'),
      quantity: createLiteral(5, 'number'),
    });
    expect(renderExplicit(node)).toBe('[increment destination:#count quantity:5]');
  });

  it('renders boolean values', () => {
    const node = createCommandNode('set', {
      destination: createLiteral('myVar', 'string'),
      goal: createLiteral(true, 'boolean'),
    });
    const result = renderExplicit(node);
    expect(result).toContain('goal:true');
  });

  it('renders event handler with body', () => {
    const bodyNode = createCommandNode('toggle', {
      patient: createSelector('.active'),
    });
    const node = createEventHandlerNode('on', { event: createLiteral('click', 'string') }, [
      bodyNode,
    ]);
    const result = renderExplicit(node);
    expect(result).toContain('[on event:"click"');
    expect(result).toContain('body:[toggle patient:.active]');
  });

  it('renders compound nodes', () => {
    const node1 = createCommandNode('add', {
      patient: createSelector('.loading'),
    });
    const node2 = createCommandNode('fetch', {
      source: createLiteral('/api/data', 'string'),
    });
    const compound = createCompoundNode([node1, node2], 'then');
    const result = renderExplicit(compound);
    expect(result).toBe('[add patient:.loading] then [fetch source:"/api/data"]');
  });
});

describe('renderExplicit — flags', () => {
  it('renders enabled flags as +name', () => {
    const node = createCommandNode('column', {
      name: createLiteral('id', 'string'),
      'primary-key': createFlag('primary-key', true),
    });
    const result = renderExplicit(node);
    expect(result).toContain('+primary-key');
    expect(result).not.toContain('primary-key:');
  });

  it('renders disabled flags as ~name', () => {
    const node = createCommandNode('field', {
      name: createLiteral('email', 'string'),
      nullable: createFlag('nullable', false),
    });
    const result = renderExplicit(node);
    expect(result).toContain('~nullable');
  });

  it('renders flags alongside role:value pairs', () => {
    const node = createCommandNode('column', {
      name: createLiteral('id', 'string'),
      type: createLiteral('uuid', 'string'),
      'primary-key': createFlag('primary-key', true),
      'not-null': createFlag('not-null', true),
    });
    const result = renderExplicit(node);
    expect(result).toContain('name:"id"');
    expect(result).toContain('type:"uuid"');
    expect(result).toContain('+primary-key');
    expect(result).toContain('+not-null');
  });
});

describe('round-trip: parse → render', () => {
  const cases = [
    '[toggle patient:.active]',
    '[add patient:.highlight destination:#output]',
    '[increment destination:#count quantity:5]',
    '[wait duration:500ms]',
    '[fetch source:/api/data responseType:json]',
    '[column name:id +primary-key +not-null]',
    '[field name:email +required ~nullable]',
  ];

  for (const input of cases) {
    it(`round-trips: ${input}`, () => {
      const node = parseExplicit(input);
      const output = renderExplicit(node);
      // Re-parse to verify semantic equivalence
      const reparsed = parseExplicit(output);
      expect(reparsed.action).toBe(node.action);
      expect(reparsed.roles.size).toBe(node.roles.size);
      for (const [role, value] of node.roles) {
        expect(reparsed.roles.get(role)).toEqual(value);
      }
    });
  }
});

describe('renderExplicit — annotations', () => {
  it('renders a node with a single annotation', () => {
    const node: SemanticNode = {
      ...createCommandNode('fetch', {
        source: createLiteral('/api/users', 'string'),
      }),
      annotations: [{ name: 'timeout', value: '5s' }],
    };
    expect(renderExplicit(node)).toBe('@timeout(5s) [fetch source:"/api/users"]');
  });

  it('renders annotation without value', () => {
    const node: SemanticNode = {
      ...createCommandNode('toggle', {
        patient: createSelector('.active'),
      }),
      annotations: [{ name: 'deprecated' }],
    };
    expect(renderExplicit(node)).toBe('@deprecated [toggle patient:.active]');
  });

  it('renders multiple annotations preserving order', () => {
    const node: SemanticNode = {
      ...createCommandNode('fetch', {
        source: createLiteral('/api/data', 'string'),
      }),
      annotations: [
        { name: 'retry', value: '3' },
        { name: 'timeout', value: '10s' },
      ],
    };
    const result = renderExplicit(node);
    expect(result).toBe('@retry(3) @timeout(10s) [fetch source:"/api/data"]');
  });

  it('renders no prefix when annotations are absent', () => {
    const node = createCommandNode('toggle', {
      patient: createSelector('.active'),
    });
    expect(renderExplicit(node)).toBe('[toggle patient:.active]');
  });

  it('annotation round-trip: render → parse → render', () => {
    const node: SemanticNode = {
      ...createCommandNode('fetch', {
        source: createLiteral('/api/users', 'string'),
      }),
      annotations: [{ name: 'timeout', value: '5s' }],
    };
    const rendered = renderExplicit(node);
    const reparsed = parseCompound(rendered);
    const rerendered = renderExplicit(reparsed);
    expect(rerendered).toBe(rendered);
  });
});

describe('renderDocument', () => {
  it('renders an envelope with version header', () => {
    const envelope: LSEEnvelope = {
      lseVersion: '1.2',
      nodes: [
        createCommandNode('toggle', { patient: createSelector('.active') }),
        createCommandNode('add', { patient: createSelector('.highlight') }),
      ],
    };
    const result = renderDocument(envelope);
    expect(result).toBe('#!lse 1.2\n[toggle patient:.active]\n[add patient:.highlight]');
  });

  it('omits version header for version 1.0', () => {
    const envelope: LSEEnvelope = {
      lseVersion: '1.0',
      nodes: [createCommandNode('toggle', { patient: createSelector('.active') })],
    };
    const result = renderDocument(envelope);
    expect(result).toBe('[toggle patient:.active]');
  });

  it('renders empty envelope', () => {
    const envelope: LSEEnvelope = { lseVersion: '1.2', nodes: [] };
    expect(renderDocument(envelope)).toBe('#!lse 1.2');
  });
});
