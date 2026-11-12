/**
 * Every LSE fixture, on the parser this package ships.
 *
 * The fixtures (`../../fixtures`) were the conformance suite of four reference
 * parsers (TypeScript, Python, Go, Rust) that nothing imported; this package,
 * the one implementation with users, ran eight of the 23 files. The reference
 * parsers retired on 2026-11-12 (tag `archived/lse-reference-parsers-2026-11-12`)
 * and the fixtures moved here. Where the two disagreed, the fixtures now say
 * what this parser does (see fixtures/README.md). LSE 3.0 then removed the
 * constructs with no producer, and their 27 cases (142 → 115).
 *
 * A fixture shape this file does not know fails the run: a new kind of case
 * cannot sit in the directory unread.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  fromProtocolJSON,
  parseExplicit,
  renderExplicit,
  toProtocolJSON,
  validateProtocolJSON,
  type SemanticNode,
  type SemanticValue,
} from '../index';

type Fixture = Record<string, unknown> & { id: string };
type Json = Record<string, unknown>;

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures');
const files = readdirSync(dir)
  .filter(f => f.endsWith('.json'))
  .sort();
const load = (file: string): Fixture[] => JSON.parse(readFileSync(join(dir, file), 'utf8'));

/** A parsed value as the fixtures write one: the fields with meaning, nothing else. */
function valueShape(value: SemanticValue, expected: Json): Json {
  const v = value as unknown as Json;
  if (v.type === 'flag') return { type: 'flag', name: v.name, enabled: v.enabled };
  if (v.type === 'expression') return { type: 'expression', raw: v.raw };
  const shape: Json = { type: v.type, value: v.value };
  if (v.dataType !== undefined) shape.dataType = v.dataType;
  // A selector's kind is asserted where the fixture gives one.
  if (expected.selectorKind !== undefined) shape.selectorKind = v.selectorKind;
  return shape;
}

function expectNode(node: SemanticNode, expected: Json, id: string): void {
  // The fixtures name the wire format's three kinds; this package's `conditional`
  // and `loop` nodes are written as `command` there (wire-format.md).
  const wireKind = node.kind === 'conditional' || node.kind === 'loop' ? 'command' : node.kind;
  expect(wireKind, `${id}: kind`).toBe(expected.kind);
  expect(node.action, `${id}: action`).toBe(expected.action);
  const want = (expected.roles ?? {}) as Record<string, Json>;
  // fromEntries defines each key: assigning `got['__proto__']` would set the prototype.
  const got = Object.fromEntries(
    [...node.roles].map(([role, value]) => [role, valueShape(value, want[role] ?? {})])
  );
  expect(got, `${id}: roles`).toEqual(want);
  for (const field of ['body', 'thenBranch', 'elseBranch', 'loopBody'] as const) {
    if (expected[field] === undefined) continue;
    // The node keeps a loop's commands in `body`.
    const children = (node as unknown as Json)[field === 'loopBody' ? 'body' : field];
    const wanted = expected[field] as Json[];
    expect(Array.isArray(children) ? children.length : 0, `${id}: ${field}`).toBe(wanted.length);
    wanted.forEach((w, i) =>
      expectNode((children as SemanticNode[])[i], w, `${id}.${field}[${i}]`)
    );
  }
}

function runCase(c: Fixture): void {
  // Bracket text that must not parse.
  if (c.expectError === true) {
    expect(() => parseExplicit(c.input as string)).toThrow();
    if (typeof c.errorContains === 'string') {
      expect(() => parseExplicit(c.input as string)).toThrow(
        new RegExp(c.errorContains.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      );
    }
    return;
  }
  // Bracket text → node.
  if (typeof c.input === 'string' && c.expected) {
    return expectNode(parseExplicit(c.input), c.expected as Json, c.id);
  }
  // Bracket text → node → bracket text.
  if (typeof c.input === 'string' && typeof c.roundtrip === 'string') {
    return expect(renderExplicit(parseExplicit(c.input))).toBe(c.roundtrip);
  }
  // Protocol JSON that must not validate.
  if (c.jsonInput && c.expectValidationError === true) {
    const errors = validateProtocolJSON(c.jsonInput).filter(d => d.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    if (c.errorCode) expect(errors.map(e => e.code)).toContain(c.errorCode);
    return;
  }
  // Protocol JSON → node → protocol JSON.
  if (c.jsonInput && c.expectedRoundTrip === true) {
    const back = toProtocolJSON(fromProtocolJSON(c.jsonInput as never));
    return expect(JSON.parse(JSON.stringify(back))).toEqual(c.jsonInput);
  }
  // A node (as protocol JSON) → bracket text.
  if (c.renderOnly === true && c.node) {
    return expect(renderExplicit(fromProtocolJSON(c.node as never))).toBe(c.rendered);
  }
  // The compact JSON form an LLM writes (no `kind`, a `trigger`).
  if (c.format === 'llm-simplified') {
    const node = fromProtocolJSON(c.input as never);
    expect(node.kind).toBe(c.expected_kind);
    if (c.expected_action) expect(node.action).toBe(c.expected_action);
    if (c.expected_body_action) {
      expect((node as unknown as { body: SemanticNode[] }).body[0].action).toBe(
        c.expected_body_action
      );
    }
    return;
  }
  throw new Error(`${c.id}: a fixture shape conformance.test.ts does not read`);
}

describe('LSE fixtures on @lokascript/intent', () => {
  it('reads every fixture file (18 files, 115 cases)', () => {
    expect(files.length).toBe(18);
    expect(files.reduce((n, f) => n + load(f).length, 0)).toBe(115);
  });

  for (const file of files) {
    describe(file, () => {
      for (const c of load(file)) it(`${c.id}: ${String(c.description ?? '')}`, () => runCase(c));
    });
  }
});
