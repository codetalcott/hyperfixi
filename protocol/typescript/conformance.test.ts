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
import { fromJSON } from './src/json';
import type { SemanticValue } from './src/types';

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
