/**
 * Conformance tests for the LokaScript Explicit Syntax (LSE) TypeScript implementation.
 * Loads shared test fixtures from protocol/test-fixtures/ and runs all cases.
 *
 * Run: npm test
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

import { parseExplicit, ParseError } from './src/parser';
import { renderExplicit } from './src/renderer';
import { fromJSON, toJSON, isEnvelope, fromEnvelopeJSON, toEnvelopeJSON } from './src/json';
import type { SemanticNode, SemanticValue } from './src/types';

// ── Fixture loading ──────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'test-fixtures');

function loadFixtures(filename: string): Record<string, unknown>[] {
  const data = readFileSync(join(fixturesDir, filename), 'utf-8');
  return JSON.parse(data) as Record<string, unknown>[];
}

// ── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Compares actual parsed roles against expected roles from a fixture.
 * Handles numeric type coercion (JSON floats vs JS integers).
 */
function assertRolesMatch(
  actual: Record<string, SemanticValue>,
  expected: Record<string, unknown>,
  testId: string,
): void {
  expect(
    Object.keys(actual).length,
    `[${testId}] role count`,
  ).toBe(Object.keys(expected).length);

  for (const [roleName, expectedRaw] of Object.entries(expected)) {
    const actualVal = actual[roleName];
    expect(actualVal, `[${testId}] missing role "${roleName}"`).toBeDefined();

    const expectedVal = expectedRaw as Record<string, unknown>;
    const expectedType = expectedVal['type'] as string;

    expect(actualVal.type, `[${testId}] role "${roleName}" type`).toBe(expectedType);

    switch (expectedType) {
      case 'flag': {
        expect(actualVal.name, `[${testId}] flag name`).toBe(expectedVal['name']);
        expect(actualVal.enabled, `[${testId}] flag enabled`).toBe(expectedVal['enabled']);
        break;
      }
      case 'expression': {
        expect(actualVal.raw, `[${testId}] expression raw`).toBe(expectedVal['raw']);
        break;
      }
      default: {
        // Numeric comparison: JSON stores all numbers as float64, JS has one number type
        const ev = expectedVal['value'];
        const av = actualVal.value;
        if (typeof av === 'number' && typeof ev === 'number') {
          expect(av, `[${testId}] role "${roleName}" value`).toBe(ev);
        } else {
          expect(av, `[${testId}] role "${roleName}" value`).toBe(ev);
        }
        const expectedDT = expectedVal['dataType'];
        if (expectedDT !== undefined) {
          expect(
            actualVal.dataType,
            `[${testId}] role "${roleName}" dataType`,
          ).toBe(expectedDT);
        }
      }
    }
  }
}

// ── Parse conformance ────────────────────────────────────────────────────────

describe('Parse conformance', () => {
  const parseFiles = [
    'basic.json',
    'selectors.json',
    'literals.json',
    'references.json',
    'flags.json',
  ];

  for (const file of parseFiles) {
    describe(file, () => {
      const fixtures = loadFixtures(file);
      for (const fixture of fixtures) {
        if (!fixture['expected'] || fixture['expectError'] === true) continue;

        const id = fixture['id'] as string;
        const input = fixture['input'] as string;
        const expected = fixture['expected'] as Record<string, unknown>;

        it(id, () => {
          const node = parseExplicit(input);

          expect(node.kind, `${id}: kind`).toBe(expected['kind']);
          expect(node.action, `${id}: action`).toBe(expected['action']);
          assertRolesMatch(node.roles, expected['roles'] as Record<string, unknown>, id);
        });
      }
    });
  }
});

// ── Nested / event-handler conformance ──────────────────────────────────────

describe('nested.json', () => {
  const fixtures = loadFixtures('nested.json');
  for (const fixture of fixtures) {
    if (!fixture['expected']) continue;

    const id = fixture['id'] as string;
    const input = fixture['input'] as string;
    const expected = fixture['expected'] as Record<string, unknown>;

    it(id, () => {
      const node = parseExplicit(input);

      expect(node.kind, `${id}: kind`).toBe(expected['kind']);
      expect(node.action, `${id}: action`).toBe(expected['action']);
      assertRolesMatch(node.roles, expected['roles'] as Record<string, unknown>, id);

      const expectedBody = expected['body'] as Record<string, unknown>[] | undefined;
      if (expectedBody) {
        expect(node.body?.length, `${id}: body length`).toBe(expectedBody.length);
        for (let i = 0; i < expectedBody.length; i++) {
          const eb = expectedBody[i];
          const ab = node.body![i];
          expect(ab.kind, `${id}: body[${i}].kind`).toBe(eb['kind']);
          expect(ab.action, `${id}: body[${i}].action`).toBe(eb['action']);
          assertRolesMatch(
            ab.roles,
            eb['roles'] as Record<string, unknown>,
            `${id}.body[${i}]`,
          );
        }
      }
    });
  }
});

// ── Error conformance ────────────────────────────────────────────────────────

describe('errors.json', () => {
  const fixtures = loadFixtures('errors.json');
  for (const fixture of fixtures) {
    if (fixture['expectError'] !== true) continue;

    const id = fixture['id'] as string;
    const input = fixture['input'] as string;
    const errorContains = (fixture['errorContains'] as string).toLowerCase();

    it(id, () => {
      expect(
        () => parseExplicit(input),
        `${id}: expected ParseError`,
      ).toThrow(ParseError);

      try {
        parseExplicit(input);
      } catch (e) {
        expect(
          (e as Error).message.toLowerCase(),
          `${id}: error message should contain "${errorContains}"`,
        ).toContain(errorContains);
      }
    });
  }
});

// ── Round-trip conformance ───────────────────────────────────────────────────

describe('round-trip.json', () => {
  const fixtures = loadFixtures('round-trip.json');
  for (const fixture of fixtures) {
    if (!('roundtrip' in fixture)) continue;

    const id = fixture['id'] as string;
    const input = fixture['input'] as string;

    it(id, () => {
      const node = parseExplicit(input);
      const rendered = renderExplicit(node);
      const reparsed = parseExplicit(rendered);

      expect(reparsed.action, `${id}: action preserved`).toBe(node.action);
      expect(
        Object.keys(reparsed.roles).length,
        `${id}: role count preserved`,
      ).toBe(Object.keys(node.roles).length);

      for (const [roleName, origVal] of Object.entries(node.roles)) {
        const reparsedVal = reparsed.roles[roleName];
        expect(reparsedVal, `${id}: role "${roleName}" preserved`).toBeDefined();
        expect(
          reparsedVal.type,
          `${id}: role "${roleName}" type preserved`,
        ).toBe(origVal.type);
      }
    });
  }
});

// ── Compound render-only conformance ─────────────────────────────────────────

describe('compound.json', () => {
  const fixtures = loadFixtures('compound.json');
  for (const fixture of fixtures) {
    if (!fixture['renderOnly']) continue;

    const id = fixture['id'] as string;
    const nodeData = fixture['node'] as Record<string, unknown>;
    const expectedRendered = fixture['rendered'] as string;

    it(id, () => {
      const node = fromJSON(nodeData);
      const rendered = renderExplicit(node);
      expect(rendered, `${id}: rendered output`).toBe(expectedRendered);
    });
  }
});

// ── LLM-simplified fromJSON conformance ──────────────────────────────────────

describe('llm-simplified.json', () => {
  const fixtures = loadFixtures('llm-simplified.json');
  for (const fixture of fixtures) {
    if (fixture['format'] !== 'llm-simplified') continue;

    const id = fixture['id'] as string;
    const input = fixture['input'] as Record<string, unknown>;
    const expectedKind = fixture['expected_kind'] as string;
    const expectedAction = fixture['expected_action'] as string | undefined;
    const expectedBodyAction = fixture['expected_body_action'] as string | undefined;

    it(id, () => {
      const node = fromJSON(input);
      expect(node.kind, `${id}: kind`).toBe(expectedKind);

      if (expectedAction !== undefined) {
        if (node.kind === 'event-handler') {
          // For event-handler nodes, action is always "on"
          expect(node.action, `${id}: action`).toBe('on');
        } else {
          expect(node.action, `${id}: action`).toBe(expectedAction);
        }
      }

      if (expectedBodyAction !== undefined) {
        expect(node.body?.length, `${id}: body not empty`).toBeGreaterThan(0);
        expect(node.body![0].action, `${id}: body[0].action`).toBe(expectedBodyAction);
      }
    });
  }
});

// ── Structural roles conformance ────────────────────────────────────────────

describe('structural-roles.json', () => {
  const fixtures = loadFixtures('structural-roles.json');
  for (const fixture of fixtures) {
    if (!fixture['expected']) continue;

    const id = fixture['id'] as string;
    const input = fixture['input'] as string;
    const expected = fixture['expected'] as Record<string, unknown>;

    it(id, () => {
      const node = parseExplicit(input);

      expect(node.kind, `${id}: kind`).toBe(expected['kind']);
      expect(node.action, `${id}: action`).toBe(expected['action']);
      assertRolesMatch(node.roles, expected['roles'] as Record<string, unknown>, id);

      // Check thenBranch if present in expected
      const expectedThen = expected['thenBranch'] as Record<string, unknown>[] | undefined;
      if (expectedThen) {
        expect(node.thenBranch?.length, `${id}: thenBranch length`).toBe(expectedThen.length);
        for (let i = 0; i < expectedThen.length; i++) {
          const eb = expectedThen[i];
          const ab = node.thenBranch![i];
          expect(ab.kind, `${id}: thenBranch[${i}].kind`).toBe(eb['kind']);
          expect(ab.action, `${id}: thenBranch[${i}].action`).toBe(eb['action']);
          assertRolesMatch(
            ab.roles,
            eb['roles'] as Record<string, unknown>,
            `${id}.thenBranch[${i}]`,
          );
        }
      }
    });
  }
});

// ── Conditional conformance (v1.1) ──────────────────────────────────────────

function assertNodeArrayMatch(
  actual: SemanticNode[] | undefined,
  expected: Record<string, unknown>[] | undefined,
  testId: string,
  fieldName: string,
): void {
  if (!expected) {
    expect(actual, `${testId}: ${fieldName} should be absent`).toBeUndefined();
    return;
  }
  expect(actual?.length, `${testId}: ${fieldName} length`).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    const eb = expected[i];
    const ab = actual![i];
    expect(ab.kind, `${testId}: ${fieldName}[${i}].kind`).toBe(eb['kind']);
    expect(ab.action, `${testId}: ${fieldName}[${i}].action`).toBe(eb['action']);
    assertRolesMatch(
      ab.roles,
      eb['roles'] as Record<string, unknown>,
      `${testId}.${fieldName}[${i}]`,
    );
  }
}

describe('conditionals.json', () => {
  const fixtures = loadFixtures('conditionals.json');
  for (const fixture of fixtures) {
    const id = fixture['id'] as string;

    if (fixture['input'] && fixture['expected']) {
      const input = fixture['input'] as string;
      const expected = fixture['expected'] as Record<string, unknown>;

      it(`${id} (parse)`, () => {
        const node = parseExplicit(input);

        expect(node.kind, `${id}: kind`).toBe(expected['kind']);
        expect(node.action, `${id}: action`).toBe(expected['action']);
        assertRolesMatch(node.roles, expected['roles'] as Record<string, unknown>, id);

        assertNodeArrayMatch(
          node.thenBranch,
          expected['thenBranch'] as Record<string, unknown>[] | undefined,
          id,
          'thenBranch',
        );
        assertNodeArrayMatch(
          node.elseBranch,
          expected['elseBranch'] as Record<string, unknown>[] | undefined,
          id,
          'elseBranch',
        );
      });
    }

    if (fixture['jsonInput'] && fixture['expectedRoundTrip']) {
      const jsonInput = fixture['jsonInput'] as Record<string, unknown>;

      it(`${id} (JSON round-trip)`, () => {
        const node = fromJSON(jsonInput);
        const json = toJSON(node);
        const node2 = fromJSON(json);

        expect(node2.kind, `${id}: kind preserved`).toBe(node.kind);
        expect(node2.action, `${id}: action preserved`).toBe(node.action);
        expect(node2.thenBranch?.length, `${id}: thenBranch length`).toBe(node.thenBranch?.length);
        expect(node2.elseBranch?.length, `${id}: elseBranch length`).toBe(node.elseBranch?.length);
      });
    }
  }
});

// ── Loop conformance (v1.1) ─────────────────────────────────────────────────

describe('loops.json', () => {
  const fixtures = loadFixtures('loops.json');
  for (const fixture of fixtures) {
    const id = fixture['id'] as string;

    if (fixture['jsonInput'] && fixture['expectedRoundTrip']) {
      const jsonInput = fixture['jsonInput'] as Record<string, unknown>;

      it(`${id} (JSON round-trip)`, () => {
        const node = fromJSON(jsonInput);
        const json = toJSON(node);
        const node2 = fromJSON(json);

        expect(node2.kind, `${id}: kind preserved`).toBe(node.kind);
        expect(node2.action, `${id}: action preserved`).toBe(node.action);
        expect(node2.loopVariant, `${id}: loopVariant preserved`).toBe(node.loopVariant);
        expect(node2.loopBody?.length, `${id}: loopBody length`).toBe(node.loopBody?.length);
        expect(node2.loopVariable, `${id}: loopVariable preserved`).toBe(node.loopVariable);
        expect(node2.indexVariable, `${id}: indexVariable preserved`).toBe(node.indexVariable);
      });
    }
  }
});

// ── Type constraint conformance (v1.2) ──────────────────────────────────────

describe('type-constraints.json', () => {
  const fixtures = loadFixtures('type-constraints.json');
  for (const fixture of fixtures) {
    const id = fixture['id'] as string;

    if (fixture['jsonInput'] && fixture['expectedRoundTrip']) {
      const jsonInput = fixture['jsonInput'] as Record<string, unknown>;

      it(`${id} (JSON round-trip)`, () => {
        const node = fromJSON(jsonInput);
        const json = toJSON(node);
        const node2 = fromJSON(json);

        expect(node2.kind, `${id}: kind preserved`).toBe(node.kind);
        expect(node2.action, `${id}: action preserved`).toBe(node.action);

        // Diagnostics round-trip
        const expectedDiags = (jsonInput['diagnostics'] as unknown[]) ?? [];
        if (expectedDiags.length > 0) {
          expect(node.diagnostics?.length, `${id}: diagnostics parsed`).toBe(expectedDiags.length);
          expect(node2.diagnostics?.length, `${id}: diagnostics round-trip`).toBe(expectedDiags.length);

          for (let i = 0; i < expectedDiags.length; i++) {
            const ed = expectedDiags[i] as Record<string, unknown>;
            const ad = node2.diagnostics![i];
            expect(ad.level, `${id}: diag[${i}].level`).toBe(ed['level']);
            expect(ad.role, `${id}: diag[${i}].role`).toBe(ed['role']);
            expect(ad.message, `${id}: diag[${i}].message`).toBe(ed['message']);
            expect(ad.code, `${id}: diag[${i}].code`).toBe(ed['code']);
          }
        }

        if (fixture['noDiagnostics']) {
          expect(node.diagnostics, `${id}: no diagnostics`).toBeUndefined();
        }
      });
    }
  }
});

// ── Version envelope conformance (v1.2) ─────────────────────────────────────

describe('version-envelope.json', () => {
  const fixtures = loadFixtures('version-envelope.json');
  for (const fixture of fixtures) {
    const id = fixture['id'] as string;

    if (fixture['jsonInput']) {
      const jsonInput = fixture['jsonInput'] as Record<string, unknown>;

      it(`${id} (envelope detection)`, () => {
        expect(isEnvelope(jsonInput), `${id}: is envelope`).toBe(true);
      });

      it(`${id} (envelope parse)`, () => {
        const envelope = fromEnvelopeJSON(jsonInput);

        if (fixture['expectedVersion']) {
          expect(envelope.lseVersion, `${id}: version`).toBe(fixture['expectedVersion']);
        }

        if (fixture['expectedNodeCount'] !== undefined) {
          expect(envelope.nodes.length, `${id}: node count`).toBe(fixture['expectedNodeCount']);
        }

        if (fixture['expectedFeatures']) {
          expect(envelope.features, `${id}: features`).toEqual(fixture['expectedFeatures']);
        }
      });

      if (fixture['expectedRoundTrip']) {
        it(`${id} (envelope round-trip)`, () => {
          const envelope = fromEnvelopeJSON(jsonInput);
          const json = toEnvelopeJSON(envelope);
          const envelope2 = fromEnvelopeJSON(json);

          expect(envelope2.lseVersion, `${id}: version preserved`).toBe(envelope.lseVersion);
          expect(envelope2.nodes.length, `${id}: node count preserved`).toBe(envelope.nodes.length);
          expect(envelope2.features, `${id}: features preserved`).toEqual(envelope.features);
        });
      }
    }
  }

  it('bare node is not an envelope', () => {
    const bareNode = {
      kind: 'command',
      action: 'toggle',
      roles: { patient: { type: 'selector', value: '.active' } },
    };
    expect(isEnvelope(bareNode)).toBe(false);
  });
});
