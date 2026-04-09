/**
 * Smoke tests for @lokascript/intent
 *
 * These tests import directly from the package source (not re-exports from framework)
 * to verify the standalone package works in isolation. Comprehensive IR tests live
 * in packages/framework/src/ir/ and cover the shared logic exhaustively.
 */
import { describe, it, expect } from 'vitest';

// Core public API — all imported from the barrel
import {
  // Types / factories
  createCommandNode,
  createEventHandlerNode,
  createConditionalNode,
  createCompoundNode,
  createLoopNode,
  createLiteral,
  createSelector,
  createReference,
  createFlag,
  extractRoleValue,
  getRoleValue,
  // Schema
  defineCommand,
  defineRole,
  getRoleSpec,
  // IR — parser
  parseExplicit,
  isExplicitSyntax,
  parseCompound,
  parseDocument,
  isCompoundSyntax,
  isDocumentSyntax,
  STRUCTURAL_ROLES,
  // IR — renderer
  renderExplicit,
  renderDocument,
  // IR — protocol
  toProtocolJSON,
  fromProtocolJSON,
  validateProtocolJSON,
  toEnvelopeJSON,
  fromEnvelopeJSON,
  isEnvelope,
  // IR — references
  DEFAULT_REFERENCES,
  isValidReference,
  // Diagnostics
  createDiagnosticCollector,
  filterBySeverity,
} from './index';

// ─── Factories ──────────────────────────────────────────────────────────────

describe('createCommandNode', () => {
  it('creates a command node with roles', () => {
    const roles = new Map([['patient', createSelector('.active')]]);
    const node = createCommandNode('toggle', roles);
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toEqual({ type: 'selector', value: '.active' });
  });
});

describe('createEventHandlerNode', () => {
  it('creates an event-handler node', () => {
    const body = [createCommandNode('toggle', new Map([['patient', createSelector('.active')]]))];
    const node = createEventHandlerNode('on', new Map([['event', createLiteral('click')]]), body);
    expect(node.kind).toBe('event-handler');
    expect(node.body).toHaveLength(1);
  });
});

describe('value factories', () => {
  it('createLiteral', () => {
    expect(createLiteral('click')).toEqual({ type: 'literal', value: 'click' });
    expect(createLiteral(42)).toEqual({ type: 'literal', value: 42 });
  });

  it('createSelector', () => {
    expect(createSelector('.active')).toEqual({ type: 'selector', value: '.active' });
  });

  it('createReference', () => {
    expect(createReference('me')).toEqual({ type: 'reference', value: 'me' });
  });

  it('createFlag', () => {
    expect(createFlag('hidden', true)).toEqual({ type: 'flag', name: 'hidden', enabled: true });
  });
});

describe('extractRoleValue', () => {
  it('extracts a role value as a string', () => {
    const roles = new Map([['patient', createSelector('.active')]]);
    const node = createCommandNode('toggle', roles);
    expect(extractRoleValue(node, 'patient')).toBe('.active');
    expect(extractRoleValue(node, 'missing')).toBe('');
  });
});

describe('getRoleValue', () => {
  it('returns the typed SemanticValue for a present role', () => {
    const roles = new Map([['patient', createSelector('.active')]]);
    const node = createCommandNode('toggle', roles);
    const val = getRoleValue(node, 'patient');
    expect(val).toBeDefined();
    expect(val?.type).toBe('selector');
    if (val?.type === 'selector') expect(val.value).toBe('.active');
  });

  it('returns undefined for a missing role', () => {
    const node = createCommandNode('toggle', new Map());
    expect(getRoleValue(node, 'missing')).toBeUndefined();
  });

  it('returns a LiteralValue for a literal role', () => {
    const node = createCommandNode('fetch', new Map([['source', createLiteral('/api/data')]]));
    const val = getRoleValue(node, 'source');
    expect(val?.type).toBe('literal');
    if (val?.type === 'literal') expect(val.value).toBe('/api/data');
  });

  it('returns a ReferenceValue for a reference role', () => {
    const node = createCommandNode('set', new Map([['patient', createReference('me')]]));
    const val = getRoleValue(node, 'patient');
    expect(val?.type).toBe('reference');
    if (val?.type === 'reference') expect(val.value).toBe('me');
  });
});

// ─── Schema ──────────────────────────────────────────────────────────────────

describe('defineCommand / defineRole', () => {
  it('builds a schema object', () => {
    const patientRole = defineRole({
      role: 'patient',
      required: true,
      expectedTypes: ['selector', 'reference'],
    });
    const schema = defineCommand({ action: 'toggle', roles: [patientRole] });
    expect(schema.action).toBe('toggle');
    expect(schema.roles[0].role).toBe('patient');
    expect(schema.roles[0].required).toBe(true);
  });
});

describe('getRoleSpec', () => {
  it('returns the RoleSpec for a present role', () => {
    const patientRole = defineRole({
      role: 'patient',
      required: true,
      expectedTypes: ['selector'],
    });
    const schema = defineCommand({ action: 'toggle', roles: [patientRole] });
    const spec = getRoleSpec(schema, 'patient');
    expect(spec).toBeDefined();
    expect(spec?.role).toBe('patient');
    expect(spec?.required).toBe(true);
    expect(spec?.expectedTypes).toContain('selector');
  });

  it('returns undefined for an absent role', () => {
    const schema = defineCommand({ action: 'toggle', roles: [] });
    expect(getRoleSpec(schema, 'missing')).toBeUndefined();
  });

  it('does not confuse roles with similar names', () => {
    const r1 = defineRole({ role: 'patient', required: true, expectedTypes: ['selector'] });
    const r2 = defineRole({ role: 'destination', required: false, expectedTypes: ['selector'] });
    const schema = defineCommand({ action: 'move', roles: [r1, r2] });
    expect(getRoleSpec(schema, 'destination')?.required).toBe(false);
    expect(getRoleSpec(schema, 'patient')?.required).toBe(true);
  });
});

// ─── Parser ──────────────────────────────────────────────────────────────────

describe('isExplicitSyntax', () => {
  it('accepts bracket syntax', () => {
    expect(isExplicitSyntax('[toggle patient:.active]')).toBe(true);
  });

  it('rejects non-bracket syntax', () => {
    expect(isExplicitSyntax('toggle .active')).toBe(false);
    expect(isExplicitSyntax('[incomplete')).toBe(false);
    expect(isExplicitSyntax('')).toBe(false);
  });
});

describe('parseExplicit', () => {
  it('parses a basic command', () => {
    const node = parseExplicit('[toggle patient:.active]');
    expect(node.kind).toBe('command');
    expect(node.action).toBe('toggle');
    expect(node.roles.get('patient')).toMatchObject({ type: 'selector', value: '.active' });
  });

  it('parses a literal role', () => {
    const node = parseExplicit('[fetch source:"/api/data"]');
    expect(node.action).toBe('fetch');
    expect(node.roles.get('source')).toMatchObject({ type: 'literal', value: '/api/data' });
  });

  it('parses a reference role', () => {
    const node = parseExplicit('[set patient:me]');
    expect(node.roles.get('patient')).toMatchObject({ type: 'reference', value: 'me' });
  });

  it('validates against a schema lookup', () => {
    const patientRole = defineRole({
      role: 'patient',
      required: true,
      expectedTypes: ['selector'],
    });
    const schema = defineCommand({ action: 'toggle', roles: [patientRole] });
    const schemaLookup = {
      getSchema: (action: string) => (action === 'toggle' ? schema : undefined),
    };
    // Unknown role should throw without collectDiagnostics
    expect(() => parseExplicit('[toggle unknown:value]', { schemaLookup })).toThrow();
    // With collectDiagnostics, unknown role is tolerated
    const node = parseExplicit('[toggle unknown:value]', {
      schemaLookup,
      collectDiagnostics: true,
    });
    expect(node.kind).toBe('command');
  });
});

describe('parseCompound / isCompoundSyntax', () => {
  it('detects compound syntax', () => {
    expect(isCompoundSyntax('[add patient:.active] then [remove patient:.old]')).toBe(true);
    expect(isCompoundSyntax('[toggle patient:.active]')).toBe(false);
  });

  it('parses a compound into a CompoundSemanticNode', () => {
    const node = parseCompound('[add patient:.active] then [remove patient:.old]');
    expect(node.kind).toBe('compound');
    const compound = node as import('./types').CompoundSemanticNode;
    expect(compound.statements).toHaveLength(2);
  });
});

describe('parseDocument / isDocumentSyntax', () => {
  it('detects document syntax (multiline)', () => {
    expect(isDocumentSyntax('[toggle patient:.active]\n[add patient:.open]')).toBe(true);
    expect(isDocumentSyntax('[toggle patient:.active]')).toBe(false);
  });

  it('parses a document into an LSEEnvelope', () => {
    const envelope = parseDocument('[toggle patient:.active]\n[add patient:.open]');
    expect(envelope.nodes).toHaveLength(2);
    expect(envelope.lseVersion).toBeDefined();
  });
});

describe('STRUCTURAL_ROLES', () => {
  it('contains expected structural role names', () => {
    expect(STRUCTURAL_ROLES.has('body')).toBe(true);
    expect(STRUCTURAL_ROLES.has('then')).toBe(true);
    expect(STRUCTURAL_ROLES.has('else')).toBe(true);
  });
});

// ─── Renderer ────────────────────────────────────────────────────────────────

describe('renderExplicit', () => {
  it('round-trips a simple command', () => {
    const node = parseExplicit('[toggle patient:.active]');
    const output = renderExplicit(node);
    expect(output).toContain('toggle');
    expect(output).toContain('patient');
    expect(output).toContain('.active');
  });

  it('renders a document via renderDocument', () => {
    const envelope = parseDocument('[add patient:.active]\n[remove patient:.old]');
    const output = renderDocument(envelope);
    expect(output).toContain('add');
    expect(output).toContain('remove');
  });
});

// ─── Protocol JSON ───────────────────────────────────────────────────────────

describe('toProtocolJSON / fromProtocolJSON', () => {
  it('round-trips a command node', () => {
    const original = parseExplicit('[toggle patient:.active]');
    const json = toProtocolJSON(original);

    expect(json.action).toBe('toggle');
    expect(json.roles).toBeDefined();

    const restored = fromProtocolJSON(json);
    expect(restored.kind).toBe('command');
    expect(restored.action).toBe('toggle');
    expect(restored.roles.get('patient')).toMatchObject({ type: 'selector', value: '.active' });
  });

  it('serializes an event-handler node', () => {
    const body = [parseExplicit('[toggle patient:.active]')];
    const node = createEventHandlerNode('on', new Map([['event', createLiteral('click')]]), body);
    const json = toProtocolJSON(node);
    expect(json.kind).toBe('event-handler');
  });

  it('ProtocolDiagnostic.severity matches Diagnostic.severity (not .level)', () => {
    // Wire format uses 'level'; in-memory ProtocolDiagnostic uses 'severity'
    const node = {
      ...createCommandNode('toggle', new Map()),
      diagnostics: [
        { severity: 'warning' as const, message: 'test warning', code: 'W1', source: 'schema' },
      ],
    };
    const json = toProtocolJSON(node);
    expect(json.diagnostics![0].level).toBe('warning'); // wire format: 'level'
    const restored = fromProtocolJSON(json);
    expect(restored.diagnostics![0].severity).toBe('warning'); // in-memory: 'severity'
  });
});

describe('validateProtocolJSON', () => {
  it('returns no errors for valid JSON', () => {
    const node = parseExplicit('[toggle patient:.active]');
    const json = toProtocolJSON(node);
    expect(validateProtocolJSON(json)).toHaveLength(0);
  });

  it('reports MISSING_ACTION for missing action', () => {
    const errors = validateProtocolJSON({ roles: {} });
    expect(errors.some(e => e.code === 'MISSING_ACTION')).toBe(true);
  });

  it('reports INVALID_VALUE_TYPE for bad role type', () => {
    const errors = validateProtocolJSON({
      action: 'toggle',
      roles: { patient: { type: 'unknown' } },
    });
    expect(errors.some(e => e.code === 'INVALID_VALUE_TYPE')).toBe(true);
  });
});

describe('toEnvelopeJSON / fromEnvelopeJSON / isEnvelope', () => {
  it('wraps and unwraps nodes via envelope', () => {
    const envelope = parseDocument('[toggle patient:.active]');
    const json = toEnvelopeJSON(envelope);
    expect(isEnvelope(json)).toBe(true);
    expect(Array.isArray(json.nodes)).toBe(true);

    const restored = fromEnvelopeJSON(json);
    expect(restored.nodes).toHaveLength(1);
    expect(restored.nodes[0].action).toBe('toggle');
  });
});

// ─── References ──────────────────────────────────────────────────────────────

describe('DEFAULT_REFERENCES / isValidReference', () => {
  it('DEFAULT_REFERENCES contains built-ins', () => {
    expect(DEFAULT_REFERENCES.has('me')).toBe(true);
    expect(DEFAULT_REFERENCES.has('it')).toBe(true);
  });

  it('isValidReference returns true for built-ins', () => {
    expect(isValidReference('me')).toBe(true);
    expect(isValidReference('notAReference')).toBe(false);
  });
});

// ─── Diagnostics ─────────────────────────────────────────────────────────────

describe('createDiagnosticCollector', () => {
  it('collects errors and warnings', () => {
    const collector = createDiagnosticCollector();
    collector.error('something went wrong', { code: 'TEST_ERR' });
    collector.warning('heads up', { code: 'TEST_WARN' });
    const result = collector.toResult();
    expect(result.ok).toBe(false);
    expect(result.diagnostics).toHaveLength(2);
  });

  it('reports ok when no errors', () => {
    const collector = createDiagnosticCollector();
    collector.info('all good', { code: 'TEST_INFO' });
    expect(collector.toResult().ok).toBe(true);
  });

  it('code-first overload: error(code, message)', () => {
    const collector = createDiagnosticCollector();
    collector.error('MISSING_ROLE', 'patient role is required');
    const diag = collector.getDiagnostics()[0];
    expect(diag.code).toBe('MISSING_ROLE');
    expect(diag.message).toBe('patient role is required');
    expect(diag.severity).toBe('error');
  });

  it('code-first overload merges extra options', () => {
    const collector = createDiagnosticCollector();
    collector.error('INVALID_TYPE', 'expected selector', {
      line: 3,
      suggestions: ['use .class or #id'],
    });
    const diag = collector.getDiagnostics()[0];
    expect(diag.code).toBe('INVALID_TYPE');
    expect(diag.line).toBe(3);
    expect(diag.suggestions).toContain('use .class or #id');
  });

  it('original message-first form still works', () => {
    const collector = createDiagnosticCollector();
    collector.error('something went wrong', { code: 'LEGACY_FORM' });
    const diag = collector.getDiagnostics()[0];
    expect(diag.message).toBe('something went wrong');
    expect(diag.code).toBe('LEGACY_FORM');
  });
});

describe('filterBySeverity', () => {
  it('filters by severity level', () => {
    const diagnostics = [
      { severity: 'error' as const, code: 'E1', message: 'err' },
      { severity: 'warning' as const, code: 'W1', message: 'warn' },
      { severity: 'info' as const, code: 'I1', message: 'info' },
    ];
    const errors = filterBySeverity(diagnostics, 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('E1');
  });
});
